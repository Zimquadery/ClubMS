const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../../src/app');
const { UPLOAD_DIR } = require('../../src/config/upload');
const { makeUser, tokenFor } = require('../fixtures');

let app;
beforeAll(() => { app = createApp(); });

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
]);

describe('POST /api/upload', () => {
  it('returns 201 with a /uploads/<uuid>.png URL for a valid PNG', async () => {
    const user = await makeUser();

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', tokenFor(user))
      .attach('file', PNG_BYTES, { filename: 'x.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.png$/);

    const filename = path.basename(res.body.url);
    const onDisk = fs.existsSync(path.join(UPLOAD_DIR, filename));
    expect(onDisk).toBe(true);
  });

  it('rejects an HTML file with a spoofed image mimetype (400, nothing written)', async () => {
    const user = await makeUser();
    const filesBefore = fs.readdirSync(UPLOAD_DIR).length;

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', tokenFor(user))
      .attach('file', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'evil.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
    const filesAfter = fs.readdirSync(UPLOAD_DIR).length;
    expect(filesAfter).toBe(filesBefore);
  });

  it('rejects an SVG even with an image mimetype', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', tokenFor(user))
      .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), {
        filename: 'x.svg',
        contentType: 'image/svg+xml',
      });
    expect([400, 415]).toContain(res.status);
  });

  it('returns 400 when no file is attached', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', tokenFor(user));
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', PNG_BYTES, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('derived filename extension comes from magic bytes, not the client filename', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', tokenFor(user))
      .attach('file', PNG_BYTES, { filename: 'actually-a-png.html.exe', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\.png$/);
  });
});

describe('GET /uploads/<file>', () => {
  it('serves an uploaded file with the hardening CSP header', async () => {
    const user = await makeUser();
    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Authorization', tokenFor(user))
      .attach('file', PNG_BYTES, { filename: 'x.png', contentType: 'image/png' });
    expect(uploadRes.status).toBe(201);

    const getRes = await request(app).get(uploadRes.body.url);
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-security-policy']).toBe("default-src 'none'");
    expect(getRes.headers['content-type']).toMatch(/image\/png/);
  });
});
