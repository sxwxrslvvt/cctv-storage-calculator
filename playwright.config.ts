import { defineConfig, devices } from '@playwright/test';

const remoteURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: remoteURL || 'http://127.0.0.1:4173/cctv-storage-calculator/', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: remoteURL ? undefined : {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/cctv-storage-calculator/',
    reuseExistingServer: false,
  },
});
