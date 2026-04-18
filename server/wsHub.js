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
        const channel = msg.channel || 'general';

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
          // General / Dynamic channel
          try {
            if (channel !== 'general') {
              const allChannels = await _pool.dispatch('FIND_CHANNELS', {});
              const ch = allChannels.find(c => c.id === channel);
              if (!ch) throw new Error('Channel not found');
              if (ch.adminOnly && user.role !== 'admin') {
                throw new Error('Admin only channel');
              }
            }

            const userMsg = await _pool.dispatch('createChatMessage', {
              userId: user.id, username: user.username,
              text: msg.text, channel, ownerId: user.id,
            });
            broadcast('chat_message', userMsg, channel);
          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', error: err.message }));
          }
        }
      }
    });

    ws.on('close', () => {
      console.log('[WS] ' + user.username + ' disconnected');
      broadcastOnlineUsers();
    });
    ws.on('error', (err) => console.error('[WS] Error:', err.message));
    ws.send(JSON.stringify({ type: 'connected', message: 'Welcome, ' + user.username + '!' }));
    
    // Broadcast updated list to everyone
    broadcastOnlineUsers();
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

function broadcast(type, data, channelId) {
  if (!_wss) return;
  const msg = JSON.stringify({ type, data });

  // Optimistically broadcast, but fetch channels in background for permission check
  _pool.dispatch('FIND_CHANNELS', {}).then(allChannels => {
    const ch = allChannels?.find(c => c.id === channelId);
    _wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) {
        c.send(msg);
      }
    });
  }).catch(err => {
    console.error('[WS] Broadcast check error:', err.message);
  });
}

function getConnectedCount() { return _wss ? _wss.clients.size : 0; }

function broadcastOnlineUsers() {
  if (!_wss) return;
  const usersMap = new Map();
  _wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN && c.user) {
      usersMap.set(c.user.username, { username: c.user.username, role: c.user.role });
    }
  });
  const onlineList = Array.from(usersMap.values());
  const msg = JSON.stringify({ type: 'online_users', data: onlineList });
  _wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

module.exports = { init, broadcast, getConnectedCount };