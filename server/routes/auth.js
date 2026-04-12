'use strict';

const express = require('express');
const { loginLimiter } = require('../middleware/rateLimiter');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /auth/register
 * Create a new user account.
 */
router.post('/register', loginLimiter, async (req, res) => {
  try {
    // Sanitise: only pass allowed fields to worker
    const { username, password } = req.body;
    const result = await req.pool.dispatch('register', { username, password });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /auth/login
 * Authenticate user and issue a signed JWT.
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await req.pool.dispatch('login', { username, password });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /auth/me
 * Return the currently authenticated user (no password hash ever returned).
 */
router.get('/me', verifyJWT, (req, res) => {
  // Never expose passwordHash – req.user comes from JWT which never contained it
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

module.exports = router;
