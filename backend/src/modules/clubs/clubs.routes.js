const express = require('express');
const clubsController = require('./clubs.controller');
const eventsController = require('../events/events.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole, requireClubAdmin } = require('../../middleware/rbac');

const router = express.Router();

router.get('/categories', authMiddleware, clubsController.getCategories);
router.get('/', authMiddleware, clubsController.list);
router.patch('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.update);
router.get('/:id', authMiddleware, clubsController.getById);
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.create);
router.post('/:clubId/events', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, eventsController.create);
router.delete('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.deleteClub);

module.exports = router;
