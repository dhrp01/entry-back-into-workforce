import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Python server (port 8000) serves the API and, after `npm run build`,
// this app from web/dist. During development `npm run dev` serves the app
// on port 5173 with hot reload and forwards /api calls to the Python server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    cssCodeSplit: true,
  },
});
