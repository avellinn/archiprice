/* global process */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000';

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
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,jsx,mjs}'],
  },
});
