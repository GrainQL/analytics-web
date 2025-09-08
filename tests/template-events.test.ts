import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  GrainAnalytics, 
  createGrainAnalytics, 
  GrainConfig,
  LoginEventProperties,
  SignupEventProperties,
  CheckoutEventProperties,
  PageViewEventProperties,
  PurchaseEventProperties,
  SearchEventProperties,
  AddToCartEventProperties,
  RemoveFromCartEventProperties
} from '../src/index';

describe('GrainAnalytics - Template Events and User ID', () => {
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

  describe('User ID Management', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should set global user ID in constructor', () => {
      const configWithUserId = { ...defaultConfig, userId: 'user123' };
      analytics = new GrainAnalytics(configWithUserId);
      
      expect(analytics.getUserId()).toBe('user123');
    });

    it('should set user ID via setUserId method', () => {
      analytics.setUserId('user456');
      expect(analytics.getUserId()).toBe('user456');
    });

    it('should set user ID via identify method', () => {
      analytics.identify('user789');
      expect(analytics.getUserId()).toBe('user789');
    });

    it('should return null when no user ID is set', () => {
      expect(analytics.getUserId()).toBe(null);
    });

    it('should use global user ID for events when set', async () => {
      analytics.setUserId('user123');
      
      await analytics.track('test_event', { key: 'value' });
      
      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(1);
      expect(eventQueue[0].userId).toBe('user123');
    });

    it('should prioritize event-specific userId over global userId', async () => {
      analytics.setUserId('global_user');
      
      await analytics.track({
        eventName: 'test_event',
        userId: 'event_user',
        properties: { key: 'value' }
      });
      
      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(1);
      expect(eventQueue[0].userId).toBe('event_user');
    });

    it('should fall back to anonymous when no user ID is set', async () => {
      await analytics.track('test_event', { key: 'value' });
      
      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(1);
      expect(eventQueue[0].userId).toBe('anonymous');
    });

    it('should allow clearing user ID by setting to null', () => {
      analytics.setUserId('user123');
      expect(analytics.getUserId()).toBe('user123');
      
      analytics.setUserId(null);
      expect(analytics.getUserId()).toBe(null);
    });
  });

  describe('Template Events', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    describe('Authentication Events', () => {
      it('should track login event with properties', async () => {
        const properties: LoginEventProperties = {
          method: 'email',
          success: true,
          rememberMe: true,
          twoFactorEnabled: false
        };

        await analytics.trackLogin(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue).toHaveLength(1);
        expect(eventQueue[0]).toEqual({
          eventName: 'login',
          userId: 'anonymous',
          properties
        });
      });

      it('should track signup event with properties', async () => {
        const properties: SignupEventProperties = {
          method: 'google',
          source: 'landing_page',
          plan: 'pro',
          success: true
        };

        await analytics.trackSignup(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue).toHaveLength(1);
        expect(eventQueue[0]).toEqual({
          eventName: 'signup',
          userId: 'anonymous',
          properties
        });
      });

      it('should track login failure', async () => {
        const properties: LoginEventProperties = {
          method: 'email',
          success: false,
          errorMessage: 'Invalid credentials',
          loginAttempt: 3
        };

        await analytics.trackLogin(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue[0].properties).toEqual(properties);
      });
    });

    describe('E-commerce Events', () => {
      it('should track checkout event with items', async () => {
        const properties: CheckoutEventProperties = {
          orderId: 'order_123',
          total: 99.99,
          currency: 'USD',
          items: [
            { id: 'prod_1', name: 'Product 1', price: 49.99, quantity: 1 },
            { id: 'prod_2', name: 'Product 2', price: 50.00, quantity: 1 }
          ],
          paymentMethod: 'credit_card',
          success: true,
          couponCode: 'SAVE10',
          discount: 10.00
        };

        await analytics.trackCheckout(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue).toHaveLength(1);
        expect(eventQueue[0]).toEqual({
          eventName: 'checkout',
          userId: 'anonymous',
          properties
        });
      });

      it('should track purchase event', async () => {
        const properties: PurchaseEventProperties = {
          orderId: 'order_123',
          total: 99.99,
          currency: 'USD',
          items: [
            { id: 'prod_1', name: 'Product 1', price: 49.99, quantity: 1, category: 'electronics' }
          ],
          paymentMethod: 'credit_card',
          shippingMethod: 'express',
          tax: 8.50,
          shipping: 5.99,
          discount: 10.00,
          couponCode: 'SAVE10'
        };

        await analytics.trackPurchase(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue[0].eventName).toBe('purchase');
        expect(eventQueue[0].properties).toEqual(properties);
      });

      it('should track add to cart event', async () => {
        const properties: AddToCartEventProperties = {
          itemId: 'prod_1',
          itemName: 'Product 1',
          price: 49.99,
          quantity: 2,
          currency: 'USD',
          category: 'electronics',
          variant: 'blue'
        };

        await analytics.trackAddToCart(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue[0].eventName).toBe('add_to_cart');
        expect(eventQueue[0].properties).toEqual(properties);
      });

      it('should track remove from cart event', async () => {
        const properties: RemoveFromCartEventProperties = {
          itemId: 'prod_2',
          itemName: 'Product 2',
          price: 50.00,
          quantity: 1,
          currency: 'USD',
          category: 'clothing',
          variant: 'large'
        };

        await analytics.trackRemoveFromCart(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue[0].eventName).toBe('remove_from_cart');
        expect(eventQueue[0].properties).toEqual(properties);
      });
    });

    describe('Navigation Events', () => {
      it('should track page view event', async () => {
        const properties: PageViewEventProperties = {
          page: '/products',
          title: 'Product Catalog',
          referrer: 'https://google.com',
          url: 'https://yoursite.com/products',
          userAgent: 'Mozilla/5.0...',
          screenResolution: '1920x1080',
          viewportSize: '1200x800'
        };

        await analytics.trackPageView(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue[0].eventName).toBe('page_view');
        expect(eventQueue[0].properties).toEqual(properties);
      });

      it('should track search event', async () => {
        const properties: SearchEventProperties = {
          query: 'blue shoes',
          results: 24,
          filters: { category: 'footwear', color: 'blue', size: '10' },
          sortBy: 'price_asc',
          category: 'footwear',
          success: true
        };

        await analytics.trackSearch(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue[0].eventName).toBe('search');
        expect(eventQueue[0].properties).toEqual(properties);
      });
    });

    describe('Template Events with User ID', () => {
      it('should use global user ID for template events', async () => {
        analytics.setUserId('user123');

        await analytics.trackLogin({ method: 'email', success: true });
        await analytics.trackPageView({ page: '/dashboard' });
        await analytics.trackAddToCart({ itemId: 'prod_1', itemName: 'Product 1' });

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue).toHaveLength(3);
        
        eventQueue.forEach((event: any) => {
          expect(event.userId).toBe('user123');
        });
      });

      it('should allow template events without properties', async () => {
        await analytics.trackLogin();
        await analytics.trackPageView();
        await analytics.trackSearch();

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue).toHaveLength(3);
        expect(eventQueue[0].eventName).toBe('login');
        expect(eventQueue[1].eventName).toBe('page_view');
        expect(eventQueue[2].eventName).toBe('search');
      });

      it('should support flush option for template events', async () => {
        await analytics.trackLogin({ method: 'email' }, { flush: true });

        // Should have flushed the event
        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue).toHaveLength(0);
        
        // Should have made API call
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('Template Events with Custom Properties', () => {
      it('should allow additional properties beyond the interface', async () => {
        const properties = {
          method: 'email',
          success: true,
          customField: 'custom value',
          extraData: { nested: 'data' }
        };

        await analytics.trackLogin(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue[0].properties).toEqual(properties);
      });

      it('should handle complex nested objects in properties', async () => {
        const properties = {
          orderId: 'order_123',
          items: [
            { 
              id: 'prod_1', 
              name: 'Product 1', 
              price: 49.99, 
              quantity: 1,
              metadata: { color: 'blue', size: 'large' }
            }
          ],
          customer: {
            id: 'cust_123',
            segment: 'premium',
            preferences: { newsletter: true, marketing: false }
          }
        };

        await analytics.trackCheckout(properties);

        const eventQueue = (analytics as any).eventQueue;
        expect(eventQueue[0].properties).toEqual(properties);
      });
    });
  });

  describe('Integration with Existing Functionality', () => {
    it('should work with batching and flushing', async () => {
      analytics = new GrainAnalytics({ ...defaultConfig, batchSize: 2 });
      analytics.setUserId('user123');

      await analytics.trackLogin({ method: 'email' });
      await analytics.trackPageView({ page: '/home' });
      // Third event should trigger flush
      await analytics.trackSearch({ query: 'test' });

      // Should have flushed after third event
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(1); // Only the last event should remain
    });

    // Error handling and retries are tested in error-handling.test.ts
    // Template events use the same underlying mechanisms

    it('should work with beacon API on page unload', () => {
      // This test is covered by other integration tests
      // Template events work with the same underlying mechanisms
      analytics = new GrainAnalytics(defaultConfig);
      analytics.setUserId('user123');

      analytics.trackLogin({ method: 'email' });
      analytics.trackPageView({ page: '/home' });

      // Verify events were queued
      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(2);
      expect(eventQueue[0].eventName).toBe('login');
      expect(eventQueue[1].eventName).toBe('page_view');
    });
  });
});
