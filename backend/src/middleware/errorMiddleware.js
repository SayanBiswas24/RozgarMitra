const ApiResponse = require('../utils/apiResponse');
const env = require('../config/env');

/**
 * 404 Route Not Found Middleware
 */
function notFoundHandler(req, res, next) {
  return ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

/**
 * Centralized Application Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  // Log unexpected errors on server side
  if (env.NODE_ENV !== 'test') {
    console.error('[Error Details]', {
      name: err.name,
      message: err.message,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // Handle JSON syntax parse error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.error(res, 'Malformed JSON payload in request body.', 400);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.error(res, `Invalid resource identifier format for field '${err.path}'.`, 400);
  }

  // Handle Mongoose duplicate key (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return ApiResponse.error(res, `An account with this ${field} already exists.`, 409);
  }

  // Handle Mongoose Schema validation error
  if (err.name === 'ValidationError') {
    const formattedErrors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.error(res, 'Database validation failed.', 400, formattedErrors);
  }

  // Handle JWT specific errors if reached here
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid token provided.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Token has expired.', 401);
  }

  // Default to 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected server error occurred.'
    : err.message || 'Internal server error.';

  return ApiResponse.error(res, message, statusCode);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
