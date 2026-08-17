const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const {
  makeUser, makeClub, makeEvent, makeRsvp, makeActiveMember, makeOfficer,
  tokenFor,
} = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('POST /api/events/:id/rsvp', () => {
  it('creates an RSVP for an active member of any host club', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/rsvp`)
      .set('Authorization', tokenFor(member))
      .send({ status: 'GOING' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'GOING', eventId: event.id, userId: member.id });
  });

  it('updates an existing RSVP in place (no duplicate row, no 500)', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id });
    await makeRsvp({ eventId: event.id, userId: member.id, status: 'GOING' });

    const res = await request(app)
      .post(`/api/events/${event.id}/rsvp`)
      .set('Authorization', tokenFor(member))
      .send({ status: 'NOT_GOING' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('NOT_GOING');

    const count = await prisma.eventRsvp.count({ where: { eventId: event.id, userId: member.id } });
    expect(count).toBe(1);
  });

  it('returns 403 for a non-member', async () => {
    const stranger = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/rsvp`)
      .set('Authorization', tokenFor(stranger))
      .send({ status: 'GOING' });

    expect(res.status).toBe(403);
  });

  it('returns 400 for an invalid status', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/rsvp`)
      .set('Authorization', tokenFor(member))
      .send({ status: 'INVALID' });

    expect(res.status).toBe(400);
  });

  it('active member of a CO-HOST club can RSVP', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const primary = await makeClub();
    const cohost = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: cohost.id });
    const event = await makeEvent({ primaryClubId: primary.id, coHostClubIds: [cohost.id] });

    const res = await request(app)
      .post(`/api/events/${event.id}/rsvp`)
      .set('Authorization', tokenFor(member))
      .send({ status: 'MAYBE' });

    expect(res.status).toBe(200);
  });
});

describe('GET /api/events/:id/rsvp', () => {
  it('returns the current user\'s RSVP', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id });
    await makeRsvp({ eventId: event.id, userId: member.id, status: 'GOING' });

    const res = await request(app)
      .get(`/api/events/${event.id}/rsvp`)
      .set('Authorization', tokenFor(member));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('GOING');
  });

  it('returns null when the user has not RSVPed', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .get(`/api/events/${event.id}/rsvp`)
      .set('Authorization', tokenFor(member));

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});

describe('DELETE /api/events/:id/rsvp', () => {
  it('removes the current user\'s RSVP', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id });
    await makeRsvp({ eventId: event.id, userId: member.id });

    const res = await request(app)
      .delete(`/api/events/${event.id}/rsvp`)
      .set('Authorization', tokenFor(member));

    expect(res.status).toBe(200);
    const count = await prisma.eventRsvp.count({ where: { eventId: event.id, userId: member.id } });
    expect(count).toBe(0);
  });
});

describe('GET /api/events/:id/rsvps (list)', () => {
  it('returns paginated RSVPs with counts for a host-club officer', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id });
    const m1 = await makeUser({ role: 'STUDENT' });
    const m2 = await makeUser({ role: 'STUDENT' });
    await makeRsvp({ eventId: event.id, userId: m1.id, status: 'GOING' });
    await makeRsvp({ eventId: event.id, userId: m2.id, status: 'MAYBE' });

    const res = await request(app)
      .get(`/api/events/${event.id}/rsvps`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('counts');
  });

  it('returns 403 for STUDENT (no CLUB_ADMIN)', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .get(`/api/events/${event.id}/rsvps`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
  });

  it('FACULTY can list RSVPs of any event', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const club = await makeClub();
    const event = await makeEvent({ primaryClubId: club.id });

    const res = await request(app)
      .get(`/api/events/${event.id}/rsvps`)
      .set('Authorization', tokenFor(faculty));

    expect(res.status).toBe(200);
  });

  it('rejects a search longer than 25 characters', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id });

    const res = await request(app)
      .get(`/api/events/${event.id}/rsvps`)
      .query({ search: 'a'.repeat(26) })
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(400);
  });
});

describe('GET /api/events/:id/rsvps/export', () => {
  it('returns a CSV attachment for a host-club officer', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const event = await makeEvent({ primaryClubId: club.id, creatorUserId: officer.id });
    const m = await makeUser({ role: 'STUDENT', phone: '01798765432' });
    await makeRsvp({ eventId: event.id, userId: m.id, status: 'GOING' });

    const res = await request(app)
      .get(`/api/events/${event.id}/rsvps/export`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment;\s*filename="rsvps-/);
    expect(res.text).toContain('Name,Email,Phone,Status,Responded At');
    expect(res.text).toContain('01798765432');
  });
});
