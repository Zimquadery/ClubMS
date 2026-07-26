const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const {
  makeUser, makeClub, makeAnnouncement, makeOfficer, makeActiveMember,
  tokenFor, waitFor,
} = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('POST /api/clubs/:clubId/announcements', () => {
  it('returns 201 for a CLUB_ADMIN of the club', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/announcements`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'Hello', content: 'World' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Hello', content: 'World', clubId: club.id });
    expect(res.body.authorId).toBe(officer.id);
  });

  it('returns 403 for STUDENT (no CLUB_ADMIN role)', async () => {
    const student = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const res = await request(app)
      .post(`/api/clubs/${club.id}/announcements`)
      .set('Authorization', tokenFor(student))
      .send({ title: 'X', content: 'Y' });
    expect(res.status).toBe(403);
  });

  it('returns 403 for officer of a DIFFERENT club (per-resource)', async () => {
    const adminA = await makeUser({ role: 'CLUB_ADMIN' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: adminA.id, clubId: clubA.id });

    const res = await request(app)
      .post(`/api/clubs/${clubB.id}/announcements`)
      .set('Authorization', tokenFor(adminA))
      .send({ title: 'X', content: 'Y' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when title/content are missing', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/announcements`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'X' });

    expect(res.status).toBe(400);
  });

  it('emits an audit log on create', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });

    const res = await request(app)
      .post(`/api/clubs/${club.id}/announcements`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'Audit me', content: 'body' });

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'ANNOUNCEMENT_CREATE', targetId: res.body.id } })
    );
    expect(audit.actorId).toBe(officer.id);
  });
});

describe('GET /api/clubs/:clubId/announcements', () => {
  it('returns announcements for an ACTIVE member of the club', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });
    await makeAnnouncement({ clubId: club.id, authorId: member.id });
    await makeAnnouncement({ clubId: club.id, authorId: member.id, overrides: { title: 'Second' } });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/announcements`)
      .set('Authorization', tokenFor(member));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body).toHaveProperty('items');
  });

  it('returns 403 for a non-member STUDENT (no expected-403 toast bug)', async () => {
    const stranger = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeAnnouncement({ clubId: club.id, authorId: stranger.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/announcements`)
      .set('Authorization', tokenFor(stranger));

    expect(res.status).toBe(403);
  });

  it('allows PLATFORM_ADMIN without membership', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const club = await makeClub();
    await makeAnnouncement({ clubId: club.id, authorId: pa.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/announcements`)
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('allows FACULTY without membership (inherits CLUB_ADMIN)', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const club = await makeClub();
    await makeAnnouncement({ clubId: club.id, authorId: faculty.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/announcements`)
      .set('Authorization', tokenFor(faculty));

    expect(res.status).toBe(200);
  });
});

describe('GET /api/clubs/:clubId/announcements/:announcementId', () => {
  it('returns the announcement for an active member', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });
    const author = await makeUser({ role: 'STUDENT' });
    const ann = await makeAnnouncement({ clubId: club.id, authorId: author.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/announcements/${ann.id}`)
      .set('Authorization', tokenFor(member));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ann.id);
    expect(res.body.clubId).toBe(club.id);
  });

  it('returns 404 when the announcement does not exist', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: club.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/announcements/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', tokenFor(member));

    expect(res.status).toBe(404);
  });

  it('returns 404 when the announcement belongs to a different club', async () => {
    const member = await makeUser({ role: 'STUDENT' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeActiveMember({ userId: member.id, clubId: clubA.id });
    await makeActiveMember({ userId: member.id, clubId: clubB.id });
    const author = await makeUser({ role: 'STUDENT' });
    const ann = await makeAnnouncement({ clubId: clubA.id, authorId: author.id });

    const res = await request(app)
      .get(`/api/clubs/${clubB.id}/announcements/${ann.id}`)
      .set('Authorization', tokenFor(member));

    expect(res.status).toBe(404);
  });

  it('returns 403 for a non-member STUDENT', async () => {
    const stranger = await makeUser({ role: 'STUDENT' });
    const club = await makeClub();
    const author = await makeUser({ role: 'STUDENT' });
    const ann = await makeAnnouncement({ clubId: club.id, authorId: author.id });

    const res = await request(app)
      .get(`/api/clubs/${club.id}/announcements/${ann.id}`)
      .set('Authorization', tokenFor(stranger));

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/clubs/:clubId/announcements/:announcementId', () => {
  it('author can edit their own announcement', async () => {
    const author = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: author.id, clubId: club.id });
    const ann = await makeAnnouncement({ clubId: club.id, authorId: author.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/announcements/${ann.id}`)
      .set('Authorization', tokenFor(author))
      .send({ title: 'Edited' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Edited');
  });

  it('PLATFORM_ADMIN can edit anyone\'s announcement', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const other = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: other.id, clubId: club.id });
    const ann = await makeAnnouncement({ clubId: club.id, authorId: other.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/announcements/${ann.id}`)
      .set('Authorization', tokenFor(pa))
      .send({ title: 'Admin edit' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Admin edit');
  });

  it('returns 404 when the announcement belongs to a different club', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: clubA.id });
    await makeOfficer({ userId: officer.id, clubId: clubB.id });
    const ann = await makeAnnouncement({ clubId: clubA.id, authorId: officer.id });

    const res = await request(app)
      .patch(`/api/clubs/${clubB.id}/announcements/${ann.id}`)
      .set('Authorization', tokenFor(officer))
      .send({ title: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/clubs/:clubId/announcements/:announcementId/pin', () => {
  it('pins an unpinned announcement', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const ann = await makeAnnouncement({ clubId: club.id, authorId: officer.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/announcements/${ann.id}/pin`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(200);
    expect(res.body.pinned).toBe(true);

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({ where: { action: 'ANNOUNCEMENT_PIN', targetId: ann.id } })
    );
    expect(audit).toBeTruthy();
  });

  it('unpins a pinned announcement', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    const ann = await makeAnnouncement({ clubId: club.id, authorId: officer.id, overrides: { pinned: true } });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/announcements/${ann.id}/pin`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(200);
    expect(res.body.pinned).toBe(false);
  });

  it('returns 400 when pin limit (3) is exceeded', async () => {
    const officer = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: officer.id, clubId: club.id });
    for (let i = 0; i < 3; i++) {
      await makeAnnouncement({
        clubId: club.id, authorId: officer.id,
        overrides: { pinned: true, title: `Pinned ${i}` },
      });
    }
    const target = await makeAnnouncement({ clubId: club.id, authorId: officer.id });

    const res = await request(app)
      .patch(`/api/clubs/${club.id}/announcements/${target.id}/pin`)
      .set('Authorization', tokenFor(officer));

    expect(res.status).toBe(400);
  });
});

describe('GET /api/announcements/recent', () => {
  it('returns announcements only from the user\'s active clubs', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const myClub = await makeClub();
    const otherClub = await makeClub();
    const stranger = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: user.id, clubId: myClub.id });
    await makeAnnouncement({ clubId: myClub.id, authorId: stranger.id });
    await makeAnnouncement({ clubId: otherClub.id, authorId: stranger.id });

    const res = await request(app)
      .get('/api/announcements/recent')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].clubId).toBe(myClub.id);
  });

  it('returns all recent announcements for FACULTY (regardless of membership)', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const clubA = await makeClub();
    const clubB = await makeClub();
    const stranger = await makeUser({ role: 'STUDENT' });
    await makeAnnouncement({ clubId: clubA.id, authorId: stranger.id });
    await makeAnnouncement({ clubId: clubB.id, authorId: stranger.id });

    const res = await request(app)
      .get('/api/announcements/recent')
      .set('Authorization', tokenFor(faculty));

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('returns empty array when user has no clubs', async () => {
    const user = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/announcements/recent')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('DELETE /api/clubs/:clubId/announcements/:announcementId', () => {
  it('author can delete their own announcement', async () => {
    const author = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: author.id, clubId: club.id });
    const ann = await makeAnnouncement({ clubId: club.id, authorId: author.id });

    const res = await request(app)
      .delete(`/api/clubs/${club.id}/announcements/${ann.id}`)
      .set('Authorization', tokenFor(author));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const row = await prisma.announcement.findUnique({ where: { id: ann.id } });
    expect(row).toBeNull();
  });

  it('PLATFORM_ADMIN can delete anyone\'s announcement', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const other = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: other.id, clubId: club.id });
    const ann = await makeAnnouncement({ clubId: club.id, authorId: other.id });

    const res = await request(app)
      .delete(`/api/clubs/${club.id}/announcements/${ann.id}`)
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(200);
  });
});
