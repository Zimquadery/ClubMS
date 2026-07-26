const request = require('supertest');
const { createApp } = require('../../src/app');
const {
  makeUser, makeClub, makeEvent, makeActiveMember, makeOfficer, makeMembership,
  tokenFor,
} = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('GET /api/stats/dashboard', () => {
  it('returns global stats for PLATFORM_ADMIN', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    await makeClub();
    await makeClub();
    await makeUser({ role: 'STUDENT' });
    await makeUser({ role: 'STUDENT' });

    const res = await request(app)
      .get('/api/stats/dashboard')
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalClubs');
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('totalEvents');
    expect(res.body).toHaveProperty('pendingMemberships');
    expect(res.body).toHaveProperty('upcomingEvents');
    expect(res.body.totalClubs).toBeGreaterThanOrEqual(2);
    expect(res.body.totalUsers).toBeGreaterThanOrEqual(3);
  });

  it('returns officer-scoped stats for CLUB_ADMIN', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const m1 = await makeUser({ role: 'STUDENT' });
    const m2 = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: m1.id, clubId: club.id });
    await makeActiveMember({ userId: m2.id, clubId: club.id });
    const pendingUser = await makeUser({ role: 'STUDENT' });
    await makeMembership({ userId: pendingUser.id, clubId: club.id, status: 'PENDING' });

    const res = await request(app)
      .get('/api/stats/dashboard')
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      myClubs: 1,
      totalMembers: 3,
      pendingRequests: 1,
    });
    expect(res.body).toHaveProperty('upcomingEvents');
  });

  it('returns student-scoped stats for STUDENT', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const c1 = await makeClub();
    const c2 = await makeClub();
    await makeActiveMember({ userId: student.id, clubId: c1.id });
    await makeActiveMember({ userId: student.id, clubId: c2.id });
    await makeEvent({ primaryClubId: c1.id });

    const res = await request(app)
      .get('/api/stats/dashboard')
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ myClubs: 2 });
    expect(res.body).toHaveProperty('upcomingEvents');
  });

  it('returns zeros for CLUB_ADMIN with no officer memberships', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const res = await request(app)
      .get('/api/stats/dashboard')
      .set('Authorization', tokenFor(admin));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      myClubs: 0, totalMembers: 0, upcomingEvents: 0, pendingRequests: 0,
    });
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/stats/dashboard');
    expect(res.status).toBe(401);
  });
});
