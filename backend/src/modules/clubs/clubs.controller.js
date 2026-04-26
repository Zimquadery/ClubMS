const clubsService = require('./clubs.service');

async function list(req, res, next) {
  try {
    const { search, category } = req.query;
    const clubs = await clubsService.list({ search, category });
    res.status(200).json(clubs);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const userId = req.user?.userId;
    const club = await clubsService.getById(req.params.id, userId);
    res.status(200).json(club);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, description, category, logoUrl, adminUserId } = req.body;

    if (!name || !category) {
      const { AppError } = require('../../utils/errors');
      throw new AppError('Name and category are required', 400);
    }

    const club = await clubsService.create({ name, description, category, logoUrl, adminUserId });
    res.status(201).json(club);
  } catch (err) {
    next(err);
  }
}

async function deleteClub(req, res, next) {
  try {
    const result = await clubsService.deleteClub(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getCategories(_req, res, next) {
  try {
    const categories = clubsService.getCategories();
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, deleteClub, getCategories };
