const { z } = require('zod');
const { paginatedSchema } = require('../../middleware/validate');

const listQuery = z.object({
  action: z.string().max(100).optional(),
  actorId: z.string().uuid().optional(),
  targetType: z.string().max(50).optional(),
  targetId: z.string().uuid().optional(),
  ...paginatedSchema(50),
});

module.exports = { listQuery };
