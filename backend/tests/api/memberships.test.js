const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const { makeUser, makeClub, makeMembership, makeOfficer, makeActiveMember, tokenFor, waitFor } = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('POST /api/clubs/:clubId/join', () => {
  it('creates a PENDING membership for a student', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: student.id, clubId: club.id, status: 'PENDING', role: 'MEMBER' });

    const dbCount = await prisma.clubMembership.count({ where: { userId: student.id, clubId: club.id } });
    expect(dbCount).toBe(1);
  });

  it('returns 409 when already ACTIVE', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: student.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(409);
  });

  it('returns 409 when already PENDING', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeMembership({ userId: student.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(409);
  });

  it('updates REJECTED to PENDING (no duplicate row) on re-apply', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeMembership({ userId: student.id, clubId: club.id, status: 'REJECTED' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');

    const count = await prisma.clubMembership.count({ where: { userId: student.id, clubId: club.id } });
    expect(count).toBe(1);
  });

  it('returns 401 without auth', async () => {
    const club = await makeClub();
    const res = await request(app).post(`/api/clubs/${club.id}/join`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when the club does not exist', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .post('/api/clubs/00000000-0000-0000-0000-000000000000/join')
      .set('Authorization', tokenFor(student));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/clubs/:clubId/join — club rules agreement', () => {
  it('returns 400 and creates no row when the club has rules and no agreement', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub({ rules: '1. Attend meetings.' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('You must agree to the club rules to join this club');

    const count = await prisma.clubMembership.count({ where: { userId: student.id, clubId: club.id } });
    expect(count).toBe(0);
  });

  it('returns 400 for an explicit agreedToRules: false', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub({ rules: '1. Attend meetings.' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student))
      .send({ agreedToRules: false });

    expect(res.status).toBe(400);
  });

  it('creates a PENDING membership when agreedToRules is true', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub({ rules: '1. Attend meetings.' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student))
      .send({ agreedToRules: true });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: student.id, clubId: club.id, status: 'PENDING' });
  });

  it('whitespace-only rules do not gate the join', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub({ rules: '   ' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(201);
  });

  it('gates REJECTED re-apply: stays REJECTED without agreement', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub({ rules: '1. Attend meetings.' });
    await makeMembership({ userId: student.id, clubId: club.id, status: 'REJECTED' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(400);
    const row = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: student.id, clubId: club.id } },
      select: { status: true },
    });
    expect(row.status).toBe('REJECTED');
  });

  it('lets REJECTED re-apply through with agreement', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub({ rules: '1. Attend meetings.' });
    await makeMembership({ userId: student.id, clubId: club.id, status: 'REJECTED' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student))
      .send({ agreedToRules: true });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
  });

  it('409 membership checks take precedence over the rules gate', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub({ rules: '1. Attend meetings.' });
    await makeActiveMember({ userId: student.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(409);
  });
});

describe('POST /api/clubs/:clubId/join — department join rules', () => {
  it('ALLOW mode: lets a user of a listed department join', async () => {
    const student = await makeUser({ role: 'STUDENT', department: 'CSE' });
    const club = await makeClub({ joinRuleMode: 'ALLOW', joinDepartments: ['CSE', 'ECE'] });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
  });

  it('ALLOW mode: matches department case-insensitively', async () => {
    const student = await makeUser({ role: 'STUDENT', department: 'cse' });
    const club = await makeClub({ joinRuleMode: 'ALLOW', joinDepartments: ['CSE'] });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(201);
  });

  it('ALLOW mode: rejects a user of an unlisted department with 403', async () => {
    const student = await makeUser({ role: 'STUDENT', department: 'EEE' });
    const club = await makeClub({ joinRuleMode: 'ALLOW', joinDepartments: ['CSE', 'ECE'] });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
    const count = await prisma.clubMembership.count({ where: { userId: student.id, clubId: club.id } });
    expect(count).toBe(0);
  });

  it('ALLOW mode: rejects a user without a department with 403', async () => {
    const student = await makeUser({ role: 'STUDENT', department: null });
    const club = await makeClub({ joinRuleMode: 'ALLOW', joinDepartments: ['CSE'] });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
  });

  it('ALLOW mode: blocks REJECTED re-apply and keeps the row REJECTED', async () => {
    const student = await makeUser({ role: 'STUDENT', department: 'EEE' });
    const club = await makeClub({ joinRuleMode: 'ALLOW', joinDepartments: ['CSE'] });
    await makeMembership({ userId: student.id, clubId: club.id, status: 'REJECTED' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
    const row = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: student.id, clubId: club.id } },
      select: { status: true },
    });
    expect(row.status).toBe('REJECTED');
  });

  it('existing ACTIVE membership wins over a blocking rule (409, not 403)', async () => {
    const student = await makeUser({ role: 'STUDENT', department: 'EEE' });
    const club = await makeClub({ joinRuleMode: 'ALLOW', joinDepartments: ['CSE'] });
    await makeActiveMember({ userId: student.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(409);
  });

  it('BLOCK mode: rejects a user of a listed department with 403', async () => {
    const student = await makeUser({ role: 'STUDENT', department: 'Agri' });
    const club = await makeClub({ joinRuleMode: 'BLOCK', joinDepartments: ['Agri'] });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Agri');
  });

  it('BLOCK mode: lets a user of an unlisted department join', async () => {
    const student = await makeUser({ role: 'STUDENT', department: 'EEE' });
    const club = await makeClub({ joinRuleMode: 'BLOCK', joinDepartments: ['Agri'] });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(201);
  });

  it('BLOCK mode: lets a user without a department join', async () => {
    const student = await makeUser({ role: 'STUDENT', department: null });
    const club = await makeClub({ joinRuleMode: 'BLOCK', joinDepartments: ['Agri'] });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/join`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(201);
  });
});

describe('POST /api/clubs/:clubId/leave', () => {
  it('deletes an ACTIVE MEMBER membership', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: student.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/leave`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(200);
    const count = await prisma.clubMembership.count({ where: { userId: student.id, clubId: club.id } });
    expect(count).toBe(0);
  });

  it('officer with global CLUB_ADMIN role is blocked by STUDENT middleware (403)', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/leave`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(403);
  });

  it('service-layer guard fires (400) when a STUDENT holds an OFFICER membership', async () => {
    const officer = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await prisma.clubMembership.create({
      data: { userId: officer.id, clubId: club.id, status: 'ACTIVE', role: 'OFFICER' },
    });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/leave`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(400);
  });
});

describe('GET /api/clubs/:clubId/members', () => {
  it('returns paginated members for a CLUB_ADMIN of that club', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const m1 = await makeUser({ role: 'STUDENT' });
    const m2 = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: m1.id, clubId: club.id });
    await makeActiveMember({ userId: m2.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(3);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 50);
    expect(res.body).toHaveProperty('totalPages');
  });

  it('returns 403 for a CLUB_ADMIN of a DIFFERENT club (per-resource check)', async () => {
    const adminA = await makeUser({ role: 'CLUB_ADMIN' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: adminA.id, clubId: clubA.id });

    const res = await request(app)
      .get(`/api/clubs/${clubB.id}/members`)
      .set('Authorization', tokenFor(adminA));

    expect(res.status).toBe(403);
  });

  it('returns 200 for PLATFORM_ADMIN regardless of membership', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const club = await makeClub();

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(200);
  });

  it('returns 200 for FACULTY (inherits CLUB_ADMIN)', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const club = await makeClub();

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .set('Authorization', tokenFor(faculty));

    expect(res.status).toBe(200);
  });

  it('returns 403 for STUDENT', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
  });

  it('searches members by name case-insensitively', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const alice = await makeUser({ role: 'STUDENT', name: 'Alice Johnson' });
    const bob = await makeUser({ role: 'STUDENT', name: 'Bob Smith' });
    await makeActiveMember({ userId: alice.id, clubId: club.id });
    await makeActiveMember({ userId: bob.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .query({ search: 'ALICE' })
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].user.name).toBe('Alice Johnson');
  });

  it('searches members by partial email match', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const alice = await makeUser({ role: 'STUDENT', name: 'Alice Johnson' });
    const bob = await makeUser({ role: 'STUDENT', name: 'Bob Smith' });
    await makeActiveMember({ userId: alice.id, clubId: club.id });
    await makeActiveMember({ userId: bob.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .query({ search: alice.email.slice(-14) })
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].user.id).toBe(alice.id);
  });

  it('combines search with status=ALUMNI', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const alumni = await makeUser({ role: 'STUDENT', name: 'Zoe Smith' });
    const active = await makeUser({ role: 'STUDENT', name: 'Zoe Active' });
    await makeActiveMember({ userId: active.id, clubId: club.id });
    await makeMembership({ userId: alumni.id, clubId: club.id, status: 'ALUMNI' });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .query({ status: 'ALUMNI', search: 'zoe' })
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].user.name).toBe('Zoe Smith');
    expect(res.body.items[0].status).toBe('ALUMNI');
  });

  it('returns empty items and total 0 when search matches nothing', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const member = await makeUser({ role: 'STUDENT', name: 'Alice Johnson' });
    await makeActiveMember({ userId: member.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .query({ search: 'nobody-here' })
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.items).toHaveLength(0);
  });

  it('rejects a search longer than 25 characters', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members`)
      .query({ search: 'a'.repeat(26) })
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/clubs/:clubId/members/:userId/approve', () => {
  it('moves PENDING to ACTIVE', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const pending = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: pending.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${pending.id}/approve`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('emits an audit log', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const pending = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: pending.id, clubId: club.id, status: 'PENDING' });

    await request(app)
      .patch(`/api/clubs/${club.id}/members/${pending.id}/approve`)
      .set('Authorization', tokenFor(admin));

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'MEMBERSHIP_APPROVE', targetId: pending.id } })
    );
    expect(audit).toBeTruthy();
    expect(audit.actorId).toBe(admin.id);
  });
});

describe('PATCH /api/clubs/:clubId/members/:userId/reject', () => {
  it('moves PENDING to REJECTED', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const pending = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: pending.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${pending.id}/reject`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');
  });

  it('emits a MEMBERSHIP_REJECT audit log', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const pending = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: pending.id, clubId: club.id, status: 'PENDING' });

    await request(app)
      .patch(`/api/clubs/${club.id}/members/${pending.id}/reject`)
      .set('Authorization', tokenFor(admin));

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'MEMBERSHIP_REJECT', targetId: pending.id } })
    );
    expect(audit.actorId).toBe(admin.id);
  });

  it('returns 404 when the membership does not exist', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const stranger = await makeUser({ role: 'STUDENT' });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${stranger.id}/reject`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(404);
  });

  it('returns 403 for a CLUB_ADMIN of a DIFFERENT club', async () => {
    const adminA = await makeUser({ role: 'CLUB_ADMIN' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: adminA.id, clubId: clubA.id });
    const pending = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: pending.id, clubId: clubB.id, status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/clubs/${clubB.id}/members/${pending.id}/reject`)
      .set('Authorization', tokenFor(adminA));

    expect(res.status).toBe(403);
  });

  it('returns 403 for STUDENT', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const pending = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: pending.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${pending.id}/reject`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/clubs/:clubId/members/:userId/promote', () => {
  it('promotes MEMBER to OFFICER and flips User.role to CLUB_ADMIN', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const member = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: member.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${member.id}/promote`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('OFFICER');

    const updatedUser = await prisma.user.findUnique({ where: { id: member.id }, select: { role: true } });
    expect(updatedUser.role).toBe('CLUB_ADMIN');
  });

  it('returns 400 when already an OFFICER', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const other = await makeUser({ role: 'CLUB_ADMIN' });
    await makeOfficer({ userId: other.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${other.id}/promote`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(400);
  });

  it('does NOT downgrade a FACULTY target (User.role stays FACULTY)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const faculty = await makeUser({ role: 'FACULTY' });
    await makeActiveMember({ userId: faculty.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${faculty.id}/promote`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('OFFICER');

    const facultyUser = await prisma.user.findUnique({ where: { id: faculty.id }, select: { role: true } });
    expect(facultyUser.role).toBe('FACULTY');
  });

  it('does NOT change User.role when target is already CLUB_ADMIN', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const already = await makeUser({ role: 'CLUB_ADMIN' });
    await prisma.clubMembership.create({
      data: { userId: already.id, clubId: club.id, status: 'ACTIVE', role: 'MEMBER' },
    });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${already.id}/promote`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('OFFICER');

    const user = await prisma.user.findUnique({ where: { id: already.id }, select: { role: true } });
    expect(user.role).toBe('CLUB_ADMIN');
  });
});

describe('PATCH /api/clubs/:clubId/members/:userId/demote', () => {
  it('demotes OFFICER to MEMBER and reverts User.role to STUDENT (no other officer memberships)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const other = await makeUser({ role: 'CLUB_ADMIN' });
    await makeOfficer({ userId: other.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${other.id}/demote`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('MEMBER');

    const otherUser = await prisma.user.findUnique({ where: { id: other.id }, select: { role: true } });
    expect(otherUser.role).toBe('STUDENT');
  });

  it('does NOT downgrade a FACULTY officer\'s User.role on demote (stays FACULTY)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const faculty = await makeUser({ role: 'FACULTY' });
    await prisma.clubMembership.create({
      data: { userId: faculty.id, clubId: club.id, status: 'ACTIVE', role: 'OFFICER' },
    });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${faculty.id}/demote`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('MEMBER');

    const facultyUser = await prisma.user.findUnique({ where: { id: faculty.id }, select: { role: true } });
    expect(facultyUser.role).toBe('FACULTY');
  });

  it('returns 400 when demoting the last officer', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${admin.id}/demote`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(400);
  });

  it('self-action guard: admin cannot demote themselves', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const other = await makeUser({ role: 'CLUB_ADMIN' });
    await makeOfficer({ userId: other.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${admin.id}/demote`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/clubs/:clubId/members/:userId/alumni', () => {
  it('moves ACTIVE MEMBER to ALUMNI', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const member = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: member.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${member.id}/alumni`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ALUMNI');
  });

  it('emits a MEMBERSHIP_SET_ALUMNI audit log', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const member = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: member.id, clubId: club.id });

    await request(app)
      .patch(`/api/clubs/${club.id}/members/${member.id}/alumni`)
      .set('Authorization', tokenFor(admin));

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'MEMBERSHIP_SET_ALUMNI', targetId: member.id } })
    );
    expect(audit.actorId).toBe(admin.id);
  });

  it('returns 400 on the last officer (transfer first)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${admin.id}/alumni`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(400);
  });

  it('returns 400 when the membership is not ACTIVE', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const pending = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: pending.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${pending.id}/alumni`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(400);
  });

  it('returns 404 when the membership does not exist', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const stranger = await makeUser({ role: 'STUDENT' });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${stranger.id}/alumni`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(404);
  });

  it('reverts a STUDENT officer\'s User.role to STUDENT when they have no other officer memberships', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const officer2 = await makeUser({ role: 'CLUB_ADMIN' });
    await makeOfficer({ userId: officer2.id, clubId: club.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${officer2.id}/alumni`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);

    const after = await prisma.user.findUnique({ where: { id: officer2.id }, select: { role: true } });
    expect(after.role).toBe('STUDENT');
  });

  it('does NOT downgrade a FACULTY officer\'s User.role on alumni (stays FACULTY)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const faculty = await makeUser({ role: 'FACULTY' });
    await prisma.clubMembership.create({
      data: { userId: faculty.id, clubId: club.id, status: 'ACTIVE', role: 'OFFICER' },
    });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/members/${faculty.id}/alumni`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);

    const after = await prisma.user.findUnique({ where: { id: faculty.id }, select: { role: true } });
    expect(after.role).toBe('FACULTY');
  });

  it('returns 403 for a CLUB_ADMIN of a DIFFERENT club', async () => {
    const adminA = await makeUser({ role: 'CLUB_ADMIN' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: adminA.id, clubId: clubA.id });
    const member = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: member.id, clubId: clubB.id });

    const res = await request(app)
      .patch(`/api/clubs/${clubB.id}/members/${member.id}/alumni`)
      .set('Authorization', tokenFor(adminA));

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/clubs/:clubId/members/:userId', () => {
  it('removes a MEMBER', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const member = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: member.id, clubId: club.id });

    const res = await request(app)
      .delete(`/api/clubs/${club.id}/members/${member.id}`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    const count = await prisma.clubMembership.count({ where: { userId: member.id, clubId: club.id } });
    expect(count).toBe(0);
  });

  it('returns 400 when removing an OFFICER', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const other = await makeUser({ role: 'CLUB_ADMIN' });
    await makeOfficer({ userId: other.id, clubId: club.id });

    const res = await request(app)
      .delete(`/api/clubs/${club.id}/members/${other.id}`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(400);
  });

  it('self-action guard: admin cannot remove themselves', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });

    const res = await request(app)
      .delete(`/api/clubs/${club.id}/members/${admin.id}`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(400);
  });
});

describe('POST /api/clubs/:clubId/members/bulk-approve', () => {
  it('approves all PENDING members in one call', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const p1 = await makeUser({ role: 'STUDENT' });
    const p2 = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: p1.id, clubId: club.id, status: 'PENDING' });
    await makeMembership({ userId: p2.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/members/bulk-approve`)
      .set('Authorization', tokenFor(admin))
      .send({ userIds: [p1.id, p2.id] });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);

    const activeCount = await prisma.clubMembership.count({
      where: { clubId: club.id, status: 'ACTIVE' },
    });
    expect(activeCount).toBe(3);
  });

  it('returns 400 when userIds is empty', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/members/bulk-approve`)
      .set('Authorization', tokenFor(admin))
      .send({ userIds: [] });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/clubs/:clubId/members/bulk-reject', () => {
  it('rejects all PENDING members in one call', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const p1 = await makeUser({ role: 'STUDENT' });
    const p2 = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: p1.id, clubId: club.id, status: 'PENDING' });
    await makeMembership({ userId: p2.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/members/bulk-reject`)
      .set('Authorization', tokenFor(admin))
      .send({ userIds: [p1.id, p2.id] });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);

    const rejectedCount = await prisma.clubMembership.count({
      where: { clubId: club.id, status: 'REJECTED' },
    });
    expect(rejectedCount).toBe(2);
  });

  it('emits a MEMBERSHIP_BULK_REJECT audit log', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const p = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: p.id, clubId: club.id, status: 'PENDING' });

    await request(app)
      .post(`/api/clubs/${club.id}/members/bulk-reject`)
      .set('Authorization', tokenFor(admin))
      .send({ userIds: [p.id] });

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'MEMBERSHIP_BULK_REJECT', actorId: admin.id } })
    );
    expect(audit).toBeTruthy();
  });

  it('returns 400 when userIds is empty', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/members/bulk-reject`)
      .set('Authorization', tokenFor(admin))
      .send({ userIds: [] });

    expect(res.status).toBe(400);
  });

  it('returns 403 for a CLUB_ADMIN of a DIFFERENT club', async () => {
    const adminA = await makeUser({ role: 'CLUB_ADMIN' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: adminA.id, clubId: clubA.id });
    const p = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: p.id, clubId: clubB.id, status: 'PENDING' });

    const res = await request(app)
      .post(`/api/clubs/${clubB.id}/members/bulk-reject`)
      .set('Authorization', tokenFor(adminA))
      .send({ userIds: [p.id] });

    expect(res.status).toBe(403);
  });

  it('returns 403 for STUDENT', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();

    const res = await request(app)
      .post(`/api/clubs/${club.id}/members/bulk-reject`)
      .set('Authorization', tokenFor(student))
      .send({ userIds: [] });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/clubs/:clubId/transfer', () => {
  it('transfers admin to another active member (target upgraded, caller reverted)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const other = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: other.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/transfer`)
      .set('Authorization', tokenFor(admin))
      .send({ newAdminId: other.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const otherOfficer = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: other.id, clubId: club.id } },
    });
    expect(otherOfficer.role).toBe('OFFICER');

    const callerMembership = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: admin.id, clubId: club.id } },
    });
    expect(callerMembership.role).toBe('MEMBER');

    const targetUser = await prisma.user.findUnique({ where: { id: other.id }, select: { role: true } });
    expect(targetUser.role).toBe('CLUB_ADMIN');

    const callerUser = await prisma.user.findUnique({ where: { id: admin.id }, select: { role: true } });
    expect(callerUser.role).toBe('STUDENT');
  });

  it('PLATFORM_ADMIN caller bypasses ownership check', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const club = await makeClub();
    const existingOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    await makeOfficer({ userId: existingOfficer.id, clubId: club.id });
    const target = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: target.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/transfer`)
      .set('Authorization', tokenFor(pa))
      .send({ newAdminId: target.id });

    expect(res.status).toBe(200);
    const targetMembership = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: target.id, clubId: club.id } },
    });
    expect(targetMembership.role).toBe('OFFICER');
  });

  it('FACULTY caller\'s User.role stays FACULTY after transfer', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const club = await makeClub();
    const target = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: target.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/transfer`)
      .set('Authorization', tokenFor(faculty))
      .send({ newAdminId: target.id });

    expect(res.status).toBe(200);

    const callerUser = await prisma.user.findUnique({ where: { id: faculty.id }, select: { role: true } });
    expect(callerUser.role).toBe('FACULTY');
  });

  it('returns 400 when transferring to self', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/transfer`)
      .set('Authorization', tokenFor(admin))
      .send({ newAdminId: admin.id });

    expect(res.status).toBe(400);
  });

  it('returns 400 when target is not an active member', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const other = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: other.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/transfer`)
      .set('Authorization', tokenFor(admin))
      .send({ newAdminId: other.id });

    expect(res.status).toBe(400);
  });

  it('does not downgrade an incoming FACULTY target', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const faculty = await makeUser({ role: 'FACULTY' });
    await makeActiveMember({ userId: faculty.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/transfer`)
      .set('Authorization', tokenFor(admin))
      .send({ newAdminId: faculty.id });

    expect(res.status).toBe(200);

    const facultyUser = await prisma.user.findUnique({ where: { id: faculty.id }, select: { role: true } });
    expect(facultyUser.role).toBe('FACULTY');
  });
});

describe('GET /api/clubs/:clubId/members/export', () => {
  it('returns a CSV attachment', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const member = await makeUser({ phone: '01712345678', studentId: '21234567', department: 'CSE', homeDistrict: 'Dhaka' });
    await makeActiveMember({ userId: member.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/members/export`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment;\s*filename="members-/);
    expect(typeof res.text).toBe('string');
    expect(res.text).toContain('Name,Email,Phone,Student ID,Department,Home District,Role,Status,Joined Date');
    expect(res.text).toContain('01712345678');
    expect(res.text).toContain('21234567');
    expect(res.text).toContain('"CSE","Dhaka"');
  });
});

describe('PATCH /api/memberships/users/:userId/role', () => {
  it('allows PLATFORM_ADMIN to change a STUDENT to FACULTY', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const target = await makeUser({ role: 'STUDENT' });

    const res = await request(app)
      .patch(`/api/memberships/users/${target.id}/role`)
      .set('Authorization', tokenFor(pa))
      .send({ role: 'FACULTY' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('FACULTY');
  });

  it('returns 403 for CLUB_ADMIN (platform-only)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const target = await makeUser({ role: 'STUDENT' });

    const res = await request(app)
      .patch(`/api/memberships/users/${target.id}/role`)
      .set('Authorization', tokenFor(admin))
      .send({ role: 'FACULTY' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/memberships/my-clubs and /my-admin-clubs', () => {
  it('my-clubs returns clubs the user belongs to', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const c1 = await makeClub();
    const c2 = await makeClub();
    const otherClub = await makeClub();
    await makeActiveMember({ userId: user.id, clubId: c1.id });
    await makeActiveMember({ userId: user.id, clubId: c2.id });

    const res = await request(app)
      .get('/api/memberships/my-clubs')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    const ids = res.body.map((c) => c.id);
    expect(ids).toContain(c1.id);
    expect(ids).toContain(c2.id);
    expect(ids).not.toContain(otherClub.id);
  });

  it('my-admin-clubs returns clubs where the user is OFFICER', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const c1 = await makeClub();
    const c2 = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: c1.id });
    await makeActiveMember({ userId: admin.id, clubId: c2.id });

    const res = await request(app)
      .get('/api/memberships/my-admin-clubs')
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    const ids = res.body.map((c) => c.id);
    expect(ids).toContain(c1.id);
    expect(ids).not.toContain(c2.id);
  });

  it('my-admin-clubs returns 403 for STUDENT', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/memberships/my-admin-clubs')
      .set('Authorization', tokenFor(student));
    expect(res.status).toBe(403);
  });
});

describe('route collision guard', () => {
  it('POST /api/clubs/:clubId/members/bulk-approve is multi-segment-safe (not swallowed by /:id)', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });
    const club = await makeClub();
    const res = await request(app)
      .post(`/api/clubs/${club.id}/members/bulk-approve`)
      .set('Authorization', tokenFor(admin))
      .send({ userIds: [] });
    expect([400, 200]).toContain(res.status);
    expect(res.status).not.toBe(404);
  });

  it('GET /api/memberships/my-clubs is safe on the admin router', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/memberships/my-clubs')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(200);
  });
});
