import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  // il server di prova di Python rifiuta connessioni sotto carico: un worker solo
  workers: 1,
  use: { ...devices['Pixel 5'], baseURL: 'http://localhost:8765/', serviceWorkers: 'block' },
  webServer: {
    command: 'python -m http.server 8765 --directory docs',
    url: 'http://localhost:8765/',
    reuseExistingServer: true,
  },
});
