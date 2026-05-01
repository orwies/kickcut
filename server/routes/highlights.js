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
 * Gets the video filename from the URL parameters.
 * Returns the video stream with appropriate HTTP status codes (200 or 206) and headers.
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
 * Route handler that returns a list of approved highlights.
 * It extracts filter parameters (like team, competition, dates) from the query string (req.query).
 * It then dispatches the 'getHighlights' action to the worker pool.
 * Returns a JSON array of matching highlight objects.
 */
router.get('/', async (req, res) => {
  try {
    const { competition, matchStage, dateFrom, dateTo, homeTeam, awayTeam, team } = req.query;
    const result = await req.pool.dispatch('getHighlights', {
      status: 'approved',
      competition,
      matchStage,
      dateFrom,
      dateTo,
      homeTeam,
      awayTeam,
      team,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /highlights/trending
 * Retrieves the top 3 trending highlights sorted by the number of likes.
 * It takes no arguments from the request body or query.
 * Dispatches a 'getHighlights' action to the worker pool and sorts the results.
 * Returns a JSON array containing the top 3 highlight objects.
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
 * Admin only route to retrieve all pending highlights awaiting approval.
 * It requires a valid JWT and admin role to access.
 * Dispatches a 'getPendingHighlights' action to the worker pool.
 * Returns a JSON array of pending highlight objects.
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
 * Handles the upload of a new highlight, including video and thumbnail files.
 * Receives multipart form data containing files and highlight metadata in req.body.
 * Processes the files, constructs paths, and dispatches a 'createHighlight' action.
 * Returns the newly created highlight object in JSON format with a 201 status.
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
 * Toggles the 'like' status of a specific highlight for the authenticated user.
 * Gets the highlight ID from the URL parameters and user ID from the JWT payload.
 * Dispatches a 'likeHighlight' action to the worker pool.
 * Returns the updated highlight object in JSON format.
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
 * Admin only route to approve a pending highlight and make it public.
 * Gets the highlight ID from the URL parameters.
 * Dispatches an 'approveHighlight' action and broadcasts a WebSocket event.
 * Returns the approved highlight object in JSON format.
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
 * Admin only route to delete a highlight and its associated files from disk.
 * Gets the highlight ID from the URL parameters.
 * Retrieves the highlight to locate files, deletes them from the filesystem, and dispatches a 'deleteHighlight' action.
 * Returns a JSON object confirming deletion.
 */
router.delete('/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    // First fetch the highlight so we know which files to remove
    const highlights = await req.pool.dispatch('getHighlights', { status: 'all_including_deleted' });
    const highlight = highlights?.find ? highlights.find(h => h._id?.toString() === req.params.id) : null;

    // Delete physical files if they exist
    if (highlight) {
      /**
       * Helper function to delete a file from the server's filesystem.
       * Takes the relative URL path of the file to be deleted.
       * Attempts to remove the file from the uploads directory, ignoring errors if it doesn't exist.
       * Returns nothing.
       */
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
