/**
 * Playwright configuration for the ChronoCoder e2e suite.
 *
 * The specs in ./e2e drive the real UI, so Playwright boots both halves of
 * the stack before running: the Next.js frontend on :3000 and the FastAPI
 * backend on :8000. The backend has no auth on the mentor catalogue, so the
 * gallery/workspace flows work without any Supabase credentials.
 *
 * Run locally:  npm --prefix tests run test:e2e
 * Reuse a dev server: E2E_REUSE_SERVER=1 npm --prefix tests run test:e2e
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT || '3000';
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;
const BACKEND_PORT = process.env.E2E_BACKEND_PORT || '8000';

// CI has no TTY and no dev server, so always start (and tear down) one.
const REUSE_SERVER = process.env.E2E_REUSE_SERVER === '1' && !process.env.CI;

export default defineConfig({
  testDir: './e2e',
  // A failing assertion should not be retried in CI — retries hide flake.
  retries: process.env.CI ? 0 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '..',
      url: BASE_URL,
      reuseExistingServer: REUSE_SERVER,
      timeout: 120_000,
      env: {
        PORT,
        // Without this the frontend tries an unreachable production socket.
        NEXT_PUBLIC_WS_URL: `ws://localhost:${BACKEND_PORT}/ws/feedback`,
      },
    },
    {
      command: 'uvicorn backend.main:app --host 0.0.0.0 --port 8000',
      cwd: '..',
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: REUSE_SERVER,
      timeout: 120_000,
      env: {
        PORT: BACKEND_PORT,
        // No Supabase in the test environment: run the backend in dev mode so
        // get_session_repo returns None instead of raising in production.
        FASTAPI_ENV: 'development',
      },
    },
  ],
});