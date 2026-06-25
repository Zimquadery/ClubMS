jest.mock('../src/lib/prisma', () => ({
  prisma: {
    eventHost: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    club: { findUnique: jest.fn() },
    clubMembership: { findFirst: jest.fn() },
  },
}));

const svc = require('../src/modules/eventHosts/eventHosts.service');
const { prisma } = require('../src/lib/prisma');

beforeEach(() => jest.clearAllMocks());

describe('resolveHostClubs / getHostClubIds', () => {
  it('returns rows from eventHost', async () => {
    prisma.eventHost.findMany.mockResolvedValue([
      { clubId: 'c1', isPrimary: true },
      { clubId: 'c2', isPrimary: false },
    ]);

    const hosts = await svc.resolveHostClubs('e1');
    expect(hosts).toHaveLength(2);

    const ids = await svc.getHostClubIds('e1');
    expect(ids).toEqual(['c1', 'c2']);
  });
});

describe('getPrimaryClubId', () => {
  it('returns the primary club id', async () => {
    prisma.eventHost.findFirst.mockResolvedValue({ clubId: 'c1' });
    expect(await svc.getPrimaryClubId('e1')).toBe('c1');
  });

  it('returns null when no primary exists', async () => {
    prisma.eventHost.findFirst.mockResolvedValue(null);
    expect(await svc.getPrimaryClubId('e1')).toBeNull();
  });
});

describe('isHostOfficer', () => {
  it('returns true when user is OFFICER+ACTIVE of any host club', async () => {
    prisma.eventHost.findMany.mockResolvedValue([{ clubId: 'c1', isPrimary: true }, { clubId: 'c2', isPrimary: false }]);
    prisma.clubMembership.findFirst.mockResolvedValue({ id: 'm1' });

    expect(await svc.isHostOfficer('u1', 'e1')).toBe(true);
    expect(prisma.clubMembership.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'u1', clubId: { in: ['c1', 'c2'] }, role: 'OFFICER', status: 'ACTIVE' }),
    }));
  });

  it('returns false when user has no qualifying membership', async () => {
    prisma.eventHost.findMany.mockResolvedValue([{ clubId: 'c1', isPrimary: true }]);
    prisma.clubMembership.findFirst.mockResolvedValue(null);
    expect(await svc.isHostOfficer('u1', 'e1')).toBe(false);
  });

  it('returns false when event has no hosts', async () => {
    prisma.eventHost.findMany.mockResolvedValue([]);
    expect(await svc.isHostOfficer('u1', 'e1')).toBe(false);
    expect(prisma.clubMembership.findFirst).not.toHaveBeenCalled();
  });
});

describe('isPrimaryHostOfficer', () => {
  it('checks only the primary club', async () => {
    prisma.eventHost.findFirst.mockResolvedValue({ clubId: 'c-primary' });
    prisma.clubMembership.findFirst.mockResolvedValue({ id: 'm1' });

    expect(await svc.isPrimaryHostOfficer('u1', 'e1')).toBe(true);
    expect(prisma.clubMembership.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ clubId: 'c-primary' }),
    }));
  });
});

describe('isActiveMemberOfAnyHost', () => {
  it('returns true for active member of any host (any role)', async () => {
    prisma.eventHost.findMany.mockResolvedValue([{ clubId: 'c1', isPrimary: true }]);
    prisma.clubMembership.findFirst.mockResolvedValue({ id: 'm1' });

    expect(await svc.isActiveMemberOfAnyHost('u1', 'e1')).toBe(true);
    const call = prisma.clubMembership.findFirst.mock.calls[0][0];
    expect(call.where.role).toBeUndefined();
    expect(call.where.status).toBe('ACTIVE');
  });
});

describe('assertHostOfficer', () => {
  it('throws 403 when not an officer', async () => {
    prisma.eventHost.findMany.mockResolvedValue([{ clubId: 'c1', isPrimary: true }]);
    prisma.clubMembership.findFirst.mockResolvedValue(null);

    await expect(svc.assertHostOfficer('u1', 'e1')).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('addCoHost', () => {
  it('creates a non-primary host row', async () => {
    prisma.eventHost.findUnique.mockResolvedValue(null);
    prisma.club.findUnique.mockResolvedValue({ id: 'c2' });
    prisma.eventHost.create.mockResolvedValue({ id: 'h1', clubId: 'c2' });

    const result = await svc.addCoHost('e1', 'c2', 'u1');

    expect(prisma.eventHost.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { eventId: 'e1', clubId: 'c2', isPrimary: false, addedById: 'u1' },
    }));
    expect(result.clubId).toBe('c2');
  });

  it('throws 409 if club already a host', async () => {
    prisma.eventHost.findUnique.mockResolvedValue({ isPrimary: false });

    await expect(svc.addCoHost('e1', 'c2', 'u1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 404 if club not found', async () => {
    prisma.eventHost.findUnique.mockResolvedValue(null);
    prisma.club.findUnique.mockResolvedValue(null);

    await expect(svc.addCoHost('e1', 'c2', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('removeCoHost', () => {
  it('deletes a non-primary host', async () => {
    prisma.eventHost.findUnique.mockResolvedValue({ id: 'h1', isPrimary: false });
    prisma.eventHost.delete.mockResolvedValue({});

    const result = await svc.removeCoHost('e1', 'c2');
    expect(result.success).toBe(true);
    expect(prisma.eventHost.delete).toHaveBeenCalledWith({ where: { id: 'h1' } });
  });

  it('throws 400 when attempting to remove primary', async () => {
    prisma.eventHost.findUnique.mockResolvedValue({ id: 'h1', isPrimary: true });

    await expect(svc.removeCoHost('e1', 'c1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 if club is not a host', async () => {
    prisma.eventHost.findUnique.mockResolvedValue(null);

    await expect(svc.removeCoHost('e1', 'cX')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('isPrimaryHostClub', () => {
  it('returns true when club is primary of any event', async () => {
    prisma.eventHost.findFirst.mockResolvedValue({ id: 'h1' });
    expect(await svc.isPrimaryHostClub('c1')).toBe(true);
  });

  it('returns false when not primary of any event', async () => {
    prisma.eventHost.findFirst.mockResolvedValue(null);
    expect(await svc.isPrimaryHostClub('c1')).toBe(false);
  });
});
