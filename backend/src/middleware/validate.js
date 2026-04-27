const { z } = require('zod');
const { AppError } = require('../utils/errors');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join('; ');
      return next(new AppError(messages, 400));
    }
    req.body = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join('; ');
      return next(new AppError(messages, 400));
    }
    req.query = result.data;
    next();
  };
}

const PAGINATION = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const OPTIONAL_URL = z.string().url().max(500).optional().or(z.literal(''));

module.exports = { validate, validateQuery, PAGINATION, OPTIONAL_URL };
