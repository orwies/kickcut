# KickCut – Setup & Installation Guide

## Prerequisites (install these first)

### 1. Node.js (v18 or higher)
Download and install from: https://nodejs.org/en/download
- Choose the **LTS** version (recommended)
- Includes `npm` automatically
- Verify install: `node --version` and `npm --version`

### 2. Git
Download and install from: https://git-scm.com/downloads
- Verify install: `git --version`

---

## That's it – no database, no extra software needed.

The project uses JSON files for storage and generates its own TLS certificate.

---

## First-time Setup

Open **3 separate PowerShell terminals** and run the following:

### Step 1 – Clone the repo (once)
```powershell
git clone https://github.com/YOUR_USERNAME/kickcut.git
cd kickcut
```

### Step 2 – Install dependencies
```powershell
# Root (TLS cert generator)
npm install

# Storage server
cd storage-server
npm install
cd ..

# Main server
cd server
npm install
cd ..

# React client
cd client
npm install
cd ..
```

### Step 3 – Generate TLS certificate (once)
```powershell
node certs/gen-cert.js
```

---

## Running the Project

You need **3 terminals open at the same time**:

### Terminal 1 – Storage Server
```powershell
cd storage-server
node server.js
```
✅ Expected output:
```
[Storage] Default admin created → username: admin  password: admin123
[Storage] TCP server listening on 127.0.0.1:9000
```

### Terminal 2 – Main Server
```powershell
cd server
node server.js
```
✅ Expected output:
```
[Server] HTTPS + WSS listening on https://localhost:3443
[ClientWorker #0] Connected to storage server
```

### Terminal 3 – React Client
```powershell
cd client
npm run dev
```
✅ Expected output:
```
  ➜  Local:   http://localhost:5173/
```

### Open the app
Go to: **http://localhost:5173**

Click **"⚡ Quick Demo Login (admin)"** to enter immediately.

---

## Default Accounts

| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | Admin |

The admin account is created automatically on first run.
You can register more accounts from the login page.

---

## Project Dependencies (auto-installed via npm install)

### Storage Server (`storage-server/`)
| Package   | Version | Purpose                    |
|-----------|---------|----------------------------|
| bcryptjs  | ^2.4.3  | Hashing the default admin password |
| dotenv    | ^16.4.5 | Loading `.env` config      |
| mongoose  | ^8.3.4  | (included but unused – JSON files used instead) |

### Main Server (`server/`)
| Package            | Version  | Purpose                          |
|--------------------|----------|----------------------------------|
| express            | ^4.19.2  | HTTP server & routing            |
| ws                 | ^8.17.0  | WebSocket server                 |
| jsonwebtoken       | ^9.0.2   | JWT auth tokens                  |
| bcryptjs           | ^2.4.3   | Password hashing                 |
| multer             | ^1.4.5   | File uploads (video/thumbnail)   |
| express-rate-limit | ^7.3.0   | Rate limiting on auth endpoints  |
| helmet             | ^7.1.0   | HTTP security headers            |
| cors               | ^2.8.5   | Cross-origin resource sharing    |
| dotenv             | ^16.4.5  | Environment variable loading     |

### React Client (`client/`)
| Package          | Version | Purpose                  |
|------------------|---------|--------------------------|
| react            | ^18.3.1 | UI framework             |
| react-dom        | ^18.3.1 | DOM rendering            |
| react-router-dom | ^6.23.1 | Client-side routing      |
| axios            | ^1.7.2  | HTTP requests to backend |
| vite             | ^5.2.12 | Dev server & bundler     |

### Root (`/`)
| Package    | Version | Purpose                         |
|------------|---------|---------------------------------|
| selfsigned | ^2.4.1  | Generating self-signed TLS cert |

---

## File Structure After Setup

```
kickcut/
├── certs/
│   ├── cert.pem          ← TLS certificate (generated)
│   ├── key.pem           ← TLS private key (generated, not in git)
│   └── gen-cert.js
├── client/               ← React frontend (Vite)
├── server/               ← Node.js HTTPS + WebSocket server
│   └── uploads/          ← Uploaded video/thumbnail files (created automatically)
└── storage-server/
    └── data/             ← JSON database files (created automatically)
        ├── users.json
        ├── highlights.json
        └── chat_messages.json
```
