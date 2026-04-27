jest.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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

const request = require('supertest');
const { createApp } = require('./helpers/createApp');
const { prisma } = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('returns 201 with valid data', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'STUDENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@test.com');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('returns 409 if email exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'test@test.com' });

    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('returns 400 with missing fields', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 with invalid email', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123', name: 'Test' });

    expect(res.status).toBe(400);
  });

  it('returns 400 with short password', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: '123', name: 'Test' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test User',
    role: 'STUDENT',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns 200 with valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('mock-token');
    expect(res.body.user).toBeDefined();
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 with wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('returns 401 with non-existent user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'noone@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('returns 400 with missing fields', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
  });
});
