/**
 * Lighthouse configuration for ChronoCoder v3.
 *
 * Extends the stock Lighthouse config (required — a custom config without
 * `extends` has no artifacts to gather) and pins the settings this project
 * cares about. Route-specific budgets live in budgets.json and are passed
 * to the CLI via --budget-path by performance-test-runner.js.
 *
 * Usage (from tests/):
 *   node performance/performance-test-runner.js
 */

module.exports = {
  extends: 'lighthouse:default',

  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],

    // Desktop profile for the mentor gallery / workspace UI.
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },

    // No artificial network throttling locally; keep CPU multiplier at 1 so
    // results reflect the dev machine. Bump for CI realism if needed.
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },

    output: ['html'],
  },
};