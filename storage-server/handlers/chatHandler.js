'use strict';

const { ChatMessage, Channel } = require('../db/schemas');

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
        filter = { channel };
      }
      const messages = await ChatMessage.find(filter).sort({ createdAt: 1 }).limit(limit);
      return serialize(messages);
    }

    case 'CREATE_CHANNEL': {
      const { id, label, icon, desc, adminOnly } = payload;
      let ch = await Channel.findOne({ id });
      if (ch) throw new Error('Channel already exists');
      ch = await Channel.create({ id, label, icon, desc, adminOnly });
      return serialize(ch);
    }

    case 'FIND_CHANNELS': {
      const channels = await Channel.find({}).sort({ createdAt: 1 });
      return serialize(channels);
    }

    case 'DELETE_CHANNEL': {
      const ch = await Channel.findOneAndDelete({ id: payload.id });
      if (ch) {
        // Also delete all messages in this channel
        await ChatMessage.deleteMany({ channel: payload.id });
      }
      return { deleted: true };
    }

    default:
      throw new Error(`Unknown chat message type: ${type}`);
  }
}

module.exports = { handleChatRequest };
