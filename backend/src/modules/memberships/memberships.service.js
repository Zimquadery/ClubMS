const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const { isPrivilegedRole } = require('../../utils/roles');
const { userSearchWhere } = require('../../utils/search');

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

async function listMembers(clubId, { status, page = 1, limit = 50, search } = {}) {
  const where = { clubId };
  if (status) where.status = status;
  const searchWhere = userSearchWhere(search);
  if (searchWhere) where.user = searchWhere;

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
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.status !== 'ACTIVE') {
    throw new AppError('Membership is not in ACTIVE status', 400);
  }

  if (membership.role === 'OFFICER') {
    const officerCount = await prisma.clubMembership.count({
      where: { clubId, role: 'OFFICER', status: 'ACTIVE' },
    });
    if (officerCount <= 1) {
      throw new AppError('Cannot set alumni on the last officer. Transfer admin rights first.', 400);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.clubMembership.update({
      where: { userId_clubId: { userId, clubId } },
      data: { status: 'ALUMNI' },
      include: { user: { select: USER_SELECT } },
    });

    if (membership.role === 'OFFICER') {
      const remainingOfficerCount = await tx.clubMembership.count({
        where: { userId, clubId: { not: clubId }, role: 'OFFICER', status: 'ACTIVE' },
      });
      if (remainingOfficerCount === 0) {
        const currentUser = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
        const revertRole = currentUser?.role === 'FACULTY' ? 'FACULTY' : 'STUDENT';
        await tx.user.update({ where: { id: userId }, data: { role: revertRole } });
      }
    }

    return updated;
  });

  return result;
}

async function transferAdmin(clubId, currentAdminId, newAdminId, callerRole) {
  if (currentAdminId === newAdminId) {
    throw new AppError('Cannot transfer admin to yourself', 400);
  }

  // Always look up the caller's membership — privileged callers (PLATFORM_ADMIN,
  // FACULTY) may legitimately not have one (e.g. appointing an officer for an
  // unmanaged club). The transaction below tolerates the absent row.
  const currentMembership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId: currentAdminId, clubId } },
  });

  if (!isPrivilegedRole(callerRole)) {
    if (!currentMembership || currentMembership.role !== 'OFFICER' || currentMembership.status !== 'ACTIVE') {
      throw new AppError('You are not an admin of this club', 403);
    }
  }

  const newMembership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId: newAdminId, clubId } },
  });

  if (!newMembership || newMembership.status !== 'ACTIVE') {
    throw new AppError('Target user is not an active member of this club', 400);
  }

    const result = await prisma.$transaction(async (tx) => {
      const [remainingOfficerCount, currentUser, newUser] = await Promise.all([
        tx.clubMembership.count({
          where: {
            userId: currentAdminId,
            clubId: { not: clubId },
            role: 'OFFICER',
            status: 'ACTIVE',
          },
        }),
        tx.user.findUnique({ where: { id: currentAdminId }, select: { role: true } }),
        tx.user.findUnique({ where: { id: newAdminId }, select: { role: true } }),
      ]);

      const ops = [];

      // Only demote the caller's membership if they actually held one (privileged
      // caller may have none — they're appointing, not transferring).
      if (currentMembership) {
        ops.push(tx.clubMembership.update({
          where: { userId_clubId: { userId: currentAdminId, clubId } },
          data: { role: 'MEMBER' },
        }));
      }

      ops.push(tx.clubMembership.update({
        where: { userId_clubId: { userId: newAdminId, clubId } },
        data: { role: 'OFFICER' },
      }));

      if (newUser?.role === 'STUDENT') {
        ops.push(tx.user.update({ where: { id: newAdminId }, data: { role: 'CLUB_ADMIN' } }));
      }

      // Only revert the caller's User.role if they actually held an officer role here
      // AND have no other officer memberships.
      if (currentMembership && remainingOfficerCount === 0) {
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

async function removeMember(clubId, userId, callerId) {
  if (userId === callerId) throw new AppError('You cannot remove yourself', 400);

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
    const targetUser = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (targetUser?.role === 'STUDENT') {
      await tx.user.update({ where: { id: userId }, data: { role: 'CLUB_ADMIN' } });
    }
    return { ...updated, priorUserRole: targetUser?.role ?? null };
  });
  return result;
}

async function demoteMember(clubId, userId, callerId) {
  if (userId === callerId) throw new AppError('You cannot demote yourself', 400);

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.role !== 'OFFICER') throw new AppError('Member is not an officer', 400);

  const officerCount = await prisma.clubMembership.count({
    where: { clubId, role: 'OFFICER', status: 'ACTIVE' },
  });
  if (officerCount <= 1) {
    throw new AppError('Cannot demote the last officer of this club', 400);
  }

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
