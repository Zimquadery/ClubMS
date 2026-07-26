require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { retryReadsOnTransient } = require('./dbRetry');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  require('../lib/logger').logger.error({ err }, 'pg Pool idle client error');
});

const adapter = new PrismaPg(pool);
const baseClient = new PrismaClient({ adapter });

const prisma = baseClient.$extends({
  query: { $allOperations: retryReadsOnTransient },
});

module.exports = { prisma };
