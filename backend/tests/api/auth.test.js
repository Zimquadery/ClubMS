const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const { makeUser, tokenFor, expiredTokenFor, DEFAULT_PASSWORD } = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('POST /api/auth/register', () => {
  const valid = { email: 'newuser@test.local', password: 'Password123!', name: 'New User', phone: '01712345678' };

  it('returns 201 and creates the user (no password leaked)', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: valid.email, name: valid.name, phone: valid.phone, role: 'STUDENT' });
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body.id).toBeDefined();

    const row = await prisma.user.findUnique({ where: { email: valid.email } });
    expect(row).toBeTruthy();
    expect(row.passwordHash).not.toBe(valid.password);
  });

  it('returns 409 when email already registered', async () => {
    const existing = await makeUser({ email: 'taken@test.local' });
    const res = await request(app).post('/api/auth/register').send({
      email: existing.email,
      password: 'Password123!',
      name: 'Other',
      phone: '01711111111',
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.local' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 on an invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email', password: 'Password123!', name: 'X', phone: '01712345678',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'short@test.local', password: '123', name: 'X', phone: '01712345678',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 on an invalid phone', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'badphone@test.local', password: 'Password123!', name: 'X', phone: 'call me',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/phone/i);
  });

  it('accepts a phone with a leading plus and trims whitespace', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'plusphone@test.local', password: 'Password123!', name: 'X', phone: ' +8801712345678 ',
    });
    expect(res.status).toBe(201);
    expect(res.body.phone).toBe('+8801712345678');
  });

  it('strips unknown fields before insert', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'extra@test.local',
      password: 'Password123!',
      name: 'Extra',
      phone: '01712345678',
      role: 'PLATFORM_ADMIN',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('STUDENT');
  });

  it('lowercases the email (case-insensitive login)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'Mixed@TEST.local',
      password: 'Password123!',
      name: 'Mix',
      phone: '01712345678',
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('mixed@test.local');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 with a token and user (no password leaked)', async () => {
    const user = await makeUser({ email: 'login@test.local', password: DEFAULT_PASSWORD });
    const res = await request(app).post('/api/auth/login').send({
      email: user.email, password: DEFAULT_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ id: user.id, email: user.email });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 on wrong password', async () => {
    const user = await makeUser({ email: 'wrong@test.local' });
    const res = await request(app).post('/api/auth/login').send({
      email: user.email, password: 'nope-wrong',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('returns 401 on unknown user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@test.local', password: 'anything',
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@test.local' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const user = await makeUser();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, email: user.email });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an expired token', async () => {
    const user = await makeUser();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', expiredTokenFor(user));
    expect(res.status).toBe(401);
  });

  it('returns 401 when the Authorization header has no Bearer prefix', async () => {
    const user = await makeUser();
    const token = tokenFor(user).slice('Bearer '.length);
    const res = await request(app).get('/api/auth/me').set('Authorization', token);
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/profile', () => {
  it('updates name and email', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ name: 'Renamed', email: 'renamed@test.local' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Renamed', email: 'renamed@test.local' });
  });

  it('updates phone', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ phone: '+8801798765432' });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+8801798765432');

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row.phone).toBe('+8801798765432');
  });

  it('returns 400 on an invalid phone', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ phone: '12345' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is empty', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 409 when the new email is taken', async () => {
    const other = await makeUser({ email: 'other@test.local' });
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ email: other.email });
    expect(res.status).toBe(409);
  });

  it('requires authentication', async () => {
    const res = await request(app).patch('/api/auth/profile').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/password', () => {
  it('changes the password when current is correct', async () => {
    const user = await makeUser({ password: 'OldPass1!' });
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', tokenFor(user))
      .send({ currentPassword: 'OldPass1!', newPassword: 'NewPass1!' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: user.email, password: 'NewPass1!',
    });
    expect(loginRes.status).toBe(200);
  });

  it('returns 400 when currentPassword is wrong', async () => {
    const user = await makeUser({ password: 'OldPass1!' });
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', tokenFor(user))
      .send({ currentPassword: 'wrong', newPassword: 'NewPass1!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when newPassword is too short', async () => {
    const user = await makeUser({ password: 'OldPass1!' });
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', tokenFor(user))
      .send({ currentPassword: 'OldPass1!', newPassword: '123' });
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).patch('/api/auth/password').send({
      currentPassword: 'x', newPassword: 'NewPass1!',
    });
    expect(res.status).toBe(401);
  });
});
