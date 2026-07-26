const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma } = require('../db');
const {
  makeUser, makeClub, makeOfficer, makeActiveMember,
  tokenFor, waitFor,
} = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

async function act(action, actorId, targetId, metadata = {}) {
  await prisma.auditLog.create({
    data: {
      action,
      actorId,
      targetType: 'membership',
      targetId,
      metadata: JSON.stringify(metadata),
    },
  });
}

describe('GET /api/audit-logs', () => {
  it('returns paginated logs for PLATFORM_ADMIN', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const other = await makeUser({ role: 'STUDENT' });
    await act('MEMBERSHIP_APPROVE', pa.id, other.id);
    await act('MEMBERSHIP_PROMOTE', pa.id, other.id);

    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 50);
  });

  it('returns 403 for CLUB_ADMIN (platform-only)', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', tokenFor(admin));
    expect(res.status).toBe(403);
  });

  it('returns 403 for FACULTY (platform-only — does NOT inherit)', async () => {
    const faculty = await makeUser({ role: 'FACULTY' });
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', tokenFor(faculty));
    expect(res.status).toBe(403);
  });

  it('filters by action', async () => {
    const pa = await makeUser({ role: 'PLATFORM_ADMIN' });
    const t1 = await makeUser({ role: 'STUDENT' });
    const t2 = await makeUser({ role: 'STUDENT' });
    await act('MEMBERSHIP_APPROVE', pa.id, t1.id);
    await act('MEMBERSHIP_REJECT', pa.id, t2.id);

    const res = await request(app)
      .get('/api/audit-logs?action=MEMBERSHIP_APPROVE')
      .set('Authorization', tokenFor(pa));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].action).toBe('MEMBERSHIP_APPROVE');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
  });
});

describe('audit log emission (cross-module verification)', () => {
  it('membership approve emits a verifiable audit row', async () => {
    const admin = await makeUser({ role: 'CLUB_ADMIN' });
    const club = await makeClub();
    await makeOfficer({ userId: admin.id, clubId: club.id });
    const pending = await makeUser({ role: 'STUDENT' });
    await makeActiveMember({ userId: pending.id, clubId: club.id });
    await prisma.clubMembership.update({
      where: { userId_clubId: { userId: pending.id, clubId: club.id } },
      data: { status: 'PENDING' },
    });

    await request(app)
      .patch(`/api/clubs/${club.id}/members/${pending.id}/approve`)
      .set('Authorization', tokenFor(admin));

    const audit = await waitFor(() =>
      prisma.auditLog.findFirst({
        where: { action: 'MEMBERSHIP_APPROVE', actorId: admin.id, targetId: pending.id },
      })
    );
    expect(audit).toBeTruthy();
    expect(audit.targetType).toBe('membership');
  });
});
