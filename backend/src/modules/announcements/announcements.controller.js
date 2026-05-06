const announcementsService = require('./announcements.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const { clubId } = req.params;
  const announcement = await announcementsService.create(clubId, req.user.userId, req.body);
  req.createdAnnouncementId = announcement.id;
  res.status(201).json(announcement);
});

const list = asyncHandler(async (req, res) => {
  const { clubId } = req.params;
  const { page, limit } = req.query;
  const result = await announcementsService.list(clubId, req.user.userId, req.user.role, { page, limit });
  res.status(200).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const { clubId, announcementId } = req.params;
  const announcement = await announcementsService.getById(clubId, announcementId, req.user.userId, req.user.role);
  res.status(200).json(announcement);
});

const update = asyncHandler(async (req, res) => {
  const { clubId, announcementId } = req.params;
  const announcement = await announcementsService.update(clubId, announcementId, req.user.userId, req.body);
  res.status(200).json(announcement);
});

const remove = asyncHandler(async (req, res) => {
  const { clubId, announcementId } = req.params;
  const result = await announcementsService.remove(clubId, announcementId, req.user.userId);
  res.status(200).json(result);
});

const togglePin = asyncHandler(async (req, res) => {
  const { clubId, announcementId } = req.params;
  const result = await announcementsService.togglePin(clubId, announcementId, req.user.userId, req.ip);
  res.status(200).json(result);
});

const getRecent = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const result = await announcementsService.getRecent(req.user.userId, limit);
  res.status(200).json(result);
});

module.exports = { create, list, getById, update, remove, togglePin, getRecent };
