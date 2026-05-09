const { z } = require('zod');
const { paginatedSchema } = require('../../middleware/validate');

const rsvpStatus = z.enum(['GOING', 'MAYBE', 'NOT_GOING']);

const upsert = z.object({
  status: rsvpStatus,
});

const listQuery = z.object({
  status: rsvpStatus.optional(),
  search: z.string().optional(),
  ...paginatedSchema(50),
});

module.exports = { upsert, listQuery };
