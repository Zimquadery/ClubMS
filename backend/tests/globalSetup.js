const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');

const URL_FILE = path.join(__dirname, '.pg.url');
const BACKEND_ROOT = path.resolve(__dirname, '..');

module.exports = async function globalSetup() {
  if (process.env.JEST_NO_DB === '1') {
    return async () => {};
  }

  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('clubms_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const url = container.getConnectionUri();
  fs.writeFileSync(URL_FILE, url, 'utf8');

  execSync('npx prisma migrate deploy', {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL: url },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  return async () => {
    try { fs.unlinkSync(URL_FILE); } catch { /* already gone */ }
    try { await container.stop(); } catch { /* best effort */ }
  };
};
