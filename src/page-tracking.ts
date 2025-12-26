/**
 * Page Tracking for Grain Analytics
 * Automatically tracks page views with consent-aware behavior
 */

import {
  categorizeReferrer,
  parseUTMParameters,
  getOrCreateFirstTouchAttribution,
  getSessionUTMParameters,
  setSessionUTMParameters,
  type UTMParameters,
  type FirstTouchAttribution,
} from './attribution';
import { getCountryCodeFromTimezone } from './countries';

export interface PageTrackingConfig {
  stripQueryParams: boolean;
  debug?: boolean;
  tenantId: string;
}

export interface PageTracker {
  trackSystemEvent(eventName: string, properties: Record<string, unknown>): void;
  hasConsent(category?: string): boolean;
  getEffectiveUserId(): string;
  getEphemeralSessionId(): string;
  getSessionId(): string;
}

export class PageTrackingManager {
  private config: PageTrackingConfig;
  private tracker: PageTracker;
  private isDestroyed = false;
  private currentPath: string | null = null;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;
  private previousPage: string | null = null;
  private landingPage: string | null = null;
  private pageViewCount = 0;

  constructor(tracker: PageTracker, config: PageTrackingConfig) {
    this.tracker = tracker;
    this.config = config;
    
    // Track initial page load (this is the landing page)
    this.trackCurrentPage(true);
    
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
  private trackCurrentPage(isLanding: boolean = false): void {
    if (this.isDestroyed || typeof window === 'undefined') return;

    const page = this.extractPath(window.location.href);
    
    // Don't track if it's the same page (unless it's the landing page)
    if (!isLanding && page === this.currentPath) {
      return;
    }

    // Store previous page before updating
    if (this.currentPath) {
      this.previousPage = this.currentPath;
    }

    this.currentPath = page;
    this.pageViewCount++;

    // Set landing page on first view
    if (isLanding) {
      this.landingPage = page;
    }

    const hasConsent = this.tracker.hasConsent('analytics');
    const currentUrl = window.location.href;
    const referrer = document.referrer || '';

    // Parse UTM parameters from current URL
    const utmParams = parseUTMParameters(currentUrl);
    
    // Store session UTM if they exist (first time only or if new UTMs appear)
    if (Object.keys(utmParams).length > 0) {
      const existing = getSessionUTMParameters();
      if (!existing || isLanding) {
        setSessionUTMParameters(utmParams);
      }
    }

    // Get or create first-touch attribution
    const sessionUTMs = getSessionUTMParameters() || {};
    const firstTouch = getOrCreateFirstTouchAttribution(
      this.config.tenantId,
      referrer,
      currentUrl,
      sessionUTMs
    );

    // Base properties (always included)
    const properties: Record<string, unknown> = {
      page,
      timestamp: Date.now(),
    };

    // Enhanced properties when consent is granted
    if (hasConsent) {
      properties.title = document.title || '';
      properties.full_url = currentUrl;
      properties.session_id = this.tracker.getSessionId();

      // Add referrer info
      if (referrer) {
        properties.referrer = referrer;
        properties.referrer_domain = this.extractDomain(referrer);
        properties.referrer_category = categorizeReferrer(referrer, currentUrl);
      }

      // Add landing page if this is not the first view
      if (this.landingPage && !isLanding) {
        properties.landing_page = this.landingPage;
      }

      // Add previous page if available
      if (this.previousPage) {
        properties.previous_page = this.previousPage;
      }

      // Add UTM parameters if present (from session)
      if (sessionUTMs.utm_source) properties.utm_source = sessionUTMs.utm_source;
      if (sessionUTMs.utm_medium) properties.utm_medium = sessionUTMs.utm_medium;
      if (sessionUTMs.utm_campaign) properties.utm_campaign = sessionUTMs.utm_campaign;
      if (sessionUTMs.utm_term) properties.utm_term = sessionUTMs.utm_term;
      if (sessionUTMs.utm_content) properties.utm_content = sessionUTMs.utm_content;

      // Add first-touch attribution
      properties.first_touch_source = firstTouch.source;
      properties.first_touch_medium = firstTouch.medium;
      properties.first_touch_campaign = firstTouch.campaign;
      properties.first_touch_referrer_category = firstTouch.referrer_category;

      // Browser and device info
      properties.device = this.getDeviceType();
      properties.browser = this.getBrowser();
      properties.os = this.getOS();
      properties.language = navigator.language || '';
      
      // Timezone and country (privacy-friendly: derived from timezone, no IP tracking)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      properties.timezone = timezone;
      properties.country = getCountryCodeFromTimezone();
      
      properties.screen_resolution = `${screen.width}x${screen.height}`;
      properties.viewport = `${window.innerWidth}x${window.innerHeight}`;
    }

    // Track the page view event
    this.tracker.trackSystemEvent('page_view', properties);
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Detect browser name
   */
  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
    return 'Unknown';
  }

  /**
   * Detect operating system
   */
  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Detect device type (Mobile, Tablet, Desktop)
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    const width = window.innerWidth;
    
    // Check for tablet-specific indicators
    if (ua.includes('iPad') || (ua.includes('Android') && !ua.includes('Mobile'))) {
      return 'Tablet';
    }
    
    // Check for mobile indicators
    if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) {
      return 'Mobile';
    }
    
    // Fallback to screen width detection
    if (width < 768) {
      return 'Mobile';
    } else if (width >= 768 && width < 1024) {
      return 'Tablet';
    }
    
    return 'Desktop';
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
    if (hasConsent && typeof document !== 'undefined' && typeof window !== 'undefined') {
      if (!baseProperties.referrer) {
        baseProperties.referrer = document.referrer || '';
      }
      if (!baseProperties.title) {
        baseProperties.title = document.title || '';
      }
      if (!baseProperties.full_url) {
        baseProperties.full_url = window.location.href;
      }
      if (!baseProperties.session_id) {
        baseProperties.session_id = this.tracker.getSessionId();
      }
      if (!baseProperties.browser) {
        baseProperties.browser = this.getBrowser();
      }
      if (!baseProperties.os) {
        baseProperties.os = this.getOS();
      }
    }

    this.tracker.trackSystemEvent('page_view', baseProperties);
  }

  /**
   * Get page view count for current session
   */
  getPageViewCount(): number {
    return this.pageViewCount;
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
  }
}

