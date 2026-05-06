const rsvpService = require('./rsvp.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const upsert = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rsvp = await rsvpService.upsert(id, req.user.userId, req.body.status, req.user.role);
  res.status(200).json(rsvp);
});

const remove = asyncHandler(async (req, res) => {
  await rsvpService.remove(req.params.id, req.user.userId);
  res.status(200).json({ success: true });
});

const listByEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, page, limit, search } = req.query;
  const result = await rsvpService.listByEvent(id, { status, page, limit, userId: req.user.userId, userRole: req.user.role, search });
  res.status(200).json(result);
});

const getUserRsvp = asyncHandler(async (req, res) => {
  const rsvp = await rsvpService.getUserRsvp(req.params.id, req.user.userId);
  res.status(200).json(rsvp);
});

const exportRsvps = asyncHandler(async (req, res) => {
  const csv = await rsvpService.exportRsvpsCsv(req.params.id, req.user.userId, req.user.role);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rsvps-${req.params.id}.csv"`);
  res.status(200).send(csv);
});

module.exports = { upsert, remove, listByEvent, getUserRsvp, exportRsvps };
