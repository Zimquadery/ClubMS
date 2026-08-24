const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const { makeUser, tokenFor, expiredTokenFor, DEFAULT_PASSWORD } = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

const JPEG_BYTES = Buffer.from([0xFF, 0xD8, 0xFF, 0xFF, 0x00, 0xD9]);

describe('POST /api/auth/register', () => {
  const valid = { email: 'newuser@test.local', password: 'Password123!', name: 'New User', phone: '01712345678', studentId: '21199999' };

  function multipartRegister(fields, { file = JPEG_BYTES, filename = 'id.jpg' } = {}) {
    let req = request(app).post('/api/auth/register');
    for (const [key, value] of Object.entries(fields)) {
      req = req.field(key, value);
    }
    if (file !== null) {
      req = req.attach('idCard', file, { filename, contentType: 'image/jpeg' });
    }
    return req;
  }

  it('returns 201 and creates the user (no password leaked)', async () => {
    const res = await multipartRegister(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: valid.email, name: valid.name, phone: valid.phone, studentId: valid.studentId, role: 'STUDENT' });
    expect(res.body.idCardUrl).toMatch(/^\/uploads\//);
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body.id).toBeDefined();

    const row = await prisma.user.findUnique({ where: { email: valid.email } });
    expect(row).toBeTruthy();
    expect(row.passwordHash).not.toBe(valid.password);
    expect(row.studentId).toBe(valid.studentId);
  });

  it('returns 409 when email already registered', async () => {
    const existing = await makeUser({ email: 'taken@test.local' });
    const res = await multipartRegister({
      email: existing.email,
      password: 'Password123!',
      name: 'Other',
      phone: '01711111111',
      studentId: '21198765',
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('returns 409 when student ID already registered', async () => {
    await makeUser({ studentId: '21191111' });
    const res = await multipartRegister({ ...valid, email: 'dupstudent@test.local', studentId: '21191111' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/student id/i);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await multipartRegister({ email: 'x@test.local' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 on an invalid email', async () => {
    const res = await multipartRegister({ ...valid, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await multipartRegister({ ...valid, email: 'short@test.local', password: '123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on an invalid phone', async () => {
    const res = await multipartRegister({ ...valid, email: 'badphone@test.local', phone: 'call me' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/phone/i);
  });

  it('returns 400 on an invalid student ID', async () => {
    const res = await multipartRegister({ ...valid, email: 'badstudent@test.local', studentId: '21 19 1' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/student id/i);
  });

  it('accepts a phone with a leading plus and trims whitespace', async () => {
    const res = await multipartRegister({ ...valid, email: 'plusphone@test.local', phone: ' +8801712345678 ' });
    expect(res.status).toBe(201);
    expect(res.body.phone).toBe('+8801712345678');
  });

  it('strips unknown fields before insert', async () => {
    const res = await multipartRegister({ ...valid, email: 'extra@test.local', role: 'PLATFORM_ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('STUDENT');
  });

  it('lowercases the email (case-insensitive login)', async () => {
    const res = await multipartRegister({ ...valid, email: 'Mixed@TEST.local' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('mixed@test.local');
  });

  it('returns 400 when the ID card file is missing', async () => {
    const res = await multipartRegister(valid, { file: null });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/id card/i);
  });

  it('returns 400 for a JSON body without a file (old clients)', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/id card/i);
  });

  it('returns 400 when the ID card content is not an image and creates nothing', async () => {
    const res = await multipartRegister(valid, {
      file: Buffer.from('<html><script>alert(1)</script></html>'),
      filename: 'evil.jpg',
    });
    expect(res.status).toBe(400);

    const row = await prisma.user.findUnique({ where: { email: valid.email } });
    expect(row).toBeNull();
  });

  it('returns 400 when the ID card exceeds the 5MB limit', async () => {
    const res = await multipartRegister(valid, { file: Buffer.alloc(6 * 1024 * 1024) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/5MB/i);
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

  it('updates student ID', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ studentId: '21198888' });
    expect(res.status).toBe(200);
    expect(res.body.studentId).toBe('21198888');

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row.studentId).toBe('21198888');
  });

  it('returns 400 on an invalid student ID', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ studentId: 'ABC-123' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when the new student ID is taken', async () => {
    const other = await makeUser({ studentId: '21197777' });
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ studentId: other.studentId });
    expect(res.status).toBe(409);
  });

  it('replaces the ID card with an uploaded image path', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ idCardUrl: '/uploads/replacement-id.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.idCardUrl).toBe('/uploads/replacement-id.jpg');
  });

  it('returns 400 when idCardUrl is not an upload path', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ idCardUrl: 'https://evil.example.com/card.jpg' });
    expect(res.status).toBe(400);
  });

  it('sets the department', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ department: 'CSE' });
    expect(res.status).toBe(200);
    expect(res.body.department).toBe('CSE');

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row.department).toBe('CSE');
  });

  it('clears the department with null', async () => {
    const user = await makeUser({ department: 'EEE' });
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ department: null });
    expect(res.status).toBe(200);
    expect(res.body.department).toBeNull();

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row.department).toBeNull();
  });

  it('returns 400 on an empty or oversized department', async () => {
    const user = await makeUser();
    const empty = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ department: '   ' });
    expect(empty.status).toBe(400);

    const oversize = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ department: 'x'.repeat(101) });
    expect(oversize.status).toBe(400);
  });

  it('sets the home district', async () => {
    const user = await makeUser();
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ homeDistrict: 'Dhaka' });
    expect(res.status).toBe(200);
    expect(res.body.homeDistrict).toBe('Dhaka');

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row.homeDistrict).toBe('Dhaka');
  });

  it('clears the home district with null', async () => {
    const user = await makeUser({ homeDistrict: 'Cumilla' });
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ homeDistrict: null });
    expect(res.status).toBe(200);
    expect(res.body.homeDistrict).toBeNull();

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row.homeDistrict).toBeNull();
  });

  it('returns 400 on an empty or oversized home district', async () => {
    const user = await makeUser();
    const empty = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ homeDistrict: '   ' });
    expect(empty.status).toBe(400);

    const oversize = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', tokenFor(user))
      .send({ homeDistrict: 'x'.repeat(101) });
    expect(oversize.status).toBe(400);
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
