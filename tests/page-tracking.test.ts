/**
 * Tests for Page Tracking
 */

import { PageTrackingManager, type PageTracker } from '../src/page-tracking';

describe('PageTrackingManager', () => {
  let mockTracker: PageTracker;
  let pageTrackingManager: PageTrackingManager;
  let originalLocation: Location;
  let originalHistory: History;

  beforeEach(() => {
    // Save originals
    originalLocation = window.location;
    originalHistory = window.history;

    mockTracker = {
      trackSystemEvent: jest.fn(),
      hasConsent: jest.fn().mockReturnValue(false),
      getEffectiveUserId: jest.fn().mockReturnValue('user-123'),
      getEphemeralSessionId: jest.fn().mockReturnValue('session-456'),
    };

    // Setup mock location
    delete (window as any).location;
    (window as any).location = {
      href: 'https://example.com/test-page?query=1',
      pathname: '/test-page',
      search: '?query=1',
      hash: '',
    };

    // Setup mock document
    Object.defineProperty(document, 'title', {
      writable: true,
      configurable: true,
      value: 'Test Page',
    });
    Object.defineProperty(document, 'referrer', {
      writable: true,
      configurable: true,
      value: 'https://google.com',
    });
  });

  afterEach(() => {
    if (pageTrackingManager) {
      pageTrackingManager.destroy();
    }
    // Restore originals
    (window as any).location = originalLocation;
    (window as any).history = originalHistory;
  });

  it('should track initial page load', () => {
    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
      'page_view',
      expect.objectContaining({
        page: '/test-page',
        timestamp: expect.any(Number),
      })
    );
  });

  it('should strip query params when enabled', () => {
    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    const call = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
    expect(call.page).toBe('/test-page');
    expect(call.page).not.toContain('?query=1');
  });

  it('should include query params when stripQueryParams is false', () => {
    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: false,
      debug: false,
    });

    const call = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
    expect(call.page).toContain('?query=1');
  });

  it('should include minimal properties when no consent', () => {
    (mockTracker.hasConsent as jest.Mock).mockReturnValue(false);

    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    const call = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
    expect(call.page).toBeDefined();
    expect(call.timestamp).toBeDefined();
    expect(call.referrer).toBeUndefined();
    expect(call.title).toBeUndefined();
    expect(call.full_url).toBeUndefined();
  });

  it('should include enhanced properties when consent is granted', () => {
    (mockTracker.hasConsent as jest.Mock).mockReturnValue(true);

    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    const call = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
    expect(call.page).toBe('/test-page');
    expect(call.timestamp).toBeDefined();
    expect(call.referrer).toBe('https://google.com');
    expect(call.title).toBe('Test Page');
    expect(call.full_url).toBe('https://example.com/test-page?query=1');
  });

  it('should track pushState navigation', () => {
    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    (mockTracker.trackSystemEvent as jest.Mock).mockClear();

    // Simulate pushState
    (window as any).location = {
      href: 'https://example.com/new-page',
      pathname: '/new-page',
      search: '',
      hash: '',
    };

    history.pushState({}, '', '/new-page');

    expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
      'page_view',
      expect.objectContaining({
        page: '/new-page',
      })
    );
  });

  it('should not track same page multiple times', () => {
    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    // Initial page load tracked
    expect(mockTracker.trackSystemEvent).toHaveBeenCalledTimes(1);

    (mockTracker.trackSystemEvent as jest.Mock).mockClear();

    // Navigate to same page
    history.pushState({}, '', '/test-page');

    // Should not track again
    expect(mockTracker.trackSystemEvent).not.toHaveBeenCalled();
  });

  it('should return current page path', () => {
    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    const currentPage = pageTrackingManager.getCurrentPage();
    expect(currentPage).toBe('/test-page');
  });

  it('should support manual page tracking', () => {
    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    (mockTracker.trackSystemEvent as jest.Mock).mockClear();

    pageTrackingManager.trackPage('/manual-page', { custom_prop: 'value' });

    expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
      'page_view',
      expect.objectContaining({
        page: '/manual-page',
        custom_prop: 'value',
      })
    );
  });

  it('should include hash in page path', () => {
    (window as any).location = {
      href: 'https://example.com/page#hash',
      pathname: '/page',
      search: '',
      hash: '#hash',
    };

    pageTrackingManager = new PageTrackingManager(mockTracker, {
      stripQueryParams: true,
      debug: false,
    });

    const call = (mockTracker.trackSystemEvent as jest.Mock).mock.calls[0][1];
    expect(call.page).toBe('/page#hash');
  });
});
