const { AppError } = require('../src/utils/errors');

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    club: { findUnique: jest.fn() },
    clubMembership: { findUnique: jest.fn() },
  },
}));

const svc = require('../src/modules/events/events.service');
const { prisma } = require('../src/lib/prisma');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('list', () => {
  it('returns paginated events', async () => {
    const events = [{ id: 'e1', title: 'Event 1' }, { id: 'e2', title: 'Event 2' }];
    prisma.event.findMany.mockResolvedValue(events);
    prisma.event.count.mockResolvedValue(2);

    const result = await svc.list({ page: 1, limit: 20 });

    expect(result).toEqual({ items: events, total: 2, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.event.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.event.count).toHaveBeenCalledTimes(1);
  });

  it('filters by clubId', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    await svc.list({ clubId: 'club-1', page: 1, limit: 20 });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clubId: 'club-1' }),
      })
    );
  });

  it('filters by timeRange past', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    await svc.list({ timeRange: 'past', page: 1, limit: 20 });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { startTime: 'desc' },
      })
    );
  });
});

describe('getById', () => {
  const eventId = 'event-1';

  it('returns event with club info', async () => {
    const event = { id: eventId, title: 'Test Event', club: { id: 'club-1', name: 'Test Club' } };
    prisma.event.findUnique.mockResolvedValue(event);

    const result = await svc.getById(eventId);

    expect(result).toEqual(event);
    expect(prisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: eventId },
      include: { club: { select: { id: true, name: true, logoUrl: true, category: true } } },
    });
  });

  it('returns event with user membership when userId provided', async () => {
    const event = { id: eventId, title: 'Test Event', clubId: 'club-1', club: { id: 'club-1', name: 'Test Club' } };
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.clubMembership.findUnique.mockResolvedValue({ status: 'ACTIVE', role: 'MEMBER' });

    const result = await svc.getById(eventId, 'user-1');

    expect(result.userMembership).toEqual({ status: 'ACTIVE', role: 'MEMBER' });
  });

  it('throws 404 if not found', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(svc.getById(eventId)).rejects.toThrow('Event not found');
    await expect(svc.getById(eventId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('create', () => {
  const clubId = 'club-1';
  const baseData = {
    title: 'New Event',
    startTime: '2026-06-01T10:00:00Z',
    endTime: '2026-06-01T12:00:00Z',
    description: 'A test event',
    location: 'Room 101',
  };

  it('creates event with valid data', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    prisma.event.create.mockResolvedValue({ id: 'e1', ...baseData, clubId });

    const result = await svc.create(clubId, baseData);

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clubId,
        title: 'New Event',
        description: 'A test event',
        location: 'Room 101',
      }),
      include: { club: { select: { id: true, name: true, logoUrl: true } } },
    });
    expect(result.clubId).toBe(clubId);
  });

  it('throws 404 if club not found', async () => {
    prisma.club.findUnique.mockResolvedValue(null);

    await expect(svc.create(clubId, baseData)).rejects.toThrow('Club not found');
    await expect(svc.create(clubId, baseData)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 if required fields missing', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });

    await expect(svc.create(clubId, { title: '', startTime: '', endTime: '' })).rejects.toThrow('Title, start time, and end time are required');
    await expect(svc.create(clubId, { title: '', startTime: '', endTime: '' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 422 if end < start', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });

    await expect(svc.create(clubId, {
      ...baseData,
      startTime: '2026-06-01T12:00:00Z',
      endTime: '2026-06-01T10:00:00Z',
    })).rejects.toThrow('End time must be after start time');
    await expect(svc.create(clubId, {
      ...baseData,
      startTime: '2026-06-01T12:00:00Z',
      endTime: '2026-06-01T10:00:00Z',
    })).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 400 if invalid dates (NaN)', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });

    await expect(svc.create(clubId, {
      title: 'Bad Dates',
      startTime: 'not-a-date',
      endTime: 'also-bad',
    })).rejects.toThrow('Invalid date format');
    await expect(svc.create(clubId, {
      title: 'Bad Dates',
      startTime: 'not-a-date',
      endTime: 'also-bad',
    })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('update', () => {
  const eventId = 'event-1';
  const userId = 'admin-1';
  const existingEvent = {
    id: eventId,
    clubId: 'club-1',
    title: 'Old Title',
    startTime: new Date('2026-06-01T10:00:00Z'),
    endTime: new Date('2026-06-01T12:00:00Z'),
    club: { id: 'club-1' },
  };

  it('updates event fields', async () => {
    prisma.event.findUnique.mockResolvedValue(existingEvent);
    prisma.clubMembership.findUnique.mockResolvedValue({ role: 'OFFICER', status: 'ACTIVE' });
    prisma.event.update.mockResolvedValue({ ...existingEvent, title: 'New Title' });

    const result = await svc.update(eventId, userId, { title: 'New Title' });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: eventId },
      data: { title: 'New Title' },
      include: { club: { select: { id: true, name: true, logoUrl: true } } },
    });
    expect(result.title).toBe('New Title');
  });

  it('throws 404 if event not found', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(svc.update(eventId, userId, { title: 'New' })).rejects.toThrow('Event not found');
    await expect(svc.update(eventId, userId, { title: 'New' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 if no fields to update', async () => {
    prisma.event.findUnique.mockResolvedValue(existingEvent);
    prisma.clubMembership.findUnique.mockResolvedValue({ role: 'OFFICER', status: 'ACTIVE' });

    await expect(svc.update(eventId, userId, {})).rejects.toThrow('No fields to update');
    await expect(svc.update(eventId, userId, {})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('skips ownership check when flag is set', async () => {
    prisma.event.findUnique.mockResolvedValue(existingEvent);
    prisma.event.update.mockResolvedValue({ ...existingEvent, title: 'Updated' });

    await svc.update(eventId, userId, { title: 'Updated' }, true);

    expect(prisma.clubMembership.findUnique).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  const eventId = 'event-1';
  const userId = 'admin-1';
  const existingEvent = {
    id: eventId,
    clubId: 'club-1',
    club: { id: 'club-1' },
  };

  it('deletes event', async () => {
    prisma.event.findUnique.mockResolvedValue(existingEvent);
    prisma.clubMembership.findUnique.mockResolvedValue({ role: 'OFFICER', status: 'ACTIVE' });
    prisma.event.delete.mockResolvedValue(existingEvent);

    const result = await svc.remove(eventId, userId);

    expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: eventId } });
    expect(result.success).toBe(true);
  });

  it('throws 404 if event not found', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(svc.remove(eventId, userId)).rejects.toThrow('Event not found');
    await expect(svc.remove(eventId, userId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('skips ownership check when flag is set', async () => {
    prisma.event.findUnique.mockResolvedValue(existingEvent);
    prisma.event.delete.mockResolvedValue(existingEvent);

    await svc.remove(eventId, userId, true);

    expect(prisma.clubMembership.findUnique).not.toHaveBeenCalled();
  });
});
