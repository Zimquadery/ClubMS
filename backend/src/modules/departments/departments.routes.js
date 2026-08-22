const express = require('express');
const departmentsController = require('./departments.controller');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

/**
 * @openapi
 * /departments:
 *   get:
 *     tags: [Departments]
 *     summary: List distinct departments set by users
 *     description: 'Distinct, trimmed, case-insensitive-deduped, sorted department names (suggestions for join-rule pickers).'
 *     responses:
 *       200:
 *         description: List of department names
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, departmentsController.list);

module.exports = router;
