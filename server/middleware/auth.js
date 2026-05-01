'use strict';

const jwt = require('jsonwebtoken');
const { isTokenActive } = require('../sessionStore');

/**
 * Express middleware to validate JWT Bearer tokens in incoming requests.
 * Receives the standard 'req', 'res', and 'next' arguments.
 * Decodes the Authorization header, verifies the signature, and checks the session store to reject stale tokens.
 * Returns next() on success, or a 401 JSON error on failure.
 */
function verifyJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject stale tokens: a newer login on another device supersedes this one
    if (!isTokenActive(decoded.id, token)) {
      return res.status(401).json({ error: 'Session expired — you logged in from another device' });
    }

    req.user = decoded; // { id, username, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Express middleware to enforce administrator-only access control.
 * Receives the standard 'req', 'res', and 'next' arguments.
 * Inspects the 'req.user.role' populated by verifyJWT to ensure the user is an admin.
 * Returns next() on success, or a 403 JSON error on failure.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

module.exports = { verifyJWT, requireAdmin };
