'use strict';

/**
 * clientWorker.js
 *
 * Runs in a worker_thread (one per logical CPU in the pool).
 * Each worker owns its own TCPClient connection to the storage server.
 * Receives serialised request tasks from the main thread via parentPort,
 * executes the appropriate business logic, and posts results back.
 */

const { parentPort, workerData } = require('worker_threads');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const TCPClient = require('../services/TCPClient');
const UserModel = require('../models/UserModel');
const HighlightModel = require('../models/HighlightModel');

const { JWT_SECRET, STORAGE_HOST, STORAGE_PORT, WORKER_ID } = workerData;

// Each worker maintains its own TCP connection to the storage server
const tcp = new TCPClient(STORAGE_HOST, parseInt(STORAGE_PORT, 10));

// Prevent unhandled 'error' events from crashing the worker thread
tcp.on('error', (err) => {
  console.warn(`[ClientWorker #${WORKER_ID}] TCP error caught:`, err.message);
});

// If the connection drops while active, exit the worker so the pool respawns it
tcp.on('disconnected', () => {
  console.warn(`[ClientWorker #${WORKER_ID}] Connection lost. Exiting to reconnect...`);
  process.exit(1);
});

// ─── Action Handlers ──────────────────────────────────────────────────────────

const handlers = {
  /**
   * Authenticates a user by checking their username and password against the database.
   * Gets a payload containing username and password strings.
   * It sanitizes input, fetches the user, verifies the password hash, and signs a JWT.
   * Returns an object containing the generated token and safe user profile data.
   */
  async login({ username, password }) {
    if (!username || !password) throw { status: 400, message: 'Username and password are required' };

    // Sanitise input
    const cleanUsername = String(username).trim().substring(0, 30);

    let userData;
    try {
      userData = await tcp.send('FIND_USER', { username: cleanUsername });
    } catch (err) {
      if (err.message === 'User not found') {
        throw { status: 404, message: 'User does not exist' };
      }
      throw { status: 401, message: 'Invalid credentials' };
    }

    const user = UserModel.fromDoc(userData);
    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) throw { status: 401, message: 'Invalid credentials' };

    // Sign JWT — sensitive info encrypted
    const token = jwt.sign(
      { id: userData._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { token, user: user.toSafeObject() };
  },

  /**
   * Registers a new user account with the provided credentials.
   * Gets a payload with a username and password string.
   * It validates input rules, hashes the password with bcrypt, and sends a CREATE_USER command.
   * Returns an object containing the newly created safe user profile data.
   */
  async register({ username, password }) {
    if (!username || !password) throw { status: 400, message: 'Username and password are required' };

    const cleanUsername = String(username).trim().substring(0, 30);
    const cleanPassword = String(password);

    if (cleanUsername.length < 3) throw { status: 400, message: 'Username must be at least 3 characters' };
    if (cleanPassword.length < 6) throw { status: 400, message: 'Password must be at least 6 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) throw { status: 400, message: 'Username may only contain letters, numbers, and underscores' };

    // Hash password using bcrypt (encryption of sensitive information requirement)
    const passwordHash = await bcrypt.hash(cleanPassword, 12);

    const userData = await tcp.send('CREATE_USER', {
      username: cleanUsername,
      passwordHash,
      role: 'user', // Always register as regular user
    });

    const user = UserModel.fromDoc(userData);
    return { user: user.toSafeObject() };
  },

  /**
   * Dispatches a FIND_HIGHLIGHTS request to the storage server to fetch filtered highlights.
   * Receives various filter parameters including status, competition, dates, and team names.
   * It formats these parameters and sends them via the TCP connection.
   * Returns an array of serialized highlight documents matching the filters.
   */
  async getHighlights({ status, competition, matchStage, dateFrom, dateTo, homeTeam, awayTeam, team }) {
    const highlights = await tcp.send('FIND_HIGHLIGHTS', {
      status: status || 'approved',
      competition: competition ? String(competition).trim() : undefined,
      matchStage: matchStage ? String(matchStage).trim() : undefined,
      homeTeam: homeTeam ? String(homeTeam).trim() : undefined,
      awayTeam: awayTeam ? String(awayTeam).trim() : undefined,
      team: team ? String(team).trim() : undefined,
      dateFrom,
      dateTo,
    });
    return highlights;
  },

  /**
   * Fetches a list of highlights that are currently in the 'pending' status.
   * Takes no arguments.
   * Sends a FIND_PENDING_HIGHLIGHTS command to the storage server via TCP.
   * Returns an array of serialized pending highlight documents.
   */
  async getPendingHighlights() {
    return tcp.send('FIND_PENDING_HIGHLIGHTS', {});
  },

  /**
   * Creates a new highlight entry in the database.
   * Receives a payload containing all highlight metadata (teams, score, file paths, uploader info).
   * Validates the data using HighlightModel, determines status based on role, and sends a CREATE_HIGHLIGHT command.
   * Returns the newly created, serialized highlight document.
   */
  async createHighlight({ homeTeam, awayTeam, competition, matchStage, date, scoreHome, scoreAway, thumbnailPath, videoPath, uploadedBy, uploaderRole }) {
    const model = new HighlightModel({
      homeTeam: String(homeTeam || '').trim(),
      awayTeam: String(awayTeam || '').trim(),
      competition: String(competition || '').trim(),
      matchStage: String(matchStage || '').trim(),
      date,
      score: {
        home: Math.max(0, parseInt(scoreHome, 10) || 0),
        away: Math.max(0, parseInt(scoreAway, 10) || 0),
      },
      thumbnailPath: thumbnailPath || '',
      videoPath: videoPath || '',
      uploadedBy,
      status: uploaderRole === 'admin' ? 'approved' : 'pending',
    });
    model.validate();
    return tcp.send('CREATE_HIGHLIGHT', model.toObject());
  },

  /**
   * Toggles the 'like' status of a specific highlight for a user.
   * Receives an object containing the highlight 'id' and the 'userId'.
   * Sends a LIKE_HIGHLIGHT command to the storage server via TCP.
   * Returns the updated serialized highlight document.
   */
  async likeHighlight({ id, userId }) {
    if (!id) throw { status: 400, message: 'Highlight ID required' };
    return tcp.send('LIKE_HIGHLIGHT', { id: String(id), userId: String(userId) });
  },

  /**
   * Approves a pending highlight, changing its status to 'approved' so it becomes visible.
   * Receives an object containing the highlight 'id' to be approved.
   * Sends an UPDATE_HIGHLIGHT command to the storage server with the new status.
   * Returns the updated serialized highlight document.
   */
  async approveHighlight({ id }) {
    if (!id) throw { status: 400, message: 'Highlight ID required' };
    return tcp.send('UPDATE_HIGHLIGHT', { id: String(id), updates: { status: 'approved' } });
  },

  /**
   * Deletes a highlight from the database.
   * Receives an object containing the highlight 'id' to be deleted.
   * Sends a DELETE_HIGHLIGHT command to the storage server via TCP.
   * Returns an object indicating successful deletion (e.g., { deleted: true }).
   */
  async deleteHighlight({ id }) {
    if (!id) throw { status: 400, message: 'Highlight ID required' };
    return tcp.send('DELETE_HIGHLIGHT', { id: String(id) });
  },

  /**
   * Retrieves chat messages for a specific channel.
   * Receives an optional configuration object with 'channel' (defaults to 'general') and 'userId'.
   * Sends a FIND_CHAT_MESSAGES command to the storage server.
   * Returns an array of recent chat message documents for that channel.
   */
  async getChatMessages({ channel = 'general', userId } = {}) {
    return tcp.send('FIND_CHAT_MESSAGES', { channel, userId: userId ? String(userId) : undefined, limit: 50 });
  },

  /**
   * Creates a new chat message in a specified channel.
   * Receives message details including userId, username, text, channel name, and bot/owner flags.
   * Validates the text content and sends a CREATE_CHAT_MESSAGE command to the storage server.
   * Returns the newly created chat message document.
   */
  async createChatMessage({ userId, username, text, channel = 'general', isBot = false, ownerId = null }) {
    if (!text || !String(text).trim()) throw { status: 400, message: 'Message text is required' };
    return tcp.send('CREATE_CHAT_MESSAGE', {
      userId: String(userId),
      username: String(username),
      text: String(text).trim().substring(0, 500),
      channel,
      isBot: Boolean(isBot),
      ownerId: ownerId ? String(ownerId) : String(userId),
    });
  },

  /**
   * Fetches a list of all available chat channels.
   * Takes no arguments.
   * Sends a FIND_CHANNELS command to the storage server.
   * Returns an array of channel objects representing the available chat rooms.
   */
  async FIND_CHANNELS() {
    return tcp.send('FIND_CHANNELS', {});
  },

  /**
   * Creates a new custom chat channel.
   * Receives a payload containing the new channel's 'id' and 'label'.
   * Validates the presence of required fields and sends a CREATE_CHANNEL command.
   * Returns the newly created channel object.
   */
  async CREATE_CHANNEL(payload) {
    if (!payload.id || !payload.label) throw { status: 400, message: 'Channel ID and Label required' };
    return tcp.send('CREATE_CHANNEL', payload);
  },

  /**
   * Deletes a specific chat channel.
   * Receives an object containing the 'id' of the channel to be deleted.
   * Validates the presence of the ID and sends a DELETE_CHANNEL command to the storage server.
   * Returns an object indicating successful deletion.
   */
  async DELETE_CHANNEL({ id }) {
    if (!id) throw { status: 400, message: 'Channel ID required' };
    return tcp.send('DELETE_CHANNEL', { id: String(id) });
  },
};

// ─── Message dispatcher ───────────────────────────────────────────────────────

/**
 * Attempts to establish a TCP connection to the storage server with built-in retry logic.
 * It takes no arguments and relies on the worker's outer scope for configuration.
 * It loops up to a maximum number of attempts, waiting between failures.
 * Returns nothing, but exits the process if the connection ultimately fails.
 */
async function connectWithRetry() {
  const MAX = 10;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      await tcp.connect();
      console.log(`[ClientWorker #${WORKER_ID}] Connected to storage server`);
      return;
    } catch (err) {
      console.error(
        `[ClientWorker #${WORKER_ID}] Connection attempt ${attempt}/${MAX} failed: ${err.message}`
      );
      if (attempt < MAX) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  // FIX: instead of crashing, post an error for any pending task
  // The workerPool's exit handler will respawn us if needed
  console.error(`[ClientWorker #${WORKER_ID}] Giving up – storage server not reachable`);
  process.exit(1);
}

/**
 * Initializes the worker thread.
 * It takes no arguments.
 * It first establishes a connection to the storage server, then sets up a listener for incoming messages from the parent thread.
 * Returns nothing; it runs continuously handling dispatched tasks.
 */
async function init() {
  await connectWithRetry();

  parentPort.on('message', async ({ taskId, action, payload }) => {
    try {
      const handler = handlers[action];
      if (!handler) throw { status: 404, message: `Unknown action: ${action}` };
      const data = await handler(payload || {});
      parentPort.postMessage({ taskId, success: true, data });
    } catch (err) {
      const status = err.status || 500;
      const message = err.message || 'Internal server error';
      parentPort.postMessage({ taskId, success: false, status, message });
    }
  });
}

init();
