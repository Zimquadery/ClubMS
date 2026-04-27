const express = require('express');
const clubsController = require('./clubs.controller');
const eventsController = require('../events/events.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole, requireClubAdmin } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { create: createSchema, update: updateSchema, listQuery: listQuerySchema } = require('./clubs.schemas');
const { create: eventCreateSchema } = require('../events/events.schemas');
const { auditLog } = require('../../middleware/auditLog');

const router = express.Router();

/**
 * @openapi
 * /clubs/categories:
 *   get:
 *     tags: [Clubs]
 *     summary: Get club categories
 *     responses:
 *       200:
 *         description: List of categories
 *       401:
 *         description: Unauthorized
 */
router.get('/categories', authMiddleware, clubsController.getCategories);

/**
 * @openapi
 * /clubs:
 *   get:
 *     tags: [Clubs]
 *     summary: List clubs
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
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of clubs
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, validateQuery(listQuerySchema), clubsController.list);

/**
 * @openapi
 * /clubs:
 *   post:
 *     tags: [Clubs]
 *     summary: Create a club
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *     responses:
 *       201:
 *         description: Club created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), validate(createSchema), auditLog('CLUB_CREATE', (req) => ({ type: 'club', metadata: { name: req.body.name } })), clubsController.create);

/**
 * @openapi
 * /clubs/{id}:
 *   patch:
 *     tags: [Clubs]
 *     summary: Update a club
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
 *               description: { type: string }
 *               category: { type: string }
 *     responses:
 *       200:
 *         description: Club updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Club not found
 */
router.patch('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), validate(updateSchema), auditLog('CLUB_UPDATE', (req) => ({ type: 'club', id: req.params.id })), clubsController.update);

/**
 * @openapi
 * /clubs/{id}:
 *   get:
 *     tags: [Clubs]
 *     summary: Get club by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Club details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Club not found
 */
router.get('/:id', authMiddleware, clubsController.getById);

/**
 * @openapi
 * /clubs/{clubId}/events:
 *   post:
 *     tags: [Events]
 *     summary: Create an event for a club
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, startTime, endTime]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               location: { type: string }
 *     responses:
 *       201:
 *         description: Event created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/:clubId/events', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(eventCreateSchema), auditLog('EVENT_CREATE', (req) => ({ type: 'event', metadata: { clubId: req.params.clubId, title: req.body.title } })), eventsController.create);

/**
 * @openapi
 * /clubs/{id}:
 *   delete:
 *     tags: [Clubs]
 *     summary: Delete a club
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Club deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Club not found
 */
router.delete('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), auditLog('CLUB_DELETE', (req) => ({ type: 'club', id: req.params.id })), clubsController.deleteClub);

module.exports = router;
