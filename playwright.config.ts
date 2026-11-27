import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests against a production build, with every API answered from a recording (tests/fixtures/api.har.zip)
 * so they do not depend on OpenF1, Jolpica, MultiViewer or Open-Meteo being up, open or within their limits.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  // Every test sets up its own page and recordings, so tests from one file can run side by side (and be split across CI machines).
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'off',
    // The app's service worker would fetch API data itself, out of the recording's reach.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'laptop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
