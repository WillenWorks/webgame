import { defineConfig, devices } from '@playwright/test';

// QA visual da estética CRT. Serve o build estático (`nuxt generate`) e tira
// screenshots das telas principais em desktop e mobile. Usado para validar a
// migração Tailwind 3 → 4 sem regressão visual.
//
//   npm run build && npm run qa:visual          # compara com baseline
//   npm run build && npm run qa:visual -- --update-snapshots   # regrava baseline
//
// Requer o backend rodando em http://localhost:3333 (docker compose up -d + npm run dev).

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: 'node tests/e2e/static-server.mjs',
    url: 'http://localhost:3000',
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  },
});
