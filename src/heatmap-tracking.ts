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

  constructor(
    tracker: HeatmapTracker,
    options: Partial<HeatmapTrackingOptions> = {}
  ) {
    this.tracker = tracker;
    this.options = { ...DEFAULT_OPTIONS, ...options };

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
  private initialize(): void {
    if (this.isDestroyed) return;

    this.log('Initializing heatmap tracking');

    // Setup click tracking
    this.setupClickTracking();

    // Setup scroll tracking
    this.setupScrollTracking();

    // Start periodic scroll state tracking
    this.startScrollTracking();

    // Setup page unload handler for beaconing
    this.setupUnloadHandler();
  }

  /**
   * Setup click event tracking
   */
  private setupClickTracking(): void {
    if (typeof document === 'undefined') return;

    const clickHandler = (event: MouseEvent) => {
      if (this.isDestroyed) return;
      if (!this.tracker.hasConsent('analytics')) return;

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
      if (!this.tracker.hasConsent('analytics')) return;

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
          pageUrl: window.location.href,
          viewportSection: this.currentScrollState.viewportSection,
          scrollDepthPx: scrollY,
          durationMs: duration,
          entryTimestamp: this.currentScrollState.entryTime,
          exitTimestamp: currentTime,
          pageHeight,
          viewportHeight,
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
            pageUrl: window.location.href,
            viewportSection: this.currentScrollState.viewportSection,
            scrollDepthPx: this.currentScrollState.scrollDepthPx,
            durationMs: duration,
            entryTimestamp: this.currentScrollState.entryTime,
            exitTimestamp: currentTime,
            pageHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
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
    if (!this.tracker.hasConsent('analytics')) return;

    const element = event.target as HTMLElement;
    if (!element) return;

    const pageUrl = window.location.href;
    const xpath = this.generateXPath(element);
    
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
      viewportX,
      viewportY,
      pageX,
      pageY,
      elementTag,
      elementText: elementText || undefined,
      timestamp: Date.now(),
    };

    // Check if this is a navigation link
    const isNavigationLink = element instanceof HTMLAnchorElement && element.href;

    // Send immediately with beacon for navigation links to ensure delivery
    if (isNavigationLink) {
      this.tracker.trackSystemEvent('_grain_heatmap_click', {
        page_url: clickData.pageUrl,
        xpath: clickData.xpath,
        viewport_x: clickData.viewportX,
        viewport_y: clickData.viewportY,
        page_x: clickData.pageX,
        page_y: clickData.pageY,
        element_tag: clickData.elementTag,
        element_text: clickData.elementText,
        timestamp: clickData.timestamp,
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
    if (!this.tracker.hasConsent('analytics')) return;
    this.updateScrollState();
  }

  /**
   * Update current scroll state
   */
  private updateScrollState(): void {
    if (typeof window === 'undefined') return;
    if (!this.tracker.hasConsent('analytics')) return;

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
          pageUrl: window.location.href,
          viewportSection: this.currentScrollState.viewportSection,
          scrollDepthPx: this.currentScrollState.scrollDepthPx,
          durationMs: duration,
          entryTimestamp: this.currentScrollState.entryTime,
          exitTimestamp: currentTime,
          pageHeight,
          viewportHeight,
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
    if (!this.tracker.hasConsent('analytics')) {
      // Clear pending events if consent is revoked
      this.pendingClicks = [];
      this.pendingScrolls = [];
      return;
    }

    // Send click events
    if (this.pendingClicks.length > 0) {
      for (const clickData of this.pendingClicks) {
        this.tracker.trackSystemEvent('_grain_heatmap_click', {
          page_url: clickData.pageUrl,
          xpath: clickData.xpath,
          viewport_x: clickData.viewportX,
          viewport_y: clickData.viewportY,
          page_x: clickData.pageX,
          page_y: clickData.pageY,
          element_tag: clickData.elementTag,
          element_text: clickData.elementText,
          timestamp: clickData.timestamp,
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
    if (!this.tracker.hasConsent('analytics')) {
      this.pendingClicks = [];
      this.pendingScrolls = [];
      return;
    }

    // Send click events with beacon
    if (this.pendingClicks.length > 0) {
      for (const clickData of this.pendingClicks) {
        this.tracker.trackSystemEvent('_grain_heatmap_click', {
          page_url: clickData.pageUrl,
          xpath: clickData.xpath,
          viewport_x: clickData.viewportX,
          viewport_y: clickData.viewportY,
          page_x: clickData.pageX,
          page_y: clickData.pageY,
          element_tag: clickData.elementTag,
          element_text: clickData.elementText,
          timestamp: clickData.timestamp,
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

