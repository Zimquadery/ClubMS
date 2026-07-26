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

// Accepts a strict http(s) URL or a same-origin uploaded-image path. The upload
// endpoint returns relative /uploads/... paths, so plain z.string().url() would
// reject legitimate uploaded logos/banners. Protocol-relative (//host/...) and
// non-/uploads/ same-origin paths are rejected.
function isUrlOrUploadPath(value) {
  if (/^\/uploads\/[^\s]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const OPTIONAL_URL = z.string().max(500)
  .refine(isUrlOrUploadPath, { message: 'Must be a valid http(s) URL or an uploaded image path' })
  .optional()
  .or(z.literal(''));

module.exports = { validate, validateQuery, PAGINATION, OPTIONAL_URL, paginatedSchema };
