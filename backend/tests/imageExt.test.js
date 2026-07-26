const { getImageExt } = require('../src/utils/imageExt');

describe('getImageExt', () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const GIF = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);
  const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

  it('detects png', () => expect(getImageExt(PNG)).toBe('.png'));
  it('detects jpeg', () => expect(getImageExt(JPEG)).toBe('.jpg'));
  it('detects gif', () => expect(getImageExt(GIF)).toBe('.gif'));
  it('detects webp', () => expect(getImageExt(WEBP)).toBe('.webp'));

  it('rejects html', () =>
    expect(getImageExt(Buffer.from('<html><body><script>alert(1)</script></body></html>'))).toBeNull());
  it('rejects svg', () =>
    expect(getImageExt(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull());
  it('rejects truncated signature', () => expect(getImageExt(Buffer.from([0x89, 0x50]))).toBeNull());
  it('rejects empty buffer', () => expect(getImageExt(Buffer.alloc(0))).toBeNull());
  it('rejects non-buffer', () => {
    expect(getImageExt('not a buffer')).toBeNull();
    expect(getImageExt(null)).toBeNull();
    expect(getImageExt(undefined)).toBeNull();
  });

  // A buffer with a genuine image header but hostile trailing bytes still
  // classifies as that image type — that is intentional. The serving-layer CSP
  // (default-src 'none', see uploadsStatic.test) is what neutralises polyglots,
  // not magic-byte detection.
  it('classifies by header alone; polyglots are handled at the serving layer', () => {
    const polyglot = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from('<script>alert(1)</script>'),
    ]);
    expect(getImageExt(polyglot)).toBe('.jpg');
  });
});
