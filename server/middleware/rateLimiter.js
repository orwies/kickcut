'use strict';

// Rate limiting to prevent brute-force (strict for auth) and spam (relaxed for API).

const rateLimit = require('express-rate-limit');


/**
 * Strict Express rate limiter middleware for authentication endpoints.
 * Takes no arguments natively (configured via express-rate-limit).
 * Caps traffic to 10 requests per 15-minute window per IP to thwart brute-force cracking.
 * Returns the middleware function to be injected into routes.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 10,                   // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: false,
});

/**
 * Relaxed Express rate limiter middleware for general API endpoints.
 * Takes no arguments natively (configured via express-rate-limit).
 * Caps traffic to 120 requests per minute to prevent accidental spamming while allowing high usage.
 * Returns the middleware function to be injected into routes.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { loginLimiter, apiLimiter };
