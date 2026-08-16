const cohostInvitesService = require('./cohostInvites.service');
const eventHostsService = require('../eventHosts/eventHosts.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { isPrivilegedRole } = require('../../utils/roles');

const create = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  if (!isPrivilegedRole(req.user.role)) {
    await eventHostsService.assertHostOfficer(req.user.userId, eventId);
  }
  const invite = await cohostInvitesService.create(eventId, req.body.clubId);
  req.coHostInviteClubId = req.body.clubId;
  res.status(201).json(invite);
});

const listForEvent = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  if (!isPrivilegedRole(req.user.role)) {
    await eventHostsService.assertHostOfficer(req.user.userId, eventId);
  }
  res.status(200).json(await cohostInvitesService.listForEvent(eventId));
});

const cancel = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const result = await cohostInvitesService.cancel(inviteId, req.user.userId, isPrivilegedRole(req.user.role));
  res.status(200).json(result);
});

const listIncoming = asyncHandler(async (req, res) => {
  const { clubId, page, limit } = req.query;
  res.status(200).json(await cohostInvitesService.listIncoming(req.user.userId, { clubId, page, limit }));
});

const accept = asyncHandler(async (req, res) => {
  const result = await cohostInvitesService.accept(req.params.id, req.user.userId, isPrivilegedRole(req.user.role));
  req.auditEventId = result.event?.id;
  req.acceptedInviteClubId = result.club?.id;
  res.status(200).json(result);
});

const reject = asyncHandler(async (req, res) => {
  const result = await cohostInvitesService.reject(req.params.id, req.user.userId, isPrivilegedRole(req.user.role));
  req.auditEventId = result.eventId;
  res.status(200).json(result);
});

module.exports = { create, listForEvent, cancel, listIncoming, accept, reject };
