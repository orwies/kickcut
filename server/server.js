'use strict';

require('dotenv').config();

const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const WorkerPool = require('./workerPool');
const wsHub = require('./wsHub');
const authRoutes = require('./routes/auth');
const highlightsRoutes = require('./routes/highlights');
const chatRoutes = require('./routes/chat');
const { apiLimiter } = require('./middleware/rateLimiter');

const PORT = parseInt(process.env.PORT || '3443', 10);
const CERTS_DIR = path.join(__dirname, '..', 'certs');

// ─── TLS ─────────────────────────────────────────────────────────────────────
let tlsOptions;
try {
  tlsOptions = {
    cert: fs.readFileSync(path.join(CERTS_DIR, 'cert.pem')),
    key: fs.readFileSync(path.join(CERTS_DIR, 'key.pem')),
  };
} catch {
  console.error('[Server] TLS certificates not found. Run: node certs/gen-cert.js');
  process.exit(1);
}

// ─── Worker Pool (thread per client pattern) ──────────────────────────────────
const pool = new WorkerPool(
  path.join(__dirname, 'workers', 'clientWorker.js'),
  {
    JWT_SECRET: process.env.JWT_SECRET,
    STORAGE_HOST: process.env.STORAGE_HOST || '127.0.0.1',
    STORAGE_PORT: process.env.STORAGE_PORT || '9000',
  }
);

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://localhost:5173'],
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// General rate limit
app.use(apiLimiter);

// Inject worker pool into requests
app.use((req, _res, next) => {
  req.pool = pool;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/highlights', highlightsRoutes);
app.use('/chat', chatRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', workers: pool.size }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── HTTPS + WebSocket Server ─────────────────────────────────────────────────
const httpsServer = https.createServer(tlsOptions, app);

wsHub.init(httpsServer, pool);

httpsServer.listen(PORT, () => {
  console.log(`[Server] HTTPS + WSS listening on https://localhost:${PORT}`);
  console.log(`[Server] Worker threads: ${pool.size}`);
});

httpsServer.on('error', (err) => {
  console.error('[Server] Fatal error:', err.message);
  process.exit(1);
});
