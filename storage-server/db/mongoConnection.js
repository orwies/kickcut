'use strict';

const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB with retry logic.
 * @param {string} uri - MongoDB connection URI
 */
async function connectMongo(uri) {
  if (isConnected) return;

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      isConnected = true;
      console.log('[MongoDB] Connected to', uri);
      return;
    } catch (err) {
      attempt++;
      console.error(`[MongoDB] Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  throw new Error('[MongoDB] Failed to connect after max retries');
}

module.exports = { connectMongo };
