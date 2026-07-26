const { OPTIONAL_URL } = require('../src/middleware/validate');

describe('OPTIONAL_URL', () => {
  const valid = [
    '/uploads/abc.png',
    '/uploads/9f2e1d80-c0d2-4c11-b7a3-2a1b3c4d5e6f.webp',
    'https://example.com/x.png',
    'http://example.com/x.png',
    'https://cdn.clubms.app/banners/1.jpg',
    '',
    undefined,
  ];
  const invalid = [
    '//evil.com/x.png',          // protocol-relative
    '/api/secret',               // non-upload same-origin path
    'javascript:alert(1)',       // script scheme
    'data:text/html,<script>',   // data scheme
    '/uploads/',                 // empty path under bucket
    '/uploads/x y.png',          // whitespace in path
    'ftp://example.com/x.png',   // non-http scheme
    'not-a-url',
  ];

  test.each(valid)('accepts %p', (value) => {
    expect(OPTIONAL_URL.safeParse(value).success).toBe(true);
  });

  test.each(invalid)('rejects %p', (value) => {
    expect(OPTIONAL_URL.safeParse(value).success).toBe(false);
  });

  it('rejects strings over 500 chars', () => {
    expect(OPTIONAL_URL.safeParse('https://example.com/' + 'a'.repeat(490) + '.png').success).toBe(false);
  });
});
