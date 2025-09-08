import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GrainAnalytics, GrainConfig } from '../src/index';

describe('GrainAnalytics - Properties Functionality', () => {
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

  describe('setProperty Method', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should set properties with string values', async () => {
      const properties = {
        plan: 'premium',
        status: 'active',
        signupDate: '2024-01-15',
        source: 'web'
      };

      await analytics.setProperty(properties);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/v1/events/test-tenant/properties',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'anonymous',
            plan: 'premium',
            status: 'active',
            signupDate: '2024-01-15',
            source: 'web'
          }),
        }
      );
    });

    it('should serialize non-string values to strings', async () => {
      const properties = {
        isActive: true,
        count: 42,
        metadata: { source: 'web', version: '1.0' },
        tags: ['premium', 'beta']
      };

      await analytics.setProperty(properties);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body).toEqual({
        userId: 'anonymous',
        isActive: 'true',
        count: '42',
        metadata: '{"source":"web","version":"1.0"}',
        tags: '["premium","beta"]'
      });
    });

    it('should handle null and undefined values', async () => {
      const properties = {
        name: 'John',
        age: null,
        email: undefined,
        city: 'New York'
      };

      await analytics.setProperty(properties);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body).toEqual({
        userId: 'anonymous',
        name: 'John',
        age: '',
        email: '',
        city: 'New York'
      });
    });

    it('should use global userId when available', async () => {
      analytics.setUserId('user123');
      
      await analytics.setProperty({ plan: 'free' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body.userId).toBe('user123');
    });

    it('should use provided userId in options', async () => {
      analytics.setUserId('global_user');
      
      await analytics.setProperty({ plan: 'free' }, { userId: 'specific_user' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body.userId).toBe('specific_user');
    });

    it('should fall back to anonymous when no userId is set', async () => {
      await analytics.setProperty({ plan: 'free' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body.userId).toBe('anonymous');
    });

    it('should enforce maximum 4 properties limit', async () => {
      const tooManyProperties = {
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3',
        prop4: 'value4',
        prop5: 'value5'
      };

      await expect(analytics.setProperty(tooManyProperties)).rejects.toThrow(
        'Grain Analytics: Maximum 4 properties allowed per request'
      );
    });

    it('should require at least one property', async () => {
      await expect(analytics.setProperty({})).rejects.toThrow(
        'Grain Analytics: At least one property is required'
      );
    });

    it('should throw error if client is destroyed', async () => {
      analytics.destroy();

      await expect(analytics.setProperty({ plan: 'free' })).rejects.toThrow(
        'Grain Analytics: Client has been destroyed'
      );
    });
  });

  describe('Properties API Integration', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should send properties to correct endpoint', async () => {
      await analytics.setProperty({ plan: 'premium' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/v1/events/test-tenant/properties',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle authentication headers', async () => {
      const configWithAuth = {
        ...defaultConfig,
        authStrategy: 'SERVER_SIDE' as const,
        secretKey: 'secret123',
      };
      analytics.destroy();
      analytics = new GrainAnalytics(configWithAuth);

      await analytics.setProperty({ plan: 'premium' });

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

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad Request' }),
      } as Response);

      await expect(analytics.setProperty({ plan: 'premium' })).rejects.toThrow(
        'Failed to set properties: Bad Request'
      );
    });

    it('should URL encode tenant ID properly', async () => {
      const configWithSpecialChars = {
        ...defaultConfig,
        tenantId: 'tenant@special+chars',
      };
      analytics.destroy();
      analytics = new GrainAnalytics(configWithSpecialChars);

      await analytics.setProperty({ plan: 'free' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/v1/events/tenant%40special%2Bchars/properties',
        expect.any(Object)
      );
    });
  });

  describe('Property Validation', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should accept exactly 4 properties', async () => {
      const fourProperties = {
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3',
        prop4: 'value4'
      };

      await expect(analytics.setProperty(fourProperties)).resolves.not.toThrow();
    });

    it('should handle special characters in property values', async () => {
      const specialProperties = {
        text: 'Hello "World" & <Test>',
        emoji: '🎉 🚀 💯',
        unicode: 'こんにちは世界',
        symbols: '!@#$%^&*()[]{}|;:,.<>?'
      };

      await analytics.setProperty(specialProperties);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body.text).toBe('Hello "World" & <Test>');
      expect(body.emoji).toBe('🎉 🚀 💯');
      expect(body.unicode).toBe('こんにちは世界');
      expect(body.symbols).toBe('!@#$%^&*()[]{}|;:,.<>?');
    });

    it('should handle complex object serialization', async () => {
      const complexProperties = {
        user: { id: 123, name: 'John', active: true },
        settings: { theme: 'dark', notifications: false },
        metadata: { source: 'api', version: '2.0' }
      };

      await analytics.setProperty(complexProperties);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body.user).toBe('{"id":123,"name":"John","active":true}');
      expect(body.settings).toBe('{"theme":"dark","notifications":false}');
      expect(body.metadata).toBe('{"source":"api","version":"2.0"}');
    });
  });
});
