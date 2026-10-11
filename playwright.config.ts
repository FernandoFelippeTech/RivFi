import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/ui', timeout: 120000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'npm.cmd run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 120000 },
})
