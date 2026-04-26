const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');

async function requestJoin(clubId, userId) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    throw new AppError('Club not found', 404);
  }

  const existing = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (existing) {
    if (existing.status === 'ACTIVE') {
      throw new AppError('You are already a member of this club', 409);
    }
    if (existing.status === 'PENDING') {
      throw new AppError('You already have a pending request for this club', 409);
    }
    if (existing.status === 'ALUMNI') {
      throw new AppError('You are an alumni of this club', 409);
    }
    if (existing.status === 'REJECTED') {
      throw new AppError('Your previous request was rejected', 409);
    }
  }

  const membership = await prisma.clubMembership.create({
    data: { userId, clubId, status: 'PENDING', role: 'MEMBER' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return membership;
}

async function listMembers(clubId, { status } = {}) {
  const where = { clubId };
  if (status) {
    where.status = status;
  }

  const memberships = await prisma.clubMembership.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return memberships;
}

async function approve(clubId, userId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (!membership) {
    throw new AppError('Membership not found', 404);
  }

  if (membership.status !== 'PENDING') {
    throw new AppError('Membership is not in PENDING status', 400);
  }

  const updated = await prisma.clubMembership.update({
    where: { userId_clubId: { userId, clubId } },
    data: { status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return updated;
}

async function reject(clubId, userId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (!membership) {
    throw new AppError('Membership not found', 404);
  }

  if (membership.status !== 'PENDING') {
    throw new AppError('Membership is not in PENDING status', 400);
  }

  const updated = await prisma.clubMembership.update({
    where: { userId_clubId: { userId, clubId } },
    data: { status: 'REJECTED' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return updated;
}

async function setAlumni(clubId, userId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });

  if (!membership) {
    throw new AppError('Membership not found', 404);
  }

  if (membership.status !== 'ACTIVE') {
    throw new AppError('Membership is not in ACTIVE status', 400);
  }

  const updated = await prisma.clubMembership.update({
    where: { userId_clubId: { userId, clubId } },
    data: { status: 'ALUMNI' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return updated;
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

  const remainingOfficerCount = await prisma.clubMembership.count({
    where: {
      userId: currentAdminId,
      clubId: { not: clubId },
      role: 'OFFICER',
      status: 'ACTIVE',
    },
  });

  const transactionOps = [
    prisma.clubMembership.update({
      where: { userId_clubId: { userId: currentAdminId, clubId } },
      data: { role: 'MEMBER' },
    }),
    prisma.clubMembership.update({
      where: { userId_clubId: { userId: newAdminId, clubId } },
      data: { role: 'OFFICER' },
    }),
    prisma.user.update({
      where: { id: newAdminId },
      data: { role: 'CLUB_ADMIN' },
    }),
  ];

  if (remainingOfficerCount === 0) {
    transactionOps.push(
      prisma.user.update({
        where: { id: currentAdminId },
        data: { role: 'STUDENT' },
      })
    );
  }

  await prisma.$transaction(transactionOps);

  return { success: true };
}

async function isClubAdmin(userId, clubId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  return !!(membership && membership.role === 'OFFICER' && membership.status === 'ACTIVE');
}

async function getAdminClubs(userId) {
  const memberships = await prisma.clubMembership.findMany({
    where: { userId, role: 'OFFICER', status: 'ACTIVE' },
    include: { club: { select: { id: true, name: true, category: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m) => m.club);
}

module.exports = { requestJoin, listMembers, approve, reject, setAlumni, transferAdmin, isClubAdmin, getAdminClubs };
