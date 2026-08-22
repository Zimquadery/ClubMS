const request = require('supertest');
const { createApp } = require('../../src/app');
const { makeUser, tokenFor } = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

describe('GET /api/departments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/departments');
    expect(res.status).toBe(401);
  });

  it('returns distinct sorted departments, excluding null/empty and deduping case', async () => {
    await makeUser({ role: 'STUDENT', department: 'CSE' });
    await makeUser({ role: 'STUDENT', department: 'cse' });
    await makeUser({ role: 'STUDENT', department: 'EEE' });
    await makeUser({ role: 'STUDENT', department: null });
    await makeUser({ role: 'STUDENT', department: '   ' });

    const user = await makeUser({ role: 'STUDENT' });
    const res = await request(app)
      .get('/api/departments')
      .set('Authorization', tokenFor(user));

    expect(res.status).toBe(200);
    expect(res.body.items).toContain('CSE');
    expect(res.body.items).toContain('EEE');
    expect(res.body.items.filter((d) => d.toLowerCase() === 'cse')).toHaveLength(1);
    expect(res.body.items).toEqual([...res.body.items].sort((a, b) => a.localeCompare(b)));
    expect(res.body.items.every((d) => d.trim().length > 0)).toBe(true);
  });
});
