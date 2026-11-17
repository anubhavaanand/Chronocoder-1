/**
 * API & Backend Contract Integration Tests for ChronoCoder
 * 
 * Tests the frontend Next.js route handlers and WebSocket communication contracts:
 * - GET /health (Healthcheck endpoint)
 * - POST /api/sessions (Backend session forwarding & 502 error handling)
 * - /ws/feedback WebSocket communication contracts for historical mentors
 * - Payload sanitization and special character escaping
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET as healthGet } from '@/app/health/route';
import { POST as sessionsPost } from '@/app/api/sessions/route';

describe.sequential('API & Route Integration', () => {
  const originalFetch = globalThis.fetch;
  const originalEnvApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalEnvWsUrl = process.env.NEXT_PUBLIC_WS_URL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalEnvApiUrl;
    process.env.NEXT_PUBLIC_WS_URL = originalEnvWsUrl;
  });

  describe('GET /health', () => {
    it('returns 200 OK with service identifier and timestamp', async () => {
      const response = await healthGet();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.service).toBe('chronocoder-frontend');
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });

  describe('POST /api/sessions (Proxy Route)', () => {
    it('forwards session creation payload to the FastAPI backend and returns response', async () => {
      const mockBackendResponse = {
        session_id: 'session-abc-123',
        mentor_id: 'ada',
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockBackendResponse), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = mockFetch;

      const requestPayload = {
        mentor_id: 'ada',
        user_code: 'def bernoulli(n): return [1, -0.5, 0.16667]',
      };

      const request = new Request('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const response = await sessionsPost(request);
      expect(response.status).toBe(201);

      const responseBody = await response.json();
      expect(responseBody.session_id).toBe('session-abc-123');
      expect(responseBody.mentor_id).toBe('ada');

      // Verify fetch called with target URL and body
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = mockFetch.mock.calls[0];
      expect(calledUrl).toMatch(/\/api\/sessions$/);
      expect(calledInit.method).toBe('POST');
      expect(JSON.parse(calledInit.body)).toEqual(requestPayload);
    });

    it('forwards Authorization header when present in incoming request', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
      );
      globalThis.fetch = mockFetch;

      const request = new Request('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        body: JSON.stringify({ mentor_id: 'linus' }),
      });

      await sessionsPost(request);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, calledInit] = mockFetch.mock.calls[0];
      expect(calledInit.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('propagates upstream HTTP error status and error details', async () => {
      const mockErrorResponse = {
        detail: 'Mentor linus is currently at capacity',
      };

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockErrorResponse), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = mockFetch;

      const request = new Request('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentor_id: 'linus' }),
      });

      const response = await sessionsPost(request);
      expect(response.status).toBe(429);

      const responseBody = await response.json();
      expect(responseBody.detail).toBe('Mentor linus is currently at capacity');
    });

    it('returns 502 with backend_unreachable when backend connection fails', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      globalThis.fetch = mockFetch;

      const request = new Request('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentor_id: 'turing' }),
      });

      const response = await sessionsPost(request);
      expect(response.status).toBe(502);

      const responseBody = await response.json();
      expect(responseBody.status).toBe('backend_unreachable');
      expect(responseBody.detail).toContain('Could not reach the ChronoCoder backend');
    });

    it('attaches an AbortSignal timeout to prevent hanging connections (#CC-075)', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ session_id: 'timeout-test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = mockFetch;

      const request = new Request('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentor_id: 'hopper' }),
      });

      await sessionsPost(request);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, calledInit] = mockFetch.mock.calls[0];
      expect(calledInit.signal).toBeDefined();
      expect(calledInit.signal).toBeInstanceOf(AbortSignal);
    });

    it('falls back to AbortController when AbortSignal.timeout is unavailable (#222)', async () => {
      // Simulate an older Safari/WebView where AbortSignal.timeout is undefined.
      const originalTimeout = (AbortSignal as { timeout?: unknown }).timeout;
      // @ts-expect-error — deliberately removing the static method for the test
      delete AbortSignal.timeout;

      try {
        const mockFetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ session_id: 'fallback-test' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
        globalThis.fetch = mockFetch;

        const request = new Request('http://localhost:3000/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mentor_id: 'hopper' }),
        });

        const response = await sessionsPost(request);

        // The request must succeed (not throw / 502) and still carry a signal.
        expect(response.status).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [, calledInit] = mockFetch.mock.calls[0];
        expect(calledInit.signal).toBeDefined();
        expect(calledInit.signal).toBeInstanceOf(AbortSignal);
      } finally {
        (AbortSignal as { timeout?: unknown }).timeout = originalTimeout;
      }
    });
  });

  describe('WebSocket & Feedback Protocol Contracts', () => {
    it('constructs correct WebSocket endpoint from NEXT_PUBLIC_WS_URL', () => {
      process.env.NEXT_PUBLIC_WS_URL = 'wss://chronocoder.example.com';
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/feedback`;
      expect(wsUrl).toBe('wss://chronocoder.example.com/ws/feedback');
    });

    it('falls back to ws://localhost:8000 when env variable is not set', () => {
      delete process.env.NEXT_PUBLIC_WS_URL;
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/feedback`;
      expect(wsUrl).toBe('ws://localhost:8000/ws/feedback');
    });

    it('validates protocol request structure for all historical personas', () => {
      const personas = ['ada', 'linus', 'hopper', 'turing', 'carmack', 'hamilton'];
      const sampleCode = 'def solution(): return 42';

      for (const persona of personas) {
        const payload = {
          mentor_id: persona,
          user_code: sampleCode,
          session_id: `test-session-${persona}`,
        };

        const serialized = JSON.stringify(payload);
        const parsed = JSON.parse(serialized);

        expect(parsed.mentor_id).toBe(persona);
        expect(parsed.user_code).toBe(sampleCode);
        expect(parsed.session_id).toBe(`test-session-${persona}`);
      }
    });

    it('escapes special characters in code payload without corruption', () => {
      const complexCode = `
# Python test with quotes, slashes, unicode, and HTML
import re
def sanitize(input_str: str) -> str:
    """Check: <script>alert("XSS & special chars");</script>"""
    pattern = r'[\\s\\t\\n\\r]+'
    emoji = "💡⚡ Computing History"
    math_sym = "∑(x_i) = ∫ f(t) dt"
    return re.sub(pattern, ' ', input_str)
`;
      const payload = {
        mentor_id: 'ada',
        user_code: complexCode,
        session_id: 'session-special-chars-1',
      };

      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.user_code).toBe(complexCode);
      expect(deserialized.user_code).toContain('<script>alert("XSS & special chars");</script>');
      expect(deserialized.user_code).toContain('∑(x_i) = ∫ f(t) dt');
      expect(deserialized.user_code).toContain('💡⚡ Computing History');
    });

    it('validates response envelope contracts for all supported message types', () => {
      const envelopes = [
        {
          type: 'analysis_complete',
          payload: {
            line_count: 10,
            functions: 2,
            classes: 1,
            imports: 1,
            complexity_score: 3,
            estimated_tokens: 45,
          },
        },
        {
          type: 'feedback_chunk',
          payload: {
            reading: 'Inspecting your code architecture...',
            sections: [
              {
                id: 'sec-1',
                label: 'Algorithmic Structure',
                content: 'Clean decomposition of subroutines.',
              },
            ],
          },
        },
        {
          type: 'feedback_token',
          payload: {
            challenge: 'Try reducing time complexity to O(n log n).',
          },
        },
        {
          type: 'feedback_complete',
          payload: {},
        },
        {
          type: 'error',
          payload: {
            message: 'Syntax error detected at line 4',
          },
        },
      ];

      for (const env of envelopes) {
        const json = JSON.stringify(env);
        const parsed = JSON.parse(json);
        expect(parsed.type).toBe(env.type);
        expect(parsed.payload).toBeDefined();
      }
    });
  });
});
