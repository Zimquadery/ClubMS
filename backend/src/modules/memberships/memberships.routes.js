const express = require('express');
const membershipsController = require('./memberships.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole, requireClubAdmin } = require('../../middleware/rbac');
const { validate, validateQuery } = require('../../middleware/validate');
const { join: joinSchema, approve: approveSchema, position: positionSchema, transferAdmin: transferAdminSchema, listMembersQuery, bulkAction: bulkActionSchema, updateRole: updateRoleSchema } = require('./memberships.schemas');
const { auditLog } = require('../../middleware/auditLog');

const router = express.Router();

/**
 * @openapi
 * /clubs/{clubId}/join:
 *   post:
 *     tags: [Memberships]
 *     summary: Request to join a club
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agreedToRules: { type: boolean, description: 'Required (true) when the club has rules' }
 *     responses:
 *       201:
 *         description: Join request submitted
 *       400:
 *         description: Club rules agreement missing
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Already a member or pending
 */
router.post('/:clubId/join', authMiddleware, requireRole('STUDENT'), validate(joinSchema), membershipsController.requestJoin);

/**
 * @openapi
 * /clubs/{clubId}/leave:
 *   post:
 *     tags: [Memberships]
 *     summary: Leave a club
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Left the club
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Membership not found
 */
router.post('/:clubId/leave', authMiddleware, requireRole('STUDENT'), membershipsController.leaveClub);

/**
 * @openapi
 * /clubs/{clubId}/members:
 *   get:
 *     tags: [Memberships]
 *     summary: List club members
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
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, ACTIVE, ALUMNI, REJECTED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of members
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:clubId/members', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validateQuery(listMembersQuery), membershipsController.listMembers);

/**
 * @openapi
 * /clubs/{clubId}/members/bulk-approve:
 *   post:
 *     tags: [Memberships]
 *     summary: Bulk approve members
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
 *             required: [userIds]
 *             properties:
 *               userIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Members approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/:clubId/members/bulk-approve', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(bulkActionSchema), auditLog('MEMBERSHIP_BULK_APPROVE', (req) => ({ type: 'membership', metadata: { clubId: req.params.clubId, userIds: req.body.userIds } })), membershipsController.bulkApprove);

/**
 * @openapi
 * /clubs/{clubId}/members/bulk-reject:
 *   post:
 *     tags: [Memberships]
 *     summary: Bulk reject members
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
 *             required: [userIds]
 *             properties:
 *               userIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Members rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/:clubId/members/bulk-reject', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(bulkActionSchema), auditLog('MEMBERSHIP_BULK_REJECT', (req) => ({ type: 'membership', metadata: { clubId: req.params.clubId, userIds: req.body.userIds } })), membershipsController.bulkReject);

/**
 * @openapi
 * /clubs/{clubId}/members/export:
 *   get:
 *     tags: [Memberships]
 *     summary: Export club members as CSV
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: CSV file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:clubId/members/export', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, membershipsController.exportMembers);

/**
 * @openapi
 * /clubs/{clubId}/members/{userId}/promote:
 *   patch:
 *     tags: [Memberships]
 *     summary: Promote member to officer
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Member promoted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Member not found
 */
router.patch('/:clubId/members/:userId/promote', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, auditLog('MEMBERSHIP_PROMOTE', (req) => ({ type: 'membership', id: req.params.userId, metadata: { clubId: req.params.clubId, priorUserRole: req.auditPriorRole } })), membershipsController.promoteMember);

/**
 * @openapi
 * /clubs/{clubId}/members/{userId}/demote:
 *   patch:
 *     tags: [Memberships]
 *     summary: Demote officer to member
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Member demoted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Member not found
 */
router.patch('/:clubId/members/:userId/demote', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, auditLog('MEMBERSHIP_DEMOTE', (req) => ({ type: 'membership', id: req.params.userId, metadata: { clubId: req.params.clubId } })), membershipsController.demoteMember);

/**
 * @openapi
 * /clubs/{clubId}/members/{userId}/approve:
 *   patch:
 *     tags: [Memberships]
 *     summary: Approve a membership request
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Membership approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Membership not found
 */
router.patch('/:clubId/members/:userId/approve', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(approveSchema), auditLog('MEMBERSHIP_APPROVE', (req) => ({ type: 'membership', id: req.params.userId, metadata: { clubId: req.params.clubId, position: req.body.position ?? null } })), membershipsController.approve);

router.patch('/:clubId/members/:userId/position', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(positionSchema), auditLog('MEMBERSHIP_POSITION_UPDATE', (req) => ({ type: 'membership', id: req.params.userId, metadata: { clubId: req.params.clubId, position: req.body.position } })), membershipsController.updatePosition);

/**
 * @openapi
 * /clubs/{clubId}/members/{userId}/reject:
 *   patch:
 *     tags: [Memberships]
 *     summary: Reject a membership request
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Membership rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Membership not found
 */
router.patch('/:clubId/members/:userId/reject', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, auditLog('MEMBERSHIP_REJECT', (req) => ({ type: 'membership', id: req.params.userId, metadata: { clubId: req.params.clubId } })), membershipsController.reject);

/**
 * @openapi
 * /clubs/{clubId}/members/{userId}/alumni:
 *   patch:
 *     tags: [Memberships]
 *     summary: Set member as alumni
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Member set as alumni
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Membership not found
 */
router.patch('/:clubId/members/:userId/alumni', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, auditLog('MEMBERSHIP_SET_ALUMNI', (req) => ({ type: 'membership', id: req.params.userId, metadata: { clubId: req.params.clubId } })), membershipsController.setAlumni);

/**
 * @openapi
 * /clubs/{clubId}/members/{userId}:
 *   delete:
 *     tags: [Memberships]
 *     summary: Remove a member from a club
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Member removed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Membership not found
 */
router.delete('/:clubId/members/:userId', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, auditLog('MEMBERSHIP_REMOVE', (req) => ({ type: 'membership', id: req.params.userId, metadata: { clubId: req.params.clubId } })), membershipsController.removeMember);

/**
 * @openapi
 * /clubs/{clubId}/transfer:
 *   post:
 *     tags: [Memberships]
 *     summary: Transfer club admin to another member
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
 *             required: [newAdminId]
 *             properties:
 *               newAdminId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Admin transferred
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Membership not found
 */
router.post('/:clubId/transfer', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, validate(transferAdminSchema), auditLog('MEMBERSHIP_TRANSFER_ADMIN', (req) => ({ type: 'membership', id: req.body.newAdminId, metadata: { clubId: req.params.clubId, newAdminId: req.body.newAdminId } })), membershipsController.transferAdmin);

/**
 * @openapi
 * /memberships/my-clubs:
 *   get:
 *     tags: [Memberships]
 *     summary: Get current user's clubs
 *     responses:
 *       200:
 *         description: List of user's clubs
 *       401:
 *         description: Unauthorized
 */
const adminRouter = express.Router();
adminRouter.get('/my-clubs', authMiddleware, membershipsController.getMyClubs);

/**
 * @openapi
 * /memberships/my-admin-clubs:
 *   get:
 *     tags: [Memberships]
 *     summary: Get clubs where user is admin
 *     responses:
 *       200:
 *         description: List of admin clubs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
adminRouter.get('/my-admin-clubs', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.getAdminClubs);

/**
 * @openapi
 * /memberships/users/{userId}/role:
 *   patch:
 *     tags: [Memberships]
 *     summary: Change a user's role (PLATFORM_ADMIN only)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [STUDENT, FACULTY, CLUB_ADMIN] }
 *     responses:
 *       200:
 *         description: Role updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
adminRouter.patch('/users/:userId/role', authMiddleware, requireRole('PLATFORM_ADMIN'), validate(updateRoleSchema), auditLog('USER_ROLE_UPDATE', (req) => ({ type: 'user', id: req.params.userId, metadata: { newRole: req.body.role } })), membershipsController.updateUserRole);

module.exports = { router, adminRouter };
