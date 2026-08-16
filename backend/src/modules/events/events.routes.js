const express = require('express');
const eventsController = require('./events.controller');
const cohostInvitesController = require('../cohostInvites/cohostInvites.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { create: createSchema, update: updateSchema, listQuery: listQuerySchema } = require('./events.schemas');
const { create: inviteCreateSchema } = require('../cohostInvites/cohostInvites.schemas');
const { auditLog } = require('../../middleware/auditLog');

const router = express.Router();

/**
 * @openapi
 * /events:
 *   get:
 *     tags: [Events]
 *     summary: List events
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: timeRange
 *         schema: { type: string, enum: [upcoming, past, all], default: upcoming }
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: venueId
 *         schema: { type: string, description: "Venue id, or 'none' for custom/other venues" }
 *       - in: query
 *         name: tags
 *         schema: { type: string, description: "Comma-separated tag names; returns events matching any of them" }
 *     responses:
 *       200:
 *         description: Paginated list of events
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, validateQuery(listQuerySchema), eventsController.list);

/**
 * @openapi
 * /events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Get event by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Event details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
router.get('/:id', authMiddleware, eventsController.getById);

/**
 * @openapi
 * /events/{id}:
 *   patch:
 *     tags: [Events]
 *     summary: Update an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               venueId: { type: string, format: uuid, description: "Managed venue id (mutually exclusive with venue)" }
 *               venue: { type: string, description: "Custom venue text (used when venueId is absent)" }
 *               tags: { type: array, items: { type: string }, description: "Optional event tags (max 10)" }
 *     responses:
 *       200:
 *         description: Event updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.patch('/:id', authMiddleware, requireRole('CLUB_ADMIN'), validate(updateSchema), auditLog('EVENT_UPDATE', (req) => ({ type: 'event', id: req.params.id })), eventsController.updateEvent);

/**
 * @openapi
 * /events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Event deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.delete('/:id', authMiddleware, requireRole('CLUB_ADMIN'), auditLog('EVENT_DELETE', (req) => ({ type: 'event', id: req.params.id })), eventsController.deleteEvent);

/**
 * @openapi
 * /events/{id}/cohosts/{clubId}:
 *   delete:
 *     tags: [Events]
 *     summary: Remove a co-host club from an event (cannot remove primary)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Co-host removed
 *       400:
 *         description: Cannot remove primary host
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an officer of a host club
 *       404:
 *         description: Event or co-host not found
 */
router.delete('/:id/cohosts/:clubId', authMiddleware, requireRole('CLUB_ADMIN'), auditLog('EVENT_COHOST_REMOVE', (req) => ({ type: 'event', id: req.params.id, metadata: { coHostClubId: req.params.clubId } })), eventsController.removeCoHost);

/**
 * @openapi
 * /events/{id}/cohost-invites:
 *   post:
 *     tags: [Co-host Invites]
 *     summary: Invite a club to co-host an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clubId]
 *             properties:
 *               clubId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Invitation sent
 *       400:
 *         description: Cannot invite the primary host
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an officer of a host club
 *       404:
 *         description: Event or club not found
 *       409:
 *         description: Club already a host, or invitation already pending
 */
router.post('/:id/cohost-invites', authMiddleware, requireRole('CLUB_ADMIN'), validate(inviteCreateSchema), auditLog('EVENT_COHOST_INVITE', (req) => ({ type: 'event', id: req.params.id, metadata: { invitedClubId: req.coHostInviteClubId || req.body.clubId } })), cohostInvitesController.create);

/**
 * @openapi
 * /events/{id}/cohost-invites:
 *   get:
 *     tags: [Co-host Invites]
 *     summary: List pending co-host invitations for an event (host officers only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pending invitations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an officer of a host club
 *       404:
 *         description: Event not found
 */
router.get('/:id/cohost-invites', authMiddleware, requireRole('CLUB_ADMIN'), cohostInvitesController.listForEvent);

/**
 * @openapi
 * /events/{id}/cohost-invites/{inviteId}:
 *   delete:
 *     tags: [Co-host Invites]
 *     summary: Cancel a pending co-host invitation (host officers only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invitation cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an officer of a host club
 *       404:
 *         description: Invitation not found
 */
router.delete('/:id/cohost-invites/:inviteId', authMiddleware, requireRole('CLUB_ADMIN'), auditLog('EVENT_COHOST_INVITE_CANCEL', (req) => ({ type: 'event', id: req.params.id, metadata: { inviteId: req.params.inviteId } })), cohostInvitesController.cancel);

module.exports = router;
