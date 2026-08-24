const express = require('express');
const clubsController = require('./clubs.controller');
const eventsController = require('../events/events.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole, requireClubAdmin } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { create: createSchema, update: updateSchema, profile: profileSchema, joinRules: joinRulesSchema, listQuery: listQuerySchema, getByIdQuery: getByIdQuerySchema } = require('./clubs.schemas');
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
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), validate(createSchema), auditLog('CLUB_CREATE', (req) => ({ type: 'club', id: req.createdClubId, metadata: { name: req.body.name } })), clubsController.create);

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
 * /clubs/{clubId}/join-rules:
 *   patch:
 *     tags: [Clubs]
 *     summary: Update who can send join requests to a club (officer-managed)
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
 *             required: [joinRuleMode]
 *             properties:
 *               joinRuleMode: { type: string, enum: [ALL, ALLOW, BLOCK], description: 'ALL = anyone, ALLOW = only listed departments, BLOCK = all except listed departments' }
 *               joinDepartments: { type: array, items: { type: string }, maxItems: 10, description: 'Required non-empty unless joinRuleMode is ALL' }
 *     responses:
 *       200:
 *         description: Join rules updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Club not found
 */
router.patch('/:clubId/join-rules', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(joinRulesSchema), auditLog('CLUB_JOIN_RULES_UPDATE', (req) => ({ type: 'club', id: req.params.clubId, metadata: { joinRuleMode: req.body.joinRuleMode, joinDepartments: req.body.joinDepartments } })), clubsController.updateJoinRules);

/**
 * @openapi
 * /clubs/{clubId}/profile:
 *   patch:
 *     tags: [Clubs]
 *     summary: Update club description and rules (officer-managed)
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
 *             properties:
 *               description: { type: string, maxLength: 1000, description: 'Empty string clears' }
 *               rules: { type: string, maxLength: 4000, description: 'Disclosed separately; joiners must agree. Empty string clears' }
 *     responses:
 *       200:
 *         description: Club profile updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Club not found
 */
router.patch('/:clubId/profile', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(profileSchema), auditLog('CLUB_PROFILE_UPDATE', (req) => ({ type: 'club', id: req.params.clubId, metadata: { fields: Object.keys(req.body) } })), clubsController.updateProfile);

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
router.get('/:id', authMiddleware, validateQuery(getByIdQuerySchema), clubsController.getById);

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
 *               venueId: { type: string, format: uuid, description: "Managed venue id (mutually exclusive with venue)" }
 *               venue: { type: string, description: "Custom venue text (used when venueId is absent)" }
 *               tags: { type: array, items: { type: string }, description: "Optional event tags (max 10)" }
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
router.post('/:clubId/events', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(eventCreateSchema), auditLog('EVENT_CREATE', (req) => ({ type: 'event', id: req.createdEventId, metadata: { primaryClubId: req.params.clubId, inviteClubIds: req.body.inviteClubIds || [], title: req.body.title } })), eventsController.create);

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
