const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting KickCut Automatic Setup...\n');

// 1. Create .env file
console.log('⚙️ Setting up environment file...');

const rootEnvPath = path.join(__dirname, '.env');

const rootEnvContent = `# ─── KickCut Environment Variables ────────────────────────────

# Port the HTTPS + WSS main server listens on.
PORT=3443

# Secret key used to sign and verify JSON Web Tokens.
JWT_SECRET=change_this_to_a_long_random_secret

# Address of the storage server (TCP).
STORAGE_HOST=127.0.0.1

# TCP port the storage server listens on. Must match TCP_PORT below.
STORAGE_PORT=9000

# Directory where uploaded videos and thumbnail images are saved.
UPLOAD_DIR=./uploads

# Your Google Gemini API key — needed for the KickBot AI chat channel.
GEMINI_API_KEY=your_gemini_api_key_here

# Full MongoDB connection string.
MONGO_URI=mongodb+srv://YOUR_DB_USER:YOUR_DB_PASSWORD@cluster0.xxxx.mongodb.net/?appName=Cluster0

# TCP port the storage server listens on.
TCP_PORT=9000
`;

if (!fs.existsSync(rootEnvPath)) {
  fs.writeFileSync(rootEnvPath, rootEnvContent);
  console.log('✅ Created .env in the root folder (Remember to add your Gemini API Key and Mongo URI!)');
} else {
  console.log('⏭️  .env already exists in the root folder, skipping.');
}

// 2. Install Dependencies
const dirs = ['.', 'client', 'server', 'storage-server'];
console.log('\n📦 Installing dependencies for all folders (this might take a minute)...');

dirs.forEach(dir => {
  const folderName = dir === '.' ? 'root' : dir;
  console.log(`\n⬇️  Installing in /${folderName}...`);
  try {
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, dir) });
  } catch (err) {
    console.error(`❌ Failed to install dependencies in /${folderName}`);
  }
});

// 3. Generate Certs
console.log('\n🔒 Generating SSL Certificates...');
try {
  execSync('node certs/gen-cert.js', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Certificates generated successfully.');
} catch (err) {
  console.error('❌ Failed to generate certificates.');
}

console.log('\n🎉 Setup Complete! 🎉');
console.log('You just need to add your MONGO_URI and GEMINI_API_KEY to the .env file in the root folder.');
console.log('Then you can start the environment by running: .\\start_dev.bat');
