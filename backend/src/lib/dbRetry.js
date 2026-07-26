const { logger } = require('./logger');

// Transient connection-level codes worth a single retry. If any of these
// surfaces, the query may never have reached Postgres (or the connection died
// before the result returned), so a fresh pool client can succeed on retry.
const RETRYABLE = [
  'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ENOTCONN', 'EPIPE',
  '57P03', '57P02', '57P01',
  'P1001', 'P1002', 'P1008',
];

// Only idempotent read operations are safe to retry automatically. Writes
// (create/update/upsert/delete/updateMany/deleteMany), $transaction bodies, and
// raw queries are NOT retried: if the write committed before the connection
// dropped, re-executing it would double-apply the effect.
const READ_OPERATIONS = new Set([
  'findUnique', 'findUniqueOrThrow',
  'findFirst', 'findFirstOrThrow',
  'findMany',
  'count', 'aggregate', 'groupBy',
]);

// Prisma $allOperations query hook. Single immediate retry for transient read
// failures; everything else (non-retryable code, or any non-read op) rethrows.
async function retryReadsOnTransient({ operation, args, query }) {
  try {
    return await query(args);
  } catch (error) {
    if (!READ_OPERATIONS.has(operation)) throw error;
    const code = error.code || error.meta?.code;
    if (!RETRYABLE.includes(code)) throw error;
    logger.warn({ code, operation }, 'Transient database error on read; retrying once');
    return query(args);
  }
}

module.exports = { retryReadsOnTransient, READ_OPERATIONS, RETRYABLE };
