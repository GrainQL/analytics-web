import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GrainAnalytics, GrainConfig } from '../src/index';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock localStorage globally
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Also mock window.localStorage for browser environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

describe('GrainAnalytics - Anonymous User ID', () => {
  let analytics: GrainAnalytics;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockConsoleError: jest.SpiedFunction<typeof console.error>;

  const defaultConfig: GrainConfig = {
    tenantId: 'test-tenant',
    apiUrl: 'https://test-api.com',
    debug: false,
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();

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

  describe('Persistent Anonymous User ID Generation', () => {
    it('should generate a new persistent anonymous user ID when none exists', () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      
      // Should be in format temp:UUID (without dashes)
      expect(effectiveUserId).toMatch(/^temp:[a-f0-9]{32}$/);
      expect(effectiveUserId).not.toContain('-');
      
      // Should be stored in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'grain_anonymous_user_id_test-tenant',
        effectiveUserId
      );
    });

    it('should load existing persistent anonymous user ID from localStorage', () => {
      const existingId = 'temp:1234567890abcdef1234567890abcdef';
      localStorageMock.setItem('grain_anonymous_user_id_test-tenant', existingId);
      
      // Clear the mock calls from the setItem above
      localStorageMock.setItem.mockClear();
      
      analytics = new GrainAnalytics(defaultConfig);
      
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      expect(effectiveUserId).toBe(existingId);
      
      // Should not set a new ID in localStorage since we loaded existing one
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'grain_anonymous_user_id_test-tenant',
        expect.any(String)
      );
    });

    it('should use persistent anonymous user ID for events when no global userId is set', async () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      
      await analytics.track('test_event', { key: 'value' }, { flush: true });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);
      const event = body.events[0];

      expect(event.userId).toBe(effectiveUserId);
    });

    it('should use persistent anonymous user ID for setProperty when no global userId is set', async () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      
      await analytics.setProperty({ key: 'value' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body.userId).toBe(effectiveUserId);
    });

    it('should use persistent anonymous user ID for fetchConfig when no global userId is set', async () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      
      await analytics.fetchConfig();

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);

      expect(body.userId).toBe(effectiveUserId);
    });
  });

  describe('User ID Priority', () => {
    it('should prioritize global userId over persistent anonymous ID', async () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const persistentId = analytics.getEffectiveUserIdPublic();
      analytics.setUserId('real_user_123');
      
      await analytics.track('test_event', { key: 'value' }, { flush: true });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);
      const event = body.events[0];

      expect(event.userId).toBe('real_user_123');
      expect(event.userId).not.toBe(persistentId);
    });

    it('should prioritize event-specific userId over both global and persistent IDs', async () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const persistentId = analytics.getEffectiveUserIdPublic();
      analytics.setUserId('global_user_123');
      
      await analytics.track({
        eventName: 'test_event',
        userId: 'event_specific_user',
        properties: { key: 'value' }
      }, { flush: true });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs![1]!.body as string);
      const event = body.events[0];

      expect(event.userId).toBe('event_specific_user');
      expect(event.userId).not.toBe('global_user_123');
      expect(event.userId).not.toBe(persistentId);
    });
  });

  describe('Anonymous ID Clearing', () => {
    it('should clear persistent anonymous ID when identify is called', () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const persistentId = analytics.getEffectiveUserIdPublic();
      expect(persistentId).toMatch(/^temp:/);
      
      analytics.identify('real_user_123');
      
      // Should now use the real user ID
      const newEffectiveId = analytics.getEffectiveUserIdPublic();
      expect(newEffectiveId).toBe('real_user_123');
      
      // Persistent ID should be cleared
      const privateAnalytics = analytics as any;
      expect(privateAnalytics.persistentAnonymousUserId).toBe(null);
    });

    it('should clear persistent anonymous ID when setUserId is called with a real user ID', () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const persistentId = analytics.getEffectiveUserIdPublic();
      expect(persistentId).toMatch(/^temp:/);
      
      analytics.setUserId('real_user_123');
      
      // Should now use the real user ID
      const newEffectiveId = analytics.getEffectiveUserIdPublic();
      expect(newEffectiveId).toBe('real_user_123');
      
      // Persistent ID should be cleared
      const privateAnalytics = analytics as any;
      expect(privateAnalytics.persistentAnonymousUserId).toBe(null);
    });

    it('should not clear persistent anonymous ID when setUserId is called with null', () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const persistentId = analytics.getEffectiveUserIdPublic();
      expect(persistentId).toMatch(/^temp:/);
      
      analytics.setUserId(null);
      
      // Should still use the persistent anonymous ID
      const newEffectiveId = analytics.getEffectiveUserIdPublic();
      expect(newEffectiveId).toBe(persistentId);
      
      // Persistent ID should still exist
      const privateAnalytics = analytics as any;
      expect(privateAnalytics.persistentAnonymousUserId).toBe(persistentId);
    });
  });

  describe('UUID Format', () => {
    it('should generate UUIDs without dashes in anonymous user IDs', () => {
      analytics = new GrainAnalytics(defaultConfig);
      
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      
      // Should be in format temp:UUID (without dashes)
      expect(effectiveUserId).toMatch(/^temp:[a-f0-9]{32}$/);
      expect(effectiveUserId).not.toContain('-');
      expect(effectiveUserId).toHaveLength(37); // 'temp:' + 32 hex chars
    });

    it('should handle multiple instances generating different UUIDs', () => {
      const analytics1 = new GrainAnalytics({ ...defaultConfig, tenantId: 'tenant1' });
      const analytics2 = new GrainAnalytics({ ...defaultConfig, tenantId: 'tenant2' });
      
      const id1 = analytics1.getEffectiveUserIdPublic();
      const id2 = analytics2.getEffectiveUserIdPublic();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^temp:[a-f0-9]{32}$/);
      expect(id2).toMatch(/^temp:[a-f0-9]{32}$/);
      
      analytics1.destroy();
      analytics2.destroy();
    });
  });

  describe('localStorage Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });
      
      // Should not throw an error
      expect(() => {
        analytics = new GrainAnalytics(defaultConfig);
      }).not.toThrow();
      
      // Should still generate an effective user ID
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      expect(effectiveUserId).toMatch(/^temp:[a-f0-9]{32}$/);
    });

    it('should handle localStorage.getItem errors gracefully', () => {
      // Mock localStorage.getItem to throw an error
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });
      
      // Should not throw an error
      expect(() => {
        analytics = new GrainAnalytics(defaultConfig);
      }).not.toThrow();
      
      // Should still generate an effective user ID
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      expect(effectiveUserId).toMatch(/^temp:[a-f0-9]{32}$/);
    });
  });

  describe('Server-side Environment', () => {
    it('should work in server-side environment without localStorage', () => {
      // Mock server-side environment
      const originalWindow = global.window;
      delete (global as any).window;
      
      // Should not throw an error
      expect(() => {
        analytics = new GrainAnalytics(defaultConfig);
      }).not.toThrow();
      
      // Should still generate an effective user ID
      const effectiveUserId = analytics.getEffectiveUserIdPublic();
      expect(effectiveUserId).toMatch(/^temp:[a-f0-9]{32}$/);
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Tenant-specific Storage', () => {
    it('should generate different anonymous IDs for different tenants', () => {
      const analytics1 = new GrainAnalytics({ ...defaultConfig, tenantId: 'tenant1' });
      const analytics2 = new GrainAnalytics({ ...defaultConfig, tenantId: 'tenant2' });
      
      const id1 = analytics1.getEffectiveUserIdPublic();
      const id2 = analytics2.getEffectiveUserIdPublic();
      
      // Should be different IDs for different tenants
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^temp:[a-f0-9]{32}$/);
      expect(id2).toMatch(/^temp:[a-f0-9]{32}$/);
      
      analytics1.destroy();
      analytics2.destroy();
    });
  });
});
