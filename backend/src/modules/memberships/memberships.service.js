const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');

const USER_SELECT = { id: true, name: true, email: true };

async function updateMembershipStatus(clubId, userId, expectedStatus, newStatus) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.status !== expectedStatus) {
    throw new AppError(`Membership is not in ${expectedStatus} status`, 400);
  }

  return prisma.clubMembership.update({
    where: { userId_clubId: { userId, clubId } },
    data: { status: newStatus },
    include: { user: { select: USER_SELECT } },
  });
}

async function requestJoin(clubId, userId) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new AppError('Club not found', 404);

  const existing = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (existing) {
    if (existing.status === 'ACTIVE') throw new AppError('You are already a member of this club', 409);
    if (existing.status === 'PENDING') throw new AppError('You already have a pending request for this club', 409);
    if (existing.status === 'ALUMNI') throw new AppError('You are an alumni of this club', 409);
    if (existing.status === 'REJECTED') {
      return prisma.clubMembership.update({
        where: { userId_clubId: { userId, clubId } },
        data: { status: 'PENDING' },
        include: { user: { select: USER_SELECT } },
      });
    }
  }

  return prisma.clubMembership.create({
    data: { userId, clubId, status: 'PENDING', role: 'MEMBER' },
    include: { user: { select: USER_SELECT } },
  });
}

async function listMembers(clubId, { status, page = 1, limit = 50 } = {}) {
  const where = { clubId };
  if (status) where.status = status;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.clubMembership.findMany({
      where,
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.clubMembership.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function approve(clubId, userId) {
  return updateMembershipStatus(clubId, userId, 'PENDING', 'ACTIVE');
}

async function reject(clubId, userId) {
  return updateMembershipStatus(clubId, userId, 'PENDING', 'REJECTED');
}

async function setAlumni(clubId, userId) {
  return updateMembershipStatus(clubId, userId, 'ACTIVE', 'ALUMNI');
}

async function transferAdmin(clubId, currentAdminId, newAdminId) {
  if (currentAdminId === newAdminId) {
    throw new AppError('Cannot transfer admin to yourself', 400);
  }

  const currentMembership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId: currentAdminId, clubId } },
  });

  if (!currentMembership || currentMembership.role !== 'OFFICER' || currentMembership.status !== 'ACTIVE') {
    throw new AppError('You are not an admin of this club', 403);
  }

  const newMembership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId: newAdminId, clubId } },
  });

  if (!newMembership || newMembership.status !== 'ACTIVE') {
    throw new AppError('Target user is not an active member of this club', 400);
  }

    const result = await prisma.$transaction(async (tx) => {
      const [remainingOfficerCount, currentUser] = await Promise.all([
        tx.clubMembership.count({
          where: {
            userId: currentAdminId,
            clubId: { not: clubId },
            role: 'OFFICER',
            status: 'ACTIVE',
          },
        }),
        tx.user.findUnique({ where: { id: currentAdminId }, select: { role: true } }),
      ]);

      const ops = [
        tx.clubMembership.update({
          where: { userId_clubId: { userId: currentAdminId, clubId } },
          data: { role: 'MEMBER' },
        }),
        tx.clubMembership.update({
          where: { userId_clubId: { userId: newAdminId, clubId } },
          data: { role: 'OFFICER' },
        }),
        tx.user.update({ where: { id: newAdminId }, data: { role: 'CLUB_ADMIN' } }),
      ];

      if (remainingOfficerCount === 0) {
        const revertRole = currentUser?.role === 'FACULTY' ? 'FACULTY' : 'STUDENT';
        ops.push(tx.user.update({ where: { id: currentAdminId }, data: { role: revertRole } }));
      }

      await Promise.all(ops);
      return { success: true };
    });

  return result;
}

async function leaveClub(clubId, userId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.status !== 'ACTIVE' && membership.status !== 'PENDING') {
    throw new AppError('You are not an active or pending member of this club', 400);
  }
  if (membership.role === 'OFFICER') {
    throw new AppError('Officers cannot leave. Transfer admin rights first.', 400);
  }

  await prisma.clubMembership.delete({ where: { userId_clubId: { userId, clubId } } });
  return { success: true };
}

async function removeMember(clubId, userId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.role === 'OFFICER') {
    throw new AppError('Cannot remove an officer. Transfer admin rights first.', 400);
  }

  await prisma.clubMembership.delete({ where: { userId_clubId: { userId, clubId } } });
  return { success: true };
}

async function isClubAdmin(userId, clubId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  return !!(membership && membership.role === 'OFFICER' && membership.status === 'ACTIVE');
}

async function getMyClubs(userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const memberships = await prisma.clubMembership.findMany({
    where: { userId, status: { in: ['ACTIVE', 'PENDING'] } },
    include: {
      club: {
        select: {
          id: true, name: true, category: true, logoUrl: true,
          _count: {
            select: {
              announcements: {
                where: { createdAt: { gte: sevenDaysAgo } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return memberships.map((m) => ({
    ...m.club,
    announcementCount: m.club._count.announcements,
    membershipStatus: m.status,
    membershipRole: m.role,
  }));
}

async function getAdminClubs(userId) {
  const memberships = await prisma.clubMembership.findMany({
    where: { userId, role: 'OFFICER', status: 'ACTIVE' },
    include: { club: { select: { id: true, name: true, category: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m) => m.club);
}

async function promoteMember(clubId, userId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.status !== 'ACTIVE') throw new AppError('Only active members can be promoted', 400);
  if (membership.role === 'OFFICER') throw new AppError('Member is already an officer', 400);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.clubMembership.update({
      where: { userId_clubId: { userId, clubId } },
      data: { role: 'OFFICER' },
      include: { user: { select: USER_SELECT } },
    });
    await tx.user.update({ where: { id: userId }, data: { role: 'CLUB_ADMIN' } });
    return updated;
  });
  return result;
}

async function demoteMember(clubId, userId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.role !== 'OFFICER') throw new AppError('Member is not an officer', 400);

  const result = await prisma.$transaction(async (tx) => {
    const [remainingOfficerCount, targetUser] = await Promise.all([
      tx.clubMembership.count({
        where: { userId, clubId: { not: clubId }, role: 'OFFICER', status: 'ACTIVE' },
      }),
      tx.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);
    const updated = await tx.clubMembership.update({
      where: { userId_clubId: { userId, clubId } },
      data: { role: 'MEMBER' },
      include: { user: { select: USER_SELECT } },
    });
    if (remainingOfficerCount === 0) {
      const revertRole = targetUser?.role === 'FACULTY' ? 'FACULTY' : 'STUDENT';
      await tx.user.update({ where: { id: userId }, data: { role: revertRole } });
    }
    return updated;
  });
  return result;
}

async function bulkUpdateStatus(clubId, userIds, newStatus) {
  if (!Array.isArray(userIds) || userIds.length === 0) throw new AppError('userIds must be a non-empty array', 400);

  const updated = await prisma.$transaction(async (tx) => {
    return tx.clubMembership.updateMany({
      where: { clubId, userId: { in: userIds }, status: 'PENDING' },
      data: { status: newStatus },
    });
  });
  return { count: updated.count };
}

async function bulkApprove(clubId, userIds) {
  return bulkUpdateStatus(clubId, userIds, 'ACTIVE');
}

async function bulkReject(clubId, userIds) {
  return bulkUpdateStatus(clubId, userIds, 'REJECTED');
}

async function exportMembersCsv(clubId) {
  const members = await prisma.clubMembership.findMany({
    where: { clubId },
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'asc' },
  });

  const header = 'Name,Email,Role,Status,Joined Date';
  const rows = members.map((m) =>
    `"${m.user.name}","${m.user.email}","${m.role}","${m.status}","${m.createdAt.toISOString()}"`
  );
  return [header, ...rows].join('\n');
}

async function isActiveMember(userId, clubId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  return !!(membership && membership.status === 'ACTIVE');
}

async function updateUserRole(userId, newRole) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'PLATFORM_ADMIN') throw new AppError('Cannot change PLATFORM_ADMIN role', 400);
  return prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: { id: true, name: true, email: true, role: true },
  });
}

module.exports = { requestJoin, listMembers, approve, reject, setAlumni, transferAdmin, leaveClub, removeMember, isClubAdmin, getAdminClubs, getMyClubs, promoteMember, demoteMember, bulkApprove, bulkReject, exportMembersCsv, isActiveMember, updateUserRole };
