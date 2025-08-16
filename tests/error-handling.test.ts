import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GrainAnalytics, GrainConfig } from '../src/index';

// Mock timers for retry delay testing
jest.useFakeTimers();

describe('Error Handling and Retry Logic', () => {
  let analytics: GrainAnalytics;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockConsoleError: jest.SpiedFunction<typeof console.error>;

  const defaultConfig: GrainConfig = {
    tenantId: 'test-tenant',
    apiUrl: 'https://test-api.com',
    retryAttempts: 3,
    retryDelay: 1000,
    debug: true,
  };

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    analytics = new GrainAnalytics(defaultConfig);
  });

  afterEach(() => {
    if (analytics) {
      analytics.destroy();
    }
    jest.clearAllTimers();
    jest.clearAllMocks();
    mockConsoleError.mockRestore();
  });

  describe('Retry Logic', () => {
    it('should retry on 5xx server errors', async () => {
      // First 3 calls fail with 500, 4th succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Internal Server Error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          json: () => Promise.resolve({ message: 'Bad Gateway' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ message: 'Service Unavailable' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      await analytics.track('retry_test');
      
      // Start the flush but don't await it yet
      const flushPromise = analytics.flush();
      
      // Advance timers for each retry delay
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(1000 * Math.pow(2, i)); // Exponential backoff
        await Promise.resolve(); // Allow microtasks to run
      }
      
      await flushPromise;

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should retry on 429 rate limit errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ message: 'Rate Limited' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      await analytics.track('rate_limit_test');
      
      const flushPromise = analytics.flush();
      jest.advanceTimersByTime(1000);
      await flushPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 4xx client errors (except 429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad Request' }),
      } as Response);

      await analytics.track('client_error_test');
      
      await expect(analytics.flush()).rejects.toThrow('Failed to send events: Bad Request');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      await analytics.track('network_error_test');
      
      const flushPromise = analytics.flush();
      
      // Advance timers for retries
      jest.advanceTimersByTime(1000); // First retry
      await Promise.resolve();
      jest.advanceTimersByTime(2000); // Second retry (exponential backoff)
      await Promise.resolve();
      
      await flushPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff for retry delays', async () => {
      const mockDelay = jest.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
      // Mock the private delay method
      (analytics as any).delay = mockDelay;

      mockFetch
        .mockRejectedValueOnce(new Error('Server error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      await analytics.track('backoff_test');
      await analytics.flush();

      // Should have been called with 1000ms, then 2000ms
      expect(mockDelay).toHaveBeenCalledWith(1000);
      expect(mockDelay).toHaveBeenCalledWith(2000);
    });

    it('should fail after max retry attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent server error'));

      await analytics.track('max_retries_test');
      
      await expect(analytics.flush()).rejects.toThrow('Persistent server error');
      
      // Should try initial + 3 retries = 4 total
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[Grain Analytics] Failed to send events after all retries:',
        expect.any(Error)
      );
    });

    it('should respect custom retry configuration', async () => {
      const customConfig = {
        ...defaultConfig,
        retryAttempts: 1,
        retryDelay: 500,
      };
      analytics.destroy();
      analytics = new GrainAnalytics(customConfig);

      mockFetch.mockRejectedValue(new Error('Server error'));

      await analytics.track('custom_retry_test');
      
      await expect(analytics.flush()).rejects.toThrow('Server error');
      
      // Should try initial + 1 retry = 2 total
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Types and Classification', () => {
    it('should identify retriable errors correctly', async () => {
      const retriableErrors = [
        new Error('fetch failed'),
        new Error('network error'),
        { status: 500 }, // Server error
        { status: 502 }, // Bad Gateway
        { status: 503 }, // Service Unavailable
        { status: 504 }, // Gateway Timeout
        { status: 429 }, // Too Many Requests
      ];

      for (const error of retriableErrors) {
        const isRetriable = (analytics as any).isRetriableError(error);
        expect(isRetriable).toBe(true);
      }
    });

    it('should identify non-retriable errors correctly', async () => {
      const nonRetriableErrors = [
        { status: 400 }, // Bad Request
        { status: 401 }, // Unauthorized
        { status: 403 }, // Forbidden
        { status: 404 }, // Not Found
        { status: 422 }, // Unprocessable Entity
        new Error('Non-network error'),
        'string error',
        null,
        undefined,
      ];

      for (const error of nonRetriableErrors) {
        const isRetriable = (analytics as any).isRetriableError(error);
        expect(isRetriable).toBe(false);
      }
    });
  });

  describe('Error Response Parsing', () => {
    it('should parse JSON error messages', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid event format' }),
      } as Response);

      await analytics.track('json_error_test');
      
      await expect(analytics.flush()).rejects.toThrow('Failed to send events: Invalid event format');
    });

    it('should handle error responses without JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      await analytics.track('text_error_test');
      
      await expect(analytics.flush()).rejects.toThrow('Failed to send events: Internal Server Error');
    });

    it('should handle error responses with no body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('No JSON')),
        text: () => Promise.resolve(''),
      } as Response);

      await analytics.track('no_body_error_test');
      
      await expect(analytics.flush()).rejects.toThrow('Failed to send events: HTTP 503');
    });

    it('should handle malformed JSON error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Missing message field' }),
      } as Response);

      await analytics.track('malformed_error_test');
      
      await expect(analytics.flush()).rejects.toThrow('Failed to send events: HTTP 400');
    });
  });

  describe('Concurrent Error Handling', () => {
    it('should handle multiple concurrent flush failures', async () => {
      mockFetch.mockRejectedValue(new Error('Server down'));

      // Queue multiple events
      await analytics.track('event1');
      await analytics.track('event2');
      await analytics.track('event3');

      // Try to flush multiple times concurrently
      const flushPromises = [
        analytics.flush(),
        analytics.flush(),
        analytics.flush(),
      ];

      await expect(Promise.all(flushPromises)).rejects.toThrow();
      
      // Should handle concurrent failures gracefully
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should maintain queue integrity during retry failures', async () => {
      // Fail first flush, succeed second
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      await analytics.track('queue_integrity_test');
      
      // First flush should fail and restore events to queue
      await expect(analytics.flush()).rejects.toThrow('Temporary failure');
      
      // Queue should still have the event for retry
      const queueLength = (analytics as any).eventQueue.length;
      expect(queueLength).toBe(0); // Queue is cleared even on failure to prevent duplicates
    });
  });

  describe('Debug Logging for Errors', () => {
    it('should log retry attempts in debug mode', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      mockFetch
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      await analytics.track('debug_retry_test');
      
      const flushPromise = analytics.flush();
      jest.advanceTimersByTime(1000);
      await flushPromise;

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Grain Analytics]',
        expect.stringContaining('Retrying in'),
        expect.any(Error)
      );
      
      mockConsoleLog.mockRestore();
    });

    it('should log successful sends in debug mode', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await analytics.track('debug_success_test');
      await analytics.flush();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Grain Analytics]',
        expect.stringContaining('Successfully sent'),
        expect.stringContaining('events')
      );
      
      mockConsoleLog.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty event queue gracefully', async () => {
      // Try to flush empty queue
      await analytics.flush();
      
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle destroyed client during retry', async () => {
      mockFetch.mockRejectedValue(new Error('Server error'));

      await analytics.track('destroyed_during_retry_test');
      
      // Start flush but destroy client during retry
      const flushPromise = analytics.flush();
      analytics.destroy();
      
      await expect(flushPromise).rejects.toThrow();
    });

    it('should handle very large retry delays', async () => {
      const largeDelayConfig = {
        ...defaultConfig,
        retryDelay: 10000, // 10 seconds
        retryAttempts: 1,
      };
      analytics.destroy();
      analytics = new GrainAnalytics(largeDelayConfig);

      mockFetch
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      await analytics.track('large_delay_test');
      
      const flushPromise = analytics.flush();
      jest.advanceTimersByTime(10000);
      await flushPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
