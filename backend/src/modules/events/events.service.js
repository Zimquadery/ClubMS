const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');

async function list({ clubId, joined, timeRange = 'upcoming', userId, page = 1, limit = 20 }) {
  const now = new Date();
  const where = {};

  if (timeRange === 'upcoming') {
    where.startTime = { gte: now };
  } else if (timeRange === 'past') {
    where.startTime = { lt: now };
  }

  if (clubId) where.clubId = clubId;

  if (joined) {
    where.club = { memberships: { some: { userId, status: 'ACTIVE' } } };
  }

  const skip = (page - 1) * limit;

  const orderBy = timeRange === 'past' ? { startTime: 'desc' } : { startTime: 'asc' };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { club: { select: { id: true, name: true, logoUrl: true } } },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getById(eventId, userId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: { select: { id: true, name: true, logoUrl: true, category: true } } },
  });

  if (!event) throw new AppError('Event not found', 404);

  if (userId) {
    const membership = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId: event.clubId } },
      select: { status: true, role: true },
    });
    event.userMembership = membership;
  }

  return event;
}

async function create(clubId, { title, description, startTime, endTime, location, bannerUrl }) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new AppError('Club not found', 404);

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

  return prisma.event.create({
    data: {
      clubId,
      title,
      description: description || null,
      startTime: start,
      endTime: end,
      location: location || null,
      bannerUrl: bannerUrl || null,
    },
    include: { club: { select: { id: true, name: true, logoUrl: true } } },
  });
}

async function update(eventId, userId, { title, description, startTime, endTime, location, bannerUrl }, skipOwnershipCheck = false) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: true },
  });

  if (!event) throw new AppError('Event not found', 404);

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

  if (Object.keys(data).length === 0) throw new AppError('No fields to update', 400);

  return prisma.event.update({
    where: { id: eventId },
    data,
    include: { club: { select: { id: true, name: true, logoUrl: true } } },
  });
}

async function remove(eventId, userId, skipOwnershipCheck = false) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: true },
  });

  if (!event) throw new AppError('Event not found', 404);

  if (!skipOwnershipCheck) {
    const membership = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId: event.clubId } },
    });
    if (!membership || membership.role !== 'OFFICER' || membership.status !== 'ACTIVE') {
      throw new AppError('Not an admin of this club', 403);
    }
  }

  await prisma.event.delete({ where: { id: eventId } });
  return { success: true };
}

module.exports = { list, getById, create, update, remove };
