const { z } = require('zod');
const { paginatedSchema } = require('../../middleware/validate');

const rsvpStatus = z.enum(['GOING', 'MAYBE', 'NOT_GOING']);

const upsert = z.object({
  status: rsvpStatus,
});

const listQuery = z.object({
  status: rsvpStatus.optional(),
  search: z.string().max(25, 'Search must be at most 25 characters').optional(),
  ...paginatedSchema(50),
});

module.exports = { upsert, listQuery };
