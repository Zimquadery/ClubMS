const { logger } = require('../lib/logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, _req, res, _next) {
  if (err.code === 'P2002') {
    return res.status(409).json({
      status: 'error',
      statusCode: 409,
      message: `Duplicate value for ${err.meta?.target?.join(', ') ?? 'unique field'}`,
    });
  }

  // Multer errors (LIMIT_FILE_SIZE etc.) carry no statusCode and would 500
  if (typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'File exceeds the 5MB size limit',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    logger.error({ err, statusCode }, 'Unhandled error');
  } else {
    logger.warn({ statusCode, message }, 'Client error');
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
}

module.exports = { AppError, errorHandler };
