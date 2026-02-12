/**
 * Heatmap Tracking Manager for Grain Analytics
 * Tracks click interactions and scroll depth across all pages
 */

import type {
  HeatmapClickData,
  HeatmapScrollData,
  HeatmapTrackingOptions,
  HeatmapScrollState,
} from './types/heatmap-tracking';
import { AttentionQualityManager } from './attention-quality';
import type { ActivityDetector } from './activity';
import { cleanElementText } from './text-utils';

export interface SendEventOptions {
  flush?: boolean;
}

export interface HeatmapTracker {
  trackSystemEvent(eventName: string, properties?: Record<string, unknown>, options?: SendEventOptions): void | Promise<void>;
  hasConsent(category: 'analytics' | 'marketing' | 'functional'): boolean;
  getActivityDetector(): ActivityDetector;
  getConfigAsync(key: string): Promise<string | undefined>;
  getEffectiveUserId(): string;
  log(...args: unknown[]): void;
}

const DEFAULT_OPTIONS: HeatmapTrackingOptions = {
  scrollDebounceDelay: 100,
  batchDelay: 2000,
  maxBatchSize: 20,
  debug: false,
};

export class HeatmapTrackingManager {
  private tracker: HeatmapTracker;
  private options: HeatmapTrackingOptions;
  private isDestroyed = false;

  // Tracking state
  private currentScrollState: HeatmapScrollState | null = null;
  private pendingClicks: HeatmapClickData[] = [];
  private pendingScrolls: HeatmapScrollData[] = [];

  // Timers
  private scrollDebounceTimer: number | null = null;
  private batchTimer: number | null = null;
  private scrollTrackingTimer: number | null = null;
  private periodicScrollTimer: number | null = null;

  // Scroll tracking
  private lastScrollPosition = 0;
  private lastScrollTime = Date.now();
  private readonly SPLIT_DURATION = 3000; // 3 seconds - same as section tracking

  // Attention quality management
  private attentionQuality: AttentionQualityManager;

  // Snapshot capture state
  private snapshotCaptured = false;
  private snapshotEnabled = false;

  // Device type detection
  private deviceType: 'mobile' | 'desktop' = 'desktop';

  constructor(
    tracker: HeatmapTracker,
    options: Partial<HeatmapTrackingOptions> = {}
  ) {
    this.tracker = tracker;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Detect device type on initialization
    this.deviceType = this.detectDeviceType();

    // Initialize attention quality manager
    this.attentionQuality = new AttentionQualityManager(
      tracker.getActivityDetector(),
      {
        maxSectionDuration: 9000, // 9 seconds per viewport section
        minScrollDistance: 100, // 100 pixels
        idleThreshold: 30000, // 30 seconds
        debug: this.options.debug,
      }
    );

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // Initialize after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initialize());
      } else {
        setTimeout(() => this.initialize(), 0);
      }
    }
  }

  /**
   * Initialize heatmap tracking
   */
  private async initialize(): Promise<void> {
    if (this.isDestroyed) return;

    this.log('Initializing heatmap tracking');

    // Check remote config for snapshot capture
    await this.checkSnapshotConfig();

    // Setup click tracking
    this.setupClickTracking();

    // Setup scroll tracking
    this.setupScrollTracking();

    // Start periodic scroll state tracking
    this.startScrollTracking();

    // Setup page unload handler for beaconing
    this.setupUnloadHandler();

    // Initialize snapshot capture if enabled
    if (this.snapshotEnabled && !this.snapshotCaptured) {
      this.captureSnapshot();
    }
  }

  /**
   * Check remote config for snapshot capture enablement
   */
  /**
   * Detect device type based on viewport width and user agent
   * Mobile: width < 768px OR mobile user agent
   * Desktop: width >= 768px AND non-mobile user agent
   */
  private detectDeviceType(): 'mobile' | 'desktop' {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return 'desktop'; // SSR default
    }

    // Check viewport width
    const width = window.innerWidth || window.screen?.width || 0;
    const isMobileWidth = width < 768;

    // Check user agent for mobile indicators
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'mobile',
      'android',
      'iphone',
      'ipad',
      'ipod',
      'blackberry',
      'windows phone',
      'webos',
    ];
    const isMobileUserAgent = mobileKeywords.some((keyword) =>
      userAgent.includes(keyword)
    );

    // Device is mobile if either width OR user agent indicates mobile
    return isMobileWidth || isMobileUserAgent ? 'mobile' : 'desktop';
  }

  /**
   * Normalize URL by removing query params and hash, and stripping www prefix
   * This ensures heatmap data is aggregated by page, not by URL variations
   * Subdomains (other than www) are preserved: api.example.com != app.example.com
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname.toLowerCase();
      
      // Strip www prefix but keep other subdomains
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      
      // Return protocol + normalized hostname + pathname only
      return `${urlObj.protocol}//${hostname}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  private async checkSnapshotConfig(): Promise<void> {
    try {
      const enableSnapshot = await this.tracker.getConfigAsync('enableHeatmapSnapshot');
      this.snapshotEnabled = enableSnapshot === 'true';
      this.log('Heatmap snapshot capture enabled:', this.snapshotEnabled);
    } catch (error) {
      this.log('Failed to check snapshot config, defaulting to disabled:', error);
      this.snapshotEnabled = false;
    }
  }

  /**
   * Capture DOM snapshot using rrweb-snapshot
   */
  private async captureSnapshot(): Promise<void> {
    if (this.snapshotCaptured || !this.snapshotEnabled) return;

    // Check daily snapshot limits before capturing
    if (!this.canUploadSnapshot()) {
      this.log('Snapshot upload limit reached or URL already captured today');
      this.snapshotCaptured = true; // Prevent retry
      return;
    }

    try {
      this.log('Capturing DOM snapshot...');
      
      // Dynamically import rrweb-snapshot (only if enabled)
      // @ts-ignore - rrweb-snapshot is an optional dependency, may not be resolvable during React build
      const rrwebSnapshot = await import('rrweb-snapshot');
      
      // Capture full DOM snapshot with PII masking
      const snapshot = rrwebSnapshot.snapshot(document, {
        maskAllInputs: true,
        maskTextFn: (text: string) => {
          // Basic PII masking - mask anything that looks like email or sensitive data
          return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '*****');
        },
      });

      this.snapshotCaptured = true;
      this.log('DOM snapshot captured successfully');

      // Upload snapshot to backend
      await this.uploadSnapshot(snapshot);
    } catch (error) {
      this.log('Failed to capture DOM snapshot:', error);
    }
  }

  /**
   * Upload snapshot to backend
   */
  private async uploadSnapshot(snapshot: unknown): Promise<void> {
    try {
      const sessionId = this.tracker.getEffectiveUserId();
      const pageUrl = this.normalizeUrl(window.location.href);

      this.log('Uploading snapshot to backend - sessionId:', sessionId);

      // Note: The actual API call would need the tenantId from the tracker
      // For now, we'll log that the snapshot is ready to be uploaded
      // The tracker would need to expose tenantId for this to work
      const snapshotData = {
        sessionId,
        pageUrl,
        snapshot
      };
      
      this.log('Snapshot data prepared:', { sessionId, pageUrl, snapshotSize: JSON.stringify(snapshot).length });
      
      // Get API configuration from tracker
      const apiUrl = await this.getApiUrl();
      const tenantId = await this.getTenantId();
      const headers = await this.getAuthHeaders();
      
      if (!apiUrl || !tenantId) {
        this.log('Cannot upload snapshot: missing API URL or tenant ID');
        return;
      }
      
      // Upload to backend
      const response = await fetch(
        `${apiUrl}/v1/events/${encodeURIComponent(tenantId)}/snapshot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify({
            sessionId,
            pageUrl,
            snapshot: JSON.stringify(snapshot),
            timestamp: Date.now(),
            deviceType: this.deviceType
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Snapshot upload failed: ${response.status}`);
      }
      
      const result = await response.json();
      this.log('Snapshot uploaded successfully:', result);
      
      // Record successful upload
      this.recordSnapshotUpload(pageUrl);
    } catch (error) {
      this.log('Failed to upload snapshot:', error);
    }
  }

  /**
   * Check if snapshot can be uploaded based on daily limits
   * - Max 5 snapshots per user per day
   * - Same URL (without query params) can't be uploaded twice in same day
   */
  private canUploadSnapshot(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return true; // Allow in SSR/non-browser environments
    }

    try {
      const pageUrl = this.normalizeUrl(window.location.href);
      const urlWithoutQuery = this.stripQueryParams(pageUrl);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const storageKey = '_grain_snapshots';

      // Get existing snapshot records
      const stored = localStorage.getItem(storageKey);
      let snapshots: Array<{ url: string; date: string; timestamp: number }> = stored ? JSON.parse(stored) : [];

      // Clean up old entries (older than 2 days)
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
      snapshots = snapshots.filter(s => s.timestamp > twoDaysAgo);

      // Get today's snapshots
      const todaySnapshots = snapshots.filter(s => s.date === today);

      // Check daily limit (5 per day)
      if (todaySnapshots.length >= 5) {
        this.log('Daily snapshot limit reached (5/5)');
        return false;
      }

      // Check if this URL (without query params) was already uploaded today
      const urlAlreadyUploaded = todaySnapshots.some(s => 
        this.stripQueryParams(s.url) === urlWithoutQuery
      );

      if (urlAlreadyUploaded) {
        this.log(`Snapshot for ${urlWithoutQuery} already uploaded today`);
        return false;
      }

      this.log(`Snapshot upload allowed (${todaySnapshots.length}/5 today)`);
      return true;
    } catch (error) {
      this.log('Error checking snapshot limits:', error);
      return true; // Allow on error to not break functionality
    }
  }

  /**
   * Record a successful snapshot upload
   */
  private recordSnapshotUpload(pageUrl: string): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = '_grain_snapshots';

      // Get existing records
      const stored = localStorage.getItem(storageKey);
      let snapshots: Array<{ url: string; date: string; timestamp: number }> = stored ? JSON.parse(stored) : [];

      // Add new record
      snapshots.push({
        url: pageUrl,
        date: today,
        timestamp: Date.now()
      });

      // Clean up old entries (older than 2 days)
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
      snapshots = snapshots.filter(s => s.timestamp > twoDaysAgo);

      // Save back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(snapshots));
      this.log(`Snapshot upload recorded: ${snapshots.filter(s => s.date === today).length}/5 today`);
    } catch (error) {
      this.log('Error recording snapshot upload:', error);
    }
  }

  /**
   * Strip query parameters from URL for comparison
   */
  private stripQueryParams(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, remove everything after ?
      return url.split('?')[0];
    }
  }
  
  /**
   * Get API URL from tracker configuration
   */
  private async getApiUrl(): Promise<string | undefined> {
    try {
      return (this.tracker as any).config?.apiUrl || 'https://clientapis.grainql.com';
    } catch {
      return 'https://clientapis.grainql.com';
    }
  }
  
  /**
   * Get tenant ID from tracker configuration
   */
  private async getTenantId(): Promise<string | undefined> {
    try {
      return (this.tracker as any).config?.tenantId;
    } catch {
      return undefined;
    }
  }
  
  /**
   * Get auth headers from tracker
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      if (typeof (this.tracker as any).getAuthHeaders === 'function') {
        return await (this.tracker as any).getAuthHeaders();
      }
      return {};
    } catch {
      return {};
    }
  }

  /**
   * Setup click event tracking
   */
  private setupClickTracking(): void {
    if (typeof document === 'undefined') return;

    const clickHandler = (event: MouseEvent) => {
      if (this.isDestroyed) return;
      // v3: Always track events - consent only affects ID type (daily vs permanent)
      // Removed: if (!this.tracker.hasConsent('analytics')) return;

      this.handleClick(event);
    };

    document.addEventListener('click', clickHandler, { passive: true, capture: true });
  }

  /**
   * Setup scroll event tracking
   */
  private setupScrollTracking(): void {
    if (typeof window === 'undefined') return;

    const scrollHandler = () => {
      if (this.scrollDebounceTimer !== null) {
        clearTimeout(this.scrollDebounceTimer);
      }

      this.scrollDebounceTimer = window.setTimeout(() => {
        this.handleScroll();
        this.scrollDebounceTimer = null;
      }, this.options.scrollDebounceDelay);
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
  }

  /**
   * Start periodic scroll state tracking
   */
  private startScrollTracking(): void {
    if (typeof window === 'undefined') return;

    // Track initial scroll position
    this.updateScrollState();

    // Update scroll state every 500ms (for detecting section changes)
    this.scrollTrackingTimer = window.setInterval(() => {
      if (this.isDestroyed) return;
      this.updateScrollState();
    }, 500);

    // Start periodic 3-second scroll duration tracking
    this.startPeriodicScrollTracking();
  }

  /**
   * Start periodic scroll tracking (sends events every 3 seconds)
   */
  private startPeriodicScrollTracking(): void {
    if (typeof window === 'undefined') return;

    this.periodicScrollTimer = window.setInterval(() => {
      if (this.isDestroyed || !this.currentScrollState) return;
      // v3: Always track events - consent only affects ID type (daily vs permanent)
      // Removed: if (!this.tracker.hasConsent('analytics')) return;

      // Check attention quality policies
      if (!this.attentionQuality.shouldTrack()) {
        this.log('Scroll tracking paused:', this.attentionQuality.getLastFilterReason());
        return;
      }

      const currentTime = Date.now();
      const duration = currentTime - this.currentScrollState.entryTime;

      // Only send if meaningful duration (> 1 second)
      if (duration > 1000) {
        const scrollY = window.scrollY || window.pageYOffset;
        const viewportHeight = window.innerHeight;
        const pageHeight = document.documentElement.scrollHeight;

        // Check section-specific attention quality
        const sectionKey = `viewport_section_${this.currentScrollState.viewportSection}`;
        const attentionCheck = this.attentionQuality.shouldTrackSection(sectionKey, scrollY);

        // If attention was reset due to scroll, reset our entry time
        if (attentionCheck.resetAttention) {
          this.log(`Viewport section ${this.currentScrollState.viewportSection}: Attention reset`);
          this.currentScrollState.entryTime = currentTime;
          return;
        }

        // If max duration reached for this viewport section
        if (!attentionCheck.shouldTrack) {
          this.log(`Viewport section ${this.currentScrollState.viewportSection}: ${attentionCheck.reason}`);
          return;
        }

        const scrollData: HeatmapScrollData = {
          pageUrl: this.normalizeUrl(window.location.href),
          viewportSection: this.currentScrollState.viewportSection,
          scrollDepthPx: scrollY,
          durationMs: duration,
          entryTimestamp: this.currentScrollState.entryTime,
          exitTimestamp: currentTime,
          pageHeight,
          viewportHeight,
          deviceType: this.deviceType,
        };

        // Send immediately using beacon to ensure delivery
        this.tracker.trackSystemEvent('_grain_heatmap_scroll', {
          page_url: scrollData.pageUrl,
          viewport_section: scrollData.viewportSection,
          scroll_depth_px: scrollData.scrollDepthPx,
          duration_ms: scrollData.durationMs,
          entry_timestamp: scrollData.entryTimestamp,
          exit_timestamp: scrollData.exitTimestamp,
          page_height: scrollData.pageHeight,
          viewport_height: scrollData.viewportHeight,
          device_type: scrollData.deviceType,
          is_split: true, // Flag to indicate periodic tracking, not final exit
        }, { flush: true });

        // Update attention quality duration tracker
        this.attentionQuality.updateSectionDuration(sectionKey, duration);

        // Reset entry time for next period
        this.currentScrollState.entryTime = currentTime;
      }
    }, this.SPLIT_DURATION);
  }

  /**
   * Setup page unload handler to beacon remaining data
   */
  private setupUnloadHandler(): void {
    if (typeof window === 'undefined') return;

    const unloadHandler = () => {
      // Finalize current scroll state
      if (this.currentScrollState) {
        const currentTime = Date.now();
        const duration = currentTime - this.currentScrollState.entryTime;

        if (duration > 100) {
          const scrollData: HeatmapScrollData = {
            pageUrl: this.normalizeUrl(window.location.href),
            viewportSection: this.currentScrollState.viewportSection,
            scrollDepthPx: this.currentScrollState.scrollDepthPx,
            durationMs: duration,
            entryTimestamp: this.currentScrollState.entryTime,
            exitTimestamp: currentTime,
            pageHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
            deviceType: this.deviceType,
          };

          this.pendingScrolls.push(scrollData);
        }
      }

      // Flush all pending events with beacon
      this.flushPendingEventsWithBeacon();
    };

    // Use both events for better compatibility
    window.addEventListener('beforeunload', unloadHandler);
    window.addEventListener('pagehide', unloadHandler);
  }

  /**
   * Handle click event
   */
  private handleClick(event: MouseEvent): void {
    // v3: Always track events - consent only affects ID type (daily vs permanent)
    // Removed: if (!this.tracker.hasConsent('analytics')) return;

    const element = event.target as HTMLElement;
    if (!element) return;

    const pageUrl = this.normalizeUrl(window.location.href);
    const xpath = this.generateXPath(element);
    
    // Generate CSS selector for element-relative positioning
    const selector = this.generateCSSSelector(element);
    
    // Calculate element-relative coordinates
    let relX: number | undefined;
    let relY: number | undefined;
    try {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        relX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        relY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      }
    } catch (error) {
      this.log('Failed to calculate relative coordinates:', error);
    }
    
    // Get viewport coordinates
    const viewportX = Math.round(event.clientX);
    const viewportY = Math.round(event.clientY);
    
    // Get page coordinates (including scroll offset)
    const pageX = Math.round(event.pageX);
    const pageY = Math.round(event.pageY);
    
    const elementTag = element.tagName?.toLowerCase() || 'unknown';
    const elementText = cleanElementText(element.textContent);

    const clickData: HeatmapClickData = {
      pageUrl,
      xpath,
      selector,
      relX,
      relY,
      viewportX,
      viewportY,
      pageX,
      pageY,
      elementTag,
      elementText: elementText || undefined,
      timestamp: Date.now(),
      deviceType: this.deviceType,
    };

    // Check if this is a navigation link
    const isNavigationLink = element instanceof HTMLAnchorElement && element.href;

    // Send immediately with beacon for navigation links to ensure delivery
    if (isNavigationLink) {
      this.tracker.trackSystemEvent('_grain_heatmap_click', {
        page_url: clickData.pageUrl,
        xpath: clickData.xpath,
        selector: clickData.selector,
        rel_x: clickData.relX,
        rel_y: clickData.relY,
        viewport_x: clickData.viewportX,
        viewport_y: clickData.viewportY,
        page_x: clickData.pageX,
        page_y: clickData.pageY,
        element_tag: clickData.elementTag,
        element_text: clickData.elementText,
        timestamp: clickData.timestamp,
        device_type: clickData.deviceType,
      }, { flush: true });
    } else {
    this.pendingClicks.push(clickData);

    // Check if we should flush
    this.considerBatchFlush();
    }
  }

  /**
   * Handle scroll event
   */
  private handleScroll(): void {
    // v3: Always track events - consent only affects ID type (daily vs permanent)
    // Removed: if (!this.tracker.hasConsent('analytics')) return;
    this.updateScrollState();
  }

  /**
   * Update current scroll state
   */
  private updateScrollState(): void {
    if (typeof window === 'undefined') return;
    // v3: Always track events - consent only affects ID type (daily vs permanent)
    // Removed: if (!this.tracker.hasConsent('analytics')) return;

    const currentTime = Date.now();
    const scrollY = window.scrollY || window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    
    // Calculate which viewport section we're in
    const viewportSection = Math.floor(scrollY / viewportHeight);

    // If we're in a new section, record the previous one
    if (this.currentScrollState && this.currentScrollState.viewportSection !== viewportSection) {
      const duration = currentTime - this.currentScrollState.entryTime;
      
      // Only record if duration is meaningful (> 100ms)
      if (duration > 100) {
        const scrollData: HeatmapScrollData = {
          pageUrl: this.normalizeUrl(window.location.href),
          viewportSection: this.currentScrollState.viewportSection,
          scrollDepthPx: this.currentScrollState.scrollDepthPx,
          durationMs: duration,
          entryTimestamp: this.currentScrollState.entryTime,
          exitTimestamp: currentTime,
          pageHeight,
          viewportHeight,
          deviceType: this.deviceType,
        };

        this.pendingScrolls.push(scrollData);
      }

      // Reset attention for previous viewport section
      const prevSectionKey = `viewport_section_${this.currentScrollState.viewportSection}`;
      this.attentionQuality.resetSection(prevSectionKey);
    }

    // Update current state
    if (!this.currentScrollState || this.currentScrollState.viewportSection !== viewportSection) {
      this.currentScrollState = {
        viewportSection,
        entryTime: currentTime,
        scrollDepthPx: scrollY,
      };
    }

    this.lastScrollPosition = scrollY;
    this.lastScrollTime = currentTime;

    // Check if we should flush
    this.considerBatchFlush();
  }

  /**
   * Generate CSS selector for an element (for element-relative positioning)
   */
  private generateCSSSelector(element: HTMLElement): string {
    if (!element) return '';

    // Prefer ID if available
    if (element.id) {
      return `#${element.id}`;
    }

    // Try data attributes
    const dataAttrs = Array.from(element.attributes).filter(attr => attr.name.startsWith('data-'));
    if (dataAttrs.length > 0) {
      const attr = dataAttrs[0];
      return `${element.tagName.toLowerCase()}[${attr.name}="${attr.value}"]`;
    }

    // Try class names (pick first meaningful class)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c && !c.match(/^(active|hover|focus)/));
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes[0]}`;
      }
    }

    // Fall back to nth-child path
    const path: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const sameTagSiblings = siblings.filter(s => s.tagName === current!.tagName);
        
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      // Limit path depth to avoid overly long selectors
      if (path.length >= 5) break;
    }

    return path.join(' > ');
  }

  /**
   * Generate XPath for an element
   */
  private generateXPath(element: HTMLElement): string {
    if (!element) return '';

    // If element has an ID, use that for simpler XPath
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const paths: string[] = [];
    let currentElement: HTMLElement | null = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling: Element | null = currentElement;

      // Count preceding siblings of the same tag
      while (sibling) {
        sibling = sibling.previousElementSibling;
        if (sibling && sibling.nodeName === currentElement.nodeName) {
          index++;
        }
      }

      const tagName = currentElement.nodeName.toLowerCase();
      const pathIndex = index > 0 ? `[${index + 1}]` : '';
      paths.unshift(`${tagName}${pathIndex}`);

      currentElement = currentElement.parentElement;
    }

    return paths.length ? `/${paths.join('/')}` : '';
  }

  /**
   * Consider flushing batched events
   */
  private considerBatchFlush(): void {
    const totalEvents = this.pendingClicks.length + this.pendingScrolls.length;

    // Flush if we've hit the batch size
    if (totalEvents >= this.options.maxBatchSize) {
      this.flushPendingEvents();
      return;
    }

    // Otherwise, schedule a batch flush
    if (this.batchTimer === null && totalEvents > 0) {
      this.batchTimer = window.setTimeout(() => {
        this.flushPendingEvents();
        this.batchTimer = null;
      }, this.options.batchDelay);
    }
  }

  /**
   * Flush pending events
   */
  private flushPendingEvents(): void {
    if (this.isDestroyed) return;
    // v3: Always track events - consent only affects ID type (daily vs permanent)
    // Removed consent check that was blocking events in cookieless mode

    // Send click events
    if (this.pendingClicks.length > 0) {
      for (const clickData of this.pendingClicks) {
        this.tracker.trackSystemEvent('_grain_heatmap_click', {
          page_url: clickData.pageUrl,
          xpath: clickData.xpath,
          selector: clickData.selector,
          rel_x: clickData.relX,
          rel_y: clickData.relY,
          viewport_x: clickData.viewportX,
          viewport_y: clickData.viewportY,
          page_x: clickData.pageX,
          page_y: clickData.pageY,
          element_tag: clickData.elementTag,
          element_text: clickData.elementText,
          timestamp: clickData.timestamp,
          device_type: clickData.deviceType,
        });
      }

      this.pendingClicks = [];
    }

    // Send scroll events
    if (this.pendingScrolls.length > 0) {
      for (const scrollData of this.pendingScrolls) {
        this.tracker.trackSystemEvent('_grain_heatmap_scroll', {
          page_url: scrollData.pageUrl,
          viewport_section: scrollData.viewportSection,
          scroll_depth_px: scrollData.scrollDepthPx,
          duration_ms: scrollData.durationMs,
          entry_timestamp: scrollData.entryTimestamp,
          exit_timestamp: scrollData.exitTimestamp,
          page_height: scrollData.pageHeight,
          viewport_height: scrollData.viewportHeight,
          device_type: scrollData.deviceType,
        });
      }

      this.pendingScrolls = [];
    }

    // Clear batch timer
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Flush pending events with beacon (for page unload)
   */
  private flushPendingEventsWithBeacon(): void {
    // v3: Always track events - consent only affects ID type (daily vs permanent)
    // Removed consent check that was blocking events in cookieless mode

    // Send click events with beacon
    if (this.pendingClicks.length > 0) {
      for (const clickData of this.pendingClicks) {
        this.tracker.trackSystemEvent('_grain_heatmap_click', {
          page_url: clickData.pageUrl,
          xpath: clickData.xpath,
          selector: clickData.selector,
          rel_x: clickData.relX,
          rel_y: clickData.relY,
          viewport_x: clickData.viewportX,
          viewport_y: clickData.viewportY,
          page_x: clickData.pageX,
          page_y: clickData.pageY,
          element_tag: clickData.elementTag,
          element_text: clickData.elementText,
          timestamp: clickData.timestamp,
          device_type: clickData.deviceType,
        }, { flush: true });
      }

      this.pendingClicks = [];
    }

    // Send scroll events with beacon
    if (this.pendingScrolls.length > 0) {
      for (const scrollData of this.pendingScrolls) {
        this.tracker.trackSystemEvent('_grain_heatmap_scroll', {
          page_url: scrollData.pageUrl,
          viewport_section: scrollData.viewportSection,
          scroll_depth_px: scrollData.scrollDepthPx,
          duration_ms: scrollData.durationMs,
          entry_timestamp: scrollData.entryTimestamp,
          exit_timestamp: scrollData.exitTimestamp,
          page_height: scrollData.pageHeight,
          viewport_height: scrollData.viewportHeight,
          device_type: scrollData.deviceType,
        }, { flush: true });
      }

      this.pendingScrolls = [];
    }
  }

  /**
   * Log debug message
   */
  private log(...args: unknown[]): void {
    if (this.options.debug) {
      this.tracker.log('[Heatmap Tracking]', ...args);
    }
  }

  /**
   * Destroy the tracking manager
   */
  destroy(): void {
    this.isDestroyed = true;

    // Clear timers
    if (this.scrollDebounceTimer !== null) {
      clearTimeout(this.scrollDebounceTimer);
      this.scrollDebounceTimer = null;
    }

    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.scrollTrackingTimer !== null) {
      clearInterval(this.scrollTrackingTimer);
      this.scrollTrackingTimer = null;
    }

    if (this.periodicScrollTimer !== null) {
      clearInterval(this.periodicScrollTimer);
      this.periodicScrollTimer = null;
    }

    // Destroy attention quality manager
    this.attentionQuality.destroy();

    // Flush any remaining events
    this.flushPendingEvents();
  }
}

