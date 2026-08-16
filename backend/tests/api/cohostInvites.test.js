const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const {
  makeUser, makeClub, makeEvent, makeOfficer, makeCohostInvite, tokenFor, waitFor,
} = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('POST /api/events/:id/cohost-invites (create)', () => {
  it('host officer can invite a club, creating a pending invite (not a host)', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohost-invites`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: invitee.id });

    expect(res.status).toBe(201);
    expect(res.body.clubId).toBe(invitee.id);

    const host = await prisma.eventHost.findUnique({ where: { eventId_clubId: { eventId: event.id, clubId: invitee.id } } });
    expect(host).toBeNull();
    const invite = await prisma.eventHostInvite.findUnique({ where: { eventId_clubId: { eventId: event.id, clubId: invitee.id } } });
    expect(invite).toBeTruthy();

    const audit = await waitFor(() => prisma.auditLog.findFirst({ where: { action: 'EVENT_COHOST_INVITE', targetId: event.id } }));
    expect(audit).toBeTruthy();
  });

  it('returns 403 for an officer of an unrelated club', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const other = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: other.id });
    const event = await makeEvent({ primaryClubId: primary.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohost-invites`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: invitee.id });

    expect(res.status).toBe(403);
  });

  it('returns 400 when inviting the primary host club', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohost-invites`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: primary.id });

    expect(res.status).toBe(400);
  });

  it('returns 409 when the club is already an accepted co-host', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const cohost = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, coHostClubIds: [cohost.id], creatorUserId: officer.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohost-invites`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: cohost.id });

    expect(res.status).toBe(409);
  });

  it('returns 409 when an invitation is already pending', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });
    await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohost-invites`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: invitee.id });

    expect(res.status).toBe(409);
  });

  it('returns 404 when the invited club does not exist', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });

    const res = await request(app)
      .post(`/api/events/${event.id}/cohost-invites`)
      .set('Authorization', tokenFor(officer))
      .send({ clubId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/events/:id/cohost-invites (list for event)', () => {
  it('host officer sees pending invites; unrelated officer gets 403', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const unrelated = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const other = await makeClub();
    const inviteeA = await makeClub();
    const inviteeB = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    await makeOfficer({ userId: unrelated.id, clubId: other.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });
    await makeCohostInvite({ eventId: event.id, clubId: inviteeA.id });
    await makeCohostInvite({ eventId: event.id, clubId: inviteeB.id });

    const ok = await request(app).get(`/api/events/${event.id}/cohost-invites`).set('Authorization', tokenFor(officer));
    expect(ok.status).toBe(200);
    expect(ok.body.items).toHaveLength(2);

    const denied = await request(app).get(`/api/events/${event.id}/cohost-invites`).set('Authorization', tokenFor(unrelated));
    expect(denied.status).toBe(403);
  });
});

describe('POST /api/cohost-invites/:id/accept', () => {
  it('invited club officer accepts -> becomes a host, invite removed', async () => {
    const primaryOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const inviteeOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: primaryOfficer.id, clubId: primary.id });
    await makeOfficer({ userId: inviteeOfficer.id, clubId: invitee.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: primaryOfficer.id });
    const invite = await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    const res = await request(app)
      .post(`/api/cohost-invites/${invite.id}/accept`)
      .set('Authorization', tokenFor(inviteeOfficer));

    expect(res.status).toBe(200);
    const host = await prisma.eventHost.findUnique({ where: { eventId_clubId: { eventId: event.id, clubId: invitee.id } } });
    expect(host).toBeTruthy();
    expect(host.isPrimary).toBe(false);
    const gone = await prisma.eventHostInvite.findUnique({ where: { id: invite.id } });
    expect(gone).toBeNull();

    const audit = await waitFor(() => prisma.auditLog.findFirst({ where: { action: 'EVENT_COHOST_INVITE_ACCEPT', targetId: event.id } }));
    expect(audit).toBeTruthy();
  });

  it('returns 403 for an officer of a different club (IDOR guard)', async () => {
    const primaryOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const otherOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    const other = await makeClub();
    await makeOfficer({ userId: primaryOfficer.id, clubId: primary.id });
    await makeOfficer({ userId: otherOfficer.id, clubId: other.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: primaryOfficer.id });
    const invite = await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    const res = await request(app)
      .post(`/api/cohost-invites/${invite.id}/accept`)
      .set('Authorization', tokenFor(otherOfficer));

    expect(res.status).toBe(403);
    const host = await prisma.eventHost.findUnique({ where: { eventId_clubId: { eventId: event.id, clubId: invitee.id } } });
    expect(host).toBeNull();
  });

  it('returns 404 for an already-accepted (removed) invite', async () => {
    const inviteeOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: inviteeOfficer.id, clubId: invitee.id });
    const event = await makeEvent({ primaryClubId: primary.id });
    const invite = await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    await request(app).post(`/api/cohost-invites/${invite.id}/accept`).set('Authorization', tokenFor(inviteeOfficer));
    const second = await request(app).post(`/api/cohost-invites/${invite.id}/accept`).set('Authorization', tokenFor(inviteeOfficer));
    expect(second.status).toBe(404);
  });

  it('FACULTY bypass: can accept without being an officer of the invited club', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const primary = await makeClub();
    const invitee = await makeClub();
    const event = await makeEvent({ primaryClubId: primary.id });
    const invite = await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    const res = await request(app).post(`/api/cohost-invites/${invite.id}/accept`).set('Authorization', tokenFor(faculty));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/cohost-invites/:id/reject', () => {
  it('invited club officer rejects -> invite removed, no host created', async () => {
    const inviteeOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: inviteeOfficer.id, clubId: invitee.id });
    const event = await makeEvent({ primaryClubId: primary.id });
    const invite = await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    const res = await request(app).post(`/api/cohost-invites/${invite.id}/reject`).set('Authorization', tokenFor(inviteeOfficer));
    expect(res.status).toBe(200);
    const gone = await prisma.eventHostInvite.findUnique({ where: { id: invite.id } });
    expect(gone).toBeNull();
    const host = await prisma.eventHost.findUnique({ where: { eventId_clubId: { eventId: event.id, clubId: invitee.id } } });
    expect(host).toBeNull();
  });

  it('allows re-inviting after a rejection', async () => {
    const primaryOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const inviteeOfficer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: primaryOfficer.id, clubId: primary.id });
    await makeOfficer({ userId: inviteeOfficer.id, clubId: invitee.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: primaryOfficer.id });
    const invite = await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    await request(app).post(`/api/cohost-invites/${invite.id}/reject`).set('Authorization', tokenFor(inviteeOfficer));

    const reInvite = await request(app)
      .post(`/api/events/${event.id}/cohost-invites`)
      .set('Authorization', tokenFor(primaryOfficer))
      .send({ clubId: invitee.id });
    expect(reInvite.status).toBe(201);
  });
});

describe('DELETE /api/events/:id/cohost-invites/:inviteId (cancel)', () => {
  it('host officer can cancel a pending invite', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: primary.id });
    const event = await makeEvent({ primaryClubId: primary.id, creatorUserId: officer.id });
    const invite = await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    const res = await request(app).delete(`/api/events/${event.id}/cohost-invites/${invite.id}`).set('Authorization', tokenFor(officer));
    expect(res.status).toBe(200);
    const gone = await prisma.eventHostInvite.findUnique({ where: { id: invite.id } });
    expect(gone).toBeNull();
  });

  it('returns 403 for an unrelated officer', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const invitee = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: invitee.id });
    const event = await makeEvent({ primaryClubId: primary.id });
    const invite = await makeCohostInvite({ eventId: event.id, clubId: invitee.id });

    const res = await request(app).delete(`/api/events/${event.id}/cohost-invites/${invite.id}`).set('Authorization', tokenFor(officer));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/cohost-invites/incoming', () => {
  it('returns only invites for the current user\'s officer clubs', async () => {
    const officerA = await makeUser({ role: 'CLUB_ADMIN' });
    const officerB = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: officerA.id, clubId: clubA.id });
    await makeOfficer({ userId: officerB.id, clubId: clubB.id });
    const event = await makeEvent({ primaryClubId: primary.id });
    await makeCohostInvite({ eventId: event.id, clubId: clubA.id });
    await makeCohostInvite({ eventId: event.id, clubId: clubB.id });

    const res = await request(app).get('/api/cohost-invites/incoming').set('Authorization', tokenFor(officerA));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].clubId).toBe(clubA.id);
    expect(res.body.items[0].invitedByClub.id).toBe(primary.id);
    expect(res.body.items[0].event.id).toBe(event.id);
  });

  it('filters by clubId query param', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const primary = await makeClub();
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: clubA.id });
    await makeOfficer({ userId: officer.id, clubId: clubB.id });
    const event = await makeEvent({ primaryClubId: primary.id });
    await makeCohostInvite({ eventId: event.id, clubId: clubA.id });
    await makeCohostInvite({ eventId: event.id, clubId: clubB.id });

    const res = await request(app).get(`/api/cohost-invites/incoming?clubId=${clubA.id}`).set('Authorization', tokenFor(officer));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].clubId).toBe(clubA.id);
  });

  it('returns empty for a non-officer (STUDENT role blocked at middleware)', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const res = await request(app).get('/api/cohost-invites/incoming').set('Authorization', tokenFor(student));
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/cohost-invites/incoming');
    expect(res.status).toBe(401);
  });
});
