const rsvpService = require('./rsvp.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const upsert = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rsvp = await rsvpService.upsert(id, req.user.userId, req.body.status);
  res.status(200).json(rsvp);
});

const remove = asyncHandler(async (req, res) => {
  await rsvpService.remove(req.params.id, req.user.userId);
  res.status(200).json({ success: true });
});

const listByEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, page, limit } = req.query;
  const result = await rsvpService.listByEvent(id, { status, page, limit });
  res.status(200).json(result);
});

const getUserRsvp = asyncHandler(async (req, res) => {
  const rsvp = await rsvpService.getUserRsvp(req.params.id, req.user.userId);
  res.status(200).json(rsvp);
});

module.exports = { upsert, remove, listByEvent, getUserRsvp };
