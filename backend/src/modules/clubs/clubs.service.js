const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const { CLUB_CATEGORIES } = require('./clubs.constants');
const { isPrivilegedRole } = require('../../utils/roles');
const { isPrimaryHostClub } = require('../eventHosts/eventHosts.service');
const { userSearchWhere } = require('../../utils/search');
const { normalizeDepartments } = require('../../utils/departments');

async function list({ search, category, page = 1, limit = 20 }) {
  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (category) where.category = category;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.club.findMany({
      where,
      include: { _count: { select: { memberships: { where: { status: 'ACTIVE' } } } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.club.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getById(id, userId, { membersPage = 1, membersLimit = 10, eventsPage = 1, eventsLimit = 5, membersSearch, membersStatus = 'ACTIVE', userRole } = {}) {
  let userMembership = null;
  if (userId) {
    userMembership = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId: id } },
      select: { status: true, role: true },
    });
  }

  const isActive = userMembership?.status === 'ACTIVE';
  const canViewRoster = isActive || isPrivilegedRole(userRole);
  const canViewContact = (isActive && userMembership?.role === 'OFFICER') || isPrivilegedRole(userRole);

  const memberSearchWhere = userSearchWhere(membersSearch);
  const memberListWhere = { status: membersStatus, ...(memberSearchWhere && { user: memberSearchWhere }) };

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          memberships: { where: { status: 'ACTIVE' } },
        },
      },
      memberships: canViewRoster
        ? {
            where: memberListWhere,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  department: true,
                  studentId: true,
                  ...(canViewContact && { email: true, phone: true }),
                },
              },
            },
            orderBy: { createdAt: 'asc' },
            skip: (membersPage - 1) * membersLimit,
            take: membersLimit,
          }
        : false,
    },
  });

  if (!club) throw new AppError('Club not found', 404);

  const upcomingWhere = { hosts: { some: { clubId: id } }, startTime: { gte: new Date() } };
  const [totalMembers, totalEvents, events] = await Promise.all([
    prisma.clubMembership.count({ where: { clubId: id, ...memberListWhere } }),
    prisma.event.count({ where: upcomingWhere }),
    prisma.event.findMany({
      where: upcomingWhere,
      orderBy: { startTime: 'asc' },
      skip: (eventsPage - 1) * eventsLimit,
      take: eventsLimit,
      include: {
        hosts: {
          include: { club: { select: { id: true, name: true, logoUrl: true } } },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    }),
  ]);

  club.userMembership = userMembership;
  club.events = events.map((event) => {
    const primary = event.hosts.find((h) => h.isPrimary) || event.hosts[0];
    const { hosts, ...rest } = event;
    return { ...rest, club: primary?.club || null, clubId: primary?.clubId || null };
  });

  return { ...club, totalMembers, totalEvents };
}

async function create({ name, description, rules, category, logoUrl, adminUserId }) {
  const existing = await prisma.club.findFirst({ where: { name } });
  if (existing) throw new AppError('A club with this name already exists', 409);

  if (!CLUB_CATEGORIES.includes(category)) {
    throw new AppError(`Invalid category. Must be one of: ${CLUB_CATEGORIES.join(', ')}`, 400);
  }

  const clubData = {
    name,
    description: description || null,
    rules: rules || null,
    category,
    logoUrl: logoUrl || null,
  };

  if (adminUserId) {
    const user = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!user) throw new AppError('Specified admin user not found', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const club = await tx.club.create({ data: clubData });

    if (adminUserId) {
      await tx.clubMembership.create({
        data: { userId: adminUserId, clubId: club.id, status: 'ACTIVE', role: 'OFFICER' },
      });
      const adminUser = await tx.user.findUnique({ where: { id: adminUserId }, select: { role: true } });
      if (adminUser?.role === 'STUDENT') {
        await tx.user.update({ where: { id: adminUserId }, data: { role: 'CLUB_ADMIN' } });
      }
    }

    return club;
  });

  return result;
}

async function update(id, { name, description, rules, category, logoUrl }) {
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) throw new AppError('Club not found', 404);

  const data = {};
  if (name !== undefined && name !== club.name) {
    const existing = await prisma.club.findFirst({ where: { name } });
    if (existing) throw new AppError('A club with this name already exists', 409);
    data.name = name;
  }
  if (description !== undefined) data.description = description || null;
  if (rules !== undefined) data.rules = rules || null;
  if (category !== undefined) {
    if (!CLUB_CATEGORIES.includes(category)) {
      throw new AppError(`Invalid category. Must be one of: ${CLUB_CATEGORIES.join(', ')}`, 400);
    }
    data.category = category;
  }
  if (logoUrl !== undefined) data.logoUrl = logoUrl || null;

  if (Object.keys(data).length === 0) throw new AppError('No fields to update', 400);

  return prisma.club.update({ where: { id }, data });
}

async function updateProfile(clubId, { description, rules } = {}) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new AppError('Club not found', 404);

  const data = {};
  if (description !== undefined) data.description = description || null;
  if (rules !== undefined) data.rules = rules || null;
  if (Object.keys(data).length === 0) throw new AppError('No fields to update', 400);

  return prisma.club.update({ where: { id: clubId }, data });
}

async function updateJoinRules(clubId, { joinRuleMode, joinDepartments }) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new AppError('Club not found', 404);

  const departments = normalizeDepartments(joinDepartments);

  if (joinRuleMode !== 'ALL' && departments.length === 0) {
    throw new AppError('Select at least one department', 400);
  }

  return prisma.club.update({
    where: { id: clubId },
    data: { joinRuleMode, joinDepartments: joinRuleMode === 'ALL' ? [] : departments },
  });
}

async function deleteClub(id) {
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) throw new AppError('Club not found', 404);

  if (await isPrimaryHostClub(id)) {
    throw new AppError('Cannot delete a club that is the primary host of an event. Transfer primary or delete those events first.', 409);
  }

  await prisma.club.delete({ where: { id } });
  return { success: true };
}

function getCategories() {
  return CLUB_CATEGORIES;
}

module.exports = { list, getById, create, update, updateProfile, updateJoinRules, deleteClub, getCategories };
