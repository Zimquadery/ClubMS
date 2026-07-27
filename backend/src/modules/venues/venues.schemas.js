const { z } = require('zod');
const { PAGINATION } = require('../../middleware/validate');

const create = z.object({
  name: z.string().min(1, 'Name is required').max(200),
});

const update = z.object({
  name: z.string().min(1).max(200).optional(),
});

const listQuery = z.object({
  search: z.string().max(100).optional(),
  ...PAGINATION,
});

module.exports = { create, update, listQuery };
