const auditService = require('./audit.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const getLogs = asyncHandler(async (req, res) => {
  const { action, actorId, targetType, targetId, page, limit } = req.query;
  const result = await auditService.list({ action, actorId, targetType, targetId, page, limit });
  res.status(200).json(result);
});

module.exports = { getLogs };
