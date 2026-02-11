import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    watch: {
      usePolling: true, // Forces file checking (fixes Docker/Windows sync)
      interval: 100,    // Check every 100ms
    },
    hmr: {
      clientPort: 5173, // Ensure the browser knows where to find the websocket
    },
    // Smooth DX in Docker:
    // - Open http://localhost:5173 for the frontend + HMR
    // - Forward /api/* calls to the Wrangler Pages dev server running in the `backend` service
    proxy: {
      '/api': {
        target: 'http://backend:8788',
        changeOrigin: true,
      },
    },
  },
})