const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.PORT = '0';
process.env.SKIP_RATE_LIMIT = '1';

const UNIT_ONLY = process.env.JEST_NO_DB === '1';

if (!UNIT_ONLY) {
  const URL_FILE = path.join(__dirname, '.pg.url');
  if (!fs.existsSync(URL_FILE)) {
    throw new Error(
      'tests/.pg.url not found. globalSetup must run first to start the Postgres container ' +
      'and publish the connection URL. For unit-only runs without Docker, set JEST_NO_DB=1.'
    );
  }
  process.env.DATABASE_URL = fs.readFileSync(URL_FILE, 'utf8').trim();
}
