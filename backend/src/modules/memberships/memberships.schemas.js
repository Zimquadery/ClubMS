const { z } = require('zod');
const { PAGINATION, paginatedSchema } = require('../../middleware/validate');

const join = z.object({
  agreedToRules: z.boolean().optional(),
});

const transferAdmin = z.object({
  newAdminId: z.string().uuid('Invalid user ID'),
});

const updateRole = z.object({
  role: z.enum(['STUDENT', 'FACULTY', 'CLUB_ADMIN']),
});

const listMembersQuery = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'ALUMNI', 'REJECTED']).optional(),
  search: z.string().max(25, 'Search must be at most 25 characters').optional(),
  ...paginatedSchema(50),
});

const bulkAction = z.object({
  userIds: z.array(z.string().uuid('Invalid user ID')).min(1, 'At least one user ID is required').max(100),
});

module.exports = { join, transferAdmin, updateRole, listMembersQuery, bulkAction };
