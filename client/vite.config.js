import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../certs/cert.pem')),
    },
    proxy: {
      '/auth': {
        target: 'https://localhost:3443',
        secure: false,
        changeOrigin: true,
      },
      '/highlights': {
        target: 'https://localhost:3443',
        secure: false,
        changeOrigin: true,
      },
      '/chat/messages': {
        target: 'https://localhost:3443',
        secure: false,
        changeOrigin: true,
      },
      '/chat/channels': {
        target: 'https://localhost:3443',
        secure: false,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://localhost:3443',
        secure: false,
        changeOrigin: true,
      },
      '/widgets': {
        target: 'https://localhost:3443',
        secure: false,
        changeOrigin: true,
      },
      '/ws': {
        target: 'https://localhost:3443',
        ws: true,
        secure: false,
        changeOrigin: true,
      },
    },
  },
});
