/**
 * WebSocket manager. Singleton connection that handles real-time messages and 
 * auto-reconnects if the connection drops.
 */

let socket = null;
let _forcedLogout = false; // prevent auto-reconnect after server-side kick
const listeners = new Map(); // event type → Set of callbacks

// Constructs the WebSocket URL with the authentication token attached as a query parameter.
function getWSUrl(token) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}

// Establishes a new WebSocket connection and sets up message and close listeners.
export function connect(token) {
  // Guard against both OPEN (1) and CONNECTING (0) — was only checking OPEN,
  // which caused a second socket to be created while the first was still connecting,
  // resulting in every message being received and emitted twice.
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(getWSUrl(token));

  socket.addEventListener('open', () => {
    console.log('[WS] Connected');
    emit('__connected', null);
  });

  socket.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);

      // Server is kicking this session because another device logged in
      if (msg.type === 'force_logout') {
        _forcedLogout = true;
        sessionStorage.removeItem('kc_token');
        socket?.close();
        socket = null;
        alert(msg.reason || 'You have been logged out because you signed in from another device.');
        window.location.href = '/';
        return;
      }

      emit(msg.type, msg.data ?? msg);
    } catch {
      /* ignore malformed */
    }
  });

  socket.addEventListener('close', () => {
    console.log('[WS] Disconnected');
    emit('__disconnected', null);
    socket = null;
    // Auto-reconnect after 3 seconds — but NOT if the server kicked us out
    if (!_forcedLogout) {
      const t = sessionStorage.getItem('kc_token');
      if (t) setTimeout(() => connect(t), 3000);
    }
  });

  socket.addEventListener('error', (err) => {
    console.error('[WS] Error:', err);
  });
}

// Manually closes the current WebSocket connection and prevents automatic reconnection.
export function disconnect() {
  _forcedLogout = false; // reset so manual reconnect works after re-login
  if (socket) {
    socket.close();
    socket = null;
  }
}

// Sends a chat message to the general channel.
export function sendChat(text) {
  sendWS({ type: 'chat', channel: 'general', text });
}

// Serializes and sends a raw payload object over the open WebSocket.
export function sendWS(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

// Registers a callback function to listen for a specific WebSocket event type.
export function subscribe(event, cb) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
}

// Removes a previously registered callback function for a specific event type.
export function unsubscribe(event, cb) {
  listeners.get(event)?.delete(cb);
}

// Triggers all registered callbacks for a specific event type with the provided data.
function emit(event, data) {
  listeners.get(event)?.forEach((cb) => cb(data));
}

// Checks if the WebSocket is currently in the OPEN state.
export function isConnected() {
  return socket?.readyState === WebSocket.OPEN;
}
