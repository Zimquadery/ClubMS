const express = require('express');
const eventsController = require('./events.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();

router.get('/', authMiddleware, eventsController.list);
router.delete('/:id', authMiddleware, requireRole('CLUB_ADMIN'), eventsController.deleteEvent);

module.exports = router;
