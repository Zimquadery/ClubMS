const express = require('express');
const announcementsController = require('./announcements.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole, requireClubAdmin } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { create: createSchema, update: updateSchema, listQuery: listQuerySchema, recentQuery: recentQuerySchema } = require('./announcements.schemas');
const { auditLog } = require('../../middleware/auditLog');

const router = express.Router();

/**
 * @openapi
 * /clubs/{clubId}/announcements:
 *   post:
 *     tags: [Announcements]
 *     summary: Create an announcement
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
 *             required: [title, content]
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               content: { type: string, maxLength: 2000 }
 *     responses:
 *       201:
 *         description: Announcement created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/:clubId/announcements', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(createSchema), auditLog('ANNOUNCEMENT_CREATE', (req) => ({ type: 'announcement', id: req.createdAnnouncementId })), announcementsController.create);

/**
 * @openapi
 * /clubs/{clubId}/announcements:
 *   get:
 *     tags: [Announcements]
 *     summary: List announcements for a club
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of announcements
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:clubId/announcements', authMiddleware, validateQuery(listQuerySchema), announcementsController.list);

/**
 * @openapi
 * /clubs/{clubId}/announcements/{announcementId}:
 *   get:
 *     tags: [Announcements]
 *     summary: Get a single announcement
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Announcement details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Announcement not found
 */
router.get('/:clubId/announcements/:announcementId', authMiddleware, announcementsController.getById);

/**
 * @openapi
 * /clubs/{clubId}/announcements/{announcementId}:
 *   patch:
 *     tags: [Announcements]
 *     summary: Update an announcement
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               content: { type: string, maxLength: 2000 }
 *     responses:
 *       200:
 *         description: Announcement updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Announcement not found
 */
router.patch('/:clubId/announcements/:announcementId', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(updateSchema), auditLog('ANNOUNCEMENT_UPDATE', (req) => ({ type: 'announcement', id: req.params.announcementId })), announcementsController.update);

/**
 * @openapi
 * /clubs/{clubId}/announcements/{announcementId}:
 *   delete:
 *     tags: [Announcements]
 *     summary: Delete an announcement
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Announcement deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Announcement not found
 */
router.delete('/:clubId/announcements/:announcementId', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, auditLog('ANNOUNCEMENT_DELETE', (req) => ({ type: 'announcement', id: req.params.announcementId })), announcementsController.remove);

/**
 * @openapi
 * /clubs/{clubId}/announcements/{announcementId}/pin:
 *   patch:
 *     tags: [Announcements]
 *     summary: Toggle pin status of an announcement
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pin toggled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Announcement not found
 */
router.patch('/:clubId/announcements/:announcementId/pin', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, announcementsController.togglePin);

const recentRouter = express.Router();

/**
 * @openapi
 * /announcements/recent:
 *   get:
 *     tags: [Announcements]
 *     summary: Get recent announcements from user's clubs
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 20, default: 5 }
 *     responses:
 *       200:
 *         description: Recent announcements
 *       401:
 *         description: Unauthorized
 */
recentRouter.get('/recent', authMiddleware, validateQuery(recentQuerySchema), announcementsController.getRecent);

module.exports = { router, recentRouter };
