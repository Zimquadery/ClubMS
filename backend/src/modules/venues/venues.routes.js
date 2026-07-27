const express = require('express');
const venuesController = require('./venues.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { create: createSchema, update: updateSchema, listQuery: listQuerySchema } = require('./venues.schemas');
const { auditLog } = require('../../middleware/auditLog');

const router = express.Router();

/**
 * @openapi
 * /venues:
 *   get:
 *     tags: [Venues]
 *     summary: List venues (any authenticated user; powers event dropdown & filter)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of venues
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, validateQuery(listQuerySchema), venuesController.list);

/**
 * @openapi
 * /venues:
 *   post:
 *     tags: [Venues]
 *     summary: Create a venue (platform admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Venue created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Venue name already exists
 */
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), validate(createSchema), auditLog('VENUE_CREATE', (req) => ({ type: 'venue', id: req.createdVenueId, metadata: { name: req.body.name } })), venuesController.create);

/**
 * @openapi
 * /venues/{id}:
 *   patch:
 *     tags: [Venues]
 *     summary: Update a venue (platform admin only)
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
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Venue updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Venue not found
 *       409:
 *         description: Venue name already exists
 */
router.patch('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), validate(updateSchema), auditLog('VENUE_UPDATE', (req) => ({ type: 'venue', id: req.params.id })), venuesController.update);

/**
 * @openapi
 * /venues/{id}:
 *   delete:
 *     tags: [Venues]
 *     summary: Delete a venue (platform admin only). Linked events keep their venue name snapshot.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Venue deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Venue not found
 */
router.delete('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), auditLog('VENUE_DELETE', (req) => ({ type: 'venue', id: req.params.id })), venuesController.remove);

module.exports = router;
