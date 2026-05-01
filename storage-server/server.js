'use strict';

// The database gateway. Only this server talks to MongoDB.
// Uses raw TCP for speed (no HTTP overhead). 
// Spawns a worker thread for every client connection to keep things parallel.

require('dotenv').config();
const net = require('net');
const { Worker } = require('worker_threads');
const path = require('path');
const bcrypt = require('bcryptjs');

const TCP_PORT = parseInt(process.env.TCP_PORT || '9000', 10);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('[Storage] ERROR: MONGO_URI is not set in storage-server/.env');
  process.exit(1);
}

// ─── Protocol helpers (pure TCP – length-prefixed JSON frames) ────────────────
// Every message is prefixed with a 4-byte big-endian integer that says how many
// bytes the JSON body is. The receiver reads the length first, then waits for
// exactly that many bytes before parsing. This prevents partial-read bugs when
// the TCP stack splits a message across multiple packets.

// Converts a JavaScript object into a length-prefixed binary frame for TCP transmission.
function encodeMessage(obj) {
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(json.length, 0);
  return Buffer.concat([header, json]);
}

// Reads binary chunks from a TCP stream and extracts complete JSON message frames.
function parseFrames(buf) {
  const frames = [];
  let offset = 0;
  while (offset + 4 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    if (offset + 4 + len > buf.length) break; // incomplete frame — wait for more data
    const raw = buf.subarray(offset + 4, offset + 4 + len).toString('utf8');
    try { frames.push(JSON.parse(raw)); } catch { /* skip bad frame */ }
    offset += 4 + len;
  }
  return { frames, remaining: buf.subarray(offset) };
}

// ─── TCP Server (pure net.Socket – no WebSocket, no HTTP) ────────────────────
let connectionCount = 0;

const server = net.createServer((socket) => {
  const workerId = ++connectionCount;
  console.log(`[Storage] TCP connection #${workerId} from ${socket.remoteAddress}:${socket.remotePort}`);

  // Spawn a dedicated worker thread for this TCP connection.
  // The worker opens its own mongoose connection and handles all DB calls for
  // this client. When the socket closes, the worker is terminated.
  const worker = new Worker(path.join(__dirname, 'connectionWorker.js'), {
    workerData: { mongoUri: MONGO_URI, workerId },
  });

  let buffer = Buffer.alloc(0);

  // Worker → socket: send response back over TCP
  worker.on('message', ({ requestId, status, data, error }) => {
    if (socket.destroyed) return;
    try {
      const response = status === 'ok'
        ? { id: requestId, status: 'ok', data }
        : { id: requestId, status: 'error', error };
      socket.write(encodeMessage(response));
    } catch (err) {
      console.error(`[Storage] Failed to encode response for request #${requestId}:`, err.message);
      if (!socket.destroyed) {
        socket.write(encodeMessage({ id: requestId, status: 'error', error: 'Internal serialization error' }));
      }
    }
  });

  worker.on('error', (err) => {
    console.error(`[Storage] Worker #${workerId} error:`, err.message);
    if (!socket.destroyed) socket.destroy();
  });

  // Socket → worker: parse TCP frames and forward to the worker thread
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    const { frames, remaining } = parseFrames(buffer);
    buffer = remaining;
    for (const frame of frames) {
      if (!frame.id || !frame.type) continue;
      worker.postMessage({ requestId: frame.id, type: frame.type, payload: frame.payload || {} });
    }
  });

  socket.on('close', () => { console.log(`[Storage] Connection #${workerId} closed`); worker.terminate(); });
  socket.on('error', (err) => { console.error(`[Storage] Socket #${workerId} error:`, err.message); worker.terminate(); });
});

// ─── Auto-seed default admin once MongoDB is ready ────────────────────────────
// This function runs once at startup. It checks if the designated admin account
// already exists in the database — if it doesn't, it creates it automatically.
// This means you never have to manually insert the admin through MongoDB.
// Ensures the default 'orwies' admin account exists in the database on startup.
async function seedAdmin(mongoUri) {
  const { connectMongo } = require('./db/mongoConnection');
  const { User } = require('./db/schemas');
  try {
    await connectMongo(mongoUri);
    const existing = await User.findOne({ username: 'orwies' });
    if (!existing) {
      const passwordHash = await bcrypt.hash('orwies13579', 10);
      await User.create({ username: 'orwies', passwordHash, role: 'admin' });
      console.log('[Storage] Admin account created → username: orwies');
    } else {
      // Forcefully update to admin if they are somehow a normal user
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log('[Storage] Existing orwies account upgraded to admin');
      } else {
        console.log('[Storage] Admin account already exists → username: orwies');
      }
    }
  } catch (err) {
    console.error('[Storage] Seeding failed:', err.message);
  }
}

server.listen(TCP_PORT, '127.0.0.1', () => {
  console.log(`[Storage] TCP server listening on 127.0.0.1:${TCP_PORT}`);
  seedAdmin(MONGO_URI);
});

server.on('error', (err) => { console.error('[Storage] Server error:', err.message); process.exit(1); });
