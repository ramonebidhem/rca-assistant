import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API base URL is read from VITE_API_URL at build/runtime.
// In dev we proxy /api and /uploads to the backend to avoid CORS.
export default defineConfig({
  // Static builds are served from a sub-path (e.g. GitHub Pages project sites).
  base: (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
