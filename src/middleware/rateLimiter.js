const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const TIME = require('../constants/time');
const ERROR_MESSAGES = require('../constants/errors');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: ERROR_MESSAGES.RATE_LIMIT.TOO_MANY_REQUESTS,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: ERROR_MESSAGES.RATE_LIMIT.TOO_MANY_AUTH_ATTEMPTS,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: ERROR_MESSAGES.RATE_LIMIT.TOO_MANY_REGISTRATIONS,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Light limiter for username/email availability checks
const checkLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many username/email checks, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OAuth rate limiter - prevents OAuth abuse
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 OAuth attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many OAuth attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  checkLimiter,
  oauthLimiter,
};
