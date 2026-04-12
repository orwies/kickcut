'use strict';

const db = require('../db/jsonDb');

async function handleUsersRequest(type, payload) {
  switch (type) {
    case 'CREATE_USER': {
      const existing = db.findOne('users', (u) => u.username === payload.username);
      if (existing) throw new Error('Username already taken');
      const user = db.create('users', {
        username: payload.username,
        passwordHash: payload.passwordHash,
        role: payload.role || 'user',
      });
      return user;
    }

    case 'FIND_USER': {
      const user = db.findOne('users', (u) => u.username === payload.username);
      if (!user) throw new Error('User not found');
      return user;
    }

    default:
      throw new Error(`Unknown user message type: ${type}`);
  }
}

module.exports = { handleUsersRequest };
