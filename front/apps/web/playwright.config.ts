import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Shared Gherkin specs (ADR 0003): only @web scenarios that are not @wip run here.
const testDir = defineBddConfig({
  featuresRoot: '../../../specs/features',
  features: '../../../specs/features/**/*.feature',
  steps: ['e2e/fixtures.ts', 'e2e/steps/**/*.ts'],
  tags: '@web and not @wip',
  language: 'fr',
  outputDir: '.features-gen',
});

const baseURL = process.env.WEB_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : '50%',
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Layout checks outside the Gherkin specs (narrow screen, zoom): plain Playwright tests.
    { name: 'layout', testDir: 'e2e/layout', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // A build, locally as in CI: stable timings from a cold start (the build takes a fraction of a second), where
    // the dev server would transform the modules on demand, re-optimise the dependencies and reload the pages.
    // Locally, a server already running on the port (npm run dev) is reused.
    command: 'npx vite build && npx vite preview --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
