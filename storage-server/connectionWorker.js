'use strict';

// Handles a single TCP connection. Opens its own MongoDB connection to keep queries isolated.
// Listens for requests from the parent server and routes them to the right handler.

const { parentPort, workerData } = require('worker_threads');
const { connectMongo } = require('./db/mongoConnection');
const { handleUsersRequest } = require('./handlers/usersHandler');
const { handleHighlightsRequest } = require('./handlers/highlightsHandler');
const { handleChatRequest } = require('./handlers/chatHandler');

// These sets are used to route incoming requests to the right handler without
// a giant if/else chain. Just check if the type is in the right set.
const USER_TYPES = new Set(['CREATE_USER', 'FIND_USER']);
const HIGHLIGHT_TYPES = new Set([
  'CREATE_HIGHLIGHT', 'FIND_HIGHLIGHTS', 'FIND_PENDING_HIGHLIGHTS',
  'UPDATE_HIGHLIGHT', 'DELETE_HIGHLIGHT', 'LIKE_HIGHLIGHT',
]);
const CHAT_TYPES = new Set([
  'CREATE_CHANNEL', 'FIND_CHANNELS', 'DELETE_CHANNEL',
  'createChatMessage', 'getChatMessages', 'CREATE_CHAT_MESSAGE', 'FIND_CHAT_MESSAGES',
]);

// Routes a request to the appropriate sub-handler based on its message type.
async function processRequest(type, payload) {
  if (USER_TYPES.has(type))      return handleUsersRequest(type, payload);
  if (HIGHLIGHT_TYPES.has(type)) return handleHighlightsRequest(type, payload);
  if (CHAT_TYPES.has(type))      return handleChatRequest(type, payload);
  throw new Error(`Unknown message type: ${type}`);
}

// Initializes the worker by connecting to MongoDB and listening for parent messages.
async function init() {
  // Connect this worker's own mongoose instance to MongoDB.
  // Each worker has its own connection — they don't share one.
  await connectMongo(workerData.mongoUri);
  console.log(`[StorageWorker #${workerData.workerId}] Ready`);

  // The parent sends us a message for every incoming request from the main server.
  // We process it, then reply with either the result or an error.
  parentPort.on('message', async ({ requestId, type, payload }) => {
    try {
      const data = await processRequest(type, payload || {});
      parentPort.postMessage({ requestId, status: 'ok', data });
    } catch (err) {
      parentPort.postMessage({ requestId, status: 'error', error: err.message });
    }
  });
}

init().catch((err) => {
  console.error(`[StorageWorker #${workerData.workerId}] Init failed:`, err.message);
  process.exit(1);
});
