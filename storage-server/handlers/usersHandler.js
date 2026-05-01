'use strict';

// Manages user data in the database.
// No raw passwords here, just hashes. Mongoose handles the safety for us.

const { User } = require('../db/schemas');

/**
 * Converts a Mongoose document to a plain object and ensures IDs are strings for transmission.
 * Receives a raw Mongoose user 'doc'.
 * Strips the internal Mongoose wrapper and safely casts the ObjectId to a string.
 * Returns a clean JSON-serializable user object.
 */
function serialize(doc) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  return obj;
}

/**
 * Handles database operations for user accounts via TCP RPC calls.
 * Receives an action 'type' string and a 'payload' object.
 * Processes 'CREATE_USER' for registration and 'FIND_USER' for authentication lookups via Mongoose.
 * Returns a Promise resolving to the serialized user object or throws if not found/duplicate.
 */
async function handleUsersRequest(type, payload) {
  switch (type) {

    case 'CREATE_USER': {
      // Check for duplicate username before trying to insert — gives a friendlier
      // error than the MongoDB unique-index violation would.
      const existing = await User.findOne({ username: payload.username });
      if (existing) throw new Error('Username already taken');

      const user = await User.create({
        username: payload.username,
        passwordHash: payload.passwordHash, // already hashed by the caller
        role: payload.role || 'user',       // default to 'user' unless explicitly set
      });
      return serialize(user);
    }

    case 'FIND_USER': {
      // Used during login — the caller will then compare the returned hash
      // with the supplied password using bcrypt.compare.
      const user = await User.findOne({ username: payload.username });
      if (!user) throw new Error('User not found');
      return serialize(user);
    }

    default:
      throw new Error(`Unknown user message type: ${type}`);
  }
}

module.exports = { handleUsersRequest };
