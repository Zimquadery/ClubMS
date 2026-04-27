const { AppError } = require('../src/utils/errors');

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
}));

const svc = require('../src/modules/auth/auth.service');
const { prisma } = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('register', () => {
  it('creates user and returns user data', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'STUDENT',
    });

    const result = await svc.register('test@test.com', 'password123', 'Test User');

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'test@test.com', passwordHash: 'hashed-password', name: 'Test User', role: 'STUDENT' },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    expect(result.email).toBe('test@test.com');
  });

  it('throws 409 if email exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'test@test.com' });

    await expect(svc.register('test@test.com', 'password123', 'Test')).rejects.toThrow('Email already registered');
    await expect(svc.register('test@test.com', 'password123', 'Test')).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('login', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test User',
    role: 'STUDENT',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns token for valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const result = await svc.login('test@test.com', 'password123');

    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(result.token).toBe('mock-token');
    expect(result.user.email).toBe('test@test.com');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws 401 for wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(svc.login('test@test.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    await expect(svc.login('test@test.com', 'wrongpassword')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 for non-existent user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(svc.login('noone@test.com', 'password123')).rejects.toThrow('Invalid credentials');
    await expect(svc.login('noone@test.com', 'password123')).rejects.toMatchObject({ statusCode: 401 });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});
