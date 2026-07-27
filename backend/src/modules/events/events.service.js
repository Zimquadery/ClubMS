const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const eventHosts = require('../eventHosts/eventHosts.service');

const HOST_INCLUDE = {
  hosts: {
    include: { club: { select: eventHosts.HOST_CLUB_SELECT } },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
};

function validateDateRange(start, end) {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid date format for start or end time', 400);
  }

  if (end < start) {
    throw new AppError('End time must be after start time', 422);
  }
}

function attachPrimaryClub(event) {
  if (!event || !event.hosts) return event;
  const primaryHost = event.hosts.find((h) => h.isPrimary) || event.hosts[0];
  const primaryClub = primaryHost?.club || null;
  const primaryClubId = primaryHost?.clubId || null;
  return { ...event, club: primaryClub, clubId: primaryClubId, primaryClubId };
}

async function getEventForOwnerCheck(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: HOST_INCLUDE,
  });
  if (!event) throw new AppError('Event not found', 404);
  return event;
}

async function assertCanManage(eventId, userId, skipOwnershipCheck) {
  if (skipOwnershipCheck) return;
  if (!(await eventHosts.isHostOfficer(userId, eventId))) {
    throw new AppError('Not an admin of a host club for this event', 403);
  }
}

async function assertCanDelete(eventId, userId, skipOwnershipCheck) {
  if (skipOwnershipCheck) return;
  if (!(await eventHosts.isPrimaryHostOfficer(userId, eventId))) {
    throw new AppError('Only an officer of the primary host club can delete this event', 403);
  }
}

// venueId wins over venue text. Returns { venue, venueId } for create data and
// a partial for update. venueId that doesn't resolve → 400.
async function resolveVenue(venueId, venueText) {
  if (venueId) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new AppError('Venue not found', 400);
    return { venue: venue.name, venueId };
  }
  return { venue: venueText || null, venueId: null };
}

async function list({ clubId, joined, timeRange = 'upcoming', userId, venueId, page = 1, limit = 20 }) {
  const now = new Date();
  const where = {};

  if (timeRange === 'upcoming') {
    where.startTime = { gte: now };
  } else if (timeRange === 'past') {
    where.startTime = { lt: now };
  }

  if (clubId && joined) {
    where.AND = [
      { hosts: { some: { clubId } } },
      { hosts: { some: { club: { memberships: { some: { userId, status: 'ACTIVE' } } } } } },
    ];
  } else if (clubId) {
    where.hosts = { some: { clubId } };
  } else if (joined) {
    where.hosts = {
      some: { club: { memberships: { some: { userId, status: 'ACTIVE' } } } },
    };
  }

  if (venueId === 'none') {
    where.venueId = null;
    where.venue = { not: null };
  } else if (venueId) {
    where.venueId = venueId;
  }

  const skip = (page - 1) * limit;

  const orderBy = timeRange === 'past' ? { startTime: 'desc' } : { startTime: 'asc' };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: HOST_INCLUDE,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    items: items.map(attachPrimaryClub),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getById(eventId, userId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: HOST_INCLUDE,
  });

  if (!event) throw new AppError('Event not found', 404);

  if (userId) {
    const clubIds = event.hosts.map((h) => h.clubId);
    const primaryClubId = event.hosts.find((h) => h.isPrimary)?.clubId;
    const memberships = clubIds.length > 0
      ? await prisma.clubMembership.findMany({
          where: { userId, clubId: { in: clubIds }, status: 'ACTIVE' },
          select: { status: true, role: true, clubId: true },
        })
      : [];
    event.userMembership = memberships.find((m) => m.role === 'OFFICER' && m.clubId === primaryClubId)
      || memberships.find((m) => m.role === 'OFFICER')
      || memberships.find((m) => m.clubId === primaryClubId)
      || memberships[0]
      || null;
  }

  return attachPrimaryClub(event);
}

async function create(primaryClubId, { title, description, startTime, endTime, venueId, venue: venueText, bannerUrl, coHostClubIds, creatorUserId }) {
  const club = await prisma.club.findUnique({ where: { id: primaryClubId } });
  if (!club) throw new AppError('Club not found', 404);

  if (!title || !startTime || !endTime) {
    throw new AppError('Title, start time, and end time are required', 400);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  validateDateRange(start, end);

  const uniqueCoHosts = Array.from(new Set(coHostClubIds || [])).filter((id) => id !== primaryClubId);
  if (uniqueCoHosts.length > 0) {
    const valid = await prisma.club.count({ where: { id: { in: uniqueCoHosts } } });
    if (valid !== uniqueCoHosts.length) {
      throw new AppError('One or more co-host clubs not found', 400);
    }
  }

  const venueFields = await resolveVenue(venueId, venueText);

  const created = await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        title,
        description: description || null,
        startTime: start,
        endTime: end,
        bannerUrl: bannerUrl || null,
        ...venueFields,
      },
    });

    await tx.eventHost.create({
      data: { eventId: event.id, clubId: primaryClubId, isPrimary: true, addedById: creatorUserId },
    });

    if (uniqueCoHosts.length > 0) {
      await tx.eventHost.createMany({
        data: uniqueCoHosts.map((clubId) => ({
          eventId: event.id,
          clubId,
          isPrimary: false,
          addedById: creatorUserId,
        })),
      });
    }

    return tx.event.findUnique({
      where: { id: event.id },
      include: HOST_INCLUDE,
    });
  });

  return attachPrimaryClub(created);
}

async function update(eventId, userId, { title, description, startTime, endTime, venueId, venue: venueText, bannerUrl }, skipOwnershipCheck = false) {
  await getEventForOwnerCheck(eventId);
  await assertCanManage(eventId, userId, skipOwnershipCheck);

  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (bannerUrl !== undefined) data.bannerUrl = bannerUrl || null;

  if (venueId !== undefined) {
    if (venueId) {
      const venue = await prisma.venue.findUnique({ where: { id: venueId } });
      if (!venue) throw new AppError('Venue not found', 400);
      data.venue = venue.name;
      data.venueId = venueId;
    } else {
      data.venue = null;
      data.venueId = null;
    }
  } else if (venueText !== undefined) {
    data.venue = venueText || null;
    data.venueId = null;
  }

  const existing = await prisma.event.findUnique({ where: { id: eventId } });

  if (startTime !== undefined || endTime !== undefined) {
    const start = new Date(startTime ?? existing.startTime);
    const end = new Date(endTime ?? existing.endTime);

    validateDateRange(start, end);

    if (startTime !== undefined) data.startTime = start;
    if (endTime !== undefined) data.endTime = end;
  }

  if (Object.keys(data).length === 0) throw new AppError('No fields to update', 400);

  const updated = await prisma.event.update({
    where: { id: eventId },
    data,
    include: HOST_INCLUDE,
  });

  return attachPrimaryClub(updated);
}

async function remove(eventId, userId, skipOwnershipCheck = false) {
  await getEventForOwnerCheck(eventId);
  await assertCanDelete(eventId, userId, skipOwnershipCheck);

  await prisma.event.delete({ where: { id: eventId } });
  return { success: true };
}

module.exports = { list, getById, create, update, remove };
