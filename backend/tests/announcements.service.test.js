const { AppError } = require('../src/utils/errors');

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    announcement: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    club: { findUnique: jest.fn() },
    clubMembership: { findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((fn) => fn({
      announcement: {
        count: jest.fn(),
        update: jest.fn(),
      },
    })),
  },
}));

jest.mock('../src/modules/audit/audit.service', () => ({
  log: jest.fn(),
}));

jest.mock('../src/modules/memberships/memberships.service', () => ({
  isActiveMember: jest.fn(),
}));

const svc = require('../src/modules/announcements/announcements.service');
const { prisma } = require('../src/lib/prisma');
const auditService = require('../src/modules/audit/audit.service');
const { isActiveMember } = require('../src/modules/memberships/memberships.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('create', () => {
  const clubId = 'club-1';
  const userId = 'user-1';
  const data = { title: 'Test Announcement', content: 'Hello world' };

  it('creates announcement with valid data', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    prisma.announcement.create.mockResolvedValue({ id: 'a1', ...data, clubId, authorId: userId, author: { id: userId, name: 'Test User' } });

    const result = await svc.create(clubId, userId, data);

    expect(prisma.announcement.create).toHaveBeenCalledWith({
      data: { clubId, authorId: userId, title: data.title, content: data.content },
      include: { author: { select: { id: true, name: true } } },
    });
    expect(result.title).toBe('Test Announcement');
  });

  it('throws 404 if club not found', async () => {
    prisma.club.findUnique.mockResolvedValue(null);

    await expect(svc.create(clubId, userId, data)).rejects.toThrow('Club not found');
    await expect(svc.create(clubId, userId, data)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('list', () => {
  const clubId = 'club-1';
  const userId = 'user-1';

  it('returns paginated announcements for active member', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    isActiveMember.mockResolvedValue(true);
    const items = [{ id: 'a1', title: 'Ann 1' }, { id: 'a2', title: 'Ann 2' }];
    prisma.announcement.findMany.mockResolvedValue(items);
    prisma.announcement.count.mockResolvedValue(2);

    const result = await svc.list(clubId, userId, 'STUDENT', { page: 1, limit: 20 });

    expect(result).toEqual({ items, total: 2, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      })
    );
  });

  it('throws 404 if club not found', async () => {
    prisma.club.findUnique.mockResolvedValue(null);

    await expect(svc.list(clubId, userId, 'STUDENT')).rejects.toThrow('Club not found');
    await expect(svc.list(clubId, userId, 'STUDENT')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 for non-member non-admin', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    isActiveMember.mockResolvedValue(false);

    await expect(svc.list(clubId, userId, 'STUDENT')).rejects.toThrow('You are not an active member of this club');
    await expect(svc.list(clubId, userId, 'STUDENT')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows PLATFORM_ADMIN without membership', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    prisma.announcement.findMany.mockResolvedValue([]);
    prisma.announcement.count.mockResolvedValue(0);

    const result = await svc.list(clubId, userId, 'PLATFORM_ADMIN', { page: 1, limit: 20 });

    expect(isActiveMember).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
  });
});

describe('getById', () => {
  const clubId = 'club-1';
  const announcementId = 'ann-1';
  const userId = 'user-1';

  it('returns announcement for active member', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    isActiveMember.mockResolvedValue(true);
    const announcement = { id: announcementId, clubId, title: 'Test', author: { id: userId, name: 'User' }, club: { id: clubId, name: 'Club' } };
    prisma.announcement.findUnique.mockResolvedValue(announcement);

    const result = await svc.getById(clubId, announcementId, userId, 'STUDENT');

    expect(result).toEqual(announcement);
  });

  it('throws 404 if announcement not found', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    isActiveMember.mockResolvedValue(true);
    prisma.announcement.findUnique.mockResolvedValue(null);

    await expect(svc.getById(clubId, announcementId, userId, 'STUDENT')).rejects.toThrow('Announcement not found');
    await expect(svc.getById(clubId, announcementId, userId, 'STUDENT')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 if announcement belongs to different club', async () => {
    prisma.club.findUnique.mockResolvedValue({ id: clubId });
    isActiveMember.mockResolvedValue(true);
    prisma.announcement.findUnique.mockResolvedValue({ id: announcementId, clubId: 'other-club' });

    await expect(svc.getById(clubId, announcementId, userId, 'STUDENT')).rejects.toThrow('Announcement not found');
    await expect(svc.getById(clubId, announcementId, userId, 'STUDENT')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('update', () => {
  const clubId = 'club-1';
  const announcementId = 'ann-1';
  const userId = 'user-1';

  it('updates announcement fields', async () => {
    prisma.announcement.findUnique.mockResolvedValue({ id: announcementId, clubId });
    prisma.announcement.update.mockResolvedValue({ id: announcementId, clubId, title: 'Updated', author: { id: userId, name: 'User' } });

    const result = await svc.update(clubId, announcementId, userId, { title: 'Updated' });

    expect(prisma.announcement.update).toHaveBeenCalledWith({
      where: { id: announcementId },
      data: { title: 'Updated' },
      include: { author: { select: { id: true, name: true } } },
    });
  });

  it('throws 404 if announcement not found', async () => {
    prisma.announcement.findUnique.mockResolvedValue(null);

    await expect(svc.update(clubId, announcementId, userId, { title: 'New' })).rejects.toThrow('Announcement not found');
    await expect(svc.update(clubId, announcementId, userId, { title: 'New' })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('remove', () => {
  const clubId = 'club-1';
  const announcementId = 'ann-1';
  const userId = 'user-1';

  it('deletes announcement', async () => {
    prisma.announcement.findUnique.mockResolvedValue({ id: announcementId, clubId });
    prisma.announcement.delete.mockResolvedValue({ id: announcementId });

    const result = await svc.remove(clubId, announcementId, userId);

    expect(prisma.announcement.delete).toHaveBeenCalledWith({ where: { id: announcementId } });
    expect(result.success).toBe(true);
  });

  it('throws 404 if announcement not found', async () => {
    prisma.announcement.findUnique.mockResolvedValue(null);

    await expect(svc.remove(clubId, announcementId, userId)).rejects.toThrow('Announcement not found');
    await expect(svc.remove(clubId, announcementId, userId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('togglePin', () => {
  const clubId = 'club-1';
  const announcementId = 'ann-1';
  const userId = 'user-1';

  it('pins an unpinned announcement', async () => {
    prisma.announcement.findUnique.mockResolvedValue({ id: announcementId, clubId, pinned: false });
    const txCount = jest.fn().mockResolvedValue(1);
    const txUpdate = jest.fn().mockResolvedValue({ id: announcementId, pinned: true, author: { id: userId, name: 'User' } });
    prisma.$transaction.mockImplementation((fn) => fn({ announcement: { count: txCount, update: txUpdate } }));

    const result = await svc.togglePin(clubId, announcementId, userId, '127.0.0.1');

    expect(result.pinned).toBe(true);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ANNOUNCEMENT_PIN', targetId: announcementId })
    );
  });

  it('unpins a pinned announcement', async () => {
    prisma.announcement.findUnique.mockResolvedValue({ id: announcementId, clubId, pinned: true });
    prisma.announcement.update.mockResolvedValue({ id: announcementId, pinned: false, author: { id: userId, name: 'User' } });

    const result = await svc.togglePin(clubId, announcementId, userId, '127.0.0.1');

    expect(result.pinned).toBe(false);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ANNOUNCEMENT_UNPIN', targetId: announcementId })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws 400 when pin limit exceeded', async () => {
    prisma.announcement.findUnique.mockResolvedValue({ id: announcementId, clubId, pinned: false });
    const txCount = jest.fn().mockResolvedValue(3);
    const txUpdate = jest.fn();
    prisma.$transaction.mockImplementation(async (fn) => {
      const result = await fn({ announcement: { count: txCount, update: txUpdate } });
      return result;
    });

    await expect(svc.togglePin(clubId, announcementId, userId, '127.0.0.1')).rejects.toThrow('Maximum 3 pinned announcements per club');
    await expect(svc.togglePin(clubId, announcementId, userId, '127.0.0.1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 if announcement not found', async () => {
    prisma.announcement.findUnique.mockResolvedValue(null);

    await expect(svc.togglePin(clubId, announcementId, userId, '127.0.0.1')).rejects.toThrow('Announcement not found');
    await expect(svc.togglePin(clubId, announcementId, userId, '127.0.0.1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('getRecent', () => {
  const userId = 'user-1';

  it('returns recent announcements from user clubs', async () => {
    prisma.clubMembership.findMany.mockResolvedValue([{ clubId: 'c1' }, { clubId: 'c2' }]);
    const announcements = [{ id: 'a1', title: 'Ann 1', club: { id: 'c1', name: 'Club 1' } }];
    prisma.announcement.findMany.mockResolvedValue(announcements);

    const result = await svc.getRecent(userId, 5);

    expect(result).toEqual(announcements);
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: { in: ['c1', 'c2'] } }, take: 5 })
    );
  });

  it('returns empty array when user has no clubs', async () => {
    prisma.clubMembership.findMany.mockResolvedValue([]);

    const result = await svc.getRecent(userId, 5);

    expect(result).toEqual([]);
    expect(prisma.announcement.findMany).not.toHaveBeenCalled();
  });
});
