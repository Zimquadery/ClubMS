const { z } = require('zod');

const listQuery = z.object({
  action: z.string().max(100).optional(),
  actorId: z.string().uuid().optional(),
  targetType: z.string().max(50).optional(),
  targetId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = { listQuery };
