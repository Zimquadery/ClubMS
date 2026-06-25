const { AppError } = require('../src/utils/errors');

jest.mock('../src/lib/prisma', () => {
  const mock = jest.fn();
  return {
    prisma: {
      event: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      club: { findUnique: jest.fn(), count: jest.fn() },
      clubMembership: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
      eventHost: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), createMany: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(async (cb) => cb({
        event: {
          create: jest.fn(),
          findUnique: jest.fn(),
        },
        eventHost: {
          create: jest.fn(),
          createMany: jest.fn(),
        },
      })),
    },
  };
});

jest.mock('../src/modules/eventHosts/eventHosts.service', () => ({
  HOST_CLUB_SELECT: { id: true, name: true, logoUrl: true, category: true },
  isHostOfficer: jest.fn(),
  isPrimaryHostOfficer: jest.fn(),
  isActiveMemberOfAnyHost: jest.fn(),
  assertHostOfficer: jest.fn(),
  isPrimaryHostClub: jest.fn(),
  addCoHost: jest.fn(),
  removeCoHost: jest.fn(),
  resolveHostClubs: jest.fn(),
  getHostClubIds: jest.fn(),
  getPrimaryClubId: jest.fn(),
}));

const svc = require('../src/modules/events/events.service');
const eventHostsService = require('../src/modules/eventHosts/eventHosts.service');
const { prisma } = require('../src/lib/prisma');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('list', () => {
  it('returns paginated events with attached primary club', async () => {
    const events = [
      { id: 'e1', title: 'A', hosts: [{ clubId: 'c1', isPrimary: true, club: { id: 'c1', name: 'C1' } }] },
      { id: 'e2', title: 'B', hosts: [{ clubId: 'c2', isPrimary: true, club: { id: 'c2', name: 'C2' } }] },
    ];
    prisma.event.findMany.mockResolvedValue(events);
    prisma.event.count.mockResolvedValue(2);

    const result = await svc.list({ page: 1, limit: 20 });

    expect(result.total).toBe(2);
    expect(result.items[0].club.name).toBe('C1');
    expect(result.items[0].primaryClubId).toBe('c1');
  });

  it('filters by clubId via hosts.some', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    await svc.list({ clubId: 'club-1', page: 1, limit: 20 });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hosts: { some: { clubId: 'club-1' } } }),
      })
    );
  });

  it('filters by joined via host club memberships', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    await svc.list({ joined: true, userId: 'u1', page: 1, limit: 20 });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hosts: { some: { club: { memberships: { some: { userId: 'u1', status: 'ACTIVE' } } } } },
        }),
      })
    );
  });
});

describe('getById', () => {
  const eventId = 'event-1';

  it('throws 404 if not found', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(svc.getById(eventId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns event with primary club attached', async () => {
    const event = {
      id: eventId,
      title: 'T',
      hosts: [{ clubId: 'club-1', isPrimary: true, club: { id: 'club-1', name: 'C1' } }],
    };
    prisma.event.findUnique.mockResolvedValue(event);

    const result = await svc.getById(eventId);

    expect(result.club.name).toBe('C1');
    expect(result.primaryClubId).toBe('club-1');
  });

  it('resolves userMembership across host clubs via findMany', async () => {
    const event = {
      id: eventId,
      hosts: [
        { clubId: 'c1', isPrimary: true },
        { clubId: 'c2', isPrimary: false },
      ],
    };
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.clubMembership.findMany.mockResolvedValue([{ status: 'ACTIVE', role: 'MEMBER', clubId: 'c1' }]);

    const result = await svc.getById(eventId, 'user-1');

    expect(prisma.clubMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1', clubId: { in: ['c1', 'c2'] } }) })
    );
    expect(result.userMembership).toEqual({ status: 'ACTIVE', role: 'MEMBER', clubId: 'c1' });
  });

  it('prefers primary-club OFFICER membership over cohost OFFICER', async () => {
    const event = {
      id: eventId,
      hosts: [
        { clubId: 'c-primary', isPrimary: true },
        { clubId: 'c-cohost', isPrimary: false },
      ],
    };
    prisma.event.findUnique.mockResolvedValue(event);
    // Officer of cohost listed FIRST in storage order; officer of primary listed SECOND.
    // Deterministic priority must pick primary officer regardless of storage order.
    prisma.clubMembership.findMany.mockResolvedValue([
      { status: 'ACTIVE', role: 'OFFICER', clubId: 'c-cohost' },
      { status: 'ACTIVE', role: 'OFFICER', clubId: 'c-primary' },
    ]);

    const result = await svc.getById(eventId, 'user-1');

    expect(result.userMembership.clubId).toBe('c-primary');
    expect(result.userMembership.role).toBe('OFFICER');
  });

  it('returns cohost OFFICER (not primary MEMBER) so frontend canManage works', async () => {
    const event = {
      id: eventId,
      hosts: [
        { clubId: 'c-primary', isPrimary: true },
        { clubId: 'c-cohost', isPrimary: false },
      ],
    };
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.clubMembership.findMany.mockResolvedValue([
      { status: 'ACTIVE', role: 'MEMBER', clubId: 'c-primary' },
      { status: 'ACTIVE', role: 'OFFICER', clubId: 'c-cohost' },
    ]);

    const result = await svc.getById(eventId, 'user-1');

    // OFFICER of any host beats MEMBER of primary — frontend canManage=true.
    expect(result.userMembership.role).toBe('OFFICER');
    expect(result.userMembership.clubId).toBe('c-cohost');
  });

  it('falls back to primary MEMBER when user has no officer role anywhere', async () => {
    const event = {
      id: eventId,
      hosts: [
        { clubId: 'c-primary', isPrimary: true },
        { clubId: 'c-cohost', isPrimary: false },
      ],
    };
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.clubMembership.findMany.mockResolvedValue([
      { status: 'ACTIVE', role: 'MEMBER', clubId: 'c-cohost' },
      { status: 'ACTIVE', role: 'MEMBER', clubId: 'c-primary' },
    ]);

    const result = await svc.getById(eventId, 'user-1');

    expect(result.userMembership.clubId).toBe('c-primary');
    expect(result.userMembership.role).toBe('MEMBER');
  });

  it('returns null userMembership when user has no active membership in any host', async () => {
    const event = {
      id: eventId,
      hosts: [{ clubId: 'c1', isPrimary: true }],
    };
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.clubMembership.findMany.mockResolvedValue([]);

    const result = await svc.getById(eventId, 'user-1');

    expect(result.userMembership).toBeNull();
  });
});

describe('create', () => {
  const primaryClubId = 'club-1';
  const baseData = {
    title: 'New Event',
    startTime: '2026-06-01T10:00:00Z',
    endTime: '2026-06-01T12:00:00Z',
    description: 'A test event',
    location: 'Room 101',
    creatorUserId: 'user-1',
  };

  it('creates event + primary host row in transaction', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: primaryClubId });
    const txEventCreate = jest.fn().mockResolvedValue({ id: 'e1', title: 'New Event' });
    const txEventFindUnique = jest.fn().mockResolvedValue({
      id: 'e1',
      title: 'New Event',
      hosts: [{ clubId: primaryClubId, isPrimary: true, club: { id: primaryClubId, name: 'C1' } }],
    });
    const txHostCreate = jest.fn().mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (cb) => cb({
      event: { create: txEventCreate, findUnique: txEventFindUnique },
      eventHost: { create: txHostCreate, createMany: jest.fn() },
    }));

    const result = await svc.create(primaryClubId, baseData);

    expect(txEventCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: 'New Event' }) }));
    expect(txHostCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: { eventId: 'e1', clubId: primaryClubId, isPrimary: true, addedById: 'user-1' },
    }));
    expect(result.primaryClubId).toBe(primaryClubId);
  });

  it('throws 404 if primary club not found', async () => {
    prisma.club.findUnique.mockResolvedValue(null);

    await expect(svc.create(primaryClubId, baseData)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 if required fields missing', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: primaryClubId });

    await expect(svc.create(primaryClubId, { title: '', startTime: '', endTime: '' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 422 if end < start', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: primaryClubId });

    await expect(svc.create(primaryClubId, {
      ...baseData,
      startTime: '2026-06-01T12:00:00Z',
      endTime: '2026-06-01T10:00:00Z',
    })).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 400 if a co-host club does not exist', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: primaryClubId });
    prisma.club.count.mockResolvedValue(0);

    await expect(svc.create(primaryClubId, { ...baseData, coHostClubIds: ['nope'] }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('dedupes co-hosts and excludes the primary club', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: primaryClubId });
    prisma.club.count.mockResolvedValue(2);
    const txEventCreate = jest.fn().mockResolvedValue({ id: 'e1' });
    const txEventFindUnique = jest.fn().mockResolvedValue({ id: 'e1', hosts: [] });
    const txHostCreateMany = jest.fn().mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (cb) => cb({
      event: { create: txEventCreate, findUnique: txEventFindUnique },
      eventHost: { create: jest.fn(), createMany: txHostCreateMany },
    }));

    await svc.create(primaryClubId, { ...baseData, coHostClubIds: [primaryClubId, 'c2', 'c2', 'c3'] });

    expect(txHostCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ clubId: 'c2', isPrimary: false }),
        expect.objectContaining({ clubId: 'c3', isPrimary: false }),
      ]),
    });
    const passed = txHostCreateMany.mock.calls[0][0].data;
    expect(passed).toHaveLength(2);
    expect(passed.find((x) => x.clubId === primaryClubId)).toBeUndefined();
  });
});

describe('update', () => {
  const eventId = 'event-1';
  const userId = 'admin-1';

  it('updates event fields when caller is host officer', async () => {
    prisma.event.findUnique
      .mockResolvedValueOnce({ id: eventId, hosts: [] }) // getEventForOwnerCheck
      .mockResolvedValueOnce({ id: eventId, startTime: new Date('2026-06-01T10:00:00Z'), endTime: new Date('2026-06-01T12:00:00Z') }); // re-fetch for date comparison
    eventHostsService.isHostOfficer.mockResolvedValue(true);
    prisma.event.update.mockResolvedValue({ id: eventId, title: 'New', hosts: [{ clubId: 'c1', isPrimary: true, club: { id: 'c1', name: 'C1' } }] });

    const result = await svc.update(eventId, userId, { title: 'New' });

    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({ data: { title: 'New' } }));
    expect(result.title).toBe('New');
  });

  it('throws 403 when caller is not a host officer', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: eventId, hosts: [] });
    eventHostsService.isHostOfficer.mockResolvedValue(false);

    await expect(svc.update(eventId, userId, { title: 'New' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 if event not found', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(svc.update(eventId, userId, { title: 'New' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 if no fields to update', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: eventId, hosts: [] });
    eventHostsService.isHostOfficer.mockResolvedValue(true);

    await expect(svc.update(eventId, userId, {})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('skips ownership check when flag is set', async () => {
    prisma.event.findUnique
      .mockResolvedValueOnce({ id: eventId, hosts: [] })
      .mockResolvedValueOnce({ id: eventId, startTime: new Date('2026-06-01T10:00:00Z'), endTime: new Date('2026-06-01T12:00:00Z') });
    prisma.event.update.mockResolvedValue({ id: eventId, title: 'Updated', hosts: [] });

    await svc.update(eventId, userId, { title: 'Updated' }, true);

    expect(eventHostsService.isHostOfficer).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  const eventId = 'event-1';
  const userId = 'admin-1';

  it('deletes event when caller is primary officer', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: eventId, hosts: [] });
    eventHostsService.isPrimaryHostOfficer.mockResolvedValue(true);
    prisma.event.delete.mockResolvedValue({});

    const result = await svc.remove(eventId, userId);

    expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: eventId } });
    expect(result.success).toBe(true);
  });

  it('throws 403 when caller is only a co-host officer (not primary)', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: eventId, hosts: [] });
    eventHostsService.isPrimaryHostOfficer.mockResolvedValue(false);

    await expect(svc.remove(eventId, userId)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 if event not found', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(svc.remove(eventId, userId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('skips ownership check when flag is set', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: eventId, hosts: [] });
    prisma.event.delete.mockResolvedValue({});

    await svc.remove(eventId, userId, true);

    expect(eventHostsService.isPrimaryHostOfficer).not.toHaveBeenCalled();
  });
});
