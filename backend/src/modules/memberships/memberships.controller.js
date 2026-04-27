const membershipsService = require('./memberships.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { AppError } = require('../../utils/errors');

const requestJoin = asyncHandler(async (req, res) => {
  const membership = await membershipsService.requestJoin(req.params.clubId, req.user.userId);
  res.status(201).json(membership);
});

const listMembers = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const members = await membershipsService.listMembers(req.params.clubId, { status });
  res.status(200).json(members);
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
  const { newAdminId } = req.body;
  if (!newAdminId) throw new AppError('newAdminId is required', 400);
  const result = await membershipsService.transferAdmin(req.params.clubId, req.user.userId, newAdminId);
  res.status(200).json(result);
});

const leaveClub = asyncHandler(async (req, res) => {
  const result = await membershipsService.leaveClub(req.params.clubId, req.user.userId);
  res.status(200).json(result);
});

const removeMember = asyncHandler(async (req, res) => {
  const result = await membershipsService.removeMember(req.params.clubId, req.params.userId);
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

module.exports = { requestJoin, listMembers, approve, reject, setAlumni, transferAdmin, leaveClub, removeMember, getAdminClubs, getMyClubs };
