const { z } = require('zod');
const { PAGINATION } = require('../../middleware/validate');

const rsvpStatus = z.enum(['GOING', 'MAYBE', 'NOT_GOING']);

const upsert = z.object({
  status: rsvpStatus,
});

const listQuery = z.object({
  status: rsvpStatus.optional(),
  ...PAGINATION,
  limit: PAGINATION.limit.default(50),
});

module.exports = { upsert, listQuery };
