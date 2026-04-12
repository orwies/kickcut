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

// ─── Action Handlers ──────────────────────────────────────────────────────────

const handlers = {
  async login({ username, password }) {
    if (!username || !password) throw { status: 400, message: 'Username and password are required' };

    // Sanitise input
    const cleanUsername = String(username).trim().substring(0, 30);

    let userData;
    try {
      userData = await tcp.send('FIND_USER', { username: cleanUsername });
    } catch {
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

  async getHighlights({ status, competition, dateFrom, dateTo, homeTeam, awayTeam }) {
    const highlights = await tcp.send('FIND_HIGHLIGHTS', {
      status: status || 'approved',
      competition: competition ? String(competition).trim() : undefined,
      homeTeam: homeTeam ? String(homeTeam).trim() : undefined,
      awayTeam: awayTeam ? String(awayTeam).trim() : undefined,
      dateFrom,
      dateTo,
    });
    return highlights;
  },

  async getPendingHighlights() {
    return tcp.send('FIND_PENDING_HIGHLIGHTS', {});
  },

  async createHighlight({ homeTeam, awayTeam, competition, date, scoreHome, scoreAway, thumbnailPath, videoPath, uploadedBy }) {
    const model = new HighlightModel({
      homeTeam: String(homeTeam || '').trim(),
      awayTeam: String(awayTeam || '').trim(),
      competition: String(competition || '').trim(),
      date,
      score: {
        home: Math.max(0, parseInt(scoreHome, 10) || 0),
        away: Math.max(0, parseInt(scoreAway, 10) || 0),
      },
      thumbnailPath: thumbnailPath || '',
      videoPath: videoPath || '',
      uploadedBy,
      status: 'pending',
    });
    model.validate();
    return tcp.send('CREATE_HIGHLIGHT', model.toObject());
  },

  async likeHighlight({ id, userId }) {
    if (!id) throw { status: 400, message: 'Highlight ID required' };
    return tcp.send('LIKE_HIGHLIGHT', { id: String(id), userId: String(userId) });
  },

  async approveHighlight({ id }) {
    if (!id) throw { status: 400, message: 'Highlight ID required' };
    return tcp.send('UPDATE_HIGHLIGHT', { id: String(id), updates: { status: 'approved' } });
  },

  async deleteHighlight({ id }) {
    if (!id) throw { status: 400, message: 'Highlight ID required' };
    return tcp.send('DELETE_HIGHLIGHT', { id: String(id) });
  },

  async getChatMessages() {
    return tcp.send('FIND_CHAT_MESSAGES', { limit: 50 });
  },

  async createChatMessage({ userId, username, text }) {
    if (!text || !String(text).trim()) throw { status: 400, message: 'Message text is required' };
    return tcp.send('CREATE_CHAT_MESSAGE', {
      userId: String(userId),
      username: String(username),
      text: String(text).trim().substring(0, 500),
    });
  },
};

// ─── Message dispatcher ───────────────────────────────────────────────────────

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
