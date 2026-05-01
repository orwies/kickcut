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

/**
 * Registers a new active session for a user.
 * Receives 'userId' and the signed JWT 'token' string.
 * Overwrites any existing token entry, effectively locking the session to the newest login.
 * Returns nothing.
 */
function setSession(userId, token) {
  sessions.set(String(userId), token);
}

/**
 * Retrieves the currently active token for a given user.
 * Receives the 'userId' string.
 * Queries the internal memory map for the latest registered JWT.
 * Returns the token string, or null if the user has no active session.
 */
function getSession(userId) {
  return sessions.get(String(userId)) ?? null;
}

/**
 * Verifies if a provided token is currently the authoritative active session.
 * Receives 'userId' and the 'token' to verify.
 * Compares the given token against the one securely stored in memory.
 * Returns true if the token matches the active session, false otherwise.
 */
function isTokenActive(userId, token) {
  return sessions.get(String(userId)) === token;
}

/**
 * Permanently invalidates a user's session.
 * Receives the 'userId' string.
 * Deletes the entry from the session map, forcing the user to re-authenticate on all devices.
 * Returns nothing.
 */
function clearSession(userId) {
  sessions.delete(String(userId));
}

module.exports = { setSession, getSession, isTokenActive, clearSession };
