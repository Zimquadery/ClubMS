const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const eventHosts = require('../eventHosts/eventHosts.service');

const EVENT_SELECT = { id: true, title: true, startTime: true, venue: true };
const CLUB_SELECT = { id: true, name: true, logoUrl: true, category: true };

const INCOMING_INCLUDE = {
  event: {
    select: {
      ...EVENT_SELECT,
      hosts: {
        where: { isPrimary: true },
        select: { club: { select: { id: true, name: true } } },
        take: 1,
      },
    },
  },
};

// Invitations table holds ONLY pending rows (accept converts to EventHost and
// deletes the row; reject/cancel delete it). This keeps pending state out of
// EventHost so host-based authz can never be satisfied by an un-accepted invite.
async function create(eventId, clubId) {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: CLUB_SELECT });
  if (!club) throw new AppError('Club not found', 404);

  const existingHost = await prisma.eventHost.findUnique({
    where: { eventId_clubId: { eventId, clubId } },
    select: { isPrimary: true },
  });
  if (existingHost) {
    throw new AppError(existingHost.isPrimary
      ? 'Cannot invite the primary host club'
      : 'Club is already a host of this event', existingHost.isPrimary ? 400 : 409);
  }

  const existingInvite = await prisma.eventHostInvite.findUnique({
    where: { eventId_clubId: { eventId, clubId } },
    select: { id: true },
  });
  if (existingInvite) throw new AppError('An invitation is already pending for this club', 409);

  return prisma.eventHostInvite.create({
    data: { eventId, clubId },
    include: { club: { select: { id: true, name: true } } },
  });
}

async function listForEvent(eventId) {
  const items = await prisma.eventHostInvite.findMany({
    where: { eventId },
    include: { club: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return { items };
}

async function listIncoming(userId, { page = 1, limit = 20, clubId } = {}) {
  const officerMemberships = await prisma.clubMembership.findMany({
    where: { userId, role: 'OFFICER', status: 'ACTIVE', ...(clubId ? { clubId } : {}) },
    select: { clubId: true },
  });
  const clubIds = officerMemberships.map((m) => m.clubId);
  if (clubIds.length === 0) return { items: [], total: 0, page, limit, totalPages: 0 };

  const where = { clubId: { in: clubIds } };
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    prisma.eventHostInvite.findMany({ where, include: INCOMING_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.eventHostInvite.count({ where }),
  ]);

  const items = rows.map((invite) => ({
    id: invite.id,
    eventId: invite.eventId,
    clubId: invite.clubId,
    createdAt: invite.createdAt,
    event: { id: invite.event.id, title: invite.event.title, startTime: invite.event.startTime, venue: invite.event.venue },
    invitedByClub: invite.event.hosts[0]?.club || null,
  }));

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 0 };
}

async function assertClubOfficer(userId, clubId) {
  const membership = await prisma.clubMembership.findFirst({
    where: { userId, clubId, role: 'OFFICER', status: 'ACTIVE' },
    select: { id: true },
  });
  if (!membership) throw new AppError('You are not an officer of the invited club', 403);
}

async function accept(inviteId, userId, skipOfficerCheck = false) {
  const invite = await prisma.eventHostInvite.findUnique({
    where: { id: inviteId },
    include: { club: { select: { id: true, name: true } }, event: { select: EVENT_SELECT } },
  });
  if (!invite) throw new AppError('Invitation not found', 404);

  if (!skipOfficerCheck) await assertClubOfficer(userId, invite.clubId);

  // Race-safe: re-check host existence inside the tx so two concurrent accepts
  // serialize; deleteMany tolerates a concurrent reject/cancel already removing it.
  await prisma.$transaction(async (tx) => {
    const existingHost = await tx.eventHost.findUnique({
      where: { eventId_clubId: { eventId: invite.eventId, clubId: invite.clubId } },
      select: { id: true },
    });
    if (!existingHost) {
      await tx.eventHost.create({
        data: { eventId: invite.eventId, clubId: invite.clubId, isPrimary: false },
      });
    }
    await tx.eventHostInvite.deleteMany({ where: { id: inviteId } });
  });

  return { success: true, club: invite.club, event: invite.event };
}

async function reject(inviteId, userId, skipOfficerCheck = false) {
  const invite = await prisma.eventHostInvite.findUnique({ where: { id: inviteId }, select: { clubId: true, eventId: true } });
  if (!invite) throw new AppError('Invitation not found', 404);

  if (!skipOfficerCheck) await assertClubOfficer(userId, invite.clubId);

  await prisma.eventHostInvite.delete({ where: { id: inviteId } });
  return { success: true, eventId: invite.eventId, clubId: invite.clubId };
}

async function cancel(inviteId, userId, skipHostCheck = false) {
  const invite = await prisma.eventHostInvite.findUnique({ where: { id: inviteId }, select: { eventId: true } });
  if (!invite) throw new AppError('Invitation not found', 404);

  if (!skipHostCheck) await eventHosts.assertHostOfficer(userId, invite.eventId);

  await prisma.eventHostInvite.delete({ where: { id: inviteId } });
  return { success: true };
}

module.exports = { create, listForEvent, listIncoming, accept, reject, cancel };
