import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMentorWebSocket } from '@/hooks/useMentorWebSocket';
import type { CodeAnalysis, FeedbackPayload } from '@/hooks/useMentorWebSocket';

// Mock WebSocket implementation
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event?: unknown) => void) | null = null;
  onclose: ((event?: { code: number; reason: string }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError() {
    this.onerror?.();
  }

  simulateAbnormalClose(code = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason: 'Abnormal Closure' });
  }
}

describe.sequential('useMentorWebSocket', () => {
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  it('initializes with disconnected state and does not create WebSocket eagerly', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'ada' })
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isAnalyzing).toBe(false);
    expect(MockWebSocket.instances.length).toBe(0);
    unmount();
  });

  it('ignores empty or whitespace-only code submission', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'turing' })
    );

    act(() => {
      result.current.requestFeedback('   ');
    });

    expect(MockWebSocket.instances.length).toBe(0);
    expect(result.current.isAnalyzing).toBe(false);
    unmount();
  });

  it('lazily opens WebSocket and sends request on requestFeedback', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'ada' })
    );

    act(() => {
      result.current.requestFeedback('def calculate_bernoulli(): pass');
    });

    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain('/ws/feedback');
    expect(result.current.isAnalyzing).toBe(true);

    // Simulate connection established
    act(() => {
      ws.simulateOpen();
    });

    expect(result.current.isConnected).toBe(true);
    expect(ws.sentMessages.length).toBe(1);

    const sent = JSON.parse(ws.sentMessages[0]);
    expect(sent.mentor_id).toBe('ada');
    expect(sent.user_code).toBe('def calculate_bernoulli(): pass');
    expect(sent.session_id).toMatch(/^session_/);
    unmount();
  });

  it('reuses existing custom sessionId when provided in options', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'hopper', sessionId: 'custom-session-123' })
    );

    act(() => {
      result.current.requestFeedback('def fix_nanosecond_wire(): pass');
    });

    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    expect(result.current.getSessionId()).toBe('custom-session-123');
    const sent = JSON.parse(ws.sentMessages[0]);
    expect(sent.session_id).toBe('custom-session-123');
    unmount();
  });

  it('sends feedback request immediately if socket is already open', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'linus' })
    );

    // First request
    act(() => {
      result.current.requestFeedback('int main() { return 0; }');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });
    expect(ws.sentMessages.length).toBe(1);

    // Second request
    act(() => {
      result.current.requestFeedback('void clean_pointers() {}');
    });
    expect(ws.sentMessages.length).toBe(2);
    const secondSent = JSON.parse(ws.sentMessages[1]);
    expect(secondSent.user_code).toBe('void clean_pointers() {}');
    expect(secondSent.mentor_id).toBe('linus');
    unmount();
  });

  it('dispatches onAnalysisComplete callback when analysis_complete is received', () => {
    const onAnalysisComplete = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({
        mentorId: 'ada',
        onAnalysisComplete,
      })
    );

    act(() => {
      result.current.requestFeedback('x = 42');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    const mockAnalysis: CodeAnalysis = {
      line_count: 1,
      functions: 0,
      classes: 0,
      imports: 0,
      complexity_score: 1,
      estimated_tokens: 5,
    };

    act(() => {
      ws.simulateMessage({
        type: 'analysis_complete',
        payload: mockAnalysis,
      });
    });

    expect(onAnalysisComplete).toHaveBeenCalledTimes(1);
    expect(onAnalysisComplete).toHaveBeenCalledWith(mockAnalysis);
    unmount();
  });

  it('dispatches onFeedbackChunk when receiving feedback_chunk or feedback_token', () => {
    const onFeedbackChunk = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({
        mentorId: 'ada',
        onFeedbackChunk,
      })
    );

    act(() => {
      result.current.requestFeedback('x = 42');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    const chunk1: FeedbackPayload = {
      reading: 'Analyzing your analytical engine code...',
    };
    const chunk2: FeedbackPayload = {
      challenge: 'Consider optimizing the sequence.',
    };

    act(() => {
      ws.simulateMessage({ type: 'feedback_chunk', payload: chunk1 });
      ws.simulateMessage({ type: 'feedback_token', payload: chunk2 });
    });

    expect(onFeedbackChunk).toHaveBeenCalledTimes(2);
    expect(onFeedbackChunk).toHaveBeenNthCalledWith(1, chunk1);
    expect(onFeedbackChunk).toHaveBeenNthCalledWith(2, chunk2);
    unmount();
  });

  it('resets isAnalyzing and calls onFeedbackComplete upon feedback_complete', () => {
    const onFeedbackComplete = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({
        mentorId: 'ada',
        onFeedbackComplete,
      })
    );

    act(() => {
      result.current.requestFeedback('x = 42');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    expect(result.current.isAnalyzing).toBe(true);

    act(() => {
      ws.simulateMessage({ type: 'feedback_complete', payload: {} });
    });

    expect(result.current.isAnalyzing).toBe(false);
    expect(onFeedbackComplete).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('handles server error message payload', () => {
    const onError = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({
        mentorId: 'ada',
        onError,
      })
    );

    act(() => {
      result.current.requestFeedback('x = 42');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      ws.simulateMessage({
        type: 'error',
        payload: { message: 'Token limit exceeded' },
      });
    });

    expect(result.current.isAnalyzing).toBe(false);
    expect(onError).toHaveBeenCalledWith('Token limit exceeded');
    unmount();
  });

  it('handles WebSocket transport error', () => {
    const onError = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({
        mentorId: 'ada',
        onError,
      })
    );

    act(() => {
      result.current.requestFeedback('x = 42');
    });
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateError();
    });

    expect(onError).toHaveBeenCalledWith('WebSocket connection error');
    unmount();
  });

  it('disconnects and resets state when disconnect() is called', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'ada' })
    );

    act(() => {
      result.current.requestFeedback('x = 42');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isAnalyzing).toBe(false);
    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    unmount();
  });

  it('cleans up on unmount without throwing errors', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'ada' })
    );

    act(() => {
      result.current.requestFeedback('x = 42');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    unmount();

    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
  });

  it('attempts reconnection with backoff on abnormal close while analysis is pending', () => {
    vi.useFakeTimers();
    try {
      const { result, unmount } = renderHook(() =>
        useMentorWebSocket({ mentorId: 'turing' })
      );

      act(() => {
        result.current.requestFeedback('def enigma_cipher(): pass');
      });
      const initialWs = MockWebSocket.instances[0];
      act(() => {
        initialWs.simulateOpen();
      });

      // Simulate unexpected drop
      act(() => {
        initialWs.simulateAbnormalClose(1006);
      });

      expect(result.current.isConnected).toBe(false);

      // Fast-forward backoff timer (attempt 1: delay = 1000 * 2^1 = 2000ms)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(MockWebSocket.instances.length).toBe(2);
      const reconnectedWs = MockWebSocket.instances[1];

      act(() => {
        reconnectedWs.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
      expect(reconnectedWs.sentMessages.length).toBe(1);
      const sent = JSON.parse(reconnectedWs.sentMessages[0]);
      expect(sent.user_code).toBe('def enigma_cipher(): pass');
      expect(sent.mentor_id).toBe('turing');
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
