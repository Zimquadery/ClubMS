const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');

const HOST_CLUB_SELECT = { id: true, name: true, logoUrl: true, category: true };

async function resolveHostClubs(eventId) {
  return prisma.eventHost.findMany({
    where: { eventId },
    select: { clubId: true, isPrimary: true },
  });
}

async function getHostClubIds(eventId) {
  const hosts = await resolveHostClubs(eventId);
  return hosts.map((h) => h.clubId);
}

async function getPrimaryClubId(eventId) {
  const primary = await prisma.eventHost.findFirst({
    where: { eventId, isPrimary: true },
    select: { clubId: true },
  });
  return primary?.clubId ?? null;
}

async function isHostOfficer(userId, eventId) {
  const clubIds = await getHostClubIds(eventId);
  if (clubIds.length === 0) return false;
  const membership = await prisma.clubMembership.findFirst({
    where: { userId, clubId: { in: clubIds }, role: 'OFFICER', status: 'ACTIVE' },
    select: { id: true },
  });
  return !!membership;
}

async function isPrimaryHostOfficer(userId, eventId) {
  const primaryClubId = await getPrimaryClubId(eventId);
  if (!primaryClubId) return false;
  const membership = await prisma.clubMembership.findFirst({
    where: { userId, clubId: primaryClubId, role: 'OFFICER', status: 'ACTIVE' },
    select: { id: true },
  });
  return !!membership;
}

async function isActiveMemberOfAnyHost(userId, eventId) {
  const clubIds = await getHostClubIds(eventId);
  if (clubIds.length === 0) return false;
  const membership = await prisma.clubMembership.findFirst({
    where: { userId, clubId: { in: clubIds }, status: 'ACTIVE' },
    select: { id: true },
  });
  return !!membership;
}

async function assertHostOfficer(userId, eventId) {
  if (!(await isHostOfficer(userId, eventId))) {
    throw new AppError('Not an officer of a host club for this event', 403);
  }
}

async function isPrimaryHostClub(clubId) {
  const row = await prisma.eventHost.findFirst({
    where: { clubId, isPrimary: true },
    select: { id: true },
  });
  return !!row;
}

async function removeCoHost(eventId, clubId) {
  const existing = await prisma.eventHost.findUnique({
    where: { eventId_clubId: { eventId, clubId } },
  });
  if (!existing) throw new AppError('Club is not a host of this event', 404);
  if (existing.isPrimary) {
    throw new AppError('Cannot remove the primary host. Delete the event instead.', 400);
  }

  await prisma.eventHost.delete({ where: { id: existing.id } });
  return { success: true };
}

module.exports = {
  HOST_CLUB_SELECT,
  isHostOfficer,
  isPrimaryHostOfficer,
  isActiveMemberOfAnyHost,
  assertHostOfficer,
  isPrimaryHostClub,
  removeCoHost,
};
