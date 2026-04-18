'use strict';

const express = require('express');
const { verifyJWT, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/channels', verifyJWT, async (req, res) => {
  try {
    const channels = await req.pool.dispatch('FIND_CHANNELS', {});
    // Filter out adminOnly channels if user is not admin
    res.json(channels || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/channels', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const channel = await req.pool.dispatch('CREATE_CHANNEL', req.body);
    res.status(201).json(channel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/channels/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await req.pool.dispatch('DELETE_CHANNEL', { id: req.params.id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/messages', verifyJWT, async (req, res) => {
  try {
    const channelId = req.query.channel || 'general';
    
    // Check permission if it's a dynamic channel
    if (channelId !== 'kickbot' && channelId !== 'general') {
      const allChannels = await req.pool.dispatch('FIND_CHANNELS', {});
      const ch = allChannels.find(c => c.id === channelId);
      if (!ch) return res.status(404).json({ error: 'Channel not found' });
      // Anyone can read, but only admins can write (handled in wsHub.js)
    }

    const messages = await req.pool.dispatch('getChatMessages', {
      channel: channelId, limit: 50, userId: req.user.id,
    });
    res.json(messages);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
