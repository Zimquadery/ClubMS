const { z } = require('zod');
const { PAGINATION, OPTIONAL_URL } = require('../../middleware/validate');
const { CLUB_CATEGORIES } = require('./clubs.constants');

const create = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  category: z.enum(CLUB_CATEGORIES, { message: `Category must be one of: ${CLUB_CATEGORIES.join(', ')}` }),
  logoUrl: OPTIONAL_URL,
  adminUserId: z.string().uuid().optional(),
});

const update = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  category: z.enum(CLUB_CATEGORIES, { message: `Category must be one of: ${CLUB_CATEGORIES.join(', ')}` }).optional(),
  logoUrl: OPTIONAL_URL,
});

const listQuery = z.object({
  search: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  ...PAGINATION,
});

module.exports = { create, update, listQuery };
