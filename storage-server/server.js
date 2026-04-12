'use strict';

require('dotenv').config();
const net = require('net');
const { Worker } = require('worker_threads');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db/jsonDb');

const TCP_PORT = parseInt(process.env.TCP_PORT || '9000', 10);

// ─── Auto-seed default admin on first run ─────────────────────────────────────
async function seedDefaultAdmin() {
  const existing = db.findOne('users', (u) => u.username === 'admin');
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    db.create('users', { username: 'admin', passwordHash, role: 'admin' });
    console.log('[Storage] Default admin created → username: admin  password: admin123');
  }
}

seedDefaultAdmin().catch(console.error);

// ─── Protocol helpers ─────────────────────────────────────────────────────────
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

// ─── TCP Server ───────────────────────────────────────────────────────────────
let connectionCount = 0;

const server = net.createServer((socket) => {
  const workerId = ++connectionCount;
  console.log(`[Storage] Connection #${workerId} from ${socket.remoteAddress}:${socket.remotePort}`);

  const worker = new Worker(path.join(__dirname, 'connectionWorker.js'), {
    workerData: { workerId },
  });

  let buffer = Buffer.alloc(0);

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

server.listen(TCP_PORT, '127.0.0.1', () => {
  console.log(`[Storage] TCP server listening on 127.0.0.1:${TCP_PORT}`);
});

server.on('error', (err) => { console.error('[Storage] Server error:', err.message); process.exit(1); });
