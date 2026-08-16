const { z } = require('zod');
const { PAGINATION } = require('../../middleware/validate');

const create = z.object({
  clubId: z.string().uuid('Invalid clubId'),
});

const incomingQuery = z.object({
  clubId: z.string().uuid().optional(),
  ...PAGINATION,
});

module.exports = { create, incomingQuery };
