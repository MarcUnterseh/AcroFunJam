import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Shared Gherkin specs (ADR 0003): only @web scenarios that are not @wip run here.
const testDir = defineBddConfig({
  featuresRoot: '../../../specs/features',
  features: '../../../specs/features/**/*.feature',
  steps: 'e2e/**/*.ts',
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
  // Half the cores locally: the dev server transforms modules on demand and would slow every worker down.
  workers: process.env.CI ? 2 : '50%',
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI serves a build (stable timings); locally, the dev server (dependencies pre-bundled, see vite.config).
    command: process.env.CI ? 'npx vite build && npx vite preview --port 5173 --strictPort' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
