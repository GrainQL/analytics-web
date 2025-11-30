import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GrainAnalytics, GrainConfig } from '../src/index';
import { setSessionUTMParameters, setFirstTouchAttribution } from '../src/attribution';

describe('GrainAnalytics - UTM Parameter Enrichment', () => {
  let analytics: GrainAnalytics;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const defaultConfig: GrainConfig = {
    tenantId: 'test-tenant',
    apiUrl: 'https://test-api.com',
    debug: false,
    consentMode: 'opt-out', // User has consent by default
  };

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    // Mock successful API response
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
  });

  describe('Automatic UTM Enrichment', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
      
      // Grant consent so properties are enriched
      analytics.grantConsent('analytics');
    });

    it('should enrich custom events with session UTM parameters', async () => {
      // Set session UTM parameters (simulating page load with UTMs)
      setSessionUTMParameters({
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'spring_sale',
        utm_term: 'analytics',
        utm_content: 'banner',
      });

      // Track a custom event without explicit UTM parameters
      await analytics.track('signup', { plan: 'pro' });

      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(1);
      
      const event = eventQueue[0];
      expect(event.properties).toMatchObject({
        plan: 'pro',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'spring_sale',
        utm_term: 'analytics',
        utm_content: 'banner',
      });
    });

    it('should enrich custom events with first-touch attribution', async () => {
      // Set first-touch attribution (simulating first visit)
      setFirstTouchAttribution('test-tenant', {
        source: 'facebook',
        medium: 'social',
        campaign: 'launch',
        referrer: 'https://facebook.com',
        referrer_category: 'social',
        timestamp: Date.now(),
      });

      // Track a custom event
      await analytics.track('purchase', { amount: 99.99 });

      const eventQueue = (analytics as any).eventQueue;
      const event = eventQueue[0];
      
      expect(event.properties).toMatchObject({
        amount: 99.99,
        first_touch_source: 'facebook',
        first_touch_medium: 'social',
        first_touch_campaign: 'launch',
        first_touch_referrer_category: 'social',
      });
    });

    it('should add session_id to custom events', async () => {
      await analytics.track('button_click', { button_id: 'cta' });

      const eventQueue = (analytics as any).eventQueue;
      const event = eventQueue[0];
      
      expect(event.properties).toHaveProperty('session_id');
      expect(event.properties.session_id).toBeTruthy();
    });

    it('should not override user-provided properties', async () => {
      setSessionUTMParameters({
        utm_source: 'google',
        utm_campaign: 'default',
      });

      // User explicitly provides utm_source in their event
      await analytics.track('custom_event', {
        utm_source: 'custom_source',
        other_prop: 'value',
      });

      const eventQueue = (analytics as any).eventQueue;
      const event = eventQueue[0];
      
      // User-provided utm_source should be preserved
      // (Our enrichment adds them BEFORE, so user props override)
      expect(event.properties.utm_source).toBe('custom_source');
    });

    it('should not enrich system events', async () => {
      setSessionUTMParameters({
        utm_source: 'google',
        utm_campaign: 'test',
      });

      // System events (starting with _grain_) should handle their own properties
      await analytics.track('_grain_custom_system_event', { data: 'test' });

      const eventQueue = (analytics as any).eventQueue;
      const event = eventQueue[0];
      
      // System events should not get auto-enriched
      expect(event.properties).toEqual({ data: 'test' });
    });

    it('should not enrich events when disableAutoProperties is true', async () => {
      const configNoAuto = {
        ...defaultConfig,
        disableAutoProperties: true,
      };
      analytics.destroy();
      analytics = new GrainAnalytics(configNoAuto);
      analytics.grantConsent('analytics');

      setSessionUTMParameters({
        utm_source: 'google',
        utm_campaign: 'test',
      });

      await analytics.track('test_event', { prop: 'value' });

      const eventQueue = (analytics as any).eventQueue;
      const event = eventQueue[0];
      
      // Should not have UTM parameters when auto-properties disabled
      expect(event.properties).toEqual({ prop: 'value' });
    });

    it('should not enrich events without consent', async () => {
      const configOptIn = {
        ...defaultConfig,
        consentMode: 'opt-in' as const,
      };
      analytics.destroy();
      analytics = new GrainAnalytics(configOptIn);
      // Don't grant consent

      setSessionUTMParameters({
        utm_source: 'google',
        utm_campaign: 'test',
      });

      await analytics.track('test_event', { prop: 'value' });

      // Event should be blocked entirely without consent
      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(0);
    });

    it('should handle partial UTM parameters', async () => {
      // Only some UTM parameters provided
      setSessionUTMParameters({
        utm_source: 'newsletter',
        utm_campaign: 'weekly',
        // No medium, term, or content
      });

      await analytics.track('email_click', {});

      const eventQueue = (analytics as any).eventQueue;
      const event = eventQueue[0];
      
      // Should only include the UTM parameters that exist
      expect(event.properties.utm_source).toBe('newsletter');
      expect(event.properties.utm_campaign).toBe('weekly');
      expect(event.properties.utm_medium).toBeUndefined();
      expect(event.properties.utm_term).toBeUndefined();
      expect(event.properties.utm_content).toBeUndefined();
    });

    it('should enrich multiple events with the same attribution data', async () => {
      setSessionUTMParameters({
        utm_source: 'google',
        utm_campaign: 'summer',
      });

      await analytics.track('page_view', { page: '/landing' });
      await analytics.track('signup', { plan: 'free' });
      await analytics.track('purchase', { amount: 50 });

      const eventQueue = (analytics as any).eventQueue;
      expect(eventQueue).toHaveLength(3);
      
      // All events should have the same UTM parameters
      eventQueue.forEach((event: any) => {
        expect(event.properties.utm_source).toBe('google');
        expect(event.properties.utm_campaign).toBe('summer');
      });
    });
  });

  describe('Integration with Matrix Analysis', () => {
    it('should ensure conversion events have attribution data for matrix analysis', async () => {
      analytics = new GrainAnalytics(defaultConfig);
      analytics.grantConsent('analytics');

      // Simulate user arriving from ad campaign
      setSessionUTMParameters({
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'q4_promo',
      });

      setFirstTouchAttribution('test-tenant', {
        source: 'facebook',
        medium: 'cpc',
        campaign: 'q4_promo',
        referrer: 'https://facebook.com/ads',
        referrer_category: 'paid',
        timestamp: Date.now(),
      });

      // Track conversion event
      await analytics.track('purchase', {
        amount: 99.99,
        currency: 'USD',
        product_id: 'PROD-123',
      });

      const eventQueue = (analytics as any).eventQueue;
      const event = eventQueue[0];
      
      // This event should have all the data needed for matrix analysis by utm_source/campaign
      expect(event.properties).toMatchObject({
        amount: 99.99,
        currency: 'USD',
        product_id: 'PROD-123',
        // Session-level UTM parameters
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'q4_promo',
        // First-touch attribution
        first_touch_source: 'facebook',
        first_touch_medium: 'cpc',
        first_touch_campaign: 'q4_promo',
        first_touch_referrer_category: 'paid',
        // Session ID for analysis
        session_id: expect.any(String),
      });
    });
  });
});

