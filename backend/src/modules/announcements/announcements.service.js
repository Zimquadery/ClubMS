const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const auditService = require('../audit/audit.service');
const { isActiveMember } = require('../memberships/memberships.service');
const { isPrivilegedRole } = require('../../middleware/rbac');

async function create(clubId, userId, data) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new AppError('Club not found', 404);

  return prisma.announcement.create({
    data: {
      clubId,
      authorId: userId,
      title: data.title,
      content: data.content,
    },
    include: { author: { select: { id: true, name: true } } },
  });
}

async function list(clubId, userId, userRole, { page = 1, limit = 20 } = {}) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new AppError('Club not found', 404);

  if (!isPrivilegedRole(userRole) && !await isActiveMember(userId, clubId)) {
    throw new AppError('You are not an active member of this club', 403);
  }

  const skip = (page - 1) * limit;
  const where = { clubId };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getById(clubId, announcementId, userId, userRole) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new AppError('Club not found', 404);

  if (!isPrivilegedRole(userRole) && !await isActiveMember(userId, clubId)) {
    throw new AppError('You are not an active member of this club', 403);
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      author: { select: { id: true, name: true } },
      club: { select: { id: true, name: true } },
    },
  });

  if (!announcement || announcement.clubId !== clubId) {
    throw new AppError('Announcement not found', 404);
  }

  return announcement;
}

async function update(clubId, announcementId, userId, userRole, data) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement || announcement.clubId !== clubId) {
    throw new AppError('Announcement not found', 404);
  }

  if (!isPrivilegedRole(userRole) && announcement.authorId !== userId) {
    throw new AppError('You can only edit your own announcements', 403);
  }

  return prisma.announcement.update({
    where: { id: announcementId },
    data,
    include: { author: { select: { id: true, name: true } } },
  });
}

async function remove(clubId, announcementId, userId, userRole) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement || announcement.clubId !== clubId) {
    throw new AppError('Announcement not found', 404);
  }

  if (!isPrivilegedRole(userRole) && announcement.authorId !== userId) {
    throw new AppError('You can only delete your own announcements', 403);
  }

  await prisma.announcement.delete({ where: { id: announcementId } });
  return { success: true };
}

async function togglePin(clubId, announcementId, userId, ipAddress) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement || announcement.clubId !== clubId) {
    throw new AppError('Announcement not found', 404);
  }

  if (!announcement.pinned) {
    const result = await prisma.$transaction(async (tx) => {
      const pinnedCount = await tx.announcement.count({
        where: { clubId, pinned: true },
      });
      if (pinnedCount >= 3) {
        throw new AppError('Maximum 3 pinned announcements per club', 400);
      }
      return tx.announcement.update({
        where: { id: announcementId },
        data: { pinned: true },
        include: { author: { select: { id: true, name: true } } },
      });
    });

    await auditService.log({
      action: 'ANNOUNCEMENT_PIN',
      actorId: userId,
      targetType: 'announcement',
      targetId: announcementId,
      ipAddress,
    });

    return result;
  }

  const result = await prisma.announcement.update({
    where: { id: announcementId },
    data: { pinned: false },
    include: { author: { select: { id: true, name: true } } },
  });

  await auditService.log({
    action: 'ANNOUNCEMENT_UNPIN',
    actorId: userId,
    targetType: 'announcement',
    targetId: announcementId,
    ipAddress,
  });

  return result;
}

async function getRecent(userId, userRole, limit = 5) {
  if (isPrivilegedRole(userRole)) {
    return prisma.announcement.findMany({
      include: {
        club: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  const memberships = await prisma.clubMembership.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { clubId: true },
  });

  if (memberships.length === 0) return [];

  const clubIds = memberships.map((m) => m.clubId);

  return prisma.announcement.findMany({
    where: { clubId: { in: clubIds } },
    include: {
      club: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

module.exports = { create, list, getById, update, remove, togglePin, getRecent };
