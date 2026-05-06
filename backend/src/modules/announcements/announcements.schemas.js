const { z } = require('zod');
const { PAGINATION } = require('../../middleware/validate');

const create = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(2000),
});

const update = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
}).refine(data => data.title !== undefined || data.content !== undefined, {
  message: 'At least one field is required',
});

const listQuery = z.object({
  ...PAGINATION,
});

const recentQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

module.exports = { create, update, listQuery, recentQuery };
