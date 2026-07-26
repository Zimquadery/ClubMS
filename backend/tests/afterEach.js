const UNIT_ONLY = process.env.JEST_NO_DB === '1';

if (!UNIT_ONLY) {
  const { resetDb } = require('./db');
  afterEach(async () => {
    await resetDb();
  });
}
