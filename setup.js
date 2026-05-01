const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting KickCut Automatic Setup...\n');

// 1. Copy .env.example to .env
const envPaths = [
  { example: 'server/.env.example', target: 'server/.env' },
  { example: 'storage-server/.env.example', target: 'storage-server/.env' }
];

console.log('⚙️ Setting up environment files...');
envPaths.forEach(({ example, target }) => {
  const examplePath = path.join(__dirname, example);
  const targetPath = path.join(__dirname, target);
  
  if (fs.existsSync(examplePath) && !fs.existsSync(targetPath)) {
    fs.copyFileSync(examplePath, targetPath);
    console.log(`✅ Created ${target} (Remember to add your private keys here later!)`);
  } else if (fs.existsSync(targetPath)) {
    console.log(`⏭️  ${target} already exists, skipping.`);
  } else {
    console.log(`⚠️  Could not find ${example}, skipping.`);
  }
});

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
console.log('You just need to add your MONGO_URI and GEMINI_API_KEY to the .env files.');
console.log('Then you can start the servers with: npm run dev:server, npm run dev:storage, and npm run dev:client');
