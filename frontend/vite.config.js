import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 500,
      binaryInterval: 1000,
      ignored: [
        '**/.git/**',
        '**/.agents/**',
        '**/.codex/**',
        '**/dist/**',
        '**/node_modules/**',
        '../backend/**',
        '../dist/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
