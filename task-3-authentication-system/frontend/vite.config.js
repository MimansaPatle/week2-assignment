import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // A fixed port, so it always matches FRONTEND_URL in backend/.env.
    // If the port is taken, Vite stops with an error instead of moving on.
    port: 5173,
    strictPort: true,
    open: true,
  },
})
