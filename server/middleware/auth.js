'use strict';

const jwt = require('jsonwebtoken');
const { isTokenActive } = require('../sessionStore');

/**
 * Middleware: verifyJWT
 * Validates the Bearer token in the Authorization header.
 * Attaches decoded user payload to req.user.
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
 * Middleware: requireAdmin
 * Must be used after verifyJWT. Rejects non-admin users.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

module.exports = { verifyJWT, requireAdmin };
