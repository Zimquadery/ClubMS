const { z } = require('zod');
const { PAGINATION, OPTIONAL_URL } = require('../../middleware/validate');

const create = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  venueId: z.string().uuid().optional(),
  venue: z.string().max(200).optional(),
  bannerUrl: OPTIONAL_URL,
  coHostClubIds: z.array(z.string().uuid()).max(10).optional(),
});

const update = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venueId: z.string().uuid().optional().or(z.literal('')),
  venue: z.string().max(200).optional().or(z.literal('')),
  bannerUrl: OPTIONAL_URL,
});

const listQuery = z.object({
  clubId: z.string().uuid().optional(),
  joined: z.enum(['true', 'false']).optional(),
  timeRange: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  venueId: z.union([z.string().uuid(), z.literal('none')]).optional(),
  ...PAGINATION,
});

const addCoHost = z.object({
  clubId: z.string().uuid('Invalid clubId'),
});

module.exports = { create, update, listQuery, addCoHost };
