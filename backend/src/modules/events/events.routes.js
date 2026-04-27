const express = require('express');
const eventsController = require('./events.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { create: createSchema, update: updateSchema, listQuery: listQuerySchema } = require('./events.schemas');
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
 *               location: { type: string }
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

module.exports = router;
