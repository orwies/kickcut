'use strict';

const { ChatMessage } = require('../db/schemas');

function serialize(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  return obj;
}

async function handleChatRequest(type, payload) {
  switch (type) {
    case 'CREATE_CHAT_MESSAGE': {
      const { userId, username, text, channel = 'general', isBot = false, ownerId = null } = payload;
      if (!text || !text.trim()) throw new Error('Message text is required');
      const msg = await ChatMessage.create({
        userId, username,
        text: text.trim().substring(0, 1000),
        channel, isBot,
        ownerId: ownerId || userId,
      });
      return serialize(msg);
    }

    case 'FIND_CHAT_MESSAGES': {
      const limit = Math.min(parseInt(payload.limit || '50', 10), 100);
      const channel = payload.channel || 'general';
      let filter;
      if (channel === 'kickbot') {
        filter = { channel: 'kickbot', ownerId: payload.userId };
      } else {
        filter = { $or: [{ channel: 'general' }, { channel: { $exists: false } }] };
      }
      const messages = await ChatMessage.find(filter).sort({ createdAt: 1 }).limit(limit);
      return serialize(messages);
    }

    default:
      throw new Error(`Unknown chat message type: ${type}`);
  }
}

module.exports = { handleChatRequest };
