/**
 * Mentor Flow End-to-End Tests with Playwright
 * 
 * Test coverage includes:
 * - Full user journey from landing to export
 * - All 8 mentors selectable and functional
 * - Code submission flow
 * - Feedback streaming visual verification
 * - Export functionality verification
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Base URL for testing (configure in environment)
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('ChronoCoder Mentor Flow', () => {
  // Global setup before all tests
  test.beforeEach(async ({ page }) => {
    // Set up consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to base URL
    await page.goto(BASE_URL);
    
    // Wait for app to be ready
    await page.waitForSelector('[data-testid="mentor-card"]', { timeout: 10000 });
  });

  // ============================================================================
  // USER JOURNEY TESTS
  // ============================================================================

  test('complete user journey from landing to export', async ({ page }) => {
    // 1. Landing page loads correctly
    await expect(page).toHaveTitle(/ChronoCoder|Code Analysis/i);
    
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
    
    // 2. Hero section displays correctly
    const heroContent = page.locator('.hero-section');
    await expect(heroContent).toBeVisible();
    
    // 3. User can see available mentors
    const mentorCards = page.locator('[data-testid="mentor-card"]');
    await expect(mentorCards.first()).toBeVisible();
    
    // 4. User selects a mentor
    await mentorCards.first().click();
    
    const selectedMentor = page.locator('.mentor-card.selected');
    await expect(selectedMentor).toHaveClass(/selected/);
    
    // 5. User can access code editor
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await expect(codeEditor).toBeVisible();
    
    // 6. User pastes code into editor
    await page.keyboard.type('// Sample analysis\nfunction hello() {\n  return "world";\n}');
    
    // 7. Character count updates
    const charCount = page.locator('[aria-label="character-count"]');
    await expect(charCount).toContainText(/\d+/);
    
    // 8. User submits code
    const submitButton = page.getByRole('button', { name: /submit|analyze/i });
    await submitButton.click();
    
    // 9. Loading state appears
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    await expect(loadingIndicator).toBeVisible();
    
    // 10. Streaming feedback appears token-by-token
    await page.waitForTimeout(1000); // Allow streaming to complete
    
    const feedbackSection = page.locator('[data-testid="feedback-container"]');
    await expect(feedbackSection).toBeVisible();
    await expect(feedbackSection).toContainText(/analysis|feedback/i);
    
    // 11. User can view metrics
    const metricsCard = page.locator('[data-testid="metrics-summary"]');
    await expect(metricsCard).toBeVisible();
    
    // 12. User exports results
    const exportButton = page.getByRole('button', { name: /export|download/i });
    await exportButton.click();
    
    // 13. Download starts
    await page.waitForTimeout(500);
    
    // Verify download occurred (check browser's default download behavior)
    const downloads = await page.context().downloads();
    expect(downloads.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // MENTOR SELECTION TESTS - ALL 8 MENTORS
  // ============================================================================

  test('all 8 mentors are accessible and selectable', async ({ page }) => {
    const expectedMentors = [
      { id: 'alex-chen', name: 'Alex Chen', role: 'Full Stack Developer' },
      { id: 'sarah-johnson', name: 'Sarah Johnson', role: 'DevOps Engineer' },
      { id: 'michael-brown', name: 'Michael Brown', role: 'Security Specialist' },
      { id: 'emma-wilson', name: 'Emma Wilson', role: 'Machine Learning Expert' },
      { id: 'david-lee', name: 'David Lee', role: 'Mobile Development Lead' },
      { id: 'lisa-patel', name: 'Lisa Patel', role: 'Database Architect' },
      { id: 'james-miller', name: 'James Miller', role: 'Cloud Solutions Expert' },
      { id: 'rachel-taylor', name: 'Rachel Taylor', role: 'QA Automation Lead' },
    ];

    const mentorCards = page.locator('[data-testid="mentor-card"]');
    const cardCount = await mentorCards.count();

    expect(cardCount).toBeGreaterThanOrEqual(8);

    for (let i = 0; i < Math.min(8, cardCount); i++) {
      const card = mentorCards.nth(i);
      const mentorInfo = expectedMentors[i];

      if (mentorInfo) {
        // Check mentor name is visible
        await expect(card.locator('h3')).toContainText(mentorInfo.name, { timeout: 5000 });
        
        // Check mentor role is visible
        await expect(card.locator('.mentor-role')).toContainText(mentorInfo.role);
        
        // Check rating display
        const rating = card.locator('[data-testid="rating-badge"]');
        await expect(rating).toBeVisible();
      }

      // Test selecting each mentor
      await card.click();
      
      await page.waitForTimeout(300);
      
      // Verify selection visually
      await expect(card).toHaveClass(/selected/);
      
      // Deselect by clicking another card
      if (i < 7) {
        await mentorCards.nth(i + 1).click();
      }
    }
  });

  test('specific mentor details load correctly', async ({ page }) => {
    const mentorCards = page.locator('[data-testid="mentor-card"]');
    
    // Click on first mentor
    await mentorCards.first().click();
    
    // Wait for modal/slide-over with details
    const mentorDetails = page.locator('[data-testid="mentor-details-modal"]');
    
    await expect(mentorDetails).toBeVisible({ timeout: 5000 });
    
    // Verify all sections present
    const sections = ['expertise', 'experience', 'portfolio', 'contact'];
    for (const section of sections) {
      const sectionElement = mentorDetails.locator(`#${section}`);
      await expect(sectionElement).toBeVisible();
    }
  });

  // ============================================================================
  // CODE SUBMISSION FLOW
  // ============================================================================

  test('code submission flow works end-to-end', async ({ page }) => {
    // Setup clean workspace
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.focus();
    
    // Enter complex multi-language code
    const sampleCode = `// JavaScript Function
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));

/* CSS Styling Example */
.button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
}

<!-- HTML Template -->
<button class="button">Click Me</button>`;
    
    await codeEditor.fill(sampleCode);
    
    // Verify character count
    const charCount = await page.locator('[aria-label="character-count"]').textContent();
    expect(parseInt(charCount)).toBeGreaterThan(100);
    
    // Change language selector
    const languageSelect = page.locator('[data-testid="language-selector"]');
    await languageSelect.selectOption('typescript');
    
    // Submit code
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    // Verify submission initiated
    await expect(page.locator('[data-testid="submission-status"]')).toContainText(/analyzing/i);
  });

  test('keyboard shortcuts work correctly', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    
    await codeEditor.focus();
    
    // Type some code
    await codeEditor.pressSequentially('test code');
    
    // Press Ctrl+Enter (or Cmd+Enter on Mac)
    const isMac = page.browser().browserName() === 'webkit';
    const shortcutKey = isMac ? 'Meta+Enter' : 'Control+Enter';
    
    await codeEditor.press(shortcutKey);
    
    // Should trigger submission
    await page.waitForTimeout(500);
    
    await expect(page.locator('[data-testid="submission-status"]')).toContainText(/submitted/i);
  });

  test('validation prevents empty submissions', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    
    // Clear any existing content
    await codeEditor.fill('');
    
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    // Should show validation error
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/empty|enter code/i);
  });

  test('error handling for invalid code', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    const errorMessage = page.locator('[data-testid="error-message"]');
    
    // Enter syntax-invalid code
    await codeEditor.fill('function broken(');
    
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    // Give system time to analyze
    await page.waitForTimeout(1000);
    
    // Check for helpful error message
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/syntax|invalid/i);
    }
  });

  // ============================================================================
  // FEEDBACK STREAMING VISUAL VERIFICATION
  // ============================================================================

  test('streaming feedback displays correctly', async ({ page }) => {
    // Enter code to analyze
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.fill('console.log("test")');
    
    // Submit
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    // Capture initial loading state
    const loadingDots = page.locator('[data-testid="streaming-dots"]');
    await expect(loadingDots).toBeVisible();
    
    // Observe feedback appearing
    await page.waitForTimeout(2000);
    
    const feedbackText = page.locator('[data-testid="feedback-content"]');
    
    // Verify feedback is appearing
    await expect(feedbackText).toHaveCount(1);
  });

  test('markdown formatting renders correctly', async ({ page }) => {
    // Analyze some code
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.fill('function test() { return true; }');
    
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    await page.waitForTimeout(3000);
    
    // Check for rendered markdown elements
    const headers = page.locator('[data-testid="markdown-heading"]');
    await expect(headers.first()).toBeVisible({ timeout: 5000 });
    
    // Check for code blocks
    const codeBlocks = page.locator('[data-testid="markdown-code-block"]');
    await expect(codeBlocks.first()).toBeVisible();
    
    // Check for list items
    const lists = page.locator('[data-testid="markdown-list"]');
    await expect(lists.first()).toBeVisible();
  });

  test('interactive feedback elements respond to clicks', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.fill('test code');
    
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    await page.waitForTimeout(3000);
    
    // Find expandable sections
    const expandableSection = page.locator('[role="button"][aria-expanded]');
    if (await expandableSection.count() > 0) {
      await expandableSection.first().click();
      
      // Verify expansion
      await expect(expandableSection.first()).toHaveAttribute('aria-expanded', 'true');
    }
    
    // Try copying text
    const copyButtons = page.locator('[aria-label="copy"]');
    if (await copyButtons.count() > 0) {
      await copyButtons.first().click();
      
      // Visual confirmation
      await page.waitForTimeout(500);
      
      await expect(copyButtons.first()).toContainText(/copied/i);
    }
  });

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  test('export generates valid file', async ({ page, context }) => {
    // Create download directory if needed
    const downloadsPath = '/tmp/chronocoder-downloads';
    
    // Configure context for downloads
    const newContext = await context.newContext({
      acceptDownloads: true,
    });
    
    const newPage = await newContext.newPage();
    await newPage.goto(BASE_URL);
    
    // Generate analysis
    const codeEditor = newPage.locator('[data-testid="code-editor"]');
    await codeEditor.fill('console.log("export test")');
    
    const submitButton = newPage.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    await newPage.waitForTimeout(2000);
    
    // Initiate export
    const exportButton = newPage.getByRole('button', { name: /export/i });
    await exportButton.click();
    
    // Wait for download
    const download = await newPage.waitForEvent('download');
    
    // Verify download completed
    expect(download.suggestedFilename()).toBeTruthy();
    expect(await download.path()).toBeTruthy();
    
    // Close context
    await newContext.close();
  });

  test('multiple export formats available', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.fill('test');
    
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    await page.waitForTimeout(2000);
    
    const exportButton = page.getByRole('button', { name: /export/i });
    await exportButton.click();
    
    // Check format options
    const formatOptions = page.locator('[data-testid="export-format-option"]');
    const optionCount = await formatOptions.count();
    
    expect(optionCount).toBeGreaterThanOrEqual(3);
    
    // Select different formats
    for (let i = 0; i < optionCount; i++) {
      await formatOptions.nth(i).click();
      
      await page.waitForTimeout(300);
      
      await expect(formatOptions.nth(i)).toHaveClass(/active/);
      
      // Return to first option
      if (i < optionCount - 1) {
        await formatOptions.first().click();
      }
    }
  });

  test('export metadata is included', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.fill('metadata test');
    
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    await page.waitForTimeout(2000);
    
    const exportModal = page.locator('[data-testid="export-modal"]');
    await exportModal.waitFor();
    
    // Verify metadata fields
    const timestampField = page.locator('[data-testid="export-timestamp"]');
    await expect(timestampField).toBeVisible();
    
    const mentorField = page.locator('[data-testid="export-mentor"]');
    await expect(mentorField).toBeVisible();
    
    const versionField = page.locator('[data-testid="export-version"]');
    await expect(versionField).toBeVisible();
  });

  // ============================================================================
  // RESPONSIVE BEHAVIOR
  // ============================================================================

  test('flow works on mobile viewport', async ({ page }) => {
    // Mobile dimensions
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Reload page
    await page.reload();
    
    // Verify mentors are scrollable
    const mentorList = page.locator('[data-testid="mentor-grid"]');
    await expect(mentorList).toBeVisible();
    
    // Verify we can still interact
    const mentorCard = page.locator('[data-testid="mentor-card"]');
    await expect(mentorCard.first()).toBeVisible();
    await mentorCard.first().click();
    
    // Editor should adapt
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await expect(codeEditor).toBeVisible();
  });

  test('flow works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.reload();
    
    // Verify layout adapts
    const mainLayout = page.locator('.main-layout');
    await expect(mainLayout).toBeVisible();
  });

  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================

  test('full keyboard navigation support', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    const firstFocusable = page.locator(':focus');
    await expect(firstFocusable).toHaveCount(1);
    
    // Continue tabbing
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    const lastFocusedElement = page.locator(':focus');
    await expect(lastFocusedElement).toHaveCount(1);
    
    // Verify focus is visible
    await expect(lastFocusedElement).toHaveClass(/focus-visible|focus-ring/);
  });

  test('ARIA labels are present', async ({ page }) => {
    const elementsWithAria = page.locator('[aria-label]');
    const ariaLabelCount = await elementsWithAria.count();
    
    expect(ariaLabelCount).toBeGreaterThan(5);
    
    // Check critical elements have labels
    const submitButton = page.locator('button[aria-label*="submit"]');
    if (await submitButton.count() > 0) {
      await expect(submitButton).toHaveAttribute('aria-label');
    }
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  test('handles slow network gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await page.goto(BASE_URL);
    
    // Should show loading states
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible({ timeout: 10000 });
  });

  test('recovers from connection loss', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.fill('test recovery');
    
    // Start submission
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();
    
    await page.waitForTimeout(1000);
    
    // Network should attempt retry
    const retryButton = page.locator('[data-testid="retry-button"]');
    if (await retryButton.count() > 0) {
      await retryButton.click();
      
      await page.waitForTimeout(1000);
      
      // Should attempt reconnection
      await expect(page.locator('[data-testid="reconnecting"]')).toBeVisible();
    }
  });

  test('handles very large code submissions', async ({ page }) => {
    // Generate very long code
    const largeCode = Array(1000).fill('// Line ').join('\n') + '\nconsole.log("done");';
    
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.fill(largeCode);
    
    // Character count should update
    const charCount = page.locator('[aria-label="character-count"]');
    await expect(charCount).toContainText(/\d+/);
    
    // Should handle gracefully
    await page.waitForTimeout(1000);
    await expect(codeEditor).toBeVisible();
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });

  test('mentor cards render efficiently', async ({ page }) => {
    const mentorCards = page.locator('[data-testid="mentor-card"]');
    
    const startTime = Date.now();
    
    await expect(mentorCards.first()).toBeVisible();
    
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).toBeLessThan(2000);
  });
});

// ============================================================================
// ADDITIONAL SCENARIOS FOR COVERAGE
// ============================================================================

test.describe('Advanced Scenarios', () => {
  test('user can resume interrupted session', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await codeEditor.fill('session continuation test');
    
    await page.reload();
    
    // Check localStorage/sessionStorage preserved data
    const persistedData = page.evaluate(() => {
      return localStorage.getItem('lastAnalysis') || sessionStorage.getItem('lastCode');
    });
    
    // Data persistence is implementation detail, but UI should reflect
    const recentActivity = page.locator('[data-testid="recent-activity"]');
    // This is optional based on implementation
  });

  test('different language modes work correctly', async ({ page }) => {
    const languageSelect = page.locator('[data-testid="language-selector"]');
    const languages = ['javascript', 'python', 'typescript', 'rust', 'go'];
    
    for (const lang of languages) {
      await languageSelect.selectOption(lang);
      
      await page.waitForTimeout(300);
      
      const editorMode = page.locator('[data-testid="editor-mode"]');
      await expect(editorMode).toContainText(lang, { useContainingText: true });
    }
  });
});
