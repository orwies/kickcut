# KickCut – Setup & Installation Guide

## Prerequisites (install these first)

### 1. Node.js (v18 or higher)
Download and install from: https://nodejs.org/en/download
- Choose the **LTS** version (recommended)
- Verify install: `node --version` and `npm --version`

### 2. Git
Download and install from: https://git-scm.com/downloads
- Verify install: `git --version`

---

## 🚀 Quick Automated Setup

We have created an automated script that handles almost everything for you.

Open a PowerShell terminal and run:

> [!WARNING]
> **Windows Users:** If you get a red error saying `running scripts is disabled on this system`, you need to allow PowerShell to run scripts. Run this command first:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Step 1 – Clone the repo
```powershell
git clone https://github.com/orwies/kickcut.git
cd kickcut
```

### Step 2 – Run the Setup Script
```powershell
npm run setup
```
This script will automatically:
1. Copy the `.env.example` templates to `.env` in the server folders.
2. Generate secure, self-signed TLS certificates for your local machine.
3. Install all necessary dependencies across the entire project.

### Step 3 – Configure your Environment
Open the newly created **`.env`** file located in the root folder and add your private keys:
- Add your `MONGO_URI` connection string.
- Add your `GEMINI_API_KEY` for the AI bot.
- (Optional) Change the `JWT_SECRET` to a random string.

---

## Running the Project

You no longer need to open 3 separate terminals manually!

Just double-click the **`start_dev.bat`** file located in the root `kickcut` folder, or run it from the terminal:

```powershell
.\start_dev.bat
```

This automated script will:
1. Launch the **Storage Server** and wait for it to connect to MongoDB.
2. Launch the **Main Server** (HTTPS + WSS).
3. Launch the **React Client** UI.

Each service will open in its own separate terminal window so you can easily view their individual logs.

### Open the app
Go to: **https://localhost:5173** (Note: you may need to bypass the browser's "Not Secure" warning since we use self-signed certificates for local development).

---

## Default Admin Account

| Username | Password    | Role  |
|----------|-------------|-------|
| orwies   | orwies13579 | Admin |

The admin account is securely seeded into your MongoDB database automatically the first time you run the storage server.

---

## Project Dependencies

### Storage Server (`storage-server/`)
- **mongoose**: Connects and models data for MongoDB.
- **bcryptjs**: Hashes passwords securely before storing.
- **dotenv**: Loads environment variables.

### Main Server (`server/`)
- **express**: HTTP server & routing.
- **ws**: Real-time WebSocket server.
- **@google/generative-ai**: Powers "KickBot" AI using Gemini.
- **jsonwebtoken**: Manages secure user sessions (JWT).
- **multer**: Handles secure video and thumbnail uploads.
- **express-rate-limit & helmet**: Provides DoS protection and security headers.

### React Client (`client/`)
- **react & react-dom**: Core UI framework.
- **react-router-dom**: Client-side page routing.
- **axios**: HTTP requests to the backend.
- **vite**: Lightning-fast dev server & bundler.

---

## File Structure After Setup

```
kickcut/
├── certs/
│   ├── cert.pem          ← Public TLS certificate (auto-generated)
│   ├── key.pem           ← Private TLS key (auto-generated, hidden from git)
│   └── gen-cert.js
├── client/               ← React frontend
├── server/               ← Node.js Main Server (HTTPS + WSS)
│   ├── .env              ← Secrets (Gemini Key, JWT Secret)
│   └── uploads/          ← Uploaded media files
└── storage-server/       ← Node.js DB Gateway (TCP)
    └── .env              ← Secrets (Mongo URI)
```
