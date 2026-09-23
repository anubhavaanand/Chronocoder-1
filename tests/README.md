# ChronoCoder v3 Test Suite 🧪

Comprehensive testing infrastructure for ChronoCoder v3 including unit tests, integration tests, E2E tests, and performance benchmarks.

## 📋 Coverage Requirements

- **Line Coverage**: > 80%
- **Function Coverage**: > 85%
- **Branch Coverage**: > 75%
- **Critical Paths**: 100%

## 🏗️ Project Structure

```
tests/
├── setup.ts                 # Global configuration and mocks
├── components/
│   ├── MentorCard.test.tsx     # Component unit tests
│   ├── CodeEditor.test.tsx     # Editor functionality tests
│   └── FeedbackRenderer.test.tsx # Streaming feedback tests
├── hooks/
│   └── useMentorAnalysis.test.ts    # Custom hook tests
├── e2e/
│   └── mentor-flow.spec.ts       # Playwright E2E tests
├── integration/
│   └── api-integration.test.ts   # API integration tests
├── performance/
│   └── lighthouse.config.js      # Lighthouse audit settings
├── vitest.config.ts               # Vitest configuration
├── package.json                   # Dependencies and scripts
└── .github/workflows/
    └── test-ci.yml                # CI/CD pipeline
```

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install --with-deps
```

### Running Tests

#### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run with interactive watch mode
npm run test:watch

# Run specific test file
npm run test:unit -- components/MentorCard.test.tsx
```

#### Integration Tests
```bash
npm run test:integration
```

#### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run specific test file
npm run test:e2e -- e2e/mentor-flow.spec.ts
```

#### Performance Tests
```bash
npm run test:performance
```

#### Full Test Suite with Coverage
```bash
npm run test:coverage
```

### Environment Variables

Create a `.env` file in the test root directory:

```env
VITE_GEMINI_API_KEY=test-api-key
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-key
NODE_ENV=test
```

## 📊 Coverage Configuration

Coverage thresholds are configured in `vitest.config.ts`:

```javascript
coverage: {
  thresholds: {
    lines: 80,
    functions: 85,
    branches: 75,
    statements: 80,
  }
}
```

### Viewing Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# Open report in browser
open ./coverage/report-html/index.html
```

## 🧪 Mock Strategy

### Supabase Client
All database operations are mocked using Jest's mock functions. The mock provides realistic responses for authentication, queries, and mutations.

### Gemini API
Mock responses include predefined scenarios:
- `helloWorld`: Simple code analysis
- `inefficientLoop`: Performance optimization opportunities  
- `securityIssue`: Security vulnerability detection
- `goodPractice`: Well-structured code praise

### Monaco Editor
Full simulation of Monaco editor APIs including:
- Code input handling
- Syntax highlighting
- Keyboard shortcuts
- Error reporting

## 🎯 Test Categories

### Unit Tests (`tests/components/`, `tests/hooks/`)

Test individual components and hooks in isolation. Focus on:
- Rendering behavior
- Event handling
- State management
- Props validation
- Accessibility attributes

**Example:**
```typescript
it('renders mentor card with correct structure', () => {
  render(<MentorCard {...props} />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

### Integration Tests (`tests/integration/`)

Test interactions between multiple systems:
- WebSocket stream establishment
- SSE token delivery
- Rate limiting enforcement
- Error recovery

**Example:**
```typescript
it('handles network failure gracefully', async () => {
  await expect(apiCall()).rejects.toThrow(/Network request failed/i);
});
```

### E2E Tests (`tests/e2e/`)

End-to-end user journey testing using Playwright:
- Complete user flows
- Cross-browser compatibility
- Responsive behavior
- Accessibility compliance

**Example:**
```typescript
test('complete user journey from landing to export', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/ChronoCoder/i);
});
```

### Performance Tests (`tests/performance/`)

Lighthouse audits for web performance:
- Core Web Vitals
- Performance budgets
- Best practices
- SEO checks

## 🔬 Test Utilities

### Custom Matchers
```typescript
expect(element).toBeInTheDocument();
expect(element).toHaveAccessibilityLabel('Submit');
expect(element).toHaveCorrectAriaAttributes();
```

### Helper Functions
```typescript
// Wait for element
await waitForElement('#my-element');

// Simulate keyboard events
simulateKeyPress(element, 'Enter', { ctrl: true });

// Fire custom events
fireEventCustom(element, 'token-update', { detail: { index: 0 } });
```

### Global Setup
```typescript
setupTestEnvironment(); // Clears mocks, sets up console handlers
cleanupTestEnvironment(); // Restores all mocks
```

## 🤖 CI/CD Pipeline

The GitHub Actions workflow runs automatically on:
- Pushes to main/develop branches
- Pull requests to main branch

Jobs:
1. **Unit Tests** - Fast feedback on component changes
2. **Integration Tests** - Verify system interactions
3. **E2E Tests** - Validate user journeys
4. **Performance Tests** - Ensure quality standards
5. **Coverage Check** - Enforce minimum thresholds
6. **Quality Gate** - Final pass/fail decision

## 📈 Coverage Goals

### Current Targets

| Metric | Target | Critical Path |
|--------|--------|---------------|
| Lines  | 80%    | 100%          |
| Functions | 85% | 100%          |
| Branches | 75%  | 100%          |

### Achieving 100% Coverage

For critical paths (user auth, payment flow):
1. Test success scenarios
2. Test error conditions
3. Test edge cases
4. Test async operations
5. Test cleanup procedures

## 🐛 Debugging Tests

### Debug Mode
```bash
# Interactive debugging
npm run test:debug

# Debug specific test
DEBUG=true npm run test:unit -- MentorCard.test.tsx
```

### Snapshot Updates
```bash
# Update snapshots
npm run test:update-snapshots

# Review snapshot changes
git diff __snapshots__/
```

### Failed Test Investigation
```bash
# See detailed output
npm run test:unit -- --verbose

# Capture screenshots on failure
export VITECTURE_SCREENSHOTS=true

# Run single test
npm run test:unit -- --grep="test-name"
```

## 🎨 Test Organization Patterns

### Component Tests
```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('renders correctly', () => {});
    it('shows loading state', () => {});
  });
  
  describe('Interactions', () => {
    it('handles clicks', () => {});
    it('responds to keyboard', () => {});
  });
  
  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {});
  });
});
```

### Hook Tests
```typescript
describe('useHookName', () => {
  describe('Initialization', () => {
    it('sets up default state', () => {});
  });
  
  describe('API Calls', () => {
    it('handles success', () => {});
    it('handles errors', () => {});
  });
  
  describe('Cleanup', () => {
    it('cleans up on unmount', () => {});
  });
});
```

## 📝 Adding New Tests

### Creating a Component Test

1. Create file in `components/` matching component name
2. Import component and necessary mocks
3. Write descriptive test suite using `describe` blocks
4. Include edge case coverage
5. Run test: `npm run test:unit -- path/to/new-test.tsx`

### Example Template
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YourComponent } from '../../../src/components/YourComponent';

describe('YourComponent', () => {
  const defaultProps = {};
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should work', () => {
    render(<YourComponent {...defaultProps} />);
    expect(screen.getByText(/expected content/i)).toBeInTheDocument();
  });
});
```

## ⚠️ Common Issues

### Issue: Test timeout
```bash
# Increase timeout
it('slow operation', () => {}, 15000);
```

### Issue: Module not found
```bash
# Clear module cache
npm run test:unit -- --clearCache
```

### Issue: Mock not working
```typescript
// Ensure you're importing from correct path
vi.mock('../../../src/services/api', () => ({ ... }));
```

## 🎯 Best Practices

1. **Test naming**: Use descriptive names that explain behavior
2. **Arrange-Act-Assert**: Organize tests in this pattern
3. **Isolation**: Keep tests independent
4. **No external deps**: Avoid real network calls in unit tests
5. **Cleanup**: Always clean up after tests (timers, listeners)
6. **Accessibility**: Test ARIA attributes and keyboard navigation
7. **Edge cases**: Cover boundary conditions and null values

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [Testing Library User Guide](https://testing-library.com/docs/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

## 🔍 Troubleshooting

### Coverage Not Meeting Thresholds

1. Identify uncovered code: `npm run test:coverage -- --reporter=json`
2. Add tests for uncovered paths
3. Consider if code is truly needed
4. Document exclusions if necessary

### Slow Test Execution

1. Enable parallelization: `--maxWorkers=N`
2. Remove unnecessary waiting: `waitFor()` → `findBy*()`
3. Optimize mocks
4. Run fewer tests per PR (split suites)

### Flaky Tests

1. Stabilize timing dependencies
2. Clean up shared state
3. Add retries: `--retry=3`
4. Investigate and fix rather than ignoring

---

**Last Updated**: 2024-09-23  
**Maintainer**: ChronoCoder Team  
**License**: MIT
