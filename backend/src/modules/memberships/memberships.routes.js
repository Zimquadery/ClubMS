const express = require('express');
const membershipsController = require('./memberships.controller');
const { authMiddleware } = require('../../middleware/auth');
const { requireRole, requireClubAdmin } = require('../../middleware/rbac');

const router = express.Router();

router.post('/:clubId/join', authMiddleware, requireRole('STUDENT'), membershipsController.requestJoin);
router.get('/:clubId/members', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, membershipsController.listMembers);
router.patch('/:clubId/members/:userId/approve', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, membershipsController.approve);
router.patch('/:clubId/members/:userId/reject', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, membershipsController.reject);
router.patch('/:clubId/members/:userId/alumni', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, membershipsController.setAlumni);
router.post('/:clubId/transfer', authMiddleware, requireRole('CLUB_ADMIN'), requireClubAdmin, membershipsController.transferAdmin);

const adminRouter = express.Router();
adminRouter.get('/my-clubs', authMiddleware, membershipsController.getMyClubs);
adminRouter.get('/my-admin-clubs', authMiddleware, requireRole('CLUB_ADMIN'), membershipsController.getAdminClubs);

module.exports = { router, adminRouter };
