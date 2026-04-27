const { z } = require('zod');

const create = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().max(200).optional(),
  bannerUrl: z.string().url().max(500).optional().or(z.literal('')),
});

const update = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().max(200).optional().or(z.literal('')),
  bannerUrl: z.string().url().max(500).optional().or(z.literal('')),
});

const listQuery = z.object({
  clubId: z.string().uuid().optional(),
  joined: z.enum(['true', 'false']).optional(),
  timeRange: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { create, update, listQuery };
