const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const request = require('supertest');
const { uploadsStaticHeaders } = require('../src/config/upload');

// Verifies the REAL middleware (imported, not duplicated) sets the hardening
// header that prevents any uploaded content from executing scripts.
describe('uploads static hardening', () => {
  let dir;
  let app;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubms-uploads-'));
    fs.writeFileSync(
      path.join(dir, 'test.png'),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    app = express();
    app.use('/uploads', uploadsStaticHeaders, express.static(dir));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('sets Content-Security-Policy: default-src none on served uploads', async () => {
    const res = await request(app).get('/uploads/test.png');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
    expect(res.status).toBe(200);
  });

  it('serves the image bytes as image/png', async () => {
    const res = await request(app).get('/uploads/test.png');
    expect(res.headers['content-type']).toMatch(/image\/png/);
  });

  it('applies the header even on a missing file (404 path)', async () => {
    const res = await request(app).get('/uploads/does-not-exist.png');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
  });
});
