import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GrainAnalytics, createGrainAnalytics, GrainConfig, AuthProvider } from '../src/index';

describe('GrainAnalytics - Basic Functionality', () => {
  let analytics: GrainAnalytics;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockConsoleError: jest.SpiedFunction<typeof console.error>;

  const defaultConfig: GrainConfig = {
    tenantId: 'test-tenant',
    apiUrl: 'https://test-api.com',
    debug: false,
  };

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock successful API response by default
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    } as Response);
  });

  afterEach(() => {
    if (analytics) {
      analytics.destroy();
    }
    jest.clearAllMocks();
    mockConsoleError.mockRestore();
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with valid config', () => {
      analytics = new GrainAnalytics(defaultConfig);
      expect(analytics).toBeInstanceOf(GrainAnalytics);
    });

    it('should throw error if tenantId is missing', () => {
      const invalidConfig = { ...defaultConfig };
      delete (invalidConfig as any).tenantId;
      
      expect(() => new GrainAnalytics(invalidConfig)).toThrow(
        'Grain Analytics: tenantId is required'
      );
    });

    it('should set default values for optional config parameters', () => {
      const minimalConfig = { tenantId: 'test-tenant' };
      analytics = new GrainAnalytics(minimalConfig);
      
      // Access private config via type assertion for testing
      const config = (analytics as any).config;
      expect(config.apiUrl).toBe('https://api.grainql.com');
      expect(config.authStrategy).toBe('NONE');
      expect(config.batchSize).toBe(50);
      expect(config.flushInterval).toBe(5000);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.debug).toBe(false);
    });
  });

  describe('Event Tracking', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should track event with string eventName and properties', async () => {
      const eventName = 'test_event';
      const properties = { key: 'value', count: 42 };

      await analytics.track(eventName, properties);

      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(1);
      expect(eventQueue[0]).toEqual({
        eventName,
        userId: 'anonymous',
        properties,
      });
    });

    it('should track event with GrainEvent object', async () => {
      const event = {
        eventName: 'user_action',
        userId: 'user123',
        properties: { action: 'click', element: 'button' },
      };

      await analytics.track(event);

      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(1);
      expect(eventQueue[0]).toEqual({
        eventName: 'user_action',
        userId: 'user123',
        properties: { action: 'click', element: 'button' },
      });
    });

    it('should use anonymous userId when not provided', async () => {
      await analytics.track('test_event', {});

      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue[0].userId).toBe('anonymous');
    });

    it('should handle empty properties', async () => {
      await analytics.track('test_event');

      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue[0].properties).toEqual({});
    });

    it('should flush immediately when flush option is true', async () => {
      await analytics.track('test_event', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/v1/events/test-tenant',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            events: [{ eventName: 'test_event', userId: 'anonymous', properties: {} }],
          }),
        })
      );
    });

    it('should auto-flush when batch size is reached', async () => {
      const smallBatchConfig = { ...defaultConfig, batchSize: 2 };
      analytics.destroy();
      analytics = new GrainAnalytics(smallBatchConfig);

      await analytics.track('event1');
      expect(mockFetch).not.toHaveBeenCalled();

      await analytics.track('event2');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/v1/events/test-tenant',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: [
              { eventName: 'event1', userId: 'anonymous', properties: {} },
              { eventName: 'event2', userId: 'anonymous', properties: {} },
            ],
          }),
        })
      );
    });

    it('should throw error if client is destroyed', async () => {
      analytics.destroy();

      await expect(analytics.track('test_event')).rejects.toThrow(
        'Grain Analytics: Client has been destroyed'
      );
    });
  });

  describe('Authentication Strategies', () => {
    it('should send no auth headers for NONE strategy', async () => {
      const config = { ...defaultConfig, authStrategy: 'NONE' as const };
      analytics = new GrainAnalytics(config);

      await analytics.track('test_event', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should send Chase auth header for SERVER_SIDE strategy', async () => {
      const config = {
        ...defaultConfig,
        authStrategy: 'SERVER_SIDE' as const,
        secretKey: 'secret123',
      };
      analytics = new GrainAnalytics(config);

      await analytics.track('test_event', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Chase secret123',
          },
        })
      );
    });

    it('should send Bearer token for JWT strategy', async () => {
      const mockAuthProvider: AuthProvider = {
        getToken: jest.fn<() => Promise<string>>().mockResolvedValue('jwt-token-123'),
      };

      const config = {
        ...defaultConfig,
        authStrategy: 'JWT' as const,
        authProvider: mockAuthProvider,
      };
      analytics = new GrainAnalytics(config);

      await analytics.track('test_event', {}, { flush: true });

      expect(mockAuthProvider.getToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer jwt-token-123',
          },
        })
      );
    });
  });

  describe('Flush Method', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should send queued events', async () => {
      await analytics.track('event1');
      await analytics.track('event2');

      await analytics.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/v1/events/test-tenant',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            events: [
              { eventName: 'event1', userId: 'anonymous', properties: {} },
              { eventName: 'event2', userId: 'anonymous', properties: {} },
            ],
          }),
        })
      );
    });

    it('should clear event queue after successful flush', async () => {
      await analytics.track('test_event');
      expect((analytics as any).eventQueue).toHaveLength(1);

      await analytics.flush();
      expect((analytics as any).eventQueue).toHaveLength(0);
    });

    it('should not make API call if queue is empty', async () => {
      await analytics.flush();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
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

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await analytics.track('test_event');
      
      await expect(analytics.flush()).rejects.toThrow('Network error');
    });

    it('should retry on 5xx server errors', async () => {
      const config = { ...defaultConfig, retryAttempts: 1, retryDelay: 10 };
      analytics.destroy();
      analytics = new GrainAnalytics(config);

      // First call fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Internal Server Error' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);

      await analytics.track('retry_test');
      await analytics.flush();

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
  });

  describe('API Integration', () => {
    beforeEach(() => {
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
        'https://test-api.com/v1/events/test-tenant',
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
      analytics.destroy();
      analytics = new GrainAnalytics(configWithSpecialChars);

      await analytics.track('test_event', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/v1/events/tenant%40special%2Bchars',
        expect.any(Object)
      );
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

    it('should use default API URL when not specified', async () => {
      const configWithoutUrl = { tenantId: 'test-tenant' };
      analytics.destroy();
      analytics = new GrainAnalytics(configWithoutUrl);

      await analytics.track('url_test', {}, { flush: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.grainql.com/v1/events/test-tenant',
        expect.any(Object)
      );
    });
  });

  describe('Factory Function', () => {
    it('should create and return GrainAnalytics instance', () => {
      const instance = createGrainAnalytics(defaultConfig);
      expect(instance).toBeInstanceOf(GrainAnalytics);
      instance.destroy();
    });
  });

  describe('Debug Logging', () => {
    it('should log events in debug mode', async () => {
      const debugConfig = { ...defaultConfig, debug: true };
      analytics = new GrainAnalytics(debugConfig);
      
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await analytics.track('test_event', { prop: 'value' });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Grain Analytics]',
        'Queued event: test_event',
        { prop: 'value' }
      );

      mockConsoleLog.mockRestore();
    });

    it('should not log events when debug is false', async () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await analytics.track('test_event');

      expect(mockConsoleLog).not.toHaveBeenCalled();
      mockConsoleLog.mockRestore();
    });
  });

  describe('Payload Structure', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should send events without auto-generated fields (insertId, eventTs, eventDate)', async () => {
      await analytics.track('payload_test', { key: 'value' }, { flush: true });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);
      const event = body.events[0];

      // Should have these fields
      expect(event).toHaveProperty('eventName', 'payload_test');
      expect(event).toHaveProperty('userId', 'anonymous');
      expect(event).toHaveProperty('properties', { key: 'value' });

      // Should NOT have auto-generated fields
      expect(event).not.toHaveProperty('insertId');
      expect(event).not.toHaveProperty('eventTs');
      expect(event).not.toHaveProperty('eventDate');
    });

    it('should handle events with special characters in properties', async () => {
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
});
