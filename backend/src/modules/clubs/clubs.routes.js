const express = require('express');
const clubsController = require('./clubs.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();

router.get('/categories', authMiddleware, clubsController.getCategories);
router.get('/', authMiddleware, clubsController.list);
router.get('/:id', authMiddleware, clubsController.getById);
router.post('/', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.create);
router.delete('/:id', authMiddleware, requireRole('PLATFORM_ADMIN'), clubsController.deleteClub);

module.exports = router;
