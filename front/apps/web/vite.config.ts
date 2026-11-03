import react from '@vitejs/plugin-react';
import { toCssVariables } from '@acrofunjam/ui-tokens/css';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// In development the API is reached through the Vite proxy (same origin, no CORS, session cookie — ADR 0011).
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:5252';

/** Exposes the design tokens as CSS variables through the "virtual:tokens.css" module (ADR 0012). */
const designTokens = (): Plugin => {
  const id = 'virtual:tokens.css';
  return {
    name: 'acrofunjam-design-tokens',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load: (resolved) => (resolved === `\0${id}` ? toCssVariables() : undefined),
  };
};

export default defineConfig({
  plugins: [react(), designTokens()],
  server: {
    port: 5173,
    strictPort: true,
    // Anchored, so that pages of the site such as /catalogue or /membres are not sent to the API.
    proxy: { '^/catalog/': apiTarget, '^/identity/': apiTarget, '^/me$': apiTarget },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
