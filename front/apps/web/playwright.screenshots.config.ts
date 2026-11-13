import { defineConfig, devices } from '@playwright/test';

// Screenshots of the screens of a story, for the design reviews (npm run screenshots): one file per story,
// e2e/screenshots/story-<n>.screens.ts, the API simulated by network interception as in the e2e. Every screen is taken
// at 320 px wide and at a desktop width, light theme; the images land in screenshots/story-<n>/ (not versioned).
// One story only: npm run screenshots -- story-7.

const baseURL = process.env.WEB_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: 'e2e/screenshots',
  testMatch: '*.screens.ts',
  fullyParallel: true,
  workers: '50%',
  reporter: 'list',
  // Only the images matter: no trace, no report.
  outputDir: 'test-results/screenshots',
  use: { baseURL, colorScheme: 'light', locale: 'fr-FR' },
  projects: [
    { name: '320', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 720 } } },
    { name: '1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // As the e2e: a build, served by vite preview; a server already running on the port is reused.
    command: 'npx vite build && npx vite preview --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: true,
  },
});
