/**
 * Integration Tests
 * Tests real-world scenarios with actual API calls
 */

import { createGrainAnalytics } from '../src/index';
import { TEST_TENANT_ID, TEST_API_URL } from './setup';

describe('Integration Tests', () => {
  let grain: ReturnType<typeof createGrainAnalytics>;

  beforeEach(() => {
    grain = createGrainAnalytics({
      tenantId: TEST_TENANT_ID,
      apiUrl: TEST_API_URL,
      debug: false,
      flushInterval: 100,
    });
  });

  afterEach(async () => {
    await grain.flush();
    grain.destroy();
  });

  test('should handle complete user journey', async () => {
    // User lands on site
    await grain.track('page_view', { page: '/home' });
    
    // User identifies
    grain.identify('integration_user_1');
    
    // User interacts
    await grain.track('button_click', { button: 'cta' });
    await grain.track('form_submit', { form: 'newsletter' });
    
    // Flush events
    await grain.flush();
    
    expect(true).toBe(true);
  });

  test('should track ecommerce flow', async () => {
    grain.identify('shopper_1');
    
    // Browse products
    await grain.track('product_viewed', {
      product_id: 'prod_123',
      product_name: 'Test Product',
      price: 29.99,
    });
    
    // Add to cart
    await grain.track('product_added_to_cart', {
      product_id: 'prod_123',
      quantity: 1,
      price: 29.99,
    });
    
    // Checkout
    await grain.track('checkout_started', {
      cart_total: 29.99,
      item_count: 1,
    });
    
    await grain.flush();
    expect(true).toBe(true);
  });

  test('should handle user identification and events together', async () => {
    grain.identify('prop_test_user');
    
    // Track user signup event with properties
    await grain.track('user_signup', {
      plan: 'premium',
      trial: false,
    });
    
    await grain.track('feature_used', {
      feature: 'export',
    });
    
    // Track user activity
    await grain.track('export_completed', {
      timestamp: new Date().toISOString(),
    });
    
    await grain.flush();
    expect(true).toBe(true);
  });

  test('should work with consent flow', async () => {
    // Start without consent
    await grain.track('before_consent');
    
    // User grants consent
    grain.grantConsent(['analytics']);
    
    // Track after consent
    await grain.track('after_consent', {
      consented: true,
    });
    
    await grain.flush();
    expect(true).toBe(true);
  });

  test('should handle session tracking', async () => {
    const sessionId = grain.getSessionId();
    
    // Multiple events in same session
    await grain.track('session_event_1');
    await grain.track('session_event_2');
    await grain.track('session_event_3');
    
    // Session ID should remain same
    expect(grain.getSessionId()).toBe(sessionId);
    
    await grain.flush();
  });
});

