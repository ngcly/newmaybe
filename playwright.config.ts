import { enabled } from './e2e/apps';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: ['main', 'graph', 'ai', 'studio', 'study', 'club', 'lab']
    .map((app, index) => ({
      // Keep Astro in the foreground even when invoked from an agent session,
      // so Playwright owns its lifecycle and does not leave orphan servers.
      command: `npm run preview -w apps/${app} -- --host 127.0.0.1 --port ${4401 + index}${['main', 'graph', 'lab'].includes(app) ? ' --ignore-lock' : ''}`,
      url: `http://127.0.0.1:${4401 + index}`,
      reuseExistingServer: false,
      timeout: 60_000,
      app,
    }))
    .filter((server) => enabled(server.app)),
});
