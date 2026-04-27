const eventsService = require('./events.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { clubId } = req.query;
  const joinedBool = req.query.joined === 'true';
  const userId = req.user.userId;
  const events = await eventsService.list({ clubId: clubId || undefined, joined: joinedBool, userId });
  res.status(200).json(events);
});

const create = asyncHandler(async (req, res) => {
  const { clubId } = req.params;
  const { title, description, startTime, endTime, location, bannerUrl } = req.body;
  const event = await eventsService.create(clubId, { title, description, startTime, endTime, location, bannerUrl });
  res.status(201).json(event);
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isPlatformAdmin = req.user.role === 'PLATFORM_ADMIN';
  const result = await eventsService.remove(id, req.user.userId, isPlatformAdmin);
  res.status(200).json(result);
});

module.exports = { list, create, deleteEvent };
