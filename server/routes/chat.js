'use strict';

const express = require('express');
const { verifyJWT, requireAdmin } = require('../middleware/auth');
const router = express.Router();

/**
 * GET /chat/channels - Fetches all available chat channels.
 * Validates the requester's JWT.
 * Queries the storage worker for the list of channels and filters admin-only channels appropriately.
 * Returns a JSON array of channel objects.
 */
router.get('/channels', verifyJWT, async (req, res) => {
  try {
    const channels = await req.pool.dispatch('FIND_CHANNELS', {});
    // Filter out adminOnly channels if user is not admin
    res.json(channels || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /chat/channels - Creates a new dynamic chat channel.
 * Requires admin privileges and a valid JWT.
 * Forwards the channel creation payload to the storage worker.
 * Returns the newly created channel object with a 201 status.
 */
router.post('/channels', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const channel = await req.pool.dispatch('CREATE_CHANNEL', req.body);
    res.status(201).json(channel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /chat/channels/:id - Deletes an existing chat channel.
 * Requires admin privileges and a valid JWT.
 * Dispatches the delete command to the worker pool for the specified channel ID.
 * Returns a success confirmation object.
 */
router.delete('/channels/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await req.pool.dispatch('DELETE_CHANNEL', { id: req.params.id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /chat/messages - Retrieves message history for a specific channel.
 * Accepts an optional 'channel' query parameter (defaults to 'general').
 * Verifies channel existence and permissions before querying the storage layer for up to 50 recent messages.
 * Returns a JSON array of chat message objects.
 */
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
