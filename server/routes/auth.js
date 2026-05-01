'use strict';

// Auth routes: Login, Register, Logout, and identity checks.
// Enforces a single-device login policy using sessionStore.js.


const express = require('express');
const { loginLimiter } = require('../middleware/rateLimiter');
const { verifyJWT } = require('../middleware/auth');
const { setSession, getSession, clearSession } = require('../sessionStore');

const router = express.Router();

/**
 * POST /auth/register - Creates a new user account.
 * Receives 'username' and 'password' from the request body.
 * Dispatches a 'register' command to the worker pool to securely hash the password and save to DB.
 * Returns the newly created user object (status 201) or an error.
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
 * POST /auth/login - Authenticates a user and issues a signed JWT.
 * Receives 'username' and 'password' credentials.
 * Dispatches a 'login' command to verify credentials, checks for existing sessions to enforce single-device policy, and registers the session.
 * Returns the authentication token and user profile, or throws a 409 conflict if already logged in elsewhere.
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
 * GET /auth/me - Retrieves the currently authenticated user's profile.
 * Takes the user identity from the validated JWT attached to the request.
 * Formats a safe response object, strictly omitting sensitive data like password hashes.
 * Returns the authenticated user object.
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
 * POST /auth/logout - Invalidates the current user session.
 * Relies on the valid JWT to identify the requesting user.
 * Clears the server-side session registry, allowing the user to log in from a different device.
 * Returns a generic success confirmation {ok: true}.
 */
router.post('/logout', verifyJWT, (req, res) => {
  clearSession(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
