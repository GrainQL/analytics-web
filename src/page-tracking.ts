/**
 * Page Tracking for Grain Analytics
 * Automatically tracks page views with consent-aware behavior
 */

export interface PageTrackingConfig {
  stripQueryParams: boolean;
  debug?: boolean;
}

export interface PageTracker {
  trackSystemEvent(eventName: string, properties: Record<string, unknown>): void;
  hasConsent(category?: string): boolean;
  getEffectiveUserId(): string;
  getEphemeralSessionId(): string;
}

export class PageTrackingManager {
  private config: PageTrackingConfig;
  private tracker: PageTracker;
  private isDestroyed = false;
  private currentPath: string | null = null;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;

  constructor(tracker: PageTracker, config: PageTrackingConfig) {
    this.tracker = tracker;
    this.config = config;
    
    // Track initial page load
    this.trackCurrentPage();
    
    // Setup listeners
    this.setupHistoryListeners();
    this.setupHashChangeListener();
  }

  /**
   * Setup History API listeners (pushState, replaceState, popstate)
   */
  private setupHistoryListeners(): void {
    if (typeof window === 'undefined' || typeof history === 'undefined') return;

    // Wrap pushState
    this.originalPushState = history.pushState;
    history.pushState = (state: any, title: string, url?: string | URL | null) => {
      this.originalPushState?.call(history, state, title, url);
      this.trackCurrentPage();
    };

    // Wrap replaceState
    this.originalReplaceState = history.replaceState;
    history.replaceState = (state: any, title: string, url?: string | URL | null) => {
      this.originalReplaceState?.call(history, state, title, url);
      this.trackCurrentPage();
    };

    // Listen to popstate (back/forward buttons)
    window.addEventListener('popstate', this.handlePopState);
  }

  /**
   * Setup hash change listener
   */
  private setupHashChangeListener(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('hashchange', this.handleHashChange);
  }

  /**
   * Handle popstate event (back/forward navigation)
   */
  private handlePopState = (): void => {
    if (this.isDestroyed) return;
    this.trackCurrentPage();
  };

  /**
   * Handle hash change event
   */
  private handleHashChange = (): void => {
    if (this.isDestroyed) return;
    this.trackCurrentPage();
  };

  /**
   * Track the current page
   */
  private trackCurrentPage(): void {
    if (this.isDestroyed || typeof window === 'undefined') return;

    const page = this.extractPath(window.location.href);
    
    // Don't track if it's the same page
    if (page === this.currentPath) {
      return;
    }

    this.currentPath = page;

    const hasConsent = this.tracker.hasConsent('analytics');

    // Base properties (always included)
    const properties: Record<string, unknown> = {
      page,
      timestamp: Date.now(),
    };

    // Enhanced properties when consent is granted
    if (hasConsent) {
      properties.referrer = document.referrer || '';
      properties.title = document.title || '';
      properties.full_url = window.location.href;
    }

    // Track the page view event
    this.tracker.trackSystemEvent('page_view', properties);

    if (this.config.debug) {
      console.log('[Page Tracking] Tracked page view:', properties);
    }
  }

  /**
   * Extract path from URL, optionally stripping query parameters
   */
  private extractPath(url: string): string {
    try {
      const urlObj = new URL(url);
      let path = urlObj.pathname + urlObj.hash;
      
      if (!this.config.stripQueryParams && urlObj.search) {
        path += urlObj.search;
      }
      
      return path;
    } catch (error) {
      // If URL parsing fails, return the raw string
      if (this.config.debug) {
        console.warn('[Page Tracking] Failed to parse URL:', url, error);
      }
      return url;
    }
  }

  /**
   * Get the current page path
   */
  getCurrentPage(): string | null {
    return this.currentPath;
  }

  /**
   * Manually track a page view (for custom navigation)
   */
  trackPage(page: string, properties?: Record<string, unknown>): void {
    if (this.isDestroyed) return;

    const hasConsent = this.tracker.hasConsent('analytics');

    // Base properties
    const baseProperties: Record<string, unknown> = {
      page,
      timestamp: Date.now(),
      ...properties,
    };

    // Enhanced properties when consent is granted
    if (hasConsent && typeof document !== 'undefined') {
      if (!baseProperties.referrer) {
        baseProperties.referrer = document.referrer || '';
      }
      if (!baseProperties.title) {
        baseProperties.title = document.title || '';
      }
      if (!baseProperties.full_url && typeof window !== 'undefined') {
        baseProperties.full_url = window.location.href;
      }
    }

    this.tracker.trackSystemEvent('page_view', baseProperties);

    if (this.config.debug) {
      console.log('[Page Tracking] Manually tracked page:', baseProperties);
    }
  }

  /**
   * Destroy the page tracker
   */
  destroy(): void {
    if (this.isDestroyed) return;

    // Restore original history methods
    if (typeof history !== 'undefined') {
      if (this.originalPushState) {
        history.pushState = this.originalPushState;
      }
      if (this.originalReplaceState) {
        history.replaceState = this.originalReplaceState;
      }
    }

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.handlePopState);
      window.removeEventListener('hashchange', this.handleHashChange);
    }

    this.isDestroyed = true;

    if (this.config.debug) {
      console.log('[Page Tracking] Destroyed');
    }
  }
}

