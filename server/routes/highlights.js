'use strict';

const express = require('express');
const { verifyJWT, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const wsHub = require('../wsHub');

const router = express.Router();

/**
 * GET /highlights
 * Return all approved highlights with optional filters.
 */
router.get('/', async (req, res) => {
  try {
    const { competition, dateFrom, dateTo, homeTeam, awayTeam } = req.query;
    const result = await req.pool.dispatch('getHighlights', {
      status: 'approved',
      competition,
      dateFrom,
      dateTo,
      homeTeam,
      awayTeam,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /highlights/pending
 * Admin only: return all pending highlights.
 */
router.get('/pending', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await req.pool.dispatch('getPendingHighlights', {});
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /highlights
 * Upload a new highlight (authenticated users). Goes into pending state.
 */
router.post(
  '/',
  verifyJWT,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { homeTeam, awayTeam, competition, date, scoreHome, scoreAway } = req.body;

      const thumbnailPath = req.files?.thumbnail?.[0]
        ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}`
        : '';
      const videoPath = req.files?.video?.[0]
        ? `/uploads/videos/${req.files.video[0].filename}`
        : '';

      const result = await req.pool.dispatch('createHighlight', {
        homeTeam,
        awayTeam,
        competition,
        date,
        scoreHome,
        scoreAway,
        thumbnailPath,
        videoPath,
        uploadedBy: req.user.id,
        uploaderRole: req.user.role,  // admins skip the approval queue
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

/**
 * POST /highlights/:id/like
 * Toggle like on a highlight (authenticated).
 */
router.post('/:id/like', verifyJWT, async (req, res) => {
  try {
    const result = await req.pool.dispatch('likeHighlight', {
      id: req.params.id,
      userId: req.user.id,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * PATCH /highlights/:id/approve
 * Admin: approve a pending highlight and broadcast WS event.
 */
router.patch('/:id/approve', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await req.pool.dispatch('approveHighlight', { id: req.params.id });
    // Broadcast real-time event to all WebSocket clients
    wsHub.broadcast('highlight_approved', result);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * DELETE /highlights/:id
 * Admin: delete (reject) a highlight.
 */
router.delete('/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await req.pool.dispatch('deleteHighlight', { id: req.params.id });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
