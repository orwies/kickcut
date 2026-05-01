'use strict';

// Manages football highlights. Handles uploads, filtering, and likes.
// New uploads go to 'pending' until approved by an admin.

const { Highlight } = require('../db/schemas');

/**
 * Converts _id ObjectId to a plain string so it can be sent over TCP as JSON.
 * Also handles arrays of documents.
 */
// Prepares MongoDB documents for TCP transmission by converting them to plain objects.
function serialize(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  return obj;
}

// Manages highlight CRUD operations and like/unlike toggling in the database.
async function handleHighlightsRequest(type, payload) {
  switch (type) {

    case 'CREATE_HIGHLIGHT': {
      const h = await Highlight.create(payload);
      return serialize(h);
    }

    case 'FIND_HIGHLIGHTS': {
      // Build the MongoDB query from whichever filters were supplied.
      // Regex filters are case-insensitive so "arsenal" matches "Arsenal".
      const query = { status: payload.status || 'approved' };
      if (payload.competition) query.competition = new RegExp(payload.competition, 'i');
      if (payload.matchStage)  query.matchStage  = new RegExp(payload.matchStage, 'i');
      if (payload.homeTeam)    query.homeTeam    = new RegExp(payload.homeTeam, 'i');
      if (payload.awayTeam)    query.awayTeam    = new RegExp(payload.awayTeam, 'i');
      // Generic team search: matches either homeTeam OR awayTeam
      if (payload.team) {
        const teamReg = new RegExp(payload.team, 'i');
        query.$or = [{ homeTeam: teamReg }, { awayTeam: teamReg }];
      }
      if (payload.dateFrom || payload.dateTo) {
        query.date = {};
        if (payload.dateFrom) query.date.$gte = new Date(payload.dateFrom);
        if (payload.dateTo)   query.date.$lte = new Date(payload.dateTo);
      }
      const results = await Highlight.find(query).sort({ createdAt: -1 });
      return serialize(results);
    }

    case 'FIND_PENDING_HIGHLIGHTS': {
      // Used by the admin panel to show the review queue
      const results = await Highlight.find({ status: 'pending' }).sort({ createdAt: -1 });
      return serialize(results);
    }

    case 'UPDATE_HIGHLIGHT': {
      const { id, updates } = payload;
      // Whitelist: only allow updating the status field, nothing else
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
      // Toggle: add userId if not present, remove it if it is
      const { id, userId } = payload;
      const h = await Highlight.findById(id);
      if (!h) throw new Error('Highlight not found');
      if (h.likes.includes(userId)) {
        h.likes.pull(userId);  // un-like
      } else {
        h.likes.push(userId);  // like
      }
      await h.save();
      return serialize(h);
    }

    default:
      throw new Error(`Unknown highlight message type: ${type}`);
  }
}

module.exports = { handleHighlightsRequest };
