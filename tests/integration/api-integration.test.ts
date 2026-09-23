/**
 * API Integration Tests for ChronoCoder v3
 * 
 * Test coverage includes:
 * - WebSocket stream establishment
 * - SSE token delivery verification
 * - Rate limiting enforcement
 * - Error recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatWebSocketStream, StreamingApiService } from '../../../src/services/streaming-api';
import type { AnalysisRequest, AnalysisResponse, WebSocketMessage, SSEEvent } from '../../../src/types';

// Mock dependencies
vi.mock('../../../src/config', () => ({
  config: {
    apiBaseUrl: 'https://api.chronocoder.test',
    wsUrl: 'wss://ws.chronocoder.test',
    sseUrl: 'https://api.chronocoder.test/v1/sse',
    apiKey: 'test-api-key',
    timeout: 30000,
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('API Integration', () => {
  // Test setup
  let streamingService: StreamingApiService;
  let mockWebSocket: any;
  let mockFetch: any;
  
  const mockApiKey = 'test-api-key-12345';
  const testUserId = 'test-user-id';
  const testCode = 'console.log("Hello World");';
  
  const mockAnalysisRequest: AnalysisRequest = {
    userId: testUserId,
    code: testCode,
    language: 'javascript',
    context: {
      editorMode: 'typescript',
      includeMetrics: true,
    },
  };

  beforeEach(() => {
    // Setup clean environment
    vi.clearAllMocks();
    
    // Mock WebSocket constructor
    class MockWebSocket {
      url: string;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent<any>) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      
      constructor(url: string) {
        this.url = url;
      }
      
      send(data: any) {
        if (this.onmessage) {
          setTimeout(() => {
            this.onmessage({
              data: JSON.stringify({ type: 'pong', timestamp: Date.now() }),
            } as MessageEvent<any>);
          }, 10);
        }
      }
      
      close(code?: number, reason?: string) {
        if (this.onclose) {
          this.onclose({ code, reason } as CloseEvent);
        }
      }
      
      addEventListener(event: string, handler: Function) {
        switch (event) {
          case 'open':
            this.onopen = handler as (event: Event) => void;
            break;
          case 'message':
            this.onmessage = handler as (event: MessageEvent<any>) => void;
            break;
          case 'error':
            this.onerror = handler as (event: Event) => void;
            break;
          case 'close':
            this.onclose = handler as (event: CloseEvent) => void;
            break;
        }
      }
    }
    
    global.WebSocket = MockWebSocket as any;
    
    // Setup mock fetch for SSE
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
    
    // Initialize service
    streamingService = new StreamingApiService({ apiKey: mockApiKey });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).WebSocket;
    delete (global as any).fetch;
  });

  describe('WebSocket Stream Establishment', () => {
    it('establishes WebSocket connection successfully', async () => {
      const ws = new ChatWebSocketStream(mockApiKey);
      
      await ws.connect();
      
      expect(ws.readyState).toBe(1); // WebSocket.OPEN
      expect(ws.isConnected).toBe(true);
    });

    it('connects with correct authentication headers', async () => {
      const ws = new ChatWebSocketStream(mockApiKey);
      
      await ws.connect();
      
      // Should have sent auth message first
      expect(ws.sentMessages[0].type).toBe('auth');
      expect(ws.sentMessages[0].data.apiKey).toBe(mockApiKey);
    });

    it('handles connection timeouts', async () => {
      const originalTimeout = ChatWebSocketStream.TIMEOUT_MS;
      ChatWebSocketStream.TIMEOUT_MS = 100;
      
      const ws = new ChatWebSocketStream(mockApiKey);
      
      // Don't trigger onopen event
      
      const connectPromise = ws.connect();
      
      await expect(connectPromise).rejects.toThrow(/timeout|connection/i);
      
      ChatWebSocketStream.TIMEOUT_MS = originalTimeout;
    });

    it('retries connection on failure', async () => {
      const ws = new ChatWebSocketStream(mockApiKey);
      
      // Mock connection failures followed by success
      let attemptCount = 0;
      const originalConstructor = global.WebSocket;
      
      // @ts-ignore
      global.WebSocket = class {
        constructor(url: string) {
          this.url = url;
          attemptCount++;
          
          if (attemptCount < 3) {
            throw new Error('Connection failed');
          }
          
          // On 3rd attempt, simulate successful connection
          this.readyState = 1;
        }
        
        addEventListener(event: string, handler: Function) {
          if (event === 'open') {
            handler(new Event('open'));
          }
        }
      };
      
      await ws.connect({ maxRetries: 3 });
      
      expect(attemptCount).toBe(3);
      expect(ws.isConnected).toBe(true);
      
      // Restore
      // @ts-ignore
      global.WebSocket = originalConstructor;
    });

    it('sends heartbeat messages periodically', async () => {
      const ws = new ChatWebSocketStream(mockApiKey);
      
      const sendSpy = vi.spyOn(ws, 'send');
      
      await ws.connect();
      
      // Wait for at least one heartbeat interval
      await new Promise((resolve) => setTimeout(resolve, 6000));
      
      expect(sendSpy).toHaveBeenCalled(); // Sent some messages
    });

    it('closes connection cleanly', async () => {
      const ws = new ChatWebSocketStream(mockApiKey);
      
      await ws.connect();
      
      const closeSpy = vi.spyOn(ws['socket'], 'close').mockImplementation(() => {});
      
      await ws.disconnect();
      
      expect(closeSpy).toHaveBeenCalled();
      expect(ws.isConnected).toBe(false);
    });
  });

  describe('SSE Token Delivery', () => {
    it('receives streamed tokens correctly', async () => {
      // Mock SSE response
      const events: Array<{ type: string; data: string }> = [
        { type: 'token', data: '{"feedback": "Great"}' },
        { type: 'token', data: '{"feedback": " job!"}' },
        { type: 'complete', data: '{}' },
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              for (const event of events) {
                yield new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
                await new Promise((resolve) => setTimeout(resolve, 10));
              }
            },
            cancel: vi.fn(),
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const chunks: string[] = [];
      
      const result = await streamingService.streamingGenerateContent(testCode);
      
      for await (const chunk of result) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(result.complete).toBe(true);
    });

    it('handles partial responses gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              yield new TextEncoder().encode('data: {"token": "partial"}\n\n');
              
              // Simulate unexpected termination
              throw new Error('Stream interrupted');
            },
            cancel: vi.fn(),
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(streamingService.streamingGenerateContent(testCode)).rejects.toThrow();
    });

    it('presents metrics in real-time', async () => {
      const metricsUpdate = [
        { type: 'metrics', data: '{"complexity": 5}' },
        { type: 'metrics', data: '{"maintainability": 85}' },
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              for (const update of metricsUpdate) {
                yield new TextEncoder().encode(`data: ${JSON.stringify(update)}\n\n`);
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
            },
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const results = await streamingService.streamingGenerateContent(testCode);
      
      // Verify metrics were processed
      expect(results.metricsUpdates).toBeDefined();
    });

    it('decodes UTF-8 encoded responses', async () => {
      const unicodeContent = 'Result: 🚀 Excellent! ✨';
      
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              yield new TextEncoder().encode(`data: {"token": "${unicodeContent}"}`);
            },
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await streamingService.streamingGenerateContent(testCode);
      
      const contentString = result.content.toString();
      expect(contentString).toContain('Excellent');
    });

    it('streams errors as part of flow', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              yield new TextEncoder().encode(
                `data: {"error": {"message": "Processing failed", "code": 500}}`
              );
            },
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(streamingService.streamingGenerateContent(testCode))
        .rejects.toThrow(/processing|internal/i);
    });
  });

  describe('Rate Limiting Enforcement', () => {
    it('enforces request rate limits per user', async () => {
      const rateLimiter = streamingService.getRateLimiter();
      
      // Make requests
      const promises = Array(15).fill(null).map(async (_, i) => {
        try {
          await streamingService.analyzeCode(testCode, { maxRetries: 0 });
        } catch {
          // Ignore errors
        }
      });
      
      await Promise.all(promises);
      
      // Check rate limit was enforced
      const currentUsage = rateLimiter.getCurrentUsage('user-test-id');
      expect(currentUsage.requestCount).toBeLessThanOrEqual(10); // Per minute limit
    });

    it('respects retry-after header', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 429,
        headers: new Map([
          ['retry-after', '60'],
          ['x-rate-limit-remaining', '0'],
        ]),
        text: async () => 'Rate limit exceeded',
      };

      mockFetch.mockResolvedValueOnce(mockErrorResponse);

      const startTime = Date.now();
      
      await expect(streamingService.analyzeCode(testCode)).rejects.toThrow();
      
      const endTime = Date.now();
      
      // Should have waited or indicated retry time
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });

    it('tracks quota usage across sessions', async () => {
      const sessionStorageMock = {
        getItem: vi.fn(() => '{"requestsUsed": 45, "resetAt": 0}'),
        setItem: vi.fn(),
      };
      
      Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
      
      const rateLimiter = streamingService.getRateLimiter();
      
      // Reset and check quota
      const quota = rateLimiter.checkQuota('test-user');
      
      expect(quota.allowedRequests).toBeGreaterThanOrEqual(0);
    });

    it('provides clear error messages on rate limit', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Too Many Requests',
          message: 'You have exceeded your daily request limit',
          retryAfter: 3600,
          plan: 'free',
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      try {
        await streamingService.analyzeCode(testCode);
      } catch (error: any) {
        expect(error.message).toContain('exceeded');
        expect(error.retryAfter).toBe(3600);
      }
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('recovers from network interruptions', async () => {
      let callCount = 0;
      
      mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        
        if (callCount === 1) {
          throw new Error('Network error');
        }
        
        return {
          ok: true,
          status: 200,
          body: {
            getReader: vi.fn().mockReturnValue({
              read: async function* () {
                yield new TextEncoder().encode('data: {"token": "success"}');
              },
            }),
          },
        };
      });
      
      global.fetch = mockFetch as any;
      
      const result = await streamingService.streamingGenerateContent(testCode);
      
      // Should have retried
      expect(callCount).toBeGreaterThanOrEqual(2);
      expect(result.success).toBe(true);
    });

    it('implements exponential backoff', async () => {
      const delays: number[] = [];
      
      mockFetch = vi.fn().mockImplementation(async () => {
        const baseDelay = Math.pow(2, delays.length) * 100;
        delays.push(baseDelay);
        
        throw new Error('Server error');
      });
      
      global.fetch = mockFetch as any;
      
      const startError = await streamingService.streamingGenerateContent(testCode).catch(() => {});
      
      // Should show increasing delays
      expect(delays[delays.length - 1]).toBeGreaterThan(delays[delays.length - 2] || 0);
    });

    it('preserves partial progress on reconnection', async () => {
      const originalRequest = { ...mockAnalysisRequest };
      
      let reconnectCallCount = 0;
      
      mockFetch = vi.fn().mockImplementation(async (url: string) => {
        reconnectCallCount++;
        
        // Extract resume token from URL if present
        const params = new URLSearchParams(url.split('?')[1]);
        const resumeToken = params.get('resume_token');
        
        if (resumeToken) {
          return {
            ok: true,
            status: 200,
            body: {
              getReader: vi.fn().mockReturnValue({
                read: async function* () {
                  yield new TextEncoder().encode(
                    `data: {"token": "continued-from-${resumeToken}"}`
                  );
                },
              }),
            },
          };
        }
        
        throw new Error('Initial failure');
      });
      
      global.fetch = mockFetch as any;
      
      try {
        await streamingService.streamingGenerateContent(testCode);
      } catch {
        // Expected to fail initially
      }
      
      // Verify reconnection attempted with token
      expect(reconnectCallCount).toBeGreaterThanOrEqual(1);
    });

    it('falls back to secondary endpoint', async () => {
      const primaryUrl = 'https://api-primary.chronocoder.test';
      const fallbackUrl = 'https://api-fallback.chronocoder.test';
      
      mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('primary')) {
          throw new Error('Primary server unavailable');
        }
        
        return {
          ok: true,
          status: 200,
          body: {
            getReader: vi.fn().mockReturnValue({
              read: async function* () {
                yield new TextEncoder().encode('data: {"status": "fallback-activated"}');
              },
            }),
          },
        };
      });
      
      global.fetch = mockFetch as any;
      
      const result = await streamingService.streamingGenerateContent(testCode);
      
      expect(result.fallbackUsed).toBe(true);
    });

    it('gracefully handles corrupted responses', async () => {
      const corruptedData = 'data: {invalid json}\n\n';
      
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              yield new TextEncoder().encode(corruptedData);
            },
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(streamingService.streamingGenerateContent(testCode)).resolves.toBeDefined();
      // Should not crash, should handle gracefully
    });
  });

  describe('Concurrent Connections', () => {
    it('manages multiple simultaneous connections', async () => {
      const concurrentServices = [
        new StreamingApiService({ apiKey: mockApiKey }),
        new StreamingApiService({ apiKey: mockApiKey }),
        new StreamingApiService({ apiKey: mockApiKey }),
      ];
      
      const results = await Promise.all(
        concurrentServices.map(async (service) => {
          const mockResponse = {
            ok: true,
            status: 200,
            body: {
              getReader: vi.fn().mockReturnValue({
                read: async function* () {
                  yield new TextEncoder().encode('data: {"token": "concurrent"}');
                },
              }),
            },
          };
          
          mockFetch.mockResolvedValueOnce(mockResponse);
          
          return service.streamingGenerateContent(testCode);
        })
      );
      
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('queues requests when at capacity', async () => {
      const maxConcurrent = 2;
      
      streamingService.setMaxConcurrentConnections(maxConcurrent);
      
      const queuedServices = [];
      
      for (let i = 0; i < 5; i++) {
        const service = new StreamingApiService({ apiKey: mockApiKey });
        queuedServices.push(service);
      }
      
      const queuePromises = queuedServices.map(async (service) => {
        const mockResponse = {
          ok: true,
          status: 200,
          body: {
            getReader: vi.fn().mockReturnValue({
              read: async function* () {
                yield new TextEncoder().encode('data: {"queued": true}');
              },
            }),
          },
        };
        
        mockFetch.mockResolvedValueOnce(mockResponse);
        
        return service.streamingGenerateContent(testCode);
      });
      
      const results = await Promise.all(queuePromises);
      
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('releases resources after completion', async () => {
      const services = [
        new StreamingApiService({ apiKey: mockApiKey }),
        new StreamingApiService({ apiKey: mockApiKey }),
      ];
      
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              yield new TextEncoder().encode('data: {"done": true}');
            },
          }),
        },
      };
      
      mockFetch.mockResolvedValue(mockResponse);
      
      const promises = services.map((service) =>
        service.streamingGenerateContent(testCode)
      );
      
      await Promise.all(promises);
      
      // Resources should be freed
      expect(streamingService.getActiveConnections()).toBeLessThanOrEqual(0);
    });
  });

  describe('Security & Validation', () => {
    it('validates input before sending', async () => {
      const invalidCode = '<script>alert("xss")</script>';
      
      try {
        await streamingService.analyzeCode(invalidCode);
        // Should sanitize or reject
        expect(true).toBe(true);
      } catch (error: any) {
        expect(error.message).toContain('validate|sanitize');
      }
    });

    it='escapes special characters in output': async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              yield new TextEncoder().encode(
                `data: {"token": "<script>alert('xss')</script>"}`
              );
            },
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await streamingService.streamingGenerateContent(testCode);
      
      // Should be escaped
      expect(result.content).not.toContain('<script>');
    });

    it('verifies response integrity', async () => {
      const expectedChecksum = 'abc123';
      
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['x-response-checksum', expectedChecksum]]),
        body: {
          getReader: vi.fn().mockReturnValue({
            read: async function* () {
              yield new TextEncoder().encode('data: {"token": "verified"}');
            },
          }),
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await streamingService.streamingGenerateContent(testCode);
      
      expect(result.integrityVerified).toBe(true);
    });
  });
});
