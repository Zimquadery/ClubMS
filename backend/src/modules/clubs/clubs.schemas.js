const { z } = require('zod');
const { CLUB_CATEGORIES } = require('./clubs.constants');

const create = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  category: z.enum(CLUB_CATEGORIES, { message: `Category must be one of: ${CLUB_CATEGORIES.join(', ')}` }),
  logoUrl: z.string().url().max(500).optional().or(z.literal('')),
  adminUserId: z.string().uuid().optional(),
});

const update = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  category: z.enum(CLUB_CATEGORIES, { message: `Category must be one of: ${CLUB_CATEGORIES.join(', ')}` }).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal('')),
});

const listQuery = z.object({
  search: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { create, update, listQuery };
