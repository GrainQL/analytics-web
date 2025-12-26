/**
 * Attention Quality Tests
 * Tests attention quality management policies
 */

import { AttentionQualityManager } from '../src/attention-quality';
import { ActivityDetector } from '../src/activity';

describe('Attention Quality Management', () => {
  let detector: ActivityDetector;
  let manager: AttentionQualityManager;

  beforeEach(() => {
    detector = new ActivityDetector();
    manager = new AttentionQualityManager(detector, {
      maxSectionDuration: 9000,
      minScrollDistance: 100,
      idleThreshold: 30000,
      debug: false,
    });
  });

  afterEach(() => {
    manager.destroy();
    detector.destroy();
  });

  test('should initialize attention quality manager', () => {
    expect(manager).toBeDefined();
    expect(manager.shouldTrack).toBeDefined();
  });

  test('should allow tracking when page is visible and user is active', () => {
    const result = manager.shouldTrack();
    expect(result).toBe(true);
  });

  test('should check section tracking eligibility', () => {
    const result = manager.shouldTrackSection('test_section', 100);
    expect(result.shouldTrack).toBe(true);
  });

  test('should get active policies', () => {
    const policies = manager.getPolicies();
    expect(policies.maxSectionDuration).toBe(9000);
    expect(policies.minScrollDistance).toBe(100);
    expect(policies.idleThreshold).toBe(30000);
  });

  test('should get tracking state', () => {
    const state = manager.getTrackingState();
    expect(state.isPageVisible).toBe(true);
    expect(state.isUserActive).toBe(true);
    expect(typeof state.timeSinceLastActivity).toBe('number');
  });

  test('should handle large scroll distances', () => {
    const result = manager.shouldTrackSection('test', 0);
    
    // Large scroll should reset attention
    const result2 = manager.shouldTrackSection('test', 200);
    expect(result2.resetAttention).toBe(true);
  });
});

