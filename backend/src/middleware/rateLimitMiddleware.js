const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

// Standard error handler for rate limit exceed
const rateLimitHandler = (message) => (req, res) => {
  return ApiResponse.error(res, message, 429);
};

// Rate limiter for authentication routes (login, register)
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication attempts from this IP. Please try again after 15 minutes.'),
  skip: () => env.NODE_ENV === 'test' // Disable in test environment for test suite stability
});

// Strict rate limiter for password reset requests (prevents email bombing)
const passwordResetLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many password reset requests. Please try again after 15 minutes.'),
  skip: () => env.NODE_ENV === 'test'
});

// Global API rate limiter
const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_GLOBAL,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests. Please slow down.'),
  skip: () => env.NODE_ENV === 'test'
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  globalLimiter
};
