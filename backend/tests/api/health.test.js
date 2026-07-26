const request = require('supertest');
const { createApp } = require('../../src/app');

let app;
beforeAll(() => { app = createApp(); });

describe('GET /api/health', () => {
  it('returns ok status with connected db', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'connected' });
  });

  it('mounts the auth router', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown routes (with error handler shape)', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
