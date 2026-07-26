const membershipsService = require('./memberships.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const requestJoin = asyncHandler(async (req, res) => {
  const membership = await membershipsService.requestJoin(req.params.clubId, req.user.userId);
  res.status(201).json(membership);
});

const listMembers = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await membershipsService.listMembers(req.params.clubId, { status, page, limit });
  res.status(200).json(result);
});

const approve = asyncHandler(async (req, res) => {
  const membership = await membershipsService.approve(req.params.clubId, req.params.userId);
  res.status(200).json(membership);
});

const reject = asyncHandler(async (req, res) => {
  const membership = await membershipsService.reject(req.params.clubId, req.params.userId);
  res.status(200).json(membership);
});

const setAlumni = asyncHandler(async (req, res) => {
  const membership = await membershipsService.setAlumni(req.params.clubId, req.params.userId);
  res.status(200).json(membership);
});

const transferAdmin = asyncHandler(async (req, res) => {
  const result = await membershipsService.transferAdmin(req.params.clubId, req.user.userId, req.body.newAdminId, req.user.role);
  res.status(200).json(result);
});

const leaveClub = asyncHandler(async (req, res) => {
  const result = await membershipsService.leaveClub(req.params.clubId, req.user.userId);
  res.status(200).json(result);
});

const removeMember = asyncHandler(async (req, res) => {
  const result = await membershipsService.removeMember(req.params.clubId, req.params.userId, req.user.userId);
  res.status(200).json(result);
});

const getMyClubs = asyncHandler(async (req, res) => {
  const clubs = await membershipsService.getMyClubs(req.user.userId);
  res.status(200).json(clubs);
});

const getAdminClubs = asyncHandler(async (req, res) => {
  const clubs = await membershipsService.getAdminClubs(req.user.userId);
  res.status(200).json(clubs);
});

const promoteMember = asyncHandler(async (req, res) => {
  const result = await membershipsService.promoteMember(req.params.clubId, req.params.userId);
  req.auditPriorRole = result.priorUserRole;
  const { priorUserRole, ...membership } = result;
  res.status(200).json(membership);
});

const demoteMember = asyncHandler(async (req, res) => {
  const membership = await membershipsService.demoteMember(req.params.clubId, req.params.userId, req.user.userId);
  res.status(200).json(membership);
});

const bulkApprove = asyncHandler(async (req, res) => {
  const result = await membershipsService.bulkApprove(req.params.clubId, req.body.userIds);
  res.status(200).json(result);
});

const bulkReject = asyncHandler(async (req, res) => {
  const result = await membershipsService.bulkReject(req.params.clubId, req.body.userIds);
  res.status(200).json(result);
});

const exportMembers = asyncHandler(async (req, res) => {
  const csv = await membershipsService.exportMembersCsv(req.params.clubId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="members-${req.params.clubId}.csv"`);
  res.status(200).send(csv);
});

const updateUserRole = asyncHandler(async (req, res) => {
  const user = await membershipsService.updateUserRole(req.params.userId, req.body.role);
  res.status(200).json(user);
});

module.exports = { requestJoin, listMembers, approve, reject, setAlumni, transferAdmin, leaveClub, removeMember, getAdminClubs, getMyClubs, promoteMember, demoteMember, bulkApprove, bulkReject, exportMembers, updateUserRole };
