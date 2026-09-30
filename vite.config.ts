import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { app: 'index.html', world: 'world-preview.html' },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
