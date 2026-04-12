'use strict';

const db = require('../db/jsonDb');

async function handleChatRequest(type, payload) {
  switch (type) {
    case 'CREATE_CHAT_MESSAGE': {
      const { userId, username, text } = payload;
      if (!text || !text.trim()) throw new Error('Message text is required');
      return db.create('chat_messages', {
        userId,
        username,
        text: text.trim().substring(0, 500),
      });
    }

    case 'FIND_CHAT_MESSAGES': {
      const limit = Math.min(parseInt(payload.limit || '50', 10), 100);
      const all = db.find('chat_messages');
      all.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return all.slice(-limit); // last N in chronological order
    }

    default:
      throw new Error(`Unknown chat message type: ${type}`);
  }
}

module.exports = { handleChatRequest };
