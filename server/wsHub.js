'use strict';

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const GeminiBot = require('./services/GeminiBot');

let _wss = null;
let _pool = null;
let _bot = null;

function init(httpsServer, pool) {
  _pool = pool;
  _bot = new GeminiBot(process.env.GEMINI_API_KEY);
  _wss = new WebSocket.Server({ server: httpsServer, path: '/ws' });

  _wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'https://localhost');
    const token = url.searchParams.get('token');
    if (!token) { ws.close(4001, 'Authentication token required'); return; }

    let user;
    try { user = jwt.verify(token, process.env.JWT_SECRET); }
    catch { ws.close(4001, 'Invalid or expired token'); return; }

    ws.user = user;
    ws.isAlive = true;
    console.log('[WS] ' + user.username + ' connected');
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' })); return;
      }

      if (msg.type === 'chat' && msg.text) {
        const channel = msg.channel === 'kickbot' ? 'kickbot' : 'general';

        if (channel === 'kickbot') {
          // Private — only the requesting user sees this conversation
          try {
            const userMsg = await _pool.dispatch('createChatMessage', {
              userId: user.id, username: user.username,
              text: msg.text, channel: 'kickbot', isBot: false, ownerId: user.id,
            });
            sendTo(ws, 'chat_message', userMsg);

            const answer = await _bot.ask(msg.text);

            const botMsg = await _pool.dispatch('createChatMessage', {
              userId: 'kickbot', username: 'KickBot',
              text: answer, channel: 'kickbot', isBot: true, ownerId: user.id,
            });
            sendTo(ws, 'chat_message', botMsg);
          } catch (err) {
            console.error('[WS] KickBot error:', err.message);
            sendTo(ws, 'chat_message', {
              _id: Date.now().toString(), userId: 'kickbot', username: 'KickBot',
              text: 'Sorry, something went wrong. Try again! \u26BD',
              channel: 'kickbot', isBot: true, ownerId: user.id,
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          // General — broadcast to everyone
          try {
            const userMsg = await _pool.dispatch('createChatMessage', {
              userId: user.id, username: user.username,
              text: msg.text, channel: 'general', ownerId: user.id,
            });
            broadcast('chat_message', userMsg);
          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', error: err.message }));
          }
        }
      }
    });

    ws.on('close', () => console.log('[WS] ' + user.username + ' disconnected'));
    ws.on('error', (err) => console.error('[WS] Error:', err.message));
    ws.send(JSON.stringify({ type: 'connected', message: 'Welcome, ' + user.username + '!' }));
  });

  const pingInterval = setInterval(() => {
    _wss.clients.forEach((c) => { if (!c.isAlive) return c.terminate(); c.isAlive = false; c.ping(); });
  }, 30000);
  _wss.on('close', () => clearInterval(pingInterval));
  console.log('[WS] WebSocket hub initialised on /ws');
}

function sendTo(ws, type, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, data }));
}

function broadcast(type, data) {
  if (!_wss) return;
  const msg = JSON.stringify({ type, data });
  _wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function getConnectedCount() { return _wss ? _wss.clients.size : 0; }

module.exports = { init, broadcast, getConnectedCount };