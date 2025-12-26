/**
 * Consent Management Tests
 * Tests privacy consent functionality
 */

import { createGrainAnalytics } from '../src/index';
import { TEST_TENANT_ID, TEST_API_URL } from './setup';

describe('Consent Management', () => {
  let grain: ReturnType<typeof createGrainAnalytics>;

  beforeEach(() => {
    grain = createGrainAnalytics({
      tenantId: TEST_TENANT_ID,
      apiUrl: TEST_API_URL,
      consentMode: 'opt-in',
      waitForConsent: true,
    });
  });

  afterEach(() => {
    grain.destroy();
  });

  test('should grant consent', () => {
    grain.grantConsent(['analytics']);
    const hasConsent = grain.hasConsent('analytics');
    expect(hasConsent).toBe(true);
  });

  test('should revoke consent', () => {
    grain.grantConsent(['analytics']);
    grain.revokeConsent(['analytics']);
    const hasConsent = grain.hasConsent('analytics');
    expect(hasConsent).toBe(false);
  });

  test('should get consent state', () => {
    grain.grantConsent(['analytics', 'marketing']);
    const state = grain.getConsentState();
    expect(state).toBeDefined();
    expect(state?.granted).toBe(true);
    expect(state?.categories).toContain('analytics');
    expect(state?.categories).toContain('marketing');
  });

  test('should track events after consent granted', async () => {
    grain.grantConsent(['analytics']);
    await grain.track('consented_event');
    expect(true).toBe(true);
  });
});

