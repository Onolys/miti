import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    // Always exercise the real client against intercepted requests, independent of local env files.
    env: {
      PUBLIC_SIGNUP_URL: 'https://script.google.com/macros/s/playwright-mock/exec',
      PUBLIC_SIGNUP_PLAN: 'A',
      PUBLIC_GA_ID: 'G-PLAYWRIGHT',
    },
    // Keep Astro 7 in the foreground when it detects an agent; Playwright owns cleanup.
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4321 --ignore-lock',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
