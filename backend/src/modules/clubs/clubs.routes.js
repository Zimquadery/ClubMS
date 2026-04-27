const express = require('express');
const clubsController = require('./clubs.controller');
const eventsController = require('../events/events.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole, requireClubAdmin } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { create: createSchema, update: updateSchema, listQuery: listQuerySchema } = require('./clubs.schemas');
const { create: eventCreateSchema } = require('../events/events.schemas');

const router = express.Router();

router.get('/categories', authMiddleware, clubsController.getCategories);
router.get('/', authMiddleware, validateQuery(listQuerySchema), clubsController.list);
router.patch('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), validate(updateSchema), clubsController.update);
router.get('/:id', authMiddleware, clubsController.getById);
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), validate(createSchema), clubsController.create);
router.post('/:clubId/events', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(eventCreateSchema), eventsController.create);
router.delete('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.deleteClub);

module.exports = router;
