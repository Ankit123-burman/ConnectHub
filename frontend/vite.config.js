import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
      allowedHosts: [
      'stamina-pending-rotten.ngrok-free.dev'
    ],
    // Forwards Socket.IO and API traffic to the backend on port 4000.
    // This means the browser only ever talks to ONE origin (this dev
    // server) — important when using a single ngrok tunnel, since ngrok's
    // free plan only allows one tunnel at a time. The backend itself never
    // needs to be exposed publicly; Vite proxies to it internally.
    proxy: {
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:4000',
      },
    },
  },
});
