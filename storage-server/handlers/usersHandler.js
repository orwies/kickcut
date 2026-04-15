'use strict';

const { User } = require('../db/schemas');

function serialize(doc) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  return obj;
}

async function handleUsersRequest(type, payload) {
  switch (type) {
    case 'CREATE_USER': {
      const existing = await User.findOne({ username: payload.username });
      if (existing) throw new Error('Username already taken');
      const user = await User.create({
        username: payload.username,
        passwordHash: payload.passwordHash,
        role: payload.role || 'user',
      });
      return serialize(user);
    }

    case 'FIND_USER': {
      const user = await User.findOne({ username: payload.username });
      if (!user) throw new Error('User not found');
      return serialize(user);
    }

    default:
      throw new Error(`Unknown user message type: ${type}`);
  }
}

module.exports = { handleUsersRequest };
