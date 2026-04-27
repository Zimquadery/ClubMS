const statsService = require('./stats.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await statsService.getDashboardStats(req.user.userId, req.user.role);
  res.status(200).json(stats);
});

module.exports = { getDashboard };
