const clubsService = require('./clubs.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { AppError } = require('../../utils/errors');

const list = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const clubs = await clubsService.list({ search, category });
  res.status(200).json(clubs);
});

const getById = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const club = await clubsService.getById(req.params.id, userId);
  res.status(200).json(club);
});

const create = asyncHandler(async (req, res) => {
  const { name, description, category, logoUrl, adminUserId } = req.body;
  if (!name || !category) throw new AppError('Name and category are required', 400);
  const club = await clubsService.create({ name, description, category, logoUrl, adminUserId });
  res.status(201).json(club);
});

const deleteClub = asyncHandler(async (req, res) => {
  const result = await clubsService.deleteClub(req.params.id);
  res.status(200).json(result);
});

const getCategories = asyncHandler(async (_req, res) => {
  const categories = clubsService.getCategories();
  res.status(200).json(categories);
});

module.exports = { list, getById, create, deleteClub, getCategories };
