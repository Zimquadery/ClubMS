const express = require('express');
const statsController = require('./stats.controller');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

router.get('/dashboard', authMiddleware, statsController.getDashboard);

module.exports = router;
