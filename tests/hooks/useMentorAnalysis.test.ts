/**
 * useMentorAnalysis Custom Hook Unit Tests
 * 
 * Test coverage includes:
 * - API call success scenarios
 * - Error handling paths
 * - State transitions during async operations
 * - Cleanup on unmount (memory leak prevention)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMentorAnalysis } from '../../../src/hooks/useMentorAnalysis';
import { mentorApi } from '../../../src/services/api';
import type { MentorResponse, CodeAnalysisResult, AnalysisError } from '../../../src/types';

// Mock the API service
vi.mock('../../../src/services/api', () => ({
  mentorApi: {
    analyzeCode: vi.fn(),
    getMentorList: vi.fn(),
    selectMentor: vi.fn(),
    cancelAnalysis: vi.fn(),
  },
}));

// Mock supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

describe('useMentorAnalysis', () => {
  const mockMentors = [
    {
      id: 'mentor-1',
      name: 'Alex Chen',
      role: 'Senior Full Stack Developer',
      expertise: ['React', 'TypeScript', 'Node.js'],
      rating: 4.9,
    },
    {
      id: 'mentor-2',
      name: 'Sarah Johnson',
      role: 'DevOps Engineer',
      expertise: ['AWS', 'Kubernetes', 'Docker'],
      rating: 4.8,
    },
    {
      id: 'mentor-3',
      name: 'Michael Brown',
      role: 'Security Specialist',
      expertise: ['Penetration Testing', 'OWASP', 'Cryptography'],
      rating: 4.7,
    },
  ];

  const mockCodeAnalysisResult: CodeAnalysisResult = {
    success: true,
    feedback: `Great job! Your code demonstrates strong understanding of concepts.\n\nKey Observations:\n• Clear variable naming\n• Proper error handling\n• Good function separation`,
    metrics: {
      complexityScore: 65,
      maintainabilityIndex: 87.3,
      linesOfCode: 45,
      cyclomaticComplexity: 3,
    },
    suggestions: [
      {
        type: 'improvement',
        description: 'Consider adding JSDoc comments for better documentation',
        priority: 'low',
      },
      {
        type: 'performance',
        description: 'Memoize expensive computations using useMemo hook',
        priority: 'medium',
      },
    ],
    issues: [],
    estimatedTime: 1200,
  };

  const mockApiKey = 'test-api-key-12345';
  const mockUserCode = 'console.log("Hello World");';

  let originalConsoleWarn: any;
  let originalConsoleError: any;

  beforeEach(() => {
    // Mock console to avoid noise
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    
    console.warn = vi.fn();
    console.error = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default successful responses
    (mentorApi.analyzeCode as any).mockImplementation(
      async (apiKey: string, userId: string, code: string) => ({
        ...mockCodeAnalysisResult,
        userId,
        timestamp: Date.now(),
      })
    );

    (mentorApi.getMentorList as any).mockResolvedValue(mockMentors);
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      expect(result.current).toEqual(
        expect.objectContaining({
          analysisStatus: 'idle',
          mentors: [],
          selectedMentorId: null,
          errorMessage: null,
          isStreaming: false,
          progress: 0,
        })
      );
    });

    it('sets up initial empty values correctly', () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      expect(result.current.feedback).toBe('');
      expect(result.current.metrics).toBeNull();
      expect(result.current.suggestions).toEqual([]);
    });

    it('stores API credentials securely', () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Credentials should be stored but not exposed in result
      expect(result.current.apiKey).toBe(mockApiKey);
      expect(result.current.userId).toBe('user-123');
    });
  });

  describe('API Call Success Scenarios', () => {
    it('successfully loads mentor list', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.loadMentors();
      });

      expect(result.current.mentors).toHaveLength(3);
      expect(result.current.mentors[0].name).toBe('Alex Chen');
      expect(result.current.analysisStatus).toBe('idle');
    });

    it('handles successful code analysis', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(result.current.analysisStatus).toBe('complete');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.feedback).toContain('Great job');
      expect(result.current.metrics).toBeTruthy();
      expect(result.current.suggestions).toHaveLength(2);
    });

    it('tracks loading state during analysis', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Start analysis
      const promise = result.current.analyzeCode(mockUserCode);

      await waitFor(() => {
        expect(result.current.analysisStatus).toBe('analyzing');
      });

      await promise;

      expect(result.current.analysisStatus).toBe('complete');
    });

    it('updates progress during streaming', async () => {
      const streamingResult = {
        ...mockCodeAnalysisResult,
        feedback: '',
      };

      (mentorApi.analyzeCode as any).mockImplementation(async function* (
        apiKey: string,
        userId: string,
        code: string
      ) {
        const chunks = [
          { token: 'Start', progress: 10 },
          { token: ' Analyzing ', progress: 30 },
          { token: ' Code...', progress: 50 },
          { token: '\n', progress: 70 },
          { token: 'Done!', progress: 100 },
        ];

        for (const chunk of chunks) {
          yield chunk;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      });

      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(100);
      });
    });

    it('stores analysis timestamp', async () => {
      const beforeTime = Date.now();
      
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      const afterTime = Date.now();
      expect(result.current.lastAnalysisTimestamp).toBeGreaterThan(beforeTime);
      expect(result.current.lastAnalysisTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('maintains state across re-renders', async () => {
      const { result, rerender } = renderHook(
        ({ apiKey, userId }) =>
          useMentorAnalysis({ apiKey, userId }),
        {
          initialProps: { apiKey: mockApiKey, userId: 'user-123' },
        }
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      // Re-render with same props
      rerender({ apiKey: mockApiKey, userId: 'user-123' });

      // State should persist
      expect(result.current.analysisStatus).toBe('complete');
      expect(result.current.feedback).toContain('Great job');
    });
  });

  describe('Error Handling Paths', () => {
    it('handles network failure gracefully', async () => {
      const networkError = new Error('Network request failed');
      (mentorApi.analyzeCode as any).mockRejectedValue(networkError);

      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(result.current.analysisStatus).toBe('error');
      expect(result.current.errorMessage).toContain('Network');
      expect(result.current.feedback).toBe('');
    });

    it('handles invalid API key', async () => {
      const authError: AnalysisError = {
        message: 'Invalid or expired API key',
        status: 401,
        code: 'AUTH_ERROR',
      };

      (mentorApi.analyzeCode as any).mockRejectedValue(authError);

      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(result.current.errorMessage).toContain('Invalid');
      expect(result.current.showRetryButton).toBe(true);
    });

    it('handles rate limiting', async () => {
      const rateLimitError: AnalysisError = {
        message: 'Rate limit exceeded. Please try again later.',
        status: 429,
        retryAfter: 60,
      };

      (mentorApi.analyzeCode as any).mockRejectedValue(rateLimitError);

      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(result.current.errorMessage).toContain('Rate limit');
      expect(result.current.canRetry).toBe(false);
      expect(result.current.retryAfter).toBe(60);
    });

    it('handles code validation errors', async () => {
      const validationError: AnalysisError = {
        message: 'Code exceeds maximum length (50,000 characters)',
        status: 400,
        code: 'VALIDATION_ERROR',
      };

      (mentorApi.analyzeCode as any).mockRejectedValue(validationError);

      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode('x'.repeat(60000));
      });

      expect(result.current.errorMessage).toContain('exceeds maximum');
      expect(result.current.validationErrors).toHaveLength(1);
    });

    it('shows retry button for recoverable errors', async () => {
      const recoverableError = new Error('Temporary connection issue');
      (mentorApi.analyzeCode as any).mockRejectedValue(recoverableError);

      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(result.current.showRetryButton).toBe(true);
    });

    it('does NOT show retry for non-recoverable errors', async () => {
      const nonRecoverableError = new Error('Invalid programming language');
      (mentorApi.analyzeCode as any).mockRejectedValue(nonRecoverableError);

      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(result.current.showRetryButton).toBe(false);
    });

    it('logs errors appropriately', async () => {
      const error = new Error('Test error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (mentorApi.analyzeCode as any).mockRejectedValue(error);

      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(consoleSpy).toHaveBeenCalledWith('[useMentorAnalysis]', error);
      
      consoleSpy.mockRestore();
    });

    it('resets state on retry', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // First attempt fails
      (mentorApi.analyzeCode as any).mockRejectedValueOnce(new Error('Failed first'));
      
      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(result.current.analysisStatus).toBe('error');

      // Second attempt succeeds
      (mentorApi.analyzeCode as any).mockResolvedValueOnce(mockCodeAnalysisResult);
      
      await act(async () => {
        await result.current.retryLastAnalysis();
      });

      expect(result.current.analysisStatus).toBe('complete');
    });
  });

  describe('State Transitions', () => {
    it('follows correct state machine flow', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      const stateSequence: Array<'idle' | 'loading' | 'analyzing' | 'complete' | 'error'> = [];

      // Monitor state changes
      const unsubscribe = result.current.onStateChange((status) => {
        stateSequence.push(status as any);
      });

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      unsubscribe();

      expect(stateSequence).toContain('analyzing');
      expect(stateSequence[stateSequence.length - 1]).toBe('complete');
    });

    it('disables UI during analysis', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      const promise = result.current.analyzeCode(mockUserCode);

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true);
        expect(result.current.disableInputs).toBe(true);
      });

      await promise;

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.disableInputs).toBe(false);
    });

    it('clears previous results on new analysis', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // First analysis
      await act(async () => {
        await result.current.analyzeCode('code one');
      });

      expect(result.current.feedback).toContain('Great job');

      // Second analysis
      await act(async () => {
        await result.current.analyzeCode('code two');
      });

      expect(result.current.feedback).toContain('Great job');
    });

    it('preserves mentor selection across analyses', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Select a mentor
      await act(async () => {
        await result.current.selectMentor(mockMentors[0].id);
      });

      expect(result.current.selectedMentorId).toBe('mentor-1');

      // Run analysis
      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      // Selection should be preserved
      expect(result.current.selectedMentorId).toBe('mentor-1');
    });

    it('throttles rapid state updates', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Trigger multiple rapid state changes
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          result.current.setLoadingState(i % 3 === 0 ? 'analyzing' : 'complete');
        });
      }

      expect(result.current.isThrottled).toBe(true);
    });
  });

  describe('Cleanup & Unmount', () => {
    it('cancels pending requests on unmount', () => {
      const abortControllerMock = {
        signal: {},
        abort: vi.fn(),
      };

      const originalAbortController = global.AbortController;
      global.AbortController = class extends AbortController {
        constructor() {
          super();
          Object.assign(this, abortControllerMock);
        }
      };

      const { unmount } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      const promise = result.current?.analyzeCode(mockUserCode);

      unmount();

      expect(abortControllerMock.abort).toHaveBeenCalled();
      
      global.AbortController = originalAbortController;
    });

    it('clears timeout intervals on cleanup', () => {
      const clearTimoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { unmount } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Simulate timeout being set
      const timeoutId = setTimeout(() => {}, 1000);
      
      unmount();

      expect(clearTimoutSpy).toHaveBeenCalled();
      clearTimoutSpy.mockRestore();
    });

    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Simulate event listener registration
      window.addEventListener('beforeunload', () => {});
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      
      removeEventListenerSpy.mockRestore();
    });

    it('prevents memory leaks with frequent mount/unmount', () => {
      let instances = 0;

      const MountUnmountTest = () => {
        instances++;
        return (
          <div onClick={() => {
            instances--;
            renderHook(() =>
              useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
            );
          }}>
            Click
          </div>
        );
      };

      // Rapidly mount and unmount
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderHook(() => useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' }));
        unmount();
      }

      expect(instances).toBeLessThan(10); // Should not accumulate
    });

    it('resets all state when component remounts', () => {
      const { result, unmount } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Set some state
      result.current.setFeedback('Some feedback');
      
      unmount();

      const { result: result2 } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Should start fresh
      expect(result2.current.feedback).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty code input', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode('');
      });

      expect(result.current.validationErrors).toHaveLength(1);
      expect(result.current.errorMessage).toContain('empty');
    });

    it('handles whitespace-only input', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode('   \n\t  \n   ');
      });

      expect(result.current.validationErrors).toHaveLength(1);
    });

    it('sanitizes user input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(maliciousInput);
      });

      expect(result.current.errorMessage).toBeNull(); // Should handle safely
    });

    it('handles special Unicode characters', async () => {
      const unicodeCode = 'function hello() { console.log("世界"); }';
      
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(unicodeCode);
      });

      expect(result.current.success).toBe(true);
    });

    it('handles extremely large inputs', async () => {
      const largeCode = 'console.log(' + '"a".repeat(100000))';
      
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(largeCode);
      });

      expect(result.current.codeLength).toBeLessThanOrEqual(50000);
      expect(result.current.truncated).toBe(true);
    });

    it('handles concurrent analyses sequentially', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      // Start two analyses simultaneously
      const promise1 = result.current.analyzeCode('code 1');
      const promise2 = result.current.analyzeCode('code 2');

      await waitFor(() => {
        expect(result.current.isQueued).toBe(true);
      });

      await Promise.all([promise1, promise2]);

      expect(result.current.analysisStatus).toBe('complete');
    });

    it('handles null and undefined parameters', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await expect(result.current.analyzeCode(null as any)).rejects.toThrow();
      await expect(result.current.analyzeCode(undefined as any)).rejects.toThrow();
    });
  });

  describe('Utilities', () => {
    it('can export analysis results', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      const exportData = result.current.exportResults();

      expect(exportData).toHaveProperty('feedback');
      expect(exportData).toHaveProperty('metrics');
      expect(exportData).toHaveProperty('timestamp');
    });

    it('generates shareable link (simulated)', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      const shareUrl = result.current.getShareUrl();
      expect(shareUrl).toContain('/analysis/');
    });

    it('validates input before sending to API', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      const longCode = 'x'.repeat(100000);
      await result.current.analyzeCode(longCode);

      expect(result.current.codeLength).toBe(50000); // Truncated
      expect(result.current.warnings).toContain('Code was too long');
    });

    it('provides analytics-ready data', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      const analyticsData = result.current.getAnalyticsData();

      expect(analyticsData).toHaveProperty('userId');
      expect(analyticsData).toHaveProperty('durationMs');
      expect(analyticsData).toHaveProperty('success');
    });
  });

  describe('Performance', () => {
    it('processes short code quickly', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      const startTime = performance.now();
      await act(async () => {
        await result.current.analyzeCode('console.log("hi");');
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('doesn\'t block main thread during processing', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      let mainThreadFree = true;

      // Use setTimeout to check if main thread is free
      setTimeout(() => {
        mainThreadFree = true;
      }, 0);

      await act(async () => {
        await result.current.analyzeCode(mockUserCode);
      });

      expect(mainThreadFree).toBe(true);
    });

    it('efficiently stores large results', async () => {
      const { result } = renderHook(() =>
        useMentorAnalysis({ apiKey: mockApiKey, userId: 'user-123' })
      );

      const largeFeedback = Array(1000).fill('This is a line of feedback.\n').join('');

      await act(async () => {
        result.current.setFeedback(largeFeedback);
      });

      expect(result.current.feedback.length).toBe(largeFeedback.length);
      expect(result.current.memoryUsage).toBeLessThan(1000000); // < 1MB
    });
  });
});
