'use strict';

const db = require('../db/jsonDb');

async function handleHighlightsRequest(type, payload) {
  switch (type) {
    case 'CREATE_HIGHLIGHT': {
      return db.create('highlights', payload);
    }

    case 'FIND_HIGHLIGHTS': {
      const status = payload.status || 'approved';
      const results = db.find('highlights', (h) => {
        if (h.status !== status) return false;
        if (payload.competition && !h.competition.toLowerCase().includes(payload.competition.toLowerCase())) return false;
        if (payload.homeTeam && !h.homeTeam.toLowerCase().includes(payload.homeTeam.toLowerCase())) return false;
        if (payload.awayTeam && !h.awayTeam.toLowerCase().includes(payload.awayTeam.toLowerCase())) return false;
        if (payload.dateFrom && new Date(h.date) < new Date(payload.dateFrom)) return false;
        if (payload.dateTo && new Date(h.date) > new Date(payload.dateTo)) return false;
        return true;
      });
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return results;
    }

    case 'FIND_PENDING_HIGHLIGHTS': {
      const results = db.find('highlights', (h) => h.status === 'pending');
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return results;
    }

    case 'UPDATE_HIGHLIGHT': {
      const { id, updates } = payload;
      const safeUpdates = {};
      if (updates.status && ['pending', 'approved'].includes(updates.status)) {
        safeUpdates.status = updates.status;
      }
      const updated = db.updateById('highlights', id, safeUpdates);
      if (!updated) throw new Error('Highlight not found');
      return updated;
    }

    case 'DELETE_HIGHLIGHT': {
      const deleted = db.deleteById('highlights', payload.id);
      if (!deleted) throw new Error('Highlight not found');
      return { deleted: true };
    }

    case 'LIKE_HIGHLIGHT': {
      const { id, userId } = payload;
      const highlight = db.findOne('highlights', (h) => h._id === id);
      if (!highlight) throw new Error('Highlight not found');

      const likes = highlight.likes || [];
      const alreadyLiked = likes.includes(userId);
      const newLikes = alreadyLiked
        ? likes.filter((l) => l !== userId)
        : [...likes, userId];

      const updated = db.replaceById('highlights', id, { ...highlight, likes: newLikes });
      return updated;
    }

    default:
      throw new Error(`Unknown highlight message type: ${type}`);
  }
}

module.exports = { handleHighlightsRequest };
