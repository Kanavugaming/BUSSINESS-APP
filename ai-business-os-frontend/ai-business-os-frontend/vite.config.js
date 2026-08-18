import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api and /socket.io to your local backend (default port 5000).
// In production this app is built with `npm run build` and the dist/* files are
// copied into the backend's /public folder, so no proxy is needed there —
// the Express server serves everything from the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
