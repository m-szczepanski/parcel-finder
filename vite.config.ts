/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    // Leaflet + React + the turf/polygon-clipping modules in use land around
    // 510 kB minified (~160 kB gzip). The limit stays on as a regression
    // tripwire — a jump past this means something new got pulled in.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
