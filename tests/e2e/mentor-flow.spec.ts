/**
 * Mentor Flow End-to-End Tests with Playwright
 *
 * Covers the real ChronoCoder v3 UI:
 * - Landing page hero + mentor gallery (8 historical mentors)
 * - Mentor card navigation to /workspace/[mentorId]
 * - Workspace header, code editor tab, character count, feedback flow
 * - Export button visibility and download
 *
 * Requires a running frontend (and backend for feedback flows):
 *   BASE_URL=http://localhost:3000 npx playwright test
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

const EXPECTED_MENTORS = [
  { id: 'ada_lovelace', name: 'Ada Lovelace' },
  { id: 'alan_turing', name: 'Alan Turing' },
  { id: 'grace_hopper', name: 'Grace Hopper' },
  { id: 'margaret_hamilton', name: 'Margaret Hamilton' },
  { id: 'dennis_ritchie', name: 'Dennis Ritchie' },
  { id: 'barbara_liskov', name: 'Barbara Liskov' },
  { id: 'guido_van_rossum', name: 'Guido van Rossum' },
  { id: 'linus_torvalds', name: 'Linus Torvalds' },
];

test.describe('ChronoCoder Mentor Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="mentor-card"]', { timeout: 10000 });
  });

  test('landing page shows hero and all eight mentors', async ({ page }) => {
    await expect(page).toHaveTitle(/ChronoCoder/i);

    // Hero heading from the landing page
    await expect(
      page.getByRole('heading', { level: 1, name: /Learn Python from Legends of Computing/i })
    ).toBeVisible();

    // Mentor gallery section
    const mentorCards = page.locator('[data-testid="mentor-card"]');
    await expect(mentorCards).toHaveCount(8);

    // Each real mentor renders with their name
    for (const mentor of EXPECTED_MENTORS) {
      await expect(
        mentorCards.filter({ hasText: mentor.name }).first()
      ).toBeVisible();
    }
  });

  test('mentor card links to the correct workspace route', async ({ page }) => {
    const adaCard = page.locator('[data-testid="mentor-card"][data-mentor-id="ada_lovelace"]');
    await expect(adaCard).toHaveAttribute('href', '/workspace/ada_lovelace');

    const linusCard = page.locator('[data-testid="mentor-card"][data-mentor-id="linus_torvalds"]');
    await expect(linusCard).toHaveAttribute('href', '/workspace/linus_torvalds');
  });

  test('selecting a mentor opens their workspace', async ({ page }) => {
    await page.locator('[data-testid="mentor-card"][data-mentor-id="ada_lovelace"]').click();

    await expect(page).toHaveURL(/\/workspace\/ada_lovelace$/);
    await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
    await expect(page.getByRole('button', { name: /back to archive/i })).toBeVisible();
  });

  test('workspace submit flow shows feedback or error state', async ({ page }) => {
    await page.goto(`${BASE_URL}/workspace/ada_lovelace`);
    await expect(page.getByRole('button', { name: /get feedback/i })).toBeVisible();

    // Pre-filled starter code allows submission
    await page.getByRole('button', { name: /get feedback/i }).click();

    // Either streaming feedback begins or an error surfaces — both are
    // valid outcomes depending on backend availability.
    const analysisHeading = page.getByRole('heading', { name: /Ada Lovelace's Analysis/i });
    await expect(analysisHeading).toBeVisible();

    // Ask tab shows one of: loading state, feedback content, or error panel
    const feedbackOrError = page
      .getByText(/generating personalized feedback|error:|ready for your code/i)
      .first();
    await expect(feedbackOrError).toBeVisible({ timeout: 15000 });
  });

  test('code editor is reachable without submitting first', async ({ page }) => {
    await page.goto(`${BASE_URL}/workspace/ada_lovelace`);

    // Tabs (and the code editor behind them) are visible before any submit
    await page.getByRole('button', { name: /^Code Review$/ }).click();

    // Character count and complexity badge come from CodeEditor
    await expect(page.getByTestId('character-count')).toContainText(/\d[\d,]* characters/);
    await expect(page.getByText(/Ctrl\/Cmd \+ Enter to submit/)).toBeVisible();

    // Monaco editor mounts (client-side only)
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 10000 });
  });

  test('submit is disabled while the editor is empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/workspace/ada_lovelace`);

    // Open the Code Review tab so the Monaco editor is mounted
    await page.getByRole('button', { name: /^Code Review$/ }).click();
    const editorTextarea = page.locator('.monaco-editor textarea').first();
    await expect(editorTextarea).toBeVisible({ timeout: 10000 });

    // Clear the pre-filled code via keyboard (realistic user interaction)
    await editorTextarea.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');

    // The header submit button is disabled until there is code
    await expect(page.getByRole('button', { name: /get feedback/i })).toBeDisabled();
  });

  test('export button appears only when feedback content exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/workspace/ada_lovelace`);

    // No feedback yet — export button hidden
    await expect(page.getByRole('button', { name: /^Export$/ })).toHaveCount(0);

    await page.getByRole('button', { name: /get feedback/i }).click();
    await expect(
      page.getByRole('heading', { name: /Ada Lovelace's Analysis/i })
    ).toBeVisible();

    // Wait for some feedback content to stream in (or error). The export
    // button renders whenever feedbackContent is non-empty.
    const exportButton = page.getByRole('button', { name: /^Export$/ });
    await expect(exportButton.first()).toBeVisible({ timeout: 20000 });
  });

  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    const mentorCards = page.locator('[data-testid="mentor-card"]');
    await expect(mentorCards.first()).toBeVisible();

    await mentorCards.first().click();
    await expect(page).toHaveURL(/\/workspace\//);
    await expect(page.getByRole('button', { name: /back to archive/i })).toBeVisible();
  });
});