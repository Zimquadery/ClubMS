const express = require('express');
const eventsController = require('./events.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { create: createSchema, update: updateSchema, listQuery: listQuerySchema } = require('./events.schemas');

const router = express.Router();

router.get('/', authMiddleware, validateQuery(listQuerySchema), eventsController.list);
router.get('/:id', authMiddleware, eventsController.getById);
router.patch('/:id', authMiddleware, requireRole('CLUB_ADMIN'), validate(updateSchema), eventsController.updateEvent);
router.delete('/:id', authMiddleware, requireRole('CLUB_ADMIN'), eventsController.deleteEvent);

module.exports = router;
