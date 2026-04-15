'use strict';

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
function encodeMessage(obj) {
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(json.length, 0);
  return Buffer.concat([header, json]);
}

function parseFrames(buf) {
  const frames = [];
  let offset = 0;
  while (offset + 4 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    if (offset + 4 + len > buf.length) break;
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

  // One worker_thread per TCP connection
  const worker = new Worker(path.join(__dirname, 'connectionWorker.js'), {
    workerData: { mongoUri: MONGO_URI, workerId },
  });

  let buffer = Buffer.alloc(0);

  // Worker → socket: send response back over TCP
  worker.on('message', ({ requestId, status, data, error }) => {
    if (socket.destroyed) return;
    const response = status === 'ok'
      ? { id: requestId, status: 'ok', data }
      : { id: requestId, status: 'error', error };
    socket.write(encodeMessage(response));
  });

  worker.on('error', (err) => {
    console.error(`[Storage] Worker #${workerId} error:`, err.message);
    if (!socket.destroyed) socket.destroy();
  });

  // Socket → worker: parse TCP frames and forward to worker thread
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
async function seedAdmin(mongoUri) {
  const { connectMongo } = require('./db/mongoConnection');
  const { User } = require('./db/schemas');
  try {
    await connectMongo(mongoUri);
    const existing = await User.findOne({ username: 'admin' });
    if (!existing) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await User.create({ username: 'admin', passwordHash, role: 'admin' });
      console.log('[Storage] Default admin created → username: admin  password: admin123');
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
