import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GrainAnalytics, GrainConfig } from '../src/index';

describe('API Integration Tests', () => {
  let analytics: GrainAnalytics;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockConsoleError: jest.SpiedFunction<typeof console.error>;

  const defaultConfig: GrainConfig = {
    tenantId: 'test-tenant-123',
    apiUrl: 'https://api.example.com',
    retryAttempts: 2,
    retryDelay: 100,
  };

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (analytics) {
      analytics.destroy();
    }
    jest.clearAllMocks();
    mockConsoleError.mockRestore();
  });

  describe('Successful API calls', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response);
      
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should send events to correct endpoint with proper payload', async () => {
      const events = [
        { eventName: 'page_view', properties: { page: '/home' } },
        { eventName: 'click', properties: { element: 'button', id: 'cta' } },
      ];

      for (const event of events) {
        await analytics.track(event.eventName, event.properties);
      }
      await analytics.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/events/test-tenant-123/multi',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: [
              { eventName: 'page_view', userId: 'anonymous', properties: { page: '/home' } },
              { eventName: 'click', userId: 'anonymous', properties: { element: 'button', id: 'cta' } },
            ],
          }),
        }
      );
    });

    it('should URL encode tenant ID properly', async () => {
      const configWithSpecialChars = {
        ...defaultConfig,
        tenantId: 'tenant@special+chars',
      };
      analytics = new GrainAnalytics(configWithSpecialChars);

      await analytics.track('test_event', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/events/tenant%40special%2Bchars/multi',
        expect.any(Object)
      );
    });

    it('should handle large payloads', async () => {
      const largeProperties = {};
      for (let i = 0; i < 100; i++) {
        (largeProperties as any)[`property_${i}`] = `value_${i}`.repeat(50);
      }

      await analytics.track('large_event', largeProperties, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('large_event'),
        })
      );
    });

    it('should handle events with special characters', async () => {
      const specialProperties = {
        text: 'Hello "World" & <Test>',
        emoji: '🎉 🚀 💯',
        unicode: 'こんにちは世界',
        symbols: '!@#$%^&*()[]{}|;:,.<>?',
      };

      await analytics.track('special_chars', specialProperties, { flush: true });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);
      
      expect(body.events[0].properties).toEqual(specialProperties);
    });
  });

  describe('API Error handling', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad Request' }),
      } as Response);

      await analytics.track('test_event');
      
      await expect(analytics.flush()).rejects.toThrow('Failed to send events: Bad Request');
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[Grain Analytics] Failed to send events after all retries:',
        expect.any(Error)
      );
    });

    it.skip('should handle HTTP error without JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('No JSON')),
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      await analytics.track('test_event');
      
      await expect(analytics.flush()).rejects.toThrow('Failed to send events: Internal Server Error');
    }, 10000);

    it.skip('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await analytics.track('test_event');
      
      await expect(analytics.flush()).rejects.toThrow('Network error');
    });

    it('should handle fetch timeout/abort', async () => {
      mockFetch.mockRejectedValue(new Error('The operation was aborted'));

      await analytics.track('test_event');
      
      await expect(analytics.flush()).rejects.toThrow('The operation was aborted');
    });
  });

  describe('Content-Type and headers', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response);
      
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should always send Content-Type: application/json', async () => {
      await analytics.track('test_event', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should send proper JSON body', async () => {
      await analytics.track('json_test', { nested: { value: 42 } }, { flush: true });

      const callArgs = mockFetch.mock.calls[0];
      const body = callArgs![1]!.body as string;
      
      expect(() => JSON.parse(body)).not.toThrow();
      
      const parsedBody = JSON.parse(body);
      expect(parsedBody).toHaveProperty('events');
      expect(Array.isArray(parsedBody.events)).toBe(true);
    });
  });

  describe('Beacon API fallback', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it.skip('should use sendBeacon when available and successful', async () => {
      const mockSendBeacon = jest.fn().mockReturnValue(true);
      Object.defineProperty(global.navigator, 'sendBeacon', {
        value: mockSendBeacon,
        writable: true,
      });

      await analytics.track('beacon_test');
      analytics.destroy(); // This triggers sendEventsWithBeacon

      expect(mockSendBeacon).toHaveBeenCalledWith(
        'https://api.example.com/v1/events/test-tenant-123/multi',
        expect.any(Blob)
      );
    });

    it.skip('should fallback to fetch with keepalive when beacon fails', async () => {
      const mockSendBeacon = jest.fn().mockReturnValue(false);
      Object.defineProperty(global.navigator, 'sendBeacon', {
        value: mockSendBeacon,
        writable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);

      await analytics.track('fallback_test');
      analytics.destroy();

      // Wait for async beacon fallback
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/events/test-tenant-123/multi',
        expect.objectContaining({
          keepalive: true,
        })
      );
    }, 10000);

    it('should handle beacon API not available', () => {
      // Remove sendBeacon from navigator
      Object.defineProperty(global.navigator, 'sendBeacon', {
        value: undefined,
        writable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);

      analytics.track('no_beacon_test');
      analytics.destroy();

      // Should not throw error when beacon is not available
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('URL construction', () => {
    it('should use default API URL when not specified', async () => {
      const configWithoutUrl = { tenantId: 'test-tenant' };
      analytics = new GrainAnalytics(configWithoutUrl);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);

      await analytics.track('url_test', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.grainql.com/v1/events/test-tenant/multi',
        expect.any(Object)
      );
    });

    it('should use custom API URL when specified', async () => {
      const customConfig = {
        tenantId: 'custom-tenant',
        apiUrl: 'https://custom-api.grainql.com',
      };
      analytics = new GrainAnalytics(customConfig);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);

      await analytics.track('custom_url_test', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-api.grainql.com/v1/events/custom-tenant/multi',
        expect.any(Object)
      );
    });
  });
});
