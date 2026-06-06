import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Load .env.local then .env (mirrors Next.js precedence) so global-setup gets MONGODB_URI
(function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const envFile = path.join(__dirname, name);
    if (!fs.existsSync(envFile)) continue;
    for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
})();

// In WSL2 without system-level browser deps, point to Windows Chrome
const WSL_CHROME = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';
const useWindowsChrome = process.env.USE_WINDOWS_CHROME === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,       // serial — tests share a seeded DB via global-setup
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'e2e/reports', open: 'never' }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    ...(useWindowsChrome ? { executablePath: WSL_CHROME } : {}),
  },

  outputDir: 'e2e/screenshots',

  globalSetup: require.resolve('./e2e/global-setup'),

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(useWindowsChrome ? { executablePath: WSL_CHROME } : {}),
      },
    },
  ],
});
