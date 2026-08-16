const express = require('express');
const cohostInvitesController = require('./cohostInvites.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validateQuery } = require('../../middleware/validate');
const { incomingQuery } = require('./cohostInvites.schemas');
const { auditLog } = require('../../middleware/auditLog');

const router = express.Router();

/**
 * @openapi
 * /cohost-invites/incoming:
 *   get:
 *     tags: [Co-host Invites]
 *     summary: List pending co-host invitations for the current user's officer clubs
 *     parameters:
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of pending invitations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/incoming', authMiddleware, requireRole('CLUB_ADMIN'), validateQuery(incomingQuery), cohostInvitesController.listIncoming);

/**
 * @openapi
 * /cohost-invites/{id}/accept:
 *   post:
 *     tags: [Co-host Invites]
 *     summary: Accept a co-host invitation (officer of the invited club)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invitation accepted, club is now a host
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an officer of the invited club
 *       404:
 *         description: Invitation not found
 */
router.post('/:id/accept', authMiddleware, requireRole('CLUB_ADMIN'), auditLog('EVENT_COHOST_INVITE_ACCEPT', (req) => ({ type: 'event', id: req.auditEventId, metadata: { clubId: req.acceptedInviteClubId } })), cohostInvitesController.accept);

/**
 * @openapi
 * /cohost-invites/{id}/reject:
 *   post:
 *     tags: [Co-host Invites]
 *     summary: Reject a co-host invitation (officer of the invited club)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invitation rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an officer of the invited club
 *       404:
 *         description: Invitation not found
 */
router.post('/:id/reject', authMiddleware, requireRole('CLUB_ADMIN'), auditLog('EVENT_COHOST_INVITE_REJECT', (req) => ({ type: 'event', id: req.auditEventId })), cohostInvitesController.reject);

module.exports = router;
