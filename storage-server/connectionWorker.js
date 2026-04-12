'use strict';

/**
 * connectionWorker.js
 * Runs as a worker_thread for each accepted TCP connection.
 * Uses JSON file storage — no MongoDB or external database needed.
 */

const { parentPort, workerData } = require('worker_threads');
const { handleUsersRequest } = require('./handlers/usersHandler');
const { handleHighlightsRequest } = require('./handlers/highlightsHandler');
const { handleChatRequest } = require('./handlers/chatHandler');

const USER_TYPES = new Set(['CREATE_USER', 'FIND_USER']);
const HIGHLIGHT_TYPES = new Set([
  'CREATE_HIGHLIGHT', 'FIND_HIGHLIGHTS', 'FIND_PENDING_HIGHLIGHTS',
  'UPDATE_HIGHLIGHT', 'DELETE_HIGHLIGHT', 'LIKE_HIGHLIGHT',
]);
const CHAT_TYPES = new Set(['CREATE_CHAT_MESSAGE', 'FIND_CHAT_MESSAGES']);

async function processRequest(type, payload) {
  if (USER_TYPES.has(type)) return handleUsersRequest(type, payload);
  if (HIGHLIGHT_TYPES.has(type)) return handleHighlightsRequest(type, payload);
  if (CHAT_TYPES.has(type)) return handleChatRequest(type, payload);
  throw new Error(`Unknown message type: ${type}`);
}

// No database connection needed — just start listening immediately
console.log(`[StorageWorker #${workerData.workerId}] Ready (JSON file storage)`);

parentPort.on('message', async ({ requestId, type, payload }) => {
  try {
    const data = await processRequest(type, payload || {});
    parentPort.postMessage({ requestId, status: 'ok', data });
  } catch (err) {
    parentPort.postMessage({ requestId, status: 'error', error: err.message });
  }
});
