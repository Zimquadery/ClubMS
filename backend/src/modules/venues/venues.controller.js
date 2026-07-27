const venuesService = require('./venues.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await venuesService.list({ search, page, limit });
  res.status(200).json(result);
});

const create = asyncHandler(async (req, res) => {
  const venue = await venuesService.create(req.body);
  req.createdVenueId = venue.id;
  res.status(201).json(venue);
});

const update = asyncHandler(async (req, res) => {
  const venue = await venuesService.update(req.params.id, req.body);
  res.status(200).json(venue);
});

const remove = asyncHandler(async (req, res) => {
  const result = await venuesService.remove(req.params.id);
  res.status(200).json(result);
});

module.exports = { list, create, update, remove };
