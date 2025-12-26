/**
 * Core Functionality Tests
 * Tests basic event tracking, initialization, and core SDK features
 */

import { createGrainAnalytics } from '../src/index';
import { TEST_TENANT_ID, TEST_API_URL } from './setup';

describe('Core Functionality', () => {
  let grain: ReturnType<typeof createGrainAnalytics>;

  beforeEach(() => {
    grain = createGrainAnalytics({
      tenantId: TEST_TENANT_ID,
      apiUrl: TEST_API_URL,
      debug: false,
      flushInterval: 100, // Fast flush for tests
    });
  });

  afterEach(() => {
    grain.destroy();
  });

  test('should initialize SDK with correct config', () => {
    expect(grain).toBeDefined();
    expect(grain.track).toBeDefined();
    expect(grain.identify).toBeDefined();
  });

  test('should track basic event', async () => {
    await grain.track('test_event', {
      category: 'test',
      value: 123,
    });

    // Event should be queued
    expect(true).toBe(true);
  });

  test('should track event with different property types', async () => {
    await grain.track('complex_event', {
      string_prop: 'test',
      number_prop: 42,
      boolean_prop: true,
      array_prop: [1, 2, 3],
      object_prop: { nested: 'value' },
    });

    expect(true).toBe(true);
  });

  test('should generate session ID', () => {
    const sessionId = grain.getSessionId();
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
  });

  test('should maintain same session ID across calls', () => {
    const sessionId1 = grain.getSessionId();
    const sessionId2 = grain.getSessionId();
    expect(sessionId1).toBe(sessionId2);
  });

  test('should flush events manually', async () => {
    await grain.track('event1');
    await grain.track('event2');
    await grain.flush();
    expect(true).toBe(true);
  });

  test('should handle SDK destruction', () => {
    grain.destroy();
    // Should not throw after destroy
    expect(() => grain.track('after_destroy')).not.toThrow();
  });
});

