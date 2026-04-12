# KickCut ⚽

A full-stack football highlights sharing platform built with:
- **React** (Vite) frontend
- **Node.js** HTTPS + WebSocket main server
- **Node.js** raw TCP storage server
- **MongoDB** database

## Architecture Requirements Met

| Requirement | Implementation |
|---|---|
| ≥2 OOP classes | `TCPClient`, `StorageRequest`, `UserModel`, `HighlightModel` |
| Server + Client | Node.js main server + React SPA |
| Multi-client server | Worker pool (main) + one thread per TCP connection (storage) |
| Custom protocol | Length-prefixed JSON over raw TCP (port 9000) |
| Threads | `worker_threads` in both servers |
| Files / API | Video & thumbnail uploads; REST + WS API |
| Encrypted passwords | bcrypt (cost 12) |
| Security | Input sanitisation, rate limiting, file-type validation, no hashes in responses |
| TLS | Self-signed cert for HTTPS + WSS |
| Interactive UI | React SPA: feed, filters, upload, chat, admin panel |
| Database | MongoDB via custom TCP protocol |

## Prerequisites

- Node.js 18+
- MongoDB running locally on `mongodb://localhost:27017`

## Quick Start

**Step 1 – Install dependencies & generate TLS cert** (already done if you ran `npm install`):
```powershell
# From the kickcut/ root:
npm install selfsigned
node certs/gen-cert.js

cd storage-server; npm install; cd ..
cd server; npm install; cd ..
cd client; npm install; cd ..
```

**Step 2 – Start the storage server** (Terminal 1):
```powershell
cd storage-server
node server.js
# Output: [Storage] TCP server listening on 127.0.0.1:9000
```

**Step 3 – Start the main server** (Terminal 2):
```powershell
cd server
node server.js
# Output: [Server] HTTPS + WSS listening on https://localhost:3443
```

**Step 4 – Start the React client** (Terminal 3):
```powershell
cd client
npm run dev
# Open: http://localhost:5173
```

**Step 5 – Create an admin user** (Terminal 4, while servers are running):
```powershell
cd server
node scripts/seedAdmin.js admin admin123
# Creates admin / admin123
```

## Usage

1. Open **http://localhost:5173**
2. Register a regular user account
3. Log in
4. Browse the **Highlights Feed** (empty at first)
5. Click **➕ Upload** to submit a highlight (goes to Pending)
6. Log in as **admin / admin123** in another tab
7. Click **🛡️ Admin Panel** → Approve the highlight
8. The feed **updates in real-time via WebSocket**
9. Click **💬** in the bottom right for the **live chat**

## Project Structure

```
kickcut/
├── certs/              ← TLS certificate (auto-generated)
├── client/             ← React SPA (Vite)
├── server/             ← Node.js HTTPS + WSS main server
│   ├── models/         ← UserModel, HighlightModel (OOP)
│   ├── services/       ← TCPClient, StorageRequest (OOP)
│   ├── middleware/     ← auth, rateLimiter, upload
│   ├── routes/         ← auth, highlights, chat
│   ├── workers/        ← clientWorker (worker_threads)
│   ├── workerPool.js   ← Thread pool manager
│   └── wsHub.js        ← WebSocket hub
└── storage-server/     ← Raw TCP server → MongoDB
    ├── db/             ← Mongoose schemas & connection
    ├── handlers/       ← users, highlights, chat handlers
    └── connectionWorker.js ← Per-connection worker thread
```

## TCP Protocol

```
[4-byte big-endian uint32: payload_length][JSON payload bytes]

Request:  { "id": 1, "type": "FIND_HIGHLIGHTS", "payload": { "competition": "Premier League" } }
Response: { "id": 1, "status": "ok", "data": [...] }
          { "id": 1, "status": "error", "error": "Not found" }
```
