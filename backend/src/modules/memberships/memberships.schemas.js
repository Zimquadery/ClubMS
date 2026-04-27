const { z } = require('zod');

const transferAdmin = z.object({
  newAdminId: z.string().uuid('Invalid user ID'),
});

const listMembersQuery = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'ALUMNI', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = { transferAdmin, listMembersQuery };
