'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { verifyJWT, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const wsHub = require('../wsHub');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const router = express.Router();

/**
 * GET /highlights/video/:filename
 * Stream a video file with proper Content-Type and range support.
 * This ensures browsers play the video inline instead of downloading it.
 */
router.get('/video/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(UPLOAD_DIR, 'videos', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Determine MIME type based on extension
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg', '.mov': 'video/mp4', '.mkv': 'video/webm' };
  const contentType = mimeMap[ext] || 'video/mp4';

  if (range) {
    // Partial content (range request) — required for video scrubbing
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    // Full file
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

/**
 * GET /highlights
 * Return all approved highlights with optional filters.
 */
router.get('/', async (req, res) => {
  try {
    const { competition, matchStage, dateFrom, dateTo, homeTeam, awayTeam } = req.query;
    const result = await req.pool.dispatch('getHighlights', {
      status: 'approved',
      competition,
      matchStage,
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
 * GET /highlights/trending
 * Return top 3 highlights sorted by likes.
 */
router.get('/trending', async (req, res) => {
  try {
    const result = await req.pool.dispatch('getHighlights', { status: 'approved' });
    result.sort((a, b) => {
      const aLikes = Array.isArray(a.likes) ? a.likes.length : 0;
      const bLikes = Array.isArray(b.likes) ? b.likes.length : 0;
      return bLikes - aLikes;
    });
    res.json(result.slice(0, 3));
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
      const { homeTeam, awayTeam, competition, matchStage, date, scoreHome, scoreAway } = req.body;

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
        matchStage,
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
 * Admin: delete a highlight and remove its video + thumbnail files from disk.
 */
router.delete('/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    // First fetch the highlight so we know which files to remove
    const highlights = await req.pool.dispatch('getHighlights', { status: 'all_including_deleted' });
    const highlight = highlights?.find ? highlights.find(h => h._id?.toString() === req.params.id) : null;

    // Delete physical files if they exist
    if (highlight) {
      const deleteFile = (urlPath) => {
        if (!urlPath) return;
        // urlPath is like /uploads/videos/filename.mp4
        const rel = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
        const abs = path.join(UPLOAD_DIR, '..', rel);
        try { fs.unlinkSync(abs); } catch { /* file may already be gone, ignore */ }
      };
      deleteFile(highlight.videoPath);
      deleteFile(highlight.thumbnailPath);
    }

    const result = await req.pool.dispatch('deleteHighlight', { id: req.params.id });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});


module.exports = router;
