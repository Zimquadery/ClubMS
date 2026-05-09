const { z } = require('zod');
const { AppError } = require('../utils/errors');

function handleParseResult(result, next) {
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join('; ');
    next(new AppError(messages, 400));
    return false;
  }
  return true;
}

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (handleParseResult(result, next)) {
      req.body = result.data;
      next();
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (handleParseResult(result, next)) {
      req.query = result.data;
      next();
    }
  };
}

const PAGINATION = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const paginatedSchema = (defaultLimit = 20) => ({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(defaultLimit),
});

const OPTIONAL_URL = z.string().url().max(500).optional().or(z.literal(''));

module.exports = { validate, validateQuery, PAGINATION, OPTIONAL_URL, paginatedSchema };
