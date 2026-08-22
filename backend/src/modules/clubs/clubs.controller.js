const clubsService = require('./clubs.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { search, category, page, limit } = req.query;
  const result = await clubsService.list({ search, category, page, limit });
  res.status(200).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  const { membersPage, membersLimit, membersSearch, membersStatus, eventsPage, eventsLimit } = req.query;
  const club = await clubsService.getById(req.params.id, userId, {
    membersPage, membersLimit, membersSearch, membersStatus, eventsPage, eventsLimit, userRole
  });
  res.status(200).json(club);
});

const create = asyncHandler(async (req, res) => {
  const club = await clubsService.create(req.body);
  req.createdClubId = club.id;
  res.status(201).json(club);
});

const update = asyncHandler(async (req, res) => {
  const club = await clubsService.update(req.params.id, req.body);
  res.status(200).json(club);
});

const updateJoinRules = asyncHandler(async (req, res) => {
  const club = await clubsService.updateJoinRules(req.params.clubId, req.body);
  res.status(200).json(club);
});

const deleteClub = asyncHandler(async (req, res) => {
  const result = await clubsService.deleteClub(req.params.id);
  res.status(200).json(result);
});

const getCategories = asyncHandler(async (_req, res) => {
  const categories = clubsService.getCategories();
  res.status(200).json(categories);
});

module.exports = { list, getById, create, update, updateJoinRules, deleteClub, getCategories };
