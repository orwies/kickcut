'use strict';

const express = require('express');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /chat/messages
 * Return the last 50 chat messages (authenticated users only).
 */
router.get('/messages', verifyJWT, async (req, res) => {
  try {
    const messages = await req.pool.dispatch('getChatMessages', {});
    res.json(messages);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
