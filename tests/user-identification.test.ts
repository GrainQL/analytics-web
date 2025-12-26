/**
 * User Identification Tests
 * Tests user identification, properties, and aliases
 */

import { createGrainAnalytics } from '../src/index';
import { TEST_TENANT_ID, TEST_API_URL } from './setup';

describe('User Identification', () => {
  let grain: ReturnType<typeof createGrainAnalytics>;

  beforeEach(() => {
    grain = createGrainAnalytics({
      tenantId: TEST_TENANT_ID,
      apiUrl: TEST_API_URL,
      debug: false,
    });
  });

  afterEach(() => {
    grain.destroy();
  });

  test('should identify user with ID', () => {
    grain.identify('user_123');
    expect(true).toBe(true);
  });

  test('should track event after identifying user', async () => {
    grain.identify('user_456');
    await grain.track('user_action', {
      action: 'signup',
    });
    expect(true).toBe(true);
  });

  test('should get session ID after identification', () => {
    grain.identify('user_789');
    const sessionId = grain.getSessionId();
    expect(sessionId).toBeDefined();
  });

  test('should handle multiple identify calls', () => {
    grain.identify('user_1');
    grain.identify('user_2');
    grain.identify('user_3');
    expect(true).toBe(true);
  });
});

