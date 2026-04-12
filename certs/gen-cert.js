#!/usr/bin/env node
'use strict';

const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const certsDir = __dirname;
const certPath = path.join(certsDir, 'cert.pem');
const keyPath = path.join(certsDir, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('TLS certificates already exist. Delete them to regenerate.');
  process.exit(0);
}

console.log('Generating self-signed TLS certificate...');

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'organizationName', value: 'KickCut Dev' },
];

const pems = selfsigned.generate(attrs, {
  keySize: 2048,
  days: 730,
  algorithm: 'sha256',
  extensions: [
    { name: 'basicConstraints', cA: false },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
      ],
    },
  ],
});

fs.writeFileSync(certPath, pems.cert, 'utf8');
fs.writeFileSync(keyPath, pems.private, 'utf8');

console.log('TLS certificate generated: certs/cert.pem + certs/key.pem');
