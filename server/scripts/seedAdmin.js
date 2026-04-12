'use strict';

/**
 * seedAdmin.js - Creates an initial admin user via TCP to the storage server.
 * Run: node scripts/seedAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const net = require('net');
const bcrypt = require('bcryptjs');

const STORAGE_HOST = process.env.STORAGE_HOST || '127.0.0.1';
const STORAGE_PORT = parseInt(process.env.STORAGE_PORT || '9000', 10);

const ADMIN_USERNAME = process.argv[2] || 'admin';
const ADMIN_PASSWORD = process.argv[3] || 'admin123';

function encodeMessage(obj) {
  const body = JSON.stringify(obj);
  const json = Buffer.from(body, 'utf8');
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(json.length, 0);
  return Buffer.concat([header, json]);
}

async function seed() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = Buffer.alloc(0);

    socket.connect(STORAGE_PORT, STORAGE_HOST, () => {
      socket.write(encodeMessage({
        id: 1,
        type: 'CREATE_USER',
        payload: { username: ADMIN_USERNAME, passwordHash, role: 'admin' },
      }));
    });

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length >= 4) {
        const len = buffer.readUInt32BE(0);
        if (buffer.length >= 4 + len) {
          const msg = JSON.parse(buffer.subarray(4, 4 + len).toString('utf8'));
          socket.destroy();
          if (msg.status === 'ok') {
            console.log(`\nAdmin user "${ADMIN_USERNAME}" created!`);
            console.log(`Username: ${ADMIN_USERNAME}`);
            console.log(`Password: ${ADMIN_PASSWORD}`);
            resolve();
          } else {
            reject(new Error(msg.error));
          }
        }
      }
    });

    socket.on('error', reject);
    setTimeout(() => reject(new Error('Connection timed out - is the storage server running?')), 5000);
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => { console.error('Seed failed:', err.message); process.exit(1); });
