const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const {
  makeUser, makeClub, makeEvent, makeVenue, makeOfficer,
  tokenFor, waitFor,
} = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('GET /api/venues', () => {
  it('returns paginated list for any authenticated user', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    await makeVenue({ name: 'Listed Venue' });

    const res = await request(app)
      .get('/api/venues')
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('totalPages');
    expect(res.body.items.some((v) => v.name === 'Listed Venue')).toBe(true);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/venues');
    expect(res.status).toBe(401);
  });

  it('server-side search matches by name substring (case-insensitive)', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    await makeVenue({ name: 'Grand Auditorium' });

    const res = await request(app)
      .get('/api/venues?search=grand')
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(200);
    expect(res.body.items.some((v) => v.name === 'Grand Auditorium')).toBe(true);
    expect(res.body.items.every((v) => /grand/i.test(v.name))).toBe(true);
  });
});

describe('POST /api/venues', () => {
  it('allows PLATFORM_ADMIN to create a venue', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', tokenFor(admin))
      .send({ name: 'New Venue' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Venue');

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'VENUE_CREATE', targetId: res.body.id } })
    );
    expect(audit).toBeTruthy();
  });

  it('rejects CLUB_ADMIN with 403', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', tokenFor(officer))
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });

  it('rejects STUDENT with 403', async () => {
    const student = await makeUser({ role: 'STUDENT' });

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', tokenFor(student))
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });

  it('returns 409 on duplicate name', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });
    await makeVenue({ name: 'Unique Spot' });

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', tokenFor(admin))
      .send({ name: 'Unique Spot' });

    expect(res.status).toBe(409);
  });

  it('returns 400 when name is missing', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });

    const res = await request(app)
      .post('/api/venues')
      .set('Authorization', tokenFor(admin))
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/venues/:id', () => {
  it('allows PLATFORM_ADMIN to rename a venue', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });
    const venue = await makeVenue({ name: 'Old Name' });

    const res = await request(app)
      .patch(`/api/venues/${venue.id}`)
      .set('Authorization', tokenFor(admin))
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('returns 404 when venue does not exist', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });

    const res = await request(app)
      .patch('/api/venues/00000000-0000-0000-0000-000000000000')
      .set('Authorization', tokenFor(admin))
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  it('returns 409 when renaming to an existing name', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });
    await makeVenue({ name: 'Taken' });
    const venue = await makeVenue({ name: 'Free' });

    const res = await request(app)
      .patch(`/api/venues/${venue.id}`)
      .set('Authorization', tokenFor(admin))
      .send({ name: 'Taken' });

    expect(res.status).toBe(409);
  });

  it('rejects non-admin with 403', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const venue = await makeVenue({ name: 'Some Venue' });

    const res = await request(app)
      .patch(`/api/venues/${venue.id}`)
      .set('Authorization', tokenFor(student))
      .send({ name: 'Renamed' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/venues/:id', () => {
  it('allows PLATFORM_ADMIN to delete; linked events keep venue name snapshot, venueId nulls', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const venue = await makeVenue({ name: 'Doomed Hall' });
    const event = await makeEvent({
      primaryClubId: club.id,
      creatorUserId: officer.id,
      overrides: { venue: 'Doomed Hall', venueId: venue.id },
    });

    const res = await request(app)
      .delete(`/api/venues/${venue.id}`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const after = await prisma.event.findUnique({ where: { id: event.id }, select: { venue: true, venueId: true } });
    expect(after.venue).toBe('Doomed Hall');
    expect(after.venueId).toBeNull();

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'VENUE_DELETE', targetId: venue.id } })
    );
    expect(audit).toBeTruthy();
  });

  it('returns 404 when venue does not exist', async () => {
    const admin = await makeUser({ role: 'PLATFORM_ADMIN' });

    const res = await request(app)
      .delete('/api/venues/00000000-0000-0000-0000-000000000000')
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(404);
  });

  it('rejects non-admin with 403', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const venue = await makeVenue({ name: 'Protected' });

    const res = await request(app)
      .delete(`/api/venues/${venue.id}`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
  });
});
