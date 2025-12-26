/**
 * Activity Detection Tests
 * Tests user activity tracking
 */

import { ActivityDetector } from '../src/activity';

describe('Activity Detection', () => {
  let detector: ActivityDetector;

  beforeEach(() => {
    detector = new ActivityDetector();
  });

  afterEach(() => {
    detector.destroy();
  });

  test('should initialize activity detector', () => {
    expect(detector).toBeDefined();
    expect(detector.isActive).toBeDefined();
  });

  test('should report active on initialization', () => {
    const isActive = detector.isActive(1000);
    expect(isActive).toBe(true);
  });

  test('should get last activity time', () => {
    const time = detector.getLastActivityTime();
    expect(typeof time).toBe('number');
    expect(time).toBeGreaterThan(0);
  });

  test('should set activity threshold', () => {
    detector.setActivityThreshold(5000);
    // No error thrown means success
    expect(true).toBe(true);
  });
});

