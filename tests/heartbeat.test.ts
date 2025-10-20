/**
 * Tests for Heartbeat Manager
 */

import { HeartbeatManager, type HeartbeatTracker } from '../src/heartbeat';
import { ActivityDetector } from '../src/activity';

describe('HeartbeatManager', () => {
  let mockTracker: HeartbeatTracker;
  let activityDetector: ActivityDetector;
  let heartbeatManager: HeartbeatManager;

  beforeEach(() => {
    jest.useFakeTimers();
    mockTracker = {
      trackSystemEvent: jest.fn(),
      hasConsent: jest.fn().mockReturnValue(false),
      getEffectiveUserId: jest.fn().mockReturnValue('user-123'),
      getEphemeralSessionId: jest.fn().mockReturnValue('session-456'),
      getCurrentPage: jest.fn().mockReturnValue('/test-page'),
      getEventCountSinceLastHeartbeat: jest.fn().mockReturnValue(10),
      resetEventCountSinceLastHeartbeat: jest.fn(),
    };

    activityDetector = new ActivityDetector();
  });

  afterEach(() => {
    if (heartbeatManager) {
      heartbeatManager.destroy();
    }
    activityDetector.destroy();
    jest.useRealTimers();
  });

  it('should initialize and schedule heartbeat', () => {
    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 120000,
      inactiveInterval: 300000,
      debug: false,
    });

    expect(heartbeatManager).toBeDefined();
  });

  it('should send heartbeat at active interval when user is active', () => {
    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    // User is active by default
    jest.advanceTimersByTime(1100);

    expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
      '_grain_heartbeat',
      expect.objectContaining({
        type: 'heartbeat',
        status: 'active',
      })
    );
  });

  it('should include minimal properties when no consent', () => {
    (mockTracker.hasConsent as jest.Mock).mockReturnValue(false);

    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    jest.advanceTimersByTime(1100);

    expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
      '_grain_heartbeat',
      expect.objectContaining({
        type: 'heartbeat',
        status: expect.any(String),
        timestamp: expect.any(Number),
      })
    );

    // Should NOT include page, duration, event_count
    const call = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
    expect(call.page).toBeUndefined();
    expect(call.duration).toBeUndefined();
    expect(call.event_count).toBeUndefined();
  });

  it('should include enhanced properties when consent is granted', () => {
    (mockTracker.hasConsent as jest.Mock).mockReturnValue(true);

    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    jest.advanceTimersByTime(1100);

    expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
      '_grain_heartbeat',
      expect.objectContaining({
        type: 'heartbeat',
        status: expect.any(String),
        timestamp: expect.any(Number),
        page: '/test-page',
        duration: expect.any(Number),
        event_count: 10,
      })
    );
  });

  it('should reset event count after sending heartbeat with consent', () => {
    (mockTracker.hasConsent as jest.Mock).mockReturnValue(true);

    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    jest.advanceTimersByTime(1100);

    expect(mockTracker.resetEventCountSinceLastHeartbeat).toHaveBeenCalled();
  });

  it('should not reset event count when no consent', () => {
    (mockTracker.hasConsent as jest.Mock).mockReturnValue(false);

    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    jest.advanceTimersByTime(1100);

    expect(mockTracker.resetEventCountSinceLastHeartbeat).not.toHaveBeenCalled();
  });

  it('should continue sending heartbeats at intervals', () => {
    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    jest.advanceTimersByTime(1100);
    expect(mockTracker.trackSystemEvent).toHaveBeenCalledTimes(2); // page load + periodic

    jest.advanceTimersByTime(1000);
    expect(mockTracker.trackSystemEvent).toHaveBeenCalledTimes(3);

    jest.advanceTimersByTime(1000);
    expect(mockTracker.trackSystemEvent).toHaveBeenCalledTimes(4);
  });

  it('should stop sending heartbeats after destroy', () => {
    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    jest.advanceTimersByTime(1100);
    expect(mockTracker.trackSystemEvent).toHaveBeenCalledTimes(2); // page load + periodic

    heartbeatManager.destroy();

    jest.advanceTimersByTime(5000);
    expect(mockTracker.trackSystemEvent).toHaveBeenCalledTimes(2); // no more calls after destroy
  });

  it('should handle page being null', () => {
    (mockTracker.hasConsent as jest.Mock).mockReturnValue(true);
    (mockTracker.getCurrentPage as jest.Mock).mockReturnValue(null);

    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    jest.advanceTimersByTime(1100);

    const call = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
    expect(call.page).toBeUndefined();
  });

  it('should calculate duration between heartbeats', () => {
    (mockTracker.hasConsent as jest.Mock).mockReturnValue(true);

    heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
      activeInterval: 1000,
      inactiveInterval: 5000,
      debug: false,
    });

    jest.advanceTimersByTime(1100);
    const firstCall = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];

    jest.advanceTimersByTime(1000);
    const secondCall = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[1][1];

    expect(secondCall.duration).toBeGreaterThanOrEqual(1000);
  });

  describe('Page Load Heartbeat', () => {
    let originalDocument: Document;
    let originalWindow: Window;
    let mockDocument: any;
    let mockWindow: any;

    beforeEach(() => {
      // Mock document and window
      originalDocument = global.document;
      originalWindow = global.window;
      
      mockDocument = {
        get readyState() { return this._readyState; },
        set readyState(value) { this._readyState = value; },
        _readyState: 'loading',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      
      mockWindow = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      
      // Set up the global mocks
      (global as any).document = mockDocument;
      (global as any).window = mockWindow;
    });

    afterEach(() => {
      (global as any).document = originalDocument;
      (global as any).window = originalWindow;
    });

    it('should send page load heartbeat when document is already complete', () => {
      mockDocument._readyState = 'complete';

      heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
        activeInterval: 1000,
        inactiveInterval: 5000,
        debug: false,
      });

      // Should send page load heartbeat immediately
      expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
        '_grain_heartbeat',
        expect.objectContaining({
          type: 'heartbeat',
          heartbeat_type: 'page_load',
          status: 'active',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should send page load heartbeat immediately when document is complete', () => {
      // Reset the mock tracker to clear any previous calls
      (mockTracker.trackSystemEvent as jest.Mock).mockClear();

      // Create a new HeartbeatManager instance
      heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
        activeInterval: 1000,
        inactiveInterval: 5000,
        debug: false,
      });

      // In the test environment, document is already complete, so page load heartbeat is sent immediately
      expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
        '_grain_heartbeat',
        expect.objectContaining({
          type: 'heartbeat',
          heartbeat_type: 'page_load',
          status: 'active',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should not include duration and event_count in page load heartbeat', () => {
      (mockTracker.hasConsent as jest.Mock).mockReturnValue(true);
      mockDocument._readyState = 'complete';

      heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
        activeInterval: 1000,
        inactiveInterval: 5000,
        debug: false,
      });

      const call = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
      expect(call.heartbeat_type).toBe('page_load');
      expect(call.duration).toBeUndefined();
      expect(call.event_count).toBeUndefined();
      expect(call.page).toBe('/test-page'); // Should still include page with consent
    });

    it('should only send page load heartbeat once', () => {
      mockDocument._readyState = 'complete';

      heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
        activeInterval: 1000,
        inactiveInterval: 5000,
        debug: false,
      });

      // Should send page load heartbeat immediately
      expect(mockTracker.trackSystemEvent).toHaveBeenCalledTimes(1);
      
      // Advance time to trigger periodic heartbeat
      jest.advanceTimersByTime(1100);
      
      // Should have sent periodic heartbeat (total of 2 calls)
      expect(mockTracker.trackSystemEvent).toHaveBeenCalledTimes(2);
      
      const firstCall = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
      const secondCall = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[1][1];
      
      expect(firstCall.heartbeat_type).toBe('page_load');
      expect(secondCall.heartbeat_type).toBe('periodic');
    });

    it('should handle non-browser environment gracefully', () => {
      // Remove window and document
      delete (global as any).window;
      delete (global as any).document;

      heartbeatManager = new HeartbeatManager(mockTracker, activityDetector, {
        activeInterval: 1000,
        inactiveInterval: 5000,
        debug: false,
      });

      // Should send page load heartbeat immediately in non-browser environment
      expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
        '_grain_heartbeat',
        expect.objectContaining({
          type: 'heartbeat',
          heartbeat_type: 'page_load',
          status: 'active',
          timestamp: expect.any(Number),
        })
      );
    });
  });
});
