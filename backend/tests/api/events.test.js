const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const {
  makeUser, makeClub, makeEvent, makeVenue, makeOfficer, makeActiveMember,
  tokenFor, waitFor,
} = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

function iso(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

describe('POST /api/clubs/:clubId/events (create)', () => {
  it('creates an event with a primary host row', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/events`)
      .set('Authorization', tokenFor(officer))
      .send({
        title: 'New Event',
        description: 'desc',
        startTime: iso(1),
        endTime: iso(2),
        venue: 'Room A',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Event');
    expect(res.body.venue).toBe('Room A');
    expect(res.body.primaryClubId).toBe(club.id);
    expect(res.body.club.id).toBe(club.id);

    const hosts = await prisma.eventHost.findMany({ where: { eventId: res.body.id } });
    expect(hosts).toHaveLength(1);
    expect(hosts[0].isPrimary).toBe(true);
  });

  it('returns 422 when end < start', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/events`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'X', startTime: iso(2), endTime: iso(1) });

    expect(res.status).toBe(422);
  });

  it('returns 400 when co-host club does not exist', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/events`)
      .set('Authorization', tokenFor(officer))
      .send({
        title: 'X', startTime: iso(1), endTime: iso(2),
        coHostClubIds: ['00000000-0000-0000-0000-000000000000'],
      });

    expect(res.status).toBe(400);
  });

  it('dedupes co-hosts and excludes the primary club', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    const cohost = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/events`)
      .set('Authorization', tokenFor(officer))
      .send({
        title: 'X', startTime: iso(1), endTime: iso(2),
        coHostClubIds: [club.id, cohost.id, cohost.id],
      });

    expect(res.status).toBe(201);
    const hosts = await prisma.eventHost.findMany({
      where: { eventId: res.body.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(hosts).toHaveLength(2);
    expect(hosts.filter((h) => h.isPrimary)).toHaveLength(1);
    expect(hosts.find((h) => !h.isPrimary).clubId).toBe(cohost.id);
  });

  it('returns 403 for STUDENT (no CLUB_ADMIN role)', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const res = await request(app)
      .post(`/api/clubs/${club.id}/events`)
      .set('Authorization', tokenFor(student))
      .send({ title: 'X', startTime: iso(1), endTime: iso(2) });
    expect(res.status).toBe(403);
  });

  it('returns 403 for officer of a DIFFERENT club (per-resource)', async () => {
    const officerA = await makeUser({ role: 'CLUB_ADMIN' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: officerA.id, clubId: clubA.id });

    const res = await request(app)
      .post(`/api/clubs/${clubB.id}/events`)
      .set('Authorization', tokenFor(officerA))
      .send({ title: 'X', startTime: iso(1), endTime: iso(2) });

    expect(res.status).toBe(403);
  });
});

describe('venue resolution (create + update)', () => {
  it('create with venueId snapshots the managed venue name', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    const venue = await makeVenue({ name: 'Grand Hall' });
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/events`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'V', startTime: iso(1), endTime: iso(2), venueId: venue.id });

    expect(res.status).toBe(201);
    expect(res.body.venue).toBe('Grand Hall');
    expect(res.body.venueId).toBe(venue.id);
  });

  it('create with venueId that does not exist returns 400', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/events`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'V', startTime: iso(1), endTime: iso(2), venueId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(400);
  });

  it('create with custom venue text sets venue, null venueId', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/events`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'V', startTime: iso(1), endTime: iso(2), venue: "Bob's Backyard" });

    expect(res.status).toBe(201);
    expect(res.body.venue).toBe("Bob's Backyard");
    expect(res.body.venueId).toBeNull();
  });

  it('update to a managed venue sets both venue + venueId', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    const venue = await makeVenue({ name: 'Library' });
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer))
      .send({ venueId: venue.id });

    expect(res.status).toBe(200);
    expect(res.body.venue).toBe('Library');
    expect(res.body.venueId).toBe(venue.id);
  });

  it('update clears venue when venueId sent as empty string', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id, overrides: { venue: 'Somewhere' } });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer))
      .send({ venueId: '' });

    expect(res.status).toBe(200);
    expect(res.body.venue).toBeNull();
    expect(res.body.venueId).toBeNull();
  });
});

describe('GET /api/events', () => {
  it('returns paginated list with the pagination envelope', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeEvent({ primaryClubId: club.id });
    await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .get('/api/events')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(res.body).toHaveProperty('totalPages');
  });

  it('filters by clubId via hosts.some', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeEvent({ primaryClubId: clubA.id });
    await makeEvent({ primaryClubId: clubB.id });

    const res = await request(app)
      .get(`/api/events?clubId=${clubA.id}`)
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].primaryClubId).toBe(clubA.id);
  });

  it('joined=true returns only events from clubs the user actively belongs to', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const myClub = await makeClub();
    const otherClub = await makeClub();
    await makeActiveMember({ userId: user.id, clubId: myClub.id });
    await makeEvent({ primaryClubId: myClub.id });
    await makeEvent({ primaryClubId: otherClub.id });

    const res = await request(app)
      .get('/api/events?joined=true')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].primaryClubId).toBe(myClub.id);
  });

  it('clubId + joined=true combined: AND of both filters (where.AND regression guard)', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const myClub = await makeClub();
    const otherClub = await makeClub();
    await makeActiveMember({ userId: user.id, clubId: myClub.id });
    await makeActiveMember({ userId: user.id, clubId: otherClub.id });
    await makeEvent({ primaryClubId: myClub.id });
    await makeEvent({ primaryClubId: otherClub.id });

    const res = await request(app)
      .get(`/api/events?clubId=${myClub.id}&joined=true`)
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].primaryClubId).toBe(myClub.id);
  });

  it('filters by venueId (managed venue)', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const venue = await makeVenue({ name: 'Lab X' });
    await makeEvent({ primaryClubId: club.id, overrides: { venue: 'Lab X', venueId: venue.id } });
    await makeEvent({ primaryClubId: club.id, overrides: { venue: 'Lab X', venueId: null } });
    await makeEvent({ primaryClubId: club.id, overrides: { venue: 'Elsewhere' } });

    const res = await request(app)
      .get(`/api/events?venueId=${venue.id}`)
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].venueId).toBe(venue.id);
  });

  it('venueId=none returns events with custom venue text (venueId null, venue set)', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const venue = await makeVenue();
    await makeEvent({ primaryClubId: club.id, overrides: { venue: 'Managed', venueId: venue.id } });
    await makeEvent({ primaryClubId: club.id, overrides: { venue: 'Custom Spot', venueId: null } });
    await makeEvent({ primaryClubId: club.id, overrides: { venue: null, venueId: null } });

    const res = await request(app)
      .get('/api/events?venueId=none')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].venue).toBe('Custom Spot');
    expect(res.body.items[0].venueId).toBeNull();
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/events/:id', () => {
  it('returns 404 when not found', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/events/00000000-0000-0000-0000-000000000000')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(404);
  });

  it('attaches primary club fields for backward compat', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .get(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.club.id).toBe(club.id);
    expect(res.body.primaryClubId).toBe(club.id);
    expect(res.body.clubId).toBe(club.id);
  });
});

describe('PATCH /api/events/:id', () => {
  it('allows host-club officer to update title', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  it('allows CO-HOST officer to update (any host can edit)', async () => {
    const primaryOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const coHostOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const cohost = await makeClub();
    await makeOfficer({ userId: primaryOfficer.id, clubId: primary.id });
    await makeOfficer({ userId: coHostOfficer.id, clubId: cohost.id });
    const event = await makeEvent({
      primaryClubId: primary.id,
      coHostClubIds: [cohost.id],
      creatorUserId: primaryOfficer.id,
    });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(coHostOfficer))
      .send({ title: 'From cohost' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('From cohost');
  });

  it('returns 403 for officer of an unrelated club', async () => {
    const unrelated = await makeUser({ role: 'CLUB_ADMIN' });
    const eventClub = await makeClub();
    const otherClub = await makeClub();
    await makeOfficer({ userId: unrelated.id, clubId: otherClub.id });
    const event = await makeEvent({ primaryClubId: eventClub.id });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(unrelated))
      .send({ title: 'X' });

    expect(res.status).toBe(403);
  });

  it('returns 403 for STUDENT', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(student))
      .send({ title: 'X' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when no fields are provided', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer))
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 422 when end < start after update', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer))
      .send({ startTime: iso(5), endTime: iso(1) });

    expect(res.status).toBe(422);
  });

  it('updates startTime only, recomputing against existing.endTime (?? existing.* branch)', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({
      primaryClubId: club.id,
      creatorUserId: officer.id,
      overrides: {
        startTime: new Date(Date.now() + 1 * 86_400_000),
        endTime: new Date(Date.now() + 5 * 86_400_000),
      },
    });

    const newStart = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer))
      .send({ startTime: newStart });

    expect(res.status).toBe(200);
    expect(new Date(res.body.startTime).toISOString()).toBe(newStart);
    expect(new Date(res.body.endTime).getTime()).toBeGreaterThan(new Date(newStart).getTime());
  });

  it('updates endTime only, recomputing against existing.startTime', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({
      primaryClubId: club.id,
      creatorUserId: officer.id,
      overrides: {
        startTime: new Date(Date.now() + 1 * 86_400_000),
        endTime: new Date(Date.now() + 3 * 86_400_000),
      },
    });

    const newEnd = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer))
      .send({ endTime: newEnd });

    expect(res.status).toBe(200);
    expect(new Date(res.body.endTime).toISOString()).toBe(newEnd);
  });

  it('returns 422 when only startTime moves past existing.endTime', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({
      primaryClubId: club.id,
      creatorUserId: officer.id,
      overrides: {
        startTime: new Date(Date.now() + 1 * 86_400_000),
        endTime: new Date(Date.now() + 2 * 86_400_000),
      },
    });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer))
      .send({ startTime: iso(5) });

    expect(res.status).toBe(422);
  });

  it('FACULTY bypass: can update any event regardless of host status', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const club = await makeClub();
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(faculty))
      .send({ title: 'Faculty edit' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Faculty edit');
  });
});

describe('DELETE /api/events/:id', () => {
  it('primary-host officer can delete', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id });

    const res = await request(app)
      .delete(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const row = await prisma.event.findUnique({ where: { id: event.id } });
    expect(row).toBeNull();
  });

  it('co-host officer cannot delete (primary-only)', async () => {
    const primaryOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const coHostOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const cohost = await makeClub();
    await makeOfficer({ userId: primaryOfficer.id, clubId: primary.id });
    await makeOfficer({ userId: coHostOfficer.id, clubId: cohost.id });
    const event = await makeEvent({
      primaryClubId: primary.id,
      coHostClubIds: [cohost.id],
      creatorUserId: primaryOfficer.id,
    });

    const res = await request(app)
      .delete(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(coHostOfficer));

    expect(res.status).toBe(403);
  });

  it('FACULTY bypass: can delete any event', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const club = await makeClub();
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .delete(`/api/events/${event.id}`)
      .set('Authorization', tokenFor(faculty));

    expect(res.status).toBe(200);
  });
});

describe('POST /api/events/:id/cohosts', () => {
  it('host officer can add a co-host', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const cohost = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohosts`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: cohost.id });

    expect(res.status).toBe(201);
    expect(res.body.clubId).toBe(cohost.id);
    expect(res.body.isPrimary).toBe(false);

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'EVENT_COHOST_ADD', targetId: event.id } })
    );
    expect(audit).toBeTruthy();
  });

  it('returns 409 when the club is already a host', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const cohost = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({
      primaryClubId: primary.id,
      coHostClubIds: [cohost.id],
      creatorUserId: officer.id,
    });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohosts`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: cohost.id });

    expect(res.status).toBe(409);
  });

  it('returns 404 when the co-host club does not exist', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohosts`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/events/:id/cohosts/:clubId', () => {
  it('removes a co-host', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const cohost = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({
      primaryClubId: primary.id,
      coHostClubIds: [cohost.id],
      creatorUserId: officer.id,
    });

    const res = await request(app)
      .delete(`/api/events/${event.id}/cohosts/${cohost.id}`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(200);
    const remaining = await prisma.eventHost.findMany({
      where: { eventId: event.id, clubId: cohost.id },
    });
    expect(remaining).toHaveLength(0);
  });

  it('returns 400 when attempting to remove the PRIMARY host', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });

    const res = await request(app)
      .delete(`/api/events/${event.id}/cohosts/${primary.id}`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(400);
  });

  it('returns 404 when the club is not a host', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const other = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });

    const res = await request(app)
      .delete(`/api/events/${event.id}/cohosts/${other.id}`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(404);
  });
});
