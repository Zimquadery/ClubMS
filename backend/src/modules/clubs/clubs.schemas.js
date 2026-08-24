const { z } = require('zod');
const { PAGINATION, OPTIONAL_URL } = require('../../middleware/validate');
const { CLUB_CATEGORIES } = require('./clubs.constants');

const create = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  rules: z.string().max(4000).optional(),
  category: z.enum(CLUB_CATEGORIES, { message: `Category must be one of: ${CLUB_CATEGORIES.join(', ')}` }),
  logoUrl: OPTIONAL_URL,
  adminUserId: z.string().uuid().optional(),
});

const update = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  rules: z.string().max(4000).optional().or(z.literal('')),
  category: z.enum(CLUB_CATEGORIES, { message: `Category must be one of: ${CLUB_CATEGORIES.join(', ')}` }).optional(),
  logoUrl: OPTIONAL_URL,
});

const profile = z.object({
  description: z.string().max(1000).optional().or(z.literal('')),
  rules: z.string().max(4000).optional().or(z.literal('')),
});

const joinRules = z.object({
  joinRuleMode: z.enum(['ALL', 'ALLOW', 'BLOCK']),
  joinDepartments: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
}).refine((v) => v.joinRuleMode === 'ALL' || v.joinDepartments.length > 0, {
  message: 'Select at least one department',
});

const listQuery = z.object({
  search: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  ...PAGINATION,
});

const getByIdQuery = z.object({
  membersPage: z.coerce.number().int().min(1).default(1),
  membersLimit: z.coerce.number().int().min(1).max(100).default(10),
  membersSearch: z.string().max(25, 'Search must be at most 25 characters').optional(),
  membersStatus: z.enum(['ACTIVE', 'ALUMNI']).default('ACTIVE'),
  eventsPage: z.coerce.number().int().min(1).default(1),
  eventsLimit: z.coerce.number().int().min(1).max(100).default(5),
});

module.exports = { create, update, profile, joinRules, listQuery, getByIdQuery };
