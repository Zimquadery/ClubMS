const express = require('express');
const statsController = require('./stats.controller');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

/**
 * @openapi
 * /stats/dashboard:
 *   get:
 *     tags: [Stats]
 *     summary: Get dashboard stats
 *     description: Returns role-specific stats. PLATFORM_ADMIN sees global, CLUB_ADMIN sees their clubs, STUDENT sees their own.
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', authMiddleware, statsController.getDashboard);

module.exports = router;
