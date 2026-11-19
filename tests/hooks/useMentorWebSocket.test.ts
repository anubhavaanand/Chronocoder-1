import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMentorWebSocket,
  resolveWebSocketUrl,
  isTerminalWebSocketCloseCode,
  generateSecureSessionId,
} from '@/hooks/useMentorWebSocket';
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
  private openListeners: Array<() => void> = [];

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
    const listeners = this.openListeners;
    this.openListeners = [];
    for (const cb of listeners) cb();
  }

  /** Minimal EventTarget surface used by the hook's addEventListener('open'). */
  addEventListener(type: string, cb: () => void) {
    if (type === 'open') this.openListeners.push(cb);
  }

  removeEventListener(type: string, cb: () => void) {
    if (type === 'open') {
      this.openListeners = this.openListeners.filter((l) => l !== cb);
    }
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

  it('sends both requests when a second requestFeedback arrives while CONNECTING (#205)', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'ada' })
    );

    // First call opens a socket that stays CONNECTING.
    act(() => {
      result.current.requestFeedback('x = 1');
    });
    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.readyState).toBe(MockWebSocket.CONNECTING);
    expect(ws.sentMessages.length).toBe(0);

    // Second call while still CONNECTING must not be dropped.
    act(() => {
      result.current.requestFeedback('x = 2');
    });
    expect(MockWebSocket.instances.length).toBe(1); // no duplicate socket

    // Handshake completes: both requests should now have been sent.
    act(() => {
      ws.simulateOpen();
    });

    expect(ws.sentMessages.length).toBe(2);
    expect(JSON.parse(ws.sentMessages[0]).user_code).toBe('x = 1');
    expect(JSON.parse(ws.sentMessages[1]).user_code).toBe('x = 2');
    unmount();
  });

  it('sends a request immediately when the socket is already OPEN', () => {
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({ mentorId: 'ada' })
    );

    act(() => {
      result.current.requestFeedback('x = 1');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    act(() => {
      result.current.requestFeedback('x = 2');
    });

    expect(ws.sentMessages.length).toBe(2);
    unmount();
  });

  it('discards messages from a superseded request so a new question never renders stale feedback (#319/#243/#207)', () => {
    const onFeedbackChunk = vi.fn();
    const onAnalysisComplete = vi.fn();
    const onFeedbackComplete = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMentorWebSocket({
        mentorId: 'ada',
        onFeedbackChunk,
        onAnalysisComplete,
        onFeedbackComplete,
      })
    );

    act(() => {
      result.current.requestFeedback('x = 1');
    });
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.simulateOpen();
    });

    // First question produces partial feedback, then a second question is
    // submitted before the first stream finishes.
    act(() => {
      ws.onmessage?.({ data: JSON.stringify({ type: 'analysis_complete', payload: {} }) });
    });
    act(() => {
      ws.onmessage?.({ data: JSON.stringify({ type: 'feedback_chunk', payload: { reading: 'stale' } }) });
    });
    expect(onFeedbackChunk).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.requestFeedback('x = 2');
    });

    // The old socket is still connected and keeps streaming — its messages
    // must be ignored because they belong to a question the user moved on
    // from. The new question's callbacks must not fire on stale data.
    act(() => {
      ws.onmessage?.({ data: JSON.stringify({ type: 'feedback_chunk', payload: { reading: 'stale' } }) });
    });
    expect(onFeedbackChunk).toHaveBeenCalledTimes(1);

    unmount();
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

  it('surfaces an error when reconnect attempts are exhausted (#128)', () => {
    vi.useFakeTimers();
    try {
      const onError = vi.fn();
      const { result, unmount } = renderHook(() =>
        useMentorWebSocket({ mentorId: 'turing', onError })
      );

      act(() => {
        result.current.requestFeedback('def enigma(): pass');
      });
      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      // Each drop below fails to re-establish: the new socket is closed before
      // it opens, so ws.onopen (which resets the attempt counter) never runs.
      // After 3 reconnects the next close must surface an error (#128).
      for (let i = 0; i < 4; i++) {
        const active = MockWebSocket.instances[MockWebSocket.instances.length - 1];
        act(() => {
          active.simulateAbnormalClose(1006);
        });
        act(() => {
          vi.advanceTimersByTime(20000);
        });
      }

      expect(onError).toHaveBeenCalledWith(
        expect.stringMatching(/Connection lost before feedback completed/)
      );
      expect(result.current.isAnalyzing).toBe(false);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  describe('resolveWebSocketUrl (#CC-047)', () => {
    const originalLocation = window.location;

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('resolves default ws endpoint on non-https protocol', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:' },
        writable: true,
      });
      const url = resolveWebSocketUrl('ws://localhost:8000');
      expect(url).toBe('ws://localhost:8000/ws/feedback');
    });

    it('automatically upgrades ws:// to wss:// when loaded over https:', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
      });
      const url = resolveWebSocketUrl('ws://api.chronocoder.dev');
      expect(url).toBe('wss://api.chronocoder.dev/ws/feedback');
    });

    it('upgrades http:// to wss:// when loaded over https:', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
      });
      const url = resolveWebSocketUrl('http://api.chronocoder.dev');
      expect(url).toBe('wss://api.chronocoder.dev/ws/feedback');
    });

    it('preserves existing wss:// URLs intact', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
      });
      const url = resolveWebSocketUrl('wss://secure.chronocoder.dev');
      expect(url).toBe('wss://secure.chronocoder.dev/ws/feedback');
    });

    it('uses the page origin when no base URL or env var is set (#121)', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', host: 'chronocoder.com' },
        writable: true,
      });
      // Must not fall back to ws://localhost:8000, which in production makes
      // the browser dial the visitor's own machine.
      const url = resolveWebSocketUrl();
      expect(url).toBe('wss://chronocoder.com/ws/feedback');
    });

    it('keeps http origin on a plain http page when nothing is configured', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', host: 'localhost:3000' },
        writable: true,
      });
      const url = resolveWebSocketUrl();
      expect(url).toBe('ws://localhost:3000/ws/feedback');
    });
  });

  describe('Terminal Auth Rejection & Reconnection (#CC-048)', () => {
    it('identifies terminal WebSocket close codes', () => {
      expect(isTerminalWebSocketCloseCode(1008)).toBe(true);
      expect(isTerminalWebSocketCloseCode(4001)).toBe(true);
      expect(isTerminalWebSocketCloseCode(4003)).toBe(true);
      expect(isTerminalWebSocketCloseCode(4401)).toBe(true);
      expect(isTerminalWebSocketCloseCode(4403)).toBe(true);
      expect(isTerminalWebSocketCloseCode(1000)).toBe(false);
      expect(isTerminalWebSocketCloseCode(1006)).toBe(false);
    });

    it('aborts reconnection immediately upon terminal auth close code and reports error', () => {
      vi.useFakeTimers();
      try {
        const onError = vi.fn();
        const { result, unmount } = renderHook(() =>
          useMentorWebSocket({
            mentorId: 'ada',
            onError,
          })
        );

        act(() => {
          result.current.requestFeedback('print("testing auth failure")');
        });

        expect(MockWebSocket.instances.length).toBe(1);
        const ws = MockWebSocket.instances[0];

        act(() => {
          ws.simulateOpen();
        });

        // Simulate terminal auth rejection (code 4401 Unauthorized)
        act(() => {
          ws.close(4401, 'Invalid Supabase JWT token');
        });

        expect(onError).toHaveBeenCalledWith('Invalid Supabase JWT token');
        expect(result.current.isConnected).toBe(false);
        expect(result.current.isAnalyzing).toBe(false);

        // Advance timers by backoff window — should NOT attempt reconnect
        act(() => {
          vi.advanceTimersByTime(15000);
        });

        expect(MockWebSocket.instances.length).toBe(1); // No new connection attempt
        unmount();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Cryptographically Secure Session ID (#CC-049)', () => {
    it('generates a session ID containing a valid UUID format', () => {
      const sessionId = generateSecureSessionId();
      expect(sessionId).toMatch(/^session_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('generates unique session IDs across consecutive calls', () => {
      const id1 = generateSecureSessionId();
      const id2 = generateSecureSessionId();
      expect(id1).not.toBe(id2);
    });

    it('uses the secure session ID when no sessionId option is passed to the hook', () => {
      const { result, unmount } = renderHook(() =>
        useMentorWebSocket({
          mentorId: 'ada',
        })
      );

      act(() => {
        result.current.requestFeedback('x = 42');
      });

      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      act(() => {
        ws.simulateOpen();
      });

      const sent = JSON.parse(ws.sentMessages[0]);
      expect(sent.session_id).toMatch(/^session_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(result.current.getSessionId()).toBe(sent.session_id);
      unmount();
    });
  });
});
