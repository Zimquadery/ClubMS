const departmentsService = require('./departments.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const list = asyncHandler(async (_req, res) => {
  res.status(200).json(await departmentsService.list());
});

module.exports = { list };
