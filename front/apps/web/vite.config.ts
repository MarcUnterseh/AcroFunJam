import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the API is reached through the Vite proxy (same origin, no CORS needed).
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:5252';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/catalog': apiTarget },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
