# KickCut ⚽

A full-stack football highlights sharing platform built with:
- **React** (Vite) frontend
- **Node.js** HTTPS + WebSocket main server (with Gemini AI Bot)
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
| Encrypted passwords | bcrypt (cost 10) |
| Security | Input sanitisation, rate limiting, file-type validation, no hashes in responses |
| TLS | Self-signed cert for HTTPS + WSS |
| Interactive UI | React SPA: feed, filters, upload, chat, admin panel |
| Database | MongoDB via custom TCP protocol |
| AI Integration | Google Gemini API powering "KickBot" inside real-time chat |

## Prerequisites

- Node.js 18+
- MongoDB instance (Atlas Cloud or Local)
- Google Gemini API Key

## Quick Start (Automated Setup)

**Step 1 – Clone & Setup**:
```powershell
# From the kickcut/ root:
npm run setup
```
*(This script automatically installs all dependencies, generates TLS certificates, and prepares your `.env` files).*

**Step 2 – Add your Secrets**:
Open the new `.env` file in the root folder and paste in your `MONGO_URI` and `GEMINI_API_KEY`.

**Step 3 – Start the Environment**:
Double-click the `start_dev.bat` file in your project folder, or run it from the terminal:
```powershell
.\start_dev.bat
```
*(This will automatically launch the storage server, main server, and client UI in separate windows).*

## Usage

1. Open **https://localhost:5173**
2. Register a regular user account or log in as **orwies / orwies13579** (admin)
3. Browse the **Highlights Feed**
4. Click **➕ Upload** to submit a highlight (goes to Pending)
5. As an admin, click **🛡️ Admin Panel** → Approve the highlight
6. The feed **updates in real-time via WebSocket**
7. Click **💬** in the bottom right for the **live chat** and talk to KickBot!

## Project Structure

```
kickcut/
├── certs/              ← TLS certificate (auto-generated)
├── client/             ← React SPA (Vite)
├── server/             ← Node.js HTTPS + WSS main server
│   ├── models/         ← UserModel, HighlightModel (OOP)
│   ├── services/       ← TCPClient, GeminiBot
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
