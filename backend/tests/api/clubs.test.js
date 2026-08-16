const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const {
  makeUser, makeClub, makeEvent, makeActiveMember, makeMembership,
  tokenFor, waitFor,
} = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('route collision guard: GET /api/clubs/categories', () => {
  it('is NOT swallowed by GET /api/clubs/:id', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/clubs/categories')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain('Academic');
    expect(res.body).toContain('Sports');
  });
});

describe('GET /api/clubs', () => {
  it('returns paginated list', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    await makeClub({ name: 'Alpha' });
    await makeClub({ name: 'Beta' });

    const res = await request(app)
      .get('/api/clubs')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(res.body).toHaveProperty('totalPages');
  });

  it('rejects limit > 100 with 400 (Zod max, not clamp)', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/clubs?limit=999')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(400);
  });

  it('accepts limit=100 (boundary)', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/clubs?limit=100')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });

  it('server-side search matches by name substring (case-insensitive)', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    await makeClub({ name: 'Chess Club Unique' });
    await makeClub({ name: 'Other' });

    const res = await request(app)
      .get('/api/clubs?search=chess%20club')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe('Chess Club Unique');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/clubs');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/clubs/:id', () => {
  it('returns the club with hosts-derived events', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const club = await makeClub({ name: 'Detail Club' });
    await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}`)
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(club.id);
    expect(res.body.name).toBe('Detail Club');
  });

  it('returns 404 when the club does not exist', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/clubs/00000000-0000-0000-0000-000000000000')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(404);
  });

  it('filters embedded members with membersSearch', async () => {
    const member = await makeUser({ role: 'STUDENT', name: 'Alice Johnson' });
    const other = await makeUser({ role: 'STUDENT', name: 'Bob Smith' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });
    await makeActiveMember({ userId: other.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}`)
      .query({ membersSearch: 'ALICE' })
      .set('Authorization', tokenFor(member));

    expect(res.status).toBe(200);
    expect(res.body.memberships).toHaveLength(1);
    expect(res.body.memberships[0].user.name).toBe('Alice Johnson');
    expect(res.body.totalMembers).toBe(1);
  });

  it('returns alumni when membersStatus=ALUMNI, excluding active members', async () => {
    const viewer = await makeUser({ role: 'STUDENT' });
    const alumni = await makeUser({ role: 'STUDENT', name: 'Zoe Alumni' });
    const active = await makeUser({ role: 'STUDENT', name: 'Zoe Active' });
    const club = await makeClub();
    await makeActiveMember({ userId: viewer.id, clubId: club.id });
    await makeMembership({ userId: alumni.id, clubId: club.id, status: 'ALUMNI' });
    await makeActiveMember({ userId: active.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}`)
      .query({ membersStatus: 'ALUMNI' })
      .set('Authorization', tokenFor(viewer));

    expect(res.status).toBe(200);
    expect(res.body.memberships).toHaveLength(1);
    expect(res.body.memberships[0].user.name).toBe('Zoe Alumni');
    expect(res.body.totalMembers).toBe(1);
  });

  it('rejects membersStatus outside ACTIVE/ALUMNI', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();

    const res = await request(app)
      .get(`/api/clubs/${club.id}`)
      .query({ membersStatus: 'PENDING' })
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(400);
  });

  it('rejects a membersSearch longer than 25 characters', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();

    const res = await request(app)
      .get(`/api/clubs/${club.id}`)
      .query({ membersSearch: 'a'.repeat(26) })
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(400);
  });
});

describe('POST /api/clubs', () => {
  it('returns 201 and creates the club (PLATFORM_ADMIN)', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });

    const res = await request(app)
      .post('/api/clubs')
      .set('Authorization', tokenFor(pa))
      .send({ name: 'New Club', description: 'desc', category: 'Sports' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'New Club', category: 'Sports' });
    expect(res.body.id).toBeDefined();

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'CLUB_CREATE', targetId: res.body.id } })
    );
    expect(audit.actorId).toBe(pa.id);
  });

  it('returns 403 for CLUB_ADMIN (platform-only)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const res = await request(app)
      .post('/api/clubs')
      .set('Authorization', tokenFor(admin))
      .send({ name: 'X', category: 'Sports' });
    expect(res.status).toBe(403);
  });

  it('returns 400 on invalid category', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const res = await request(app)
      .post('/api/clubs')
      .set('Authorization', tokenFor(pa))
      .send({ name: 'X', category: 'NotARealCategory' });
    expect(res.status).toBe(400);
  });

  it('accepts an uploaded-image logoUrl path', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const res = await request(app)
      .post('/api/clubs')
      .set('Authorization', tokenFor(pa))
      .send({
        name: 'Logo Club', category: 'Academic',
        logoUrl: '/uploads/abc123.png',
      });
    expect(res.status).toBe(201);
    expect(res.body.logoUrl).toBe('/uploads/abc123.png');
  });

  it('rejects a javascript: logoUrl', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const res = await request(app)
      .post('/api/clubs')
      .set('Authorization', tokenFor(pa))
      .send({
        name: 'X', category: 'Academic',
        logoUrl: 'javascript:alert(1)',
      });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/clubs/:id', () => {
  it('updates the club (PLATFORM_ADMIN)', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const club = await makeClub();

    const res = await request(app)
      .patch(`/api/clubs/${club.id}`)
      .set('Authorization', tokenFor(pa))
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed');
  });

  it('returns 403 for non-platform', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    const res = await request(app)
      .patch(`/api/clubs/${club.id}`)
      .set('Authorization', tokenFor(admin))
      .send({ name: 'X' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/clubs/:id', () => {
  it('deletes a club with no events', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const club = await makeClub();

    const res = await request(app)
      .delete(`/api/clubs/${club.id}`)
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const row = await prisma.club.findUnique({ where: { id: club.id } });
    expect(row).toBeNull();
  });

  it('returns 409 when the club is the primary host of any event', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const club = await makeClub();
    await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .delete(`/api/clubs/${club.id}`)
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(409);
  });

  it('allows deletion when the club is only a CO-HOST (cascades EventHost, event survives)', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const primary = await makeClub();
    const cohost = await makeClub();
    const event = await makeEvent({
      primaryClubId: primary.id,
      coHostClubIds: [cohost.id],
    });

    const res = await request(app)
      .delete(`/api/clubs/${cohost.id}`)
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(200);
    const surviving = await prisma.event.findUnique({ where: { id: event.id } });
    expect(surviving).toBeTruthy();
    const remainingHosts = await prisma.eventHost.findMany({
      where: { eventId: event.id, clubId: cohost.id },
    });
    expect(remainingHosts).toHaveLength(0);
  });

  it('returns 403 for non-platform', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    const res = await request(app)
      .delete(`/api/clubs/${club.id}`)
      .set('Authorization', tokenFor(admin));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/clubs/categories route ordering', () => {
  it('returns categories even when clubs exist with UUID-like IDs', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    await makeClub();
    await makeClub();

    const res = await request(app)
      .get('/api/clubs/categories')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
