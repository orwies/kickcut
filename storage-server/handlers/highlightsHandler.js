'use strict';

const { Highlight } = require('../db/schemas');

// Converts _id ObjectId to plain string so it survives TCP JSON serialization
function serialize(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  return obj;
}

async function handleHighlightsRequest(type, payload) {
  switch (type) {
    case 'CREATE_HIGHLIGHT': {
      const h = await Highlight.create(payload);
      return serialize(h);
    }

    case 'FIND_HIGHLIGHTS': {
      const query = { status: payload.status || 'approved' };
      if (payload.competition) query.competition = new RegExp(payload.competition, 'i');
      if (payload.matchStage)  query.matchStage  = new RegExp(payload.matchStage, 'i');
      if (payload.homeTeam)    query.homeTeam    = new RegExp(payload.homeTeam, 'i');
      if (payload.awayTeam)    query.awayTeam    = new RegExp(payload.awayTeam, 'i');
      if (payload.dateFrom || payload.dateTo) {
        query.date = {};
        if (payload.dateFrom) query.date.$gte = new Date(payload.dateFrom);
        if (payload.dateTo)   query.date.$lte = new Date(payload.dateTo);
      }
      const results = await Highlight.find(query).sort({ createdAt: -1 });
      return serialize(results);
    }

    case 'FIND_PENDING_HIGHLIGHTS': {
      const results = await Highlight.find({ status: 'pending' }).sort({ createdAt: -1 });
      return serialize(results);
    }

    case 'UPDATE_HIGHLIGHT': {
      const { id, updates } = payload;
      const allowed = {};
      if (updates.status && ['pending', 'approved'].includes(updates.status)) {
        allowed.status = updates.status;
      }
      const updated = await Highlight.findByIdAndUpdate(id, allowed, { new: true });
      if (!updated) throw new Error('Highlight not found');
      return serialize(updated);
    }

    case 'DELETE_HIGHLIGHT': {
      const deleted = await Highlight.findByIdAndDelete(payload.id);
      if (!deleted) throw new Error('Highlight not found');
      return { deleted: true };
    }

    case 'LIKE_HIGHLIGHT': {
      const { id, userId } = payload;
      const h = await Highlight.findById(id);
      if (!h) throw new Error('Highlight not found');
      if (h.likes.includes(userId)) {
        h.likes.pull(userId);
      } else {
        h.likes.push(userId);
      }
      await h.save();
      return serialize(h);
    }

    default:
      throw new Error(`Unknown highlight message type: ${type}`);
  }
}

module.exports = { handleHighlightsRequest };
