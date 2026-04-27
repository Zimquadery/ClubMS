const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');

async function list({ clubId, joined, userId }) {
  const where = {
    startTime: { gte: new Date() },
    ...(clubId && { clubId }),
    ...(joined && {
      club: {
        memberships: {
          some: {
            userId,
            status: 'ACTIVE',
          },
        },
      },
    }),
  };

  const events = await prisma.event.findMany({
    where,
    include: {
      club: { select: { id: true, name: true, logoUrl: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  return events;
}

async function create(clubId, { title, description, startTime, endTime, location, bannerUrl }) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    throw new AppError('Club not found', 404);
  }

  if (!title || !startTime || !endTime) {
    throw new AppError('Title, start time, and end time are required', 400);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid date format for start or end time', 400);
  }

  if (end < start) {
    throw new AppError('End time must be after start time', 422);
  }

  const event = await prisma.event.create({
    data: {
      clubId,
      title,
      description: description || null,
      startTime: start,
      endTime: end,
      location: location || null,
      bannerUrl: bannerUrl || null,
    },
    include: {
      club: { select: { id: true, name: true, logoUrl: true } },
    },
  });

  return event;
}

async function update(eventId, userId, { title, description, startTime, endTime, location, bannerUrl }, skipOwnershipCheck = false) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: true },
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (!skipOwnershipCheck) {
    const membership = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId: event.clubId } },
    });

    if (!membership || membership.role !== 'OFFICER' || membership.status !== 'ACTIVE') {
      throw new AppError('Not an admin of this club', 403);
    }
  }

  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (location !== undefined) data.location = location || null;
  if (bannerUrl !== undefined) data.bannerUrl = bannerUrl || null;

  if (startTime !== undefined || endTime !== undefined) {
    const start = new Date(startTime ?? event.startTime);
    const end = new Date(endTime ?? event.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid date format for start or end time', 400);
    }

    if (end < start) {
      throw new AppError('End time must be after start time', 422);
    }

    if (startTime !== undefined) data.startTime = start;
    if (endTime !== undefined) data.endTime = end;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('No fields to update', 400);
  }

  return prisma.event.update({
    where: { id: eventId },
    data,
    include: {
      club: { select: { id: true, name: true, logoUrl: true } },
    },
  });
}

async function remove(eventId, userId, skipOwnershipCheck = false) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: true },
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (!skipOwnershipCheck) {
    const membership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: { userId, clubId: event.clubId },
      },
    });

    if (!membership || membership.role !== 'OFFICER' || membership.status !== 'ACTIVE') {
      throw new AppError('Not an admin of this club', 403);
    }
  }

  await prisma.event.delete({ where: { id: eventId } });

  return { success: true };
}

module.exports = { list, create, update, remove };
