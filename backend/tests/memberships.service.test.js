const { AppError } = require('../src/utils/errors');

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    club: { findUnique: jest.fn() },
    clubMembership: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ role: 'CLUB_ADMIN' }) },
    $transaction: jest.fn((fn) => fn({
      clubMembership: {
        update: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      user: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ role: 'CLUB_ADMIN' }) },
    })),
  },
}));

const svc = require('../src/modules/memberships/memberships.service');
const { prisma } = require('../src/lib/prisma');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requestJoin', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('creates a new membership when no existing record', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    prisma.clubMembership.findUnique.mockResolvedValue(null);
    prisma.clubMembership.create.mockResolvedValue({ userId, clubId, status: 'PENDING', role: 'MEMBER' });

    const result = await svc.requestJoin(clubId, userId);

    expect(prisma.clubMembership.create).toHaveBeenCalledWith({
      data: { userId, clubId, status: 'PENDING', role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(result.status).toBe('PENDING');
  });

  it('throws 409 if already ACTIVE', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    prisma.clubMembership.findUnique.mockResolvedValue({ status: 'ACTIVE' });

    await expect(svc.requestJoin(clubId, userId)).rejects.toThrow('You are already a member of this club');
    await expect(svc.requestJoin(clubId, userId)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 409 if already PENDING', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    prisma.clubMembership.findUnique.mockResolvedValue({ status: 'PENDING' });

    await expect(svc.requestJoin(clubId, userId)).rejects.toThrow('You already have a pending request for this club');
    await expect(svc.requestJoin(clubId, userId)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('updates REJECTED to PENDING on re-apply', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    prisma.clubMembership.findUnique.mockResolvedValue({ status: 'REJECTED' });
    prisma.clubMembership.update.mockResolvedValue({ userId, clubId, status: 'PENDING' });

    const result = await svc.requestJoin(clubId, userId);

    expect(prisma.clubMembership.update).toHaveBeenCalledWith({
      where: { userId_clubId: { userId, clubId } },
      data: { status: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(result.status).toBe('PENDING');
  });

  it('throws 404 if club not found', async () => {
    prisma.club.findUnique.mockResolvedValue(null);

    await expect(svc.requestJoin(clubId, userId)).rejects.toThrow('Club not found');
    await expect(svc.requestJoin(clubId, userId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 409 if ALUMNI', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    prisma.clubMembership.findUnique.mockResolvedValue({ status: 'ALUMNI' });

    await expect(svc.requestJoin(clubId, userId)).rejects.toThrow('You are an alumni of this club');
    await expect(svc.requestJoin(clubId, userId)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('approve', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('updates PENDING to ACTIVE', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'PENDING' });
    prisma.clubMembership.update.mockResolvedValue({ userId, clubId, status: 'ACTIVE' });

    const result = await svc.approve(clubId, userId);

    expect(prisma.clubMembership.update).toHaveBeenCalledWith({
      where: { userId_clubId: { userId, clubId } },
      data: { status: 'ACTIVE' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(result.status).toBe('ACTIVE');
  });
});

describe('reject', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('updates PENDING to REJECTED', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'PENDING' });
    prisma.clubMembership.update.mockResolvedValue({ userId, clubId, status: 'REJECTED' });

    const result = await svc.reject(clubId, userId);

    expect(prisma.clubMembership.update).toHaveBeenCalledWith({
      where: { userId_clubId: { userId, clubId } },
      data: { status: 'REJECTED' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(result.status).toBe('REJECTED');
  });
});

describe('setAlumni', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('updates ACTIVE to ALUMNI', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE' });
    prisma.clubMembership.update.mockResolvedValue({ userId, clubId, status: 'ALUMNI' });

    const result = await svc.setAlumni(clubId, userId);

    expect(prisma.clubMembership.update).toHaveBeenCalledWith({
      where: { userId_clubId: { userId, clubId } },
      data: { status: 'ALUMNI' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(result.status).toBe('ALUMNI');
  });
});

describe('leaveClub', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('active member leaves (deletes membership)', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'MEMBER' });
    prisma.clubMembership.delete.mockResolvedValue({});

    const result = await svc.leaveClub(clubId, userId);

    expect(prisma.clubMembership.delete).toHaveBeenCalledWith({
      where: { userId_clubId: { userId, clubId } },
    });
    expect(result.success).toBe(true);
  });

  it('officer cannot leave (throws 400)', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'OFFICER' });

    await expect(svc.leaveClub(clubId, userId)).rejects.toThrow('Officers cannot leave');
    await expect(svc.leaveClub(clubId, userId)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 if membership not found', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue(null);

    await expect(svc.leaveClub(clubId, userId)).rejects.toThrow('Membership not found');
    await expect(svc.leaveClub(clubId, userId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('removeMember', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('removes member (deletes membership)', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'MEMBER' });
    prisma.clubMembership.delete.mockResolvedValue({});

    const result = await svc.removeMember(clubId, userId);

    expect(prisma.clubMembership.delete).toHaveBeenCalledWith({
      where: { userId_clubId: { userId, clubId } },
    });
    expect(result.success).toBe(true);
  });

  it('cannot remove an officer (throws 400)', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'OFFICER' });

    await expect(svc.removeMember(clubId, userId)).rejects.toThrow('Cannot remove an officer');
    await expect(svc.removeMember(clubId, userId)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 if membership not found', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue(null);

    await expect(svc.removeMember(clubId, userId)).rejects.toThrow('Membership not found');
    await expect(svc.removeMember(clubId, userId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('transferAdmin', () => {
  const clubId = 'club-1';
  const currentAdminId = 'admin-1';
  const newAdminId = 'user-2';

  it('transfers successfully', async () => {
    prisma.clubMembership.findUnique
      .mockResolvedValueOnce({ userId: currentAdminId, clubId, role: 'OFFICER', status: 'ACTIVE' })
      .mockResolvedValueOnce({ userId: newAdminId, clubId, role: 'MEMBER', status: 'ACTIVE' });

    const txMock = {
      clubMembership: {
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue({ role: 'CLUB_ADMIN' }) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(txMock));

    const result = await svc.transferAdmin(clubId, currentAdminId, newAdminId);

    expect(result.success).toBe(true);
    expect(txMock.clubMembership.update).toHaveBeenCalledTimes(2);
    expect(txMock.user.update).toHaveBeenCalledWith({ where: { id: newAdminId }, data: { role: 'CLUB_ADMIN' } });
    expect(txMock.user.update).toHaveBeenCalledWith({ where: { id: currentAdminId }, data: { role: 'STUDENT' } });
  });

  it('throws if transferring to self', async () => {
    await expect(svc.transferAdmin(clubId, currentAdminId, currentAdminId)).rejects.toThrow('Cannot transfer admin to yourself');
    await expect(svc.transferAdmin(clubId, currentAdminId, currentAdminId)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws if caller is not an active officer', async () => {
    prisma.clubMembership.findUnique.mockResolvedValueOnce({ userId: currentAdminId, clubId, role: 'MEMBER', status: 'ACTIVE' });

    await expect(svc.transferAdmin(clubId, currentAdminId, newAdminId)).rejects.toThrow('You are not an admin of this club');
    await expect(svc.transferAdmin(clubId, currentAdminId, newAdminId)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws if target is not an active member', async () => {
    prisma.clubMembership.findUnique
      .mockResolvedValueOnce({ userId: currentAdminId, clubId, role: 'OFFICER', status: 'ACTIVE' })
      .mockResolvedValueOnce({ userId: newAdminId, clubId, role: 'MEMBER', status: 'PENDING' })
      .mockResolvedValueOnce({ userId: currentAdminId, clubId, role: 'OFFICER', status: 'ACTIVE' })
      .mockResolvedValueOnce({ userId: newAdminId, clubId, role: 'MEMBER', status: 'PENDING' });

    await expect(svc.transferAdmin(clubId, currentAdminId, newAdminId)).rejects.toThrow('Target user is not an active member');
    await expect(svc.transferAdmin(clubId, currentAdminId, newAdminId)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('promoteMember', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('promotes MEMBER to OFFICER and updates user role', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'MEMBER' });

    const txMock = {
      clubMembership: {
        update: jest.fn().mockResolvedValue({ userId, clubId, role: 'OFFICER', user: { id: userId, name: 'Test', email: 'test@test.com' } }),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(txMock));

    const result = await svc.promoteMember(clubId, userId);

    expect(txMock.clubMembership.update).toHaveBeenCalledWith({
      where: { userId_clubId: { userId, clubId } },
      data: { role: 'OFFICER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(txMock.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { role: 'CLUB_ADMIN' } });
    expect(result.role).toBe('OFFICER');
  });

  it('throws if membership not found', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue(null);

    await expect(svc.promoteMember(clubId, userId)).rejects.toThrow('Membership not found');
    await expect(svc.promoteMember(clubId, userId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws if not ACTIVE', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'PENDING', role: 'MEMBER' });

    await expect(svc.promoteMember(clubId, userId)).rejects.toThrow('Only active members can be promoted');
    await expect(svc.promoteMember(clubId, userId)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws if already OFFICER', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'OFFICER' });

    await expect(svc.promoteMember(clubId, userId)).rejects.toThrow('Member is already an officer');
    await expect(svc.promoteMember(clubId, userId)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('demoteMember', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('demotes OFFICER to MEMBER and updates user role if no other officer memberships', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'OFFICER' });

    const txMock = {
      clubMembership: {
        update: jest.fn().mockResolvedValue({ userId, clubId, role: 'MEMBER', user: { id: userId, name: 'Test', email: 'test@test.com' } }),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue({ role: 'CLUB_ADMIN' }) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(txMock));

    const result = await svc.demoteMember(clubId, userId);

    expect(txMock.clubMembership.update).toHaveBeenCalledWith({
      where: { userId_clubId: { userId, clubId } },
      data: { role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(txMock.clubMembership.count).toHaveBeenCalledWith({
      where: { userId, clubId: { not: clubId }, role: 'OFFICER', status: 'ACTIVE' },
    });
    expect(txMock.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { role: 'STUDENT' } });
    expect(result.role).toBe('MEMBER');
  });

  it('demotes OFFICER to MEMBER reverting FACULTY role', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'OFFICER' });

    const txMock = {
      clubMembership: {
        update: jest.fn().mockResolvedValue({ userId, clubId, role: 'MEMBER', user: { id: userId, name: 'Test', email: 'test@test.com' } }),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue({ role: 'FACULTY' }) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(txMock));

    const result = await svc.demoteMember(clubId, userId);

    expect(txMock.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { role: 'FACULTY' } });
    expect(result.role).toBe('MEMBER');
  });

  it('demotes OFFICER to MEMBER without updating user role if other officer memberships exist', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'OFFICER' });

    const txMock = {
      clubMembership: {
        update: jest.fn().mockResolvedValue({ userId, clubId, role: 'MEMBER', user: { id: userId, name: 'Test', email: 'test@test.com' } }),
        count: jest.fn().mockResolvedValue(1),
      },
      user: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue({ role: 'CLUB_ADMIN' }) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(txMock));

    const result = await svc.demoteMember(clubId, userId);

    expect(txMock.user.update).not.toHaveBeenCalled();
    expect(result.role).toBe('MEMBER');
  });

  it('throws if membership not found', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue(null);

    await expect(svc.demoteMember(clubId, userId)).rejects.toThrow('Membership not found');
    await expect(svc.demoteMember(clubId, userId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws if not OFFICER', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({ userId, clubId, status: 'ACTIVE', role: 'MEMBER' });

    await expect(svc.demoteMember(clubId, userId)).rejects.toThrow('Member is not an officer');
    await expect(svc.demoteMember(clubId, userId)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('bulkApprove', () => {
  const clubId = 'club-1';

  it('updates all PENDING to ACTIVE', async () => {
    const txMock = {
      clubMembership: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      user: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn) => fn(txMock));

    const result = await svc.bulkApprove(clubId, ['u1', 'u2', 'u3']);

    expect(txMock.clubMembership.updateMany).toHaveBeenCalledWith({
      where: { clubId, userId: { in: ['u1', 'u2', 'u3'] }, status: 'PENDING' },
      data: { status: 'ACTIVE' },
    });
    expect(result.count).toBe(3);
  });

  it('throws if userIds is empty', async () => {
    await expect(svc.bulkApprove(clubId, [])).rejects.toThrow('userIds must be a non-empty array');
    await expect(svc.bulkApprove(clubId, [])).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws if userIds is not an array', async () => {
    await expect(svc.bulkApprove(clubId, null)).rejects.toThrow('userIds must be a non-empty array');
    await expect(svc.bulkApprove(clubId, null)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('bulkReject', () => {
  const clubId = 'club-1';

  it('updates all PENDING to REJECTED', async () => {
    const txMock = {
      clubMembership: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      user: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn) => fn(txMock));

    const result = await svc.bulkReject(clubId, ['u1', 'u2']);

    expect(txMock.clubMembership.updateMany).toHaveBeenCalledWith({
      where: { clubId, userId: { in: ['u1', 'u2'] }, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    expect(result.count).toBe(2);
  });

  it('throws if userIds is empty', async () => {
    await expect(svc.bulkReject(clubId, [])).rejects.toThrow('userIds must be a non-empty array');
    await expect(svc.bulkReject(clubId, [])).rejects.toMatchObject({ statusCode: 400 });
  });
});
