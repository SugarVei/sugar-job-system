import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Local preview HTML files remain available in dev, outside the release build.
      input: { app: 'index.html' },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
