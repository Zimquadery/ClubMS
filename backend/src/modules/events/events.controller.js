const eventsService = require('./events.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { isPrivilegedRole } = require('../../middleware/rbac');

const list = asyncHandler(async (req, res) => {
  const { clubId, joined, timeRange, page, limit } = req.query;
  const userId = req.user.userId;
  const result = await eventsService.list({ clubId, joined: joined === 'true', timeRange, userId, page, limit });
  res.status(200).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const event = await eventsService.getById(req.params.id, userId);
  res.status(200).json(event);
});

const create = asyncHandler(async (req, res) => {
  const { clubId } = req.params;
  const event = await eventsService.create(clubId, req.body);
  res.status(201).json(event);
});

const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await eventsService.update(id, req.user.userId, req.body, isPrivilegedRole(req.user.role));
  res.status(200).json(event);
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await eventsService.remove(id, req.user.userId, isPrivilegedRole(req.user.role));
  res.status(200).json(result);
});

module.exports = { list, getById, create, updateEvent, deleteEvent };
