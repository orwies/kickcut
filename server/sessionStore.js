'use strict';

/**
 * sessionStore.js
 *
 * In-memory store that tracks the single active JWT token per user.
 * When a user logs in, their old token is immediately invalidated.
 * All HTTP requests and WS connections bearing a stale token will be rejected.
 */

// Map<userId, token>
const sessions = new Map();

function setSession(userId, token) {
  sessions.set(String(userId), token);
}

function getSession(userId) {
  return sessions.get(String(userId)) ?? null;
}

function isTokenActive(userId, token) {
  return sessions.get(String(userId)) === token;
}

function clearSession(userId) {
  sessions.delete(String(userId));
}

module.exports = { setSession, getSession, isTokenActive, clearSession };
