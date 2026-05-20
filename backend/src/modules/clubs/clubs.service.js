const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const { CLUB_CATEGORIES } = require('./clubs.constants');
const { isPrivilegedRole } = require('../../middleware/rbac');

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

async function getById(id, userId, { membersPage = 1, membersLimit = 10, eventsPage = 1, eventsLimit = 5, userRole } = {}) {
  let userMembership = null;
  if (userId) {
    userMembership = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId: id } },
      select: { status: true, role: true },
    });
  }

  const includeEmail = userMembership?.role === 'OFFICER' || isPrivilegedRole(userRole);

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          memberships: { where: { status: 'ACTIVE' } },
        },
      },
      memberships: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, name: true, ...(includeEmail && { email: true }) } } },
        orderBy: { createdAt: 'asc' },
        skip: (membersPage - 1) * membersLimit,
        take: membersLimit,
      },
      events: {
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: 'asc' },
        skip: (eventsPage - 1) * eventsLimit,
        take: eventsLimit,
      },
    },
  });

  if (!club) throw new AppError('Club not found', 404);

  const [totalMembers, totalEvents] = await Promise.all([
    prisma.clubMembership.count({ where: { clubId: id, status: 'ACTIVE' } }),
    prisma.event.count({ where: { clubId: id, startTime: { gte: new Date() } } }),
  ]);

  club.userMembership = userMembership;

  return { ...club, totalMembers, totalEvents };
}

async function create({ name, description, category, logoUrl, adminUserId }) {
  const existing = await prisma.club.findFirst({ where: { name } });
  if (existing) throw new AppError('A club with this name already exists', 409);

  if (!CLUB_CATEGORIES.includes(category)) {
    throw new AppError(`Invalid category. Must be one of: ${CLUB_CATEGORIES.join(', ')}`, 400);
  }

  const clubData = {
    name,
    description: description || null,
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
      await tx.user.update({ where: { id: adminUserId }, data: { role: 'CLUB_ADMIN' } });
    }

    return club;
  });

  return result;
}

async function update(id, { name, description, category, logoUrl }) {
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) throw new AppError('Club not found', 404);

  const data = {};
  if (name !== undefined && name !== club.name) {
    const existing = await prisma.club.findFirst({ where: { name } });
    if (existing) throw new AppError('A club with this name already exists', 409);
    data.name = name;
  }
  if (description !== undefined) data.description = description || null;
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

async function deleteClub(id) {
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) throw new AppError('Club not found', 404);
  await prisma.club.delete({ where: { id } });
  return { success: true };
}

function getCategories() {
  return CLUB_CATEGORIES;
}

module.exports = { list, getById, create, update, deleteClub, getCategories };
