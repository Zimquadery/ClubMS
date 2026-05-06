const express = require('express');
const rsvpController = require('./rsvp.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { upsert: upsertSchema, listQuery } = require('./rsvp.schemas');

const router = express.Router();

/**
 * @openapi
 * /events/{id}/rsvp:
 *   post:
 *     tags: [RSVP]
 *     summary: Set or update RSVP for an event
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [GOING, MAYBE, NOT_GOING] }
 *     responses:
 *       200:
 *         description: RSVP saved
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/rsvp', authMiddleware, validate(upsertSchema), rsvpController.upsert);

/**
 * @openapi
 * /events/{id}/rsvp:
 *   delete:
 *     tags: [RSVP]
 *     summary: Remove RSVP for an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: RSVP removed
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id/rsvp', authMiddleware, rsvpController.remove);

/**
 * @openapi
 * /events/{id}/rsvp:
 *   get:
 *     tags: [RSVP]
 *     summary: Get current user's RSVP for an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: RSVP data
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/rsvp', authMiddleware, rsvpController.getUserRsvp);

/**
 * @openapi
 * /events/{id}/rsvps:
 *   get:
 *     tags: [RSVP]
 *     summary: List RSVPs for an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated list of RSVPs
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/rsvps', authMiddleware, requireRole('CLUB_ADMIN'), validateQuery(listQuery), rsvpController.listByEvent);

/**
 * @openapi
 * /events/{id}/rsvps/export:
 *   get:
 *     tags: [RSVP]
 *     summary: Export RSVPs for an event as CSV (CLUB_ADMIN of event's club or PLATFORM_ADMIN only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: CSV file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not an admin of this event's club
 */
router.get('/:id/rsvps/export', authMiddleware, requireRole('CLUB_ADMIN'), rsvpController.exportRsvps);

module.exports = router;
