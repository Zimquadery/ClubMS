require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

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

const RETRYABLE = [
  'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ENOTCONN', 'EPIPE',
  '57P03', '57P02', '57P01',
  'P1001', 'P1002', 'P1008',
];

const prisma = baseClient.$extends({
  query: {
    $allOperations({ args, query }) {
      return query(args).catch((error) => {
        const code = error.code || error.meta?.code;
        if (RETRYABLE.includes(code)) {
          return query(args);
        }
        throw error;
      });
    }
  }
});

module.exports = { prisma };
