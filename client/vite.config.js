import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
