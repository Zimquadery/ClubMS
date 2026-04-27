const express = require('express');
const auditController = require('./audit.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validateQuery } = require('../../middleware/validate');
const { listQuery } = require('./audit.schemas');

const router = express.Router();

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     tags: [Audit]
 *     summary: List audit logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by actor
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *         description: Filter by target type
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by target ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated list of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           action: { type: string }
 *                           actorId: { type: string, format: uuid, nullable: true }
 *                           targetType: { type: string, nullable: true }
 *                           targetId: { type: string, format: uuid, nullable: true }
 *                           metadata: { type: string, nullable: true }
 *                           ipAddress: { type: string, nullable: true }
 *                           createdAt: { type: string, format: date-time }
 *                           actor:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                               email: { type: string }
 *                               role: { type: string }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - PLATFORM_ADMIN only
 */
router.get('/', authMiddleware, requireRole('PLATFORM_ADMIN'), validateQuery(listQuery), auditController.getLogs);

module.exports = router;
