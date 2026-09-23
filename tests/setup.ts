/**
 * Test Configuration and Global Mocks for ChronoCoder v3
 * 
 * This file sets up the testing environment including:
 * - Jest test configuration
 * - Mock implementations for external services
 * - Environment variable setup for testing
 * - Custom matchers and utilities
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// ============================================================================
// MOCK ENVIRONMENT VARIABLES
// ============================================================================

Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: false,
});

Object.defineProperty(process.env, 'VITE_GEMINI_API_KEY', {
  value: 'test-api-key-for-mock-responses-only',
  writable: false,
});

Object.defineProperty(process.env, 'VITE_SUPABASE_URL', {
  value: 'https://test.supabase.co',
  writable: false,
});

Object.defineProperty(process.env, 'VITE_SUPABASE_ANON_KEY', {
  value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  writable: false,
});

Object.defineProperty(process.env, 'VITE_RATE_LIMIT_WINDOW_MS', {
  value: '60000', // 60 seconds
  writable: false,
});

Object.defineProperty(process.env, 'VITE_RATE_LIMIT_MAX_REQUESTS', {
  value: '100',
  writable: false,
});

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

const mockSupabase = {
  // Auth mocks
  auth: {
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: { access_token: 'test-token' } },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },

  // Database mocks
  from: vi.fn((table) => ({
    select: vi.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
    insert: vi.fn().mockResolvedValue({
      data: [{ id: 'new-record-id' }],
      error: null,
    }),
    update: vi.fn().mockResolvedValue({
      data: [{ id: 'updated-id' }],
      error: null,
    }),
    delete: vi.fn().mockResolvedValue({
      data: undefined,
      error: null,
    }),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  })),

  // Realtime mocks
  channel: vi.fn().mockReturnValue({
    publish: vi.fn().mockResolvedValue({ payload: { status: 'ok' } }),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({
      status: 'subscribed',
    }),
  }),

  // Storage mocks
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      }),
      download: vi.fn().mockResolvedValue({
        data: { url: 'https://test-url.com/file' },
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({ error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },

  // Function mocks
  functions: {
    invoke: vi.fn().mockResolvedValue({
      data: { message: 'success' },
      error: null,
    }),
  },

  // Transact mocks
  transact: vi.fn().mockImplementation((operations: any[]) => {
    return {
      then: (resolve: any) => resolve(operations),
      catch: (reject: any) => reject(new Error('Transaction not implemented')),
    };
  }),
};

(global as any).supabase = mockSupabase;

// ============================================================================
// MOCK GEMINI API RESPONSES
// ============================================================================

interface MockGeminiResponse {
  feedback: string;
  codeMetrics?: {
    complexity: number;
    maintainabilityIndex: number;
    linesOfCode: number;
  };
  suggestions?: Array<{
    type: 'improvement' | 'bug' | 'security' | 'performance';
    description: string;
    severity: 'low' | 'medium' | 'high';
    location?: { line: number; column: number };
  }>;
  analysisTime?: number;
}

export const mockGeminiResponses: Record<string, MockGeminiResponse> = {
  helloWorld: {
    feedback: "Your code is clean and concise! Great job on the basic structure.",
    codeMetrics: {
      complexity: 1,
      maintainabilityIndex: 95,
      linesOfCode: 3,
    },
    suggestions: [],
    analysisTime: 1250,
  },

  inefficientLoop: {
    feedback: "Consider using array methods like map/filter/reduce for better performance and readability.",
    codeMetrics: {
      complexity: 5,
      maintainabilityIndex: 72,
      linesOfCode: 12,
    },
    suggestions: [
      {
        type: 'performance',
        description: 'Convert nested loops to use Set or Map for O(1) lookups',
        severity: 'medium',
        location: { line: 5, column: 3 },
      },
    ],
    analysisTime: 2100,
  },

  securityIssue: {
    feedback: "⚠️ Security alert detected. Review this code carefully before deploying.",
    codeMetrics: {
      complexity: 8,
      maintainabilityIndex: 45,
      linesOfCode: 25,
    },
    suggestions: [
      {
        type: 'security',
        description: 'Avoid using eval() - consider using a safer alternative like JSON.parse()',
        severity: 'high',
        location: { line: 12, column: 8 },
      },
      {
        type: 'bug',
        description: 'Unvalidated input could lead to injection attacks',
        severity: 'high',
        location: { line: 8, column: 4 },
      },
    ],
    analysisTime: 3200,
  },

  goodPractice: {
    feedback: "Excellent code quality! Your implementation follows best practices:\n\n• Proper error handling\n• Clean function separation\n• Descriptive naming\n• Type safety",
    codeMetrics: {
      complexity: 3,
      maintainabilityIndex: 92,
      linesOfCode: 45,
    },
    suggestions: [
      {
        type: 'improvement',
        description: 'Consider adding unit tests for edge cases',
        severity: 'low',
      },
    ],
    analysisTime: 4500,
  },
};

// Mock Gemini API client
export const mockGeminiApiClient = {
  generateContent: vi.fn(async (prompt: string): Promise<MockGeminiResponse> => {
    if (prompt.toLowerCase().includes('eval')) {
      return mockGeminiResponses.securityIssue;
    } else if (prompt.toLowerCase().includes('loop') || prompt.includes('nested')) {
      return mockGeminiResponses.inefficientLoop;
    } else if (prompt.length < 50) {
      return mockGeminiResponses.helloWorld;
    }
    return mockGeminiResponses.goodPractice;
  }),

  streamingGenerateContent: vi.fn(async function* (prompt: string) {
    const response = await this.generateContent(prompt);
    
    const tokens = response.feedback.split(' ');
    for (let i = 0; i < tokens.length; i++) {
      yield `${tokens[i]}${i < tokens.length - 1 ? ' ' : ''}`;
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 50));
    }
    
    if (response.codeMetrics) {
      yield '\n\n```json\n';
      const metricsStr = JSON.stringify(response.codeMetrics, null, 2);
      for (let i = 0; i < metricsStr.length; i += 10) {
        yield metricsStr.slice(i, i + 10);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      yield '```\n';
    }
  }),
};

// ============================================================================
// MOCK WINDOW AND DOM APIs
// ============================================================================

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
  unobserve = vi.fn();
}

(global as any).IntersectionObserver = MockIntersectionObserver;

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

(global as any).ResizeObserver = MockResizeObserver;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => {}),
    removeItem: vi.fn(() => {}),
    clear: vi.fn(),
  },
});

// ============================================================================
// MOCK MONACO EDITOR
// ============================================================================

export const mockMonacoEditor = {
  editor: {
    create: vi.fn().mockReturnValue({
      getModel: vi.fn(),
      getValue: vi.fn().mockReturnValue('// Code here'),
      setValue: vi.fn(),
      getWordAtPosition: vi.fn(),
      getPosition: vi.fn(),
      dispose: vi.fn(),
      onDidChangeModelContent: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      layout: vi.fn(),
    }),
    registerLanguage: vi.fn(),
    Monaco: {
      EditorWorkerConfig: {},
      WorkerExitCode: {},
    },
  },
  languages: {
    typescript: {},
    javascript: {},
    python: {},
  },
};

// ============================================================================
// CUSTOM MATCHERS
// ============================================================================

declare global {
  namespace Vi {
    interface Assertion<T> {
      toBeInTheDocument(): void;
      toHaveAccessibilityLabel(label: string): void;
      toHaveCorrectAriaAttributes(): void;
      toRenderWithoutViolations(): void;
      toAnimateWithDuration(duration: number): void;
    }
  }
}

expect.extend({
  toBeInTheDocument(received) {
    const pass = received.parentNode !== null;
    return {
      pass,
      message: () => `Expected element ${pass ? 'not ' : ''}to be in document`,
    };
  },

  toHaveAccessibilityLabel(received, expectedLabel) {
    const pass = received.getAttribute('aria-label') === expectedLabel;
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have label "${expectedLabel}"`
          : `Expected element to have aria-label="${expectedLabel}", got "${received.getAttribute('aria-label')}"`,
    };
  },

  toHaveCorrectAriaAttributes(received) {
    const hasRole = received.hasAttribute('role');
    const hasTabIndex = received.tabIndex >= 0;
    const pass = hasRole && hasTabIndex;
    
    return {
      pass,
      message: () =>
        pass
          ? 'Element has correct ARIA attributes'
          : `Element missing ARIA attributes (role: ${hasRole}, tabIndex: ${hasTabIndex})`,
    };
  },
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const waitForElement = (
  selector: string,
  container?: Element | Document
): Promise<Element> => {
  return new Promise((resolve, reject) => {
    const check = () => {
      const element = container?.querySelector(selector);
      if (element) {
        resolve(element);
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
    setTimeout(() => reject(new Error(`Timeout waiting for ${selector}`)), 5000);
  });
};

export const fireEventCustom = (
  element: Element,
  type: string,
  options?: EventInit
) => {
  const event = new CustomEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
};

export const getAccessibilityState = (element: Element) => ({
  role: element.getAttribute('role'),
  ariaLabel: element.getAttribute('aria-label'),
  ariaExpanded: element.getAttribute('aria-expanded'),
  ariaDisabled: element.getAttribute('aria-disabled'),
  ariaPressed: element.getAttribute('aria-pressed'),
  tabIndex: element.tabIndex,
});

export const simulateKeyPress = (
  element: Element,
  key: string,
  modifiers?: { ctrl: boolean; shift: boolean; alt: boolean }
) => {
  fireEventCustom(element, 'keydown', {
    key,
    ctrlKey: modifiers?.ctrl || false,
    shiftKey: modifiers?.shift || false,
    altKey: modifiers?.alt || false,
    metaKey: modifiers?.ctrl || false,
  });
};

export const setupTestEnvironment = () => {
  vi.clearAllMocks();
  
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    if (args[0]?.includes('Warning:')) return;
    console.warn(...args);
  });
  
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (args[0]?.includes('Warning:') || args[0]?.includes('findDOMNode')) return;
    console.error(...args);
  });
};

export const cleanupTestEnvironment = () => {
  vi.restoreAllMocks();
};

export default {
  mockSupabase,
  mockGeminiApiClient,
  mockGeminiResponses,
  mockMonacoEditor,
  setupTestEnvironment,
  cleanupTestEnvironment,
  wait,
  waitForElement,
  fireEventCustom,
  getAccessibilityState,
  simulateKeyPress,
};
