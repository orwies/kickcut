'use strict';

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let _wss = null;
let _pool = null;

/**
 * Initialise the WebSocket hub, attached to the existing HTTPS server.
 * @param {https.Server} httpsServer
 * @param {WorkerPool} pool
 */
function init(httpsServer, pool) {
  _pool = pool;
  _wss = new WebSocket.Server({ server: httpsServer, path: '/ws' });

  _wss.on('connection', (ws, req) => {
    // Authenticate via query-string token
    const url = new URL(req.url, 'https://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication token required');
      return;
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    ws.user = user;
    ws.isAlive = true;
    console.log(`[WS] ${user.username} connected`);

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
        return;
      }

      if (msg.type === 'chat' && msg.text) {
        try {
          const message = await _pool.dispatch('createChatMessage', {
            userId: user.id,
            username: user.username,
            text: msg.text,
          });
          broadcast('chat_message', message);
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', error: err.message }));
        }
      }
    });

    ws.on('close', () => console.log(`[WS] ${user.username} disconnected`));
    ws.on('error', (err) => console.error(`[WS] Error for ${user.username}:`, err.message));

    // Send connection confirmation
    ws.send(JSON.stringify({ type: 'connected', message: `Welcome, ${user.username}!` }));
  });

  // Keepalive: ping all clients every 30 seconds
  const pingInterval = setInterval(() => {
    _wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  _wss.on('close', () => clearInterval(pingInterval));
  console.log('[WS] WebSocket hub initialised on /ws');
}

/**
 * Broadcast a typed event to all authenticated WebSocket clients.
 * @param {string} type - Event type
 * @param {any} data - Event payload
 */
function broadcast(type, data) {
  if (!_wss) return;
  const message = JSON.stringify({ type, data });
  _wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Get count of currently connected WebSocket clients.
 * @returns {number}
 */
function getConnectedCount() {
  return _wss ? _wss.clients.size : 0;
}

module.exports = { init, broadcast, getConnectedCount };
