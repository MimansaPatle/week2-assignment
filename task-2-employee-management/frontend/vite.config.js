import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Fixed port, so it always matches CLIENT_ORIGIN in the backend's .env.
    port: 5173,
    strictPort: true,
  },
});
