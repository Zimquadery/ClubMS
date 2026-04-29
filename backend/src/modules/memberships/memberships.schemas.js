const { z } = require('zod');
const { PAGINATION } = require('../../middleware/validate');

const transferAdmin = z.object({
  newAdminId: z.string().uuid('Invalid user ID'),
});

const listMembersQuery = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'ALUMNI', 'REJECTED']).optional(),
  ...PAGINATION,
  limit: PAGINATION.limit.default(50),
});

const bulkAction = z.object({
  userIds: z.array(z.string().uuid('Invalid user ID')).min(1, 'At least one user ID is required').max(100),
});

module.exports = { transferAdmin, listMembersQuery, bulkAction };
