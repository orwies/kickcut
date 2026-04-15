'use strict';

const express = require('express');
const { verifyJWT } = require('../middleware/auth');
const router = express.Router();

router.get('/messages', verifyJWT, async (req, res) => {
  try {
    const channel = req.query.channel === 'kickbot' ? 'kickbot' : 'general';
    const messages = await req.pool.dispatch('getChatMessages', {
      channel, limit: 50, userId: req.user.id,
    });
    res.json(messages);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
