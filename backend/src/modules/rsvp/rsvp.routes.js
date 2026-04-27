const express = require('express');
const rsvpController = require('./rsvp.controller');
const { authMiddleware } = require('../../middleware/auth');
const { validate, validateQuery } = require('../../middleware/validate');
const { upsert: upsertSchema, listQuery } = require('./rsvp.schemas');

const router = express.Router();

router.post('/:id/rsvp', authMiddleware, validate(upsertSchema), rsvpController.upsert);
router.delete('/:id/rsvp', authMiddleware, rsvpController.remove);
router.get('/:id/rsvp', authMiddleware, rsvpController.getUserRsvp);
router.get('/:id/rsvps', authMiddleware, validateQuery(listQuery), rsvpController.listByEvent);

module.exports = router;
