const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const eventHosts = require('../eventHosts/eventHosts.service');
const { isPrivilegedRole } = require('../../utils/roles');
const { userSearchWhere } = require('../../utils/search');

async function upsert(eventId, userId, status, userRole) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);

  if (!isPrivilegedRole(userRole)) {
    const active = await eventHosts.isActiveMemberOfAnyHost(userId, eventId);
    if (!active) throw new AppError('Must be an active member of a host club to RSVP', 403);
  }

  return prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status },
    create: { eventId, userId, status },
    include: { user: { select: { id: true, name: true } } },
  });
}

async function remove(eventId, userId) {
  const rsvp = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!rsvp) throw new AppError('RSVP not found', 404);

  await prisma.eventRsvp.delete({ where: { id: rsvp.id } });
  return { success: true };
}

async function assertCanViewRsvps(eventId, userId, userRole) {
  if (isPrivilegedRole(userRole)) return;
  if (!(await eventHosts.isHostOfficer(userId, eventId))) {
    throw new AppError('Not authorized to view RSVPs for this event', 403);
  }
}

async function listByEvent(eventId, { status, page = 1, limit = 50, userId, userRole, search } = {}) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new AppError('Event not found', 404);

  await assertCanViewRsvps(eventId, userId, userRole);

  const where = { eventId };
  if (status) where.status = status;
  const searchWhere = userSearchWhere(search);
  if (searchWhere) where.user = searchWhere;

  const skip = (page - 1) * limit;

  const [items, total, countRows] = await Promise.all([
    prisma.eventRsvp.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.eventRsvp.count({ where }),
    prisma.eventRsvp.groupBy({
      by: ['status'],
      where: { eventId },
      _count: true,
    }),
  ]);

  const counts = { GOING: 0, MAYBE: 0, NOT_GOING: 0 };
  for (const row of countRows) {
    if (counts[row.status] !== undefined) counts[row.status] = row._count;
  }

  return { items, total, page, limit, totalPages: Math.ceil(total / limit), counts };
}

async function getUserRsvp(eventId, userId) {
  return prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { user: { select: { id: true, name: true } } },
  });
}

async function exportRsvpsCsv(eventId, userId, userRole) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found', 404);

  await assertCanViewRsvps(eventId, userId, userRole);

  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const header = 'Name,Email,Status,Responded At';
  const rows = rsvps.map((r) =>
    `"${r.user.name}","${r.user.email}","${r.status}","${r.createdAt.toISOString()}"`
  );
  return [header, ...rows].join('\n');
}

module.exports = { upsert, remove, listByEvent, getUserRsvp, exportRsvpsCsv };
