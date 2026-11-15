#!/usr/bin/env node
/**
 * Performance test runner for ChronoCoder v3.
 *
 * Runs Lighthouse against a live frontend using the shared config in
 * performance/lighthouse.config.js and writes HTML reports to
 * reports/lighthouse/.
 *
 * Usage (from tests/):
 *   node performance-test-runner.js
 *   BASE_URL=http://localhost:3000 node performance-test-runner.js
 *
 * The frontend must be running (production build: `npm --prefix .. run build`
 * then `npm --prefix .. run start`, or `npm --prefix .. run dev`).
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONFIG_PATH = path.resolve(__dirname, 'lighthouse.config.js');
const BUDGETS_PATH = path.resolve(__dirname, 'budgets.json');
const REPORT_DIR = path.resolve(__dirname, '../../reports/lighthouse');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(code) : reject(new Error(`${command} exited with code ${code}`))
    );
  });
}

async function isServerUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  console.log(`[perf] Checking frontend at ${BASE_URL} ...`);
  if (!(await isServerUp(BASE_URL))) {
    console.error(
      `[perf] No server responding at ${BASE_URL}.\n` +
        `[perf] Start the frontend first, e.g.:\n` +
        `[perf]   npm --prefix .. run build && npm --prefix .. run start`
    );
    process.exit(1);
  }

  console.log(`[perf] Running Lighthouse (config: ${CONFIG_PATH}) ...`);
  const chromeFlags = [
    '--headless',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-crash-reporter',
    `--user-data-dir=${path.join(REPORT_DIR, 'chrome-profile')}`,
  ];
  // Use an installed Chromium when present (Linux without Chrome).
  if (process.env.CHROME_PATH) {
    // honoured by chrome-launcher
  } else if (fs.existsSync('/usr/bin/chromium')) {
    process.env.CHROME_PATH = '/usr/bin/chromium';
  } else if (fs.existsSync('/usr/bin/chromium-browser')) {
    process.env.CHROME_PATH = '/usr/bin/chromium-browser';
  }

  try {
    await run(
      'npx',
      [
        'lighthouse',
        BASE_URL,
        `--config-path=${CONFIG_PATH}`,
        `--budget-path=${BUDGETS_PATH}`,
        `--chrome-flags=${chromeFlags.join(' ')}`,
        `--output=html`,
        `--output-path=${path.join(REPORT_DIR, 'chronocoder.html')}`,
      ],
      { cwd: path.resolve(__dirname, '..') }
    );
  } catch (err) {
    console.error(`[perf] Lighthouse run failed: ${err.message}`);
    console.error('[perf] Ensure Chrome/Chromium is installed or set CHROME_PATH.');
    process.exit(1);
  }

  console.log(`[perf] Report written to ${path.join(REPORT_DIR, 'chronocoder.html')}`);
}

main().catch((err) => {
  console.error(`[perf] Unexpected error: ${err.message || err}`);
  process.exit(1);
});