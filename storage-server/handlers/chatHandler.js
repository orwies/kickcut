'use strict';

// Handles chat messages and channel management.
// Public channels are shared, KickBot messages are private (filtered by ownerId).

const { ChatMessage, Channel } = require('../db/schemas');

/**
 * Standardizes MongoDB documents into plain JSON objects for consistent TCP delivery.
 * Receives a Mongoose 'doc' or an array of documents.
 * Extracts the raw object and converts the ObjectId '_id' into a standard string.
 * Returns the serializable plain JavaScript object.
 */
function serialize(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  return obj;
}

/**
 * Orchestrates chat-related database operations based on incoming RPC requests.
 * Receives an action 'type' string and a 'payload' data object.
 * Routes the command to the appropriate Mongoose model to create messages, fetch history, or manage channels.
 * Returns a Promise resolving to the requested database record(s) or execution confirmation.
 */
async function handleChatRequest(type, payload) {
  switch (type) {

    case 'CREATE_CHAT_MESSAGE':
    case 'createChatMessage': {
      const { userId, username, text, channel = 'general', isBot = false, ownerId = null } = payload;
      if (!text || !text.trim()) throw new Error('Message text is required');
      const msg = await ChatMessage.create({
        userId, username,
        text: text.trim().substring(0, 1000), // hard cap: schema enforces maxlength too
        channel, isBot,
        ownerId: ownerId || userId,
      });
      return serialize(msg);
    }

    case 'FIND_CHAT_MESSAGES':
    case 'getChatMessages': {
      const limit = Math.min(parseInt(payload.limit || '50', 10), 100); // never return more than 100
      const channel = payload.channel || 'general';
      let filter;
      if (channel === 'kickbot') {
        // KickBot is private — only show this user's conversation
        filter = { channel: 'kickbot', ownerId: payload.userId };
      } else {
        // Public channel — everyone sees the same history
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
      // Returns channels sorted by creation date so the sidebar stays stable
      const channels = await Channel.find({}).sort({ createdAt: 1 });
      return serialize(channels);
    }

    case 'DELETE_CHANNEL': {
      const ch = await Channel.findOneAndDelete({ id: payload.id });
      if (ch) {
        // Cascade delete: remove all messages belonging to this channel too
        await ChatMessage.deleteMany({ channel: payload.id });
      }
      return { deleted: true };
    }

    default:
      throw new Error(`Unknown chat message type: ${type}`);
  }
}

module.exports = { handleChatRequest };
