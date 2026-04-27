const { z } = require('zod');

const rsvpStatus = z.enum(['GOING', 'MAYBE', 'NOT_GOING']);

const upsert = z.object({
  status: rsvpStatus,
});

const listQuery = z.object({
  status: rsvpStatus.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = { upsert, listQuery };
