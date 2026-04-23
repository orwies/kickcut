'use strict';

const express = require('express');
const { loginLimiter } = require('../middleware/rateLimiter');
const { verifyJWT } = require('../middleware/auth');
const { setSession, getSession, clearSession } = require('../sessionStore');

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
 * Rejected if the account already has an active session on another device.
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await req.pool.dispatch('login', { username, password });

    // If an active session already exists for this account, block the new login
    if (getSession(result.user.id)) {
      return res.status(409).json({
        error: 'This account is already logged in on another device. Please log out there first.',
      });
    }

    // No existing session — register this as the active one
    setSession(result.user.id, result.token);

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

/**
 * POST /auth/logout
 * Invalidate the current session so the account can be used on another device.
 */
router.post('/logout', verifyJWT, (req, res) => {
  clearSession(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
