/**
 * Section Tracking Manager for Grain Analytics
 * Intelligent scroll tracking with viewport metrics, visible sections, and engagement analysis
 */

import type { SectionConfig, SectionViewData, SectionTrackingOptions, SectionTrackingState } from './types/auto-tracking';
import { AttentionQualityManager } from './attention-quality';
import type { ActivityDetector } from './activity';

export interface SectionTracker {
  trackSystemEvent(eventName: string, properties: Record<string, unknown>): void;
  hasConsent(category: 'analytics' | 'marketing' | 'functional'): boolean;
  getActivityDetector(): ActivityDetector;
  log(...args: unknown[]): void;
}

const DEFAULT_OPTIONS: SectionTrackingOptions = {
  minDwellTime: 1000, // 1 second minimum
  scrollVelocityThreshold: 500, // 500px/s
  intersectionThreshold: 0.1, // 10% visible
  debounceDelay: 100,
  batchDelay: 2000, // 2 seconds
  debug: false,
};

export class SectionTrackingManager {
  private tracker: SectionTracker;
  private sections: SectionConfig[];
  private options: SectionTrackingOptions;
  private isDestroyed = false;
  
  // Tracking state
  private sectionStates: Map<string, SectionTrackingState> = new Map();
  private intersectionObserver: IntersectionObserver | null = null;
  private xpathCache: Map<string, Element | null> = new Map();
  
  // Scroll tracking
  private lastScrollPosition = 0;
  private lastScrollTime = Date.now();
  private scrollVelocity = 0;
  private scrollDebounceTimer: number | null = null;
  
  // Event batching
  private pendingEvents: SectionViewData[] = [];
  private batchTimer: number | null = null;

  // Periodic tracking for long-duration views
  private sectionTimers: Map<string, number> = new Map(); // sectionName -> timer ID
  private readonly SPLIT_DURATION = 3000; // 3 seconds

  // Attention quality management
  private attentionQuality: AttentionQualityManager;

  constructor(
    tracker: SectionTracker,
    sections: SectionConfig[],
    options: Partial<SectionTrackingOptions> = {}
  ) {
    this.tracker = tracker;
    this.sections = sections;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize attention quality manager
    this.attentionQuality = new AttentionQualityManager(
      tracker.getActivityDetector(),
      {
        maxSectionDuration: 9000, // 9 seconds
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
   * Initialize section tracking
   */
  private initialize(): void {
    if (this.isDestroyed) return;

    this.log('Initializing section tracking');

    // Setup intersection observer
    this.setupIntersectionObserver();

    // Setup scroll listener for velocity tracking
    this.setupScrollListener();

    // Initialize sections
    this.initializeSections();
  }

  /**
   * Setup IntersectionObserver for section visibility
   */
  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.log('IntersectionObserver not supported');
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.handleIntersection(entry);
        });
      },
      {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
        rootMargin: '0px',
      }
    );

    this.log('IntersectionObserver created');
  }

  /**
   * Setup scroll listener for velocity calculation
   */
  private setupScrollListener(): void {
    if (typeof window === 'undefined') return;

    const scrollHandler = () => {
      if (this.scrollDebounceTimer !== null) {
        clearTimeout(this.scrollDebounceTimer);
      }

      this.scrollDebounceTimer = window.setTimeout(() => {
        this.updateScrollVelocity();
        this.scrollDebounceTimer = null;
      }, this.options.debounceDelay);
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    this.log('Scroll listener attached');
  }

  /**
   * Initialize sections and start observing
   */
  private initializeSections(): void {
    for (const section of this.sections) {
      const element = this.findElementByXPath(section.selector);
      
      if (!element) {
        this.log('Section element not found:', section.sectionName, 'selector:', section.selector);
        continue;
      }

      // Initialize state
      const state: SectionTrackingState = {
        element,
        config: section,
        entryTime: null,
        exitTime: null,
        isVisible: false,
        lastScrollPosition: window.scrollY,
        lastScrollTime: Date.now(),
        entryScrollSpeed: 0,
        exitScrollSpeed: 0,
        maxVisibleArea: 0,
      };

      this.sectionStates.set(section.sectionName, state);

      // Start observing
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(element);
      }
    }
  }

  /**
   * Handle intersection observer entry
   */
  private handleIntersection(entry: IntersectionObserverEntry): void {
    if (this.isDestroyed) return;

    // Find which section this element belongs to
    const state = Array.from(this.sectionStates.values()).find(
      (s) => s.element === entry.target
    );

    if (!state) return;

    const isVisible = entry.isIntersecting && entry.intersectionRatio >= this.options.intersectionThreshold;
    const visibleArea = entry.intersectionRatio;

    // Update max visible area
    if (visibleArea > state.maxVisibleArea) {
      state.maxVisibleArea = visibleArea;
    }

    // Handle visibility change
    if (isVisible && !state.isVisible) {
      // Section became visible
      this.handleSectionEntry(state);
    } else if (!isVisible && state.isVisible) {
      // Section became invisible
      this.handleSectionExit(state);
    }

    state.isVisible = isVisible;
  }

  /**
   * Handle section entry (became visible)
   */
  private handleSectionEntry(state: SectionTrackingState): void {
    state.entryTime = Date.now();
    state.entryScrollSpeed = this.scrollVelocity;
    state.lastScrollPosition = window.scrollY;
    state.lastScrollTime = Date.now();
    state.maxVisibleArea = 0;
    
    // Start periodic tracking timer (3 second intervals)
    this.startPeriodicTracking(state);
  }
  
  /**
   * Start periodic tracking for a section (sends events every 3 seconds)
   */
  private startPeriodicTracking(state: SectionTrackingState): void {
    // Clear any existing timer for this section
    this.stopPeriodicTracking(state.config.sectionName);
    
    const timerId = window.setInterval(() => {
      if (this.isDestroyed || !state.isVisible || state.entryTime === null) {
        this.stopPeriodicTracking(state.config.sectionName);
        return;
      }
      
      const now = Date.now();
      const duration = now - state.entryTime;
      
      // Only track if minimum dwell time has passed
      if (duration >= this.options.minDwellTime) {
        // Check attention quality policies
        const currentScrollY = window.scrollY;
        const attentionCheck = this.attentionQuality.shouldTrackSection(
          state.config.sectionName,
          currentScrollY
        );

        // If attention was reset due to scroll, reset our entry time
        if (attentionCheck.resetAttention) {
          this.log(`Section "${state.config.sectionName}": Attention reset, restarting timer`);
          state.entryTime = now;
          state.entryScrollSpeed = this.scrollVelocity;
          return;
        }

        // If tracking is not allowed (page hidden, idle, or max duration reached)
        if (!attentionCheck.shouldTrack) {
          this.log(`Section "${state.config.sectionName}": Tracking paused - ${attentionCheck.reason}`);
          return;
        }

        // Create partial section view data
        const viewData: SectionViewData = {
          sectionName: state.config.sectionName,
          sectionType: state.config.sectionType,
          entryTime: state.entryTime,
          exitTime: now, // Current time as "exit" for this split
          duration,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          scrollDepth: this.calculateScrollDepth(),
          visibleAreaPercentage: Math.round(state.maxVisibleArea * 100),
          scrollSpeedAtEntry: state.entryScrollSpeed,
          scrollSpeedAtExit: this.scrollVelocity,
        };
        
        // Track this split immediately (don't queue for batching)
        if (this.shouldTrackSection(viewData)) {
          this.tracker.trackSystemEvent('_grain_section_view', {
            section_name: viewData.sectionName,
            section_type: viewData.sectionType,
            duration_ms: viewData.duration,
            viewport_width: viewData.viewportWidth,
            viewport_height: viewData.viewportHeight,
            scroll_depth_percent: viewData.scrollDepth,
            visible_area_percent: viewData.visibleAreaPercentage,
            scroll_speed_entry: Math.round(viewData.scrollSpeedAtEntry || 0),
            scroll_speed_exit: Math.round(viewData.scrollSpeedAtExit || 0),
            entry_timestamp: viewData.entryTime,
            exit_timestamp: viewData.exitTime,
            is_split: true, // Flag to indicate this is a periodic split, not final exit
          });
          
          // Update attention quality duration tracker
          this.attentionQuality.updateSectionDuration(state.config.sectionName, duration);
          
          // Reset entry time for next split (but keep tracking)
          state.entryTime = now;
          state.entryScrollSpeed = this.scrollVelocity;
        }
      }
    }, this.SPLIT_DURATION);
    
    this.sectionTimers.set(state.config.sectionName, timerId);
  }
  
  /**
   * Stop periodic tracking for a section
   */
  private stopPeriodicTracking(sectionName: string): void {
    const timerId = this.sectionTimers.get(sectionName);
    if (timerId !== undefined) {
      clearInterval(timerId);
      this.sectionTimers.delete(sectionName);
    }
  }

  /**
   * Handle section exit (became invisible)
   */
  private handleSectionExit(state: SectionTrackingState): void {
    // Stop periodic tracking
    this.stopPeriodicTracking(state.config.sectionName);
    
    // Reset attention for this section
    this.attentionQuality.resetSection(state.config.sectionName);
    
    if (state.entryTime === null) return;

    state.exitTime = Date.now();
    state.exitScrollSpeed = this.scrollVelocity;

    const duration = state.exitTime - state.entryTime;

    // Create section view data
    const viewData: SectionViewData = {
      sectionName: state.config.sectionName,
      sectionType: state.config.sectionType,
      entryTime: state.entryTime,
      exitTime: state.exitTime,
      duration,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollDepth: this.calculateScrollDepth(),
      visibleAreaPercentage: Math.round(state.maxVisibleArea * 100),
      scrollSpeedAtEntry: state.entryScrollSpeed,
      scrollSpeedAtExit: state.exitScrollSpeed,
    };

    // Apply sanitization and track if valid
    if (this.shouldTrackSection(viewData)) {
      this.queueSectionView(viewData);
    } else {
      this.log('Section view filtered out:', state.config.sectionName, 'duration:', duration);
    }

    // Reset entry time
    state.entryTime = null;
  }

  /**
   * Update scroll velocity
   */
  private updateScrollVelocity(): void {
    const now = Date.now();
    const currentPosition = window.scrollY;
    
    const timeDelta = now - this.lastScrollTime;
    const positionDelta = Math.abs(currentPosition - this.lastScrollPosition);
    
    if (timeDelta > 0) {
      this.scrollVelocity = (positionDelta / timeDelta) * 1000; // pixels per second
    }
    
    this.lastScrollPosition = currentPosition;
    this.lastScrollTime = now;
  }

  /**
   * Calculate current scroll depth as percentage
   */
  private calculateScrollDepth(): number {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0;

    const windowHeight = window.innerHeight;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    const scrollTop = window.scrollY;
    const scrollableHeight = documentHeight - windowHeight;
    
    if (scrollableHeight <= 0) return 100;
    
    return Math.round((scrollTop / scrollableHeight) * 100);
  }

  /**
   * Determine if section view should be tracked (sanitization)
   */
  private shouldTrackSection(viewData: SectionViewData): boolean {
    // Minimum dwell time check
    if (viewData.duration < this.options.minDwellTime) {
      return false;
    }

    // Check if user was rapidly scrolling through
    const avgScrollSpeed = (viewData.scrollSpeedAtEntry! + viewData.scrollSpeedAtExit!) / 2;
    if (avgScrollSpeed > this.options.scrollVelocityThreshold * 2) {
      // Very fast scroll - likely not engaged
      return false;
    }

    // Must have had some meaningful visible area
    if (viewData.visibleAreaPercentage < 10) {
      return false;
    }

    return true;
  }

  /**
   * Queue section view for batching
   */
  private queueSectionView(viewData: SectionViewData): void {
    this.pendingEvents.push(viewData);

    // Setup batch timer if not already set
    if (this.batchTimer === null) {
      this.batchTimer = window.setTimeout(() => {
        this.flushPendingEvents();
      }, this.options.batchDelay);
    }
  }

  /**
   * Flush pending section view events
   */
  private flushPendingEvents(): void {
    if (this.isDestroyed || this.pendingEvents.length === 0) return;
    // v3: Always track events - consent only affects ID type (daily vs permanent)
    // Removed consent check that was blocking events in cookieless mode

    // Track each section view
    for (const viewData of this.pendingEvents) {
      this.tracker.trackSystemEvent('_grain_section_view', {
        section_name: viewData.sectionName,
        section_type: viewData.sectionType,
        duration_ms: viewData.duration,
        viewport_width: viewData.viewportWidth,
        viewport_height: viewData.viewportHeight,
        scroll_depth_percent: viewData.scrollDepth,
        visible_area_percent: viewData.visibleAreaPercentage,
        scroll_speed_entry: Math.round(viewData.scrollSpeedAtEntry || 0),
        scroll_speed_exit: Math.round(viewData.scrollSpeedAtExit || 0),
        entry_timestamp: viewData.entryTime,
        exit_timestamp: viewData.exitTime,
      });
    }

    // Clear pending events
    this.pendingEvents = [];
    this.batchTimer = null;
  }

  /**
   * Find element by XPath selector
   */
  private findElementByXPath(xpath: string): Element | null {
    // Check cache first
    if (this.xpathCache.has(xpath)) {
      const cached = this.xpathCache.get(xpath);
      if (cached && document.contains(cached)) {
        return cached;
      }
      this.xpathCache.delete(xpath);
    }

    try {
      // Strip the xpath= prefix if present (from Stagehand selectors)
      let cleanXpath = xpath;
      if (xpath.startsWith('xpath=')) {
        cleanXpath = xpath.substring(6); // Remove 'xpath=' prefix
      }

      const result = document.evaluate(
        cleanXpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      
      const element = result.singleNodeValue as Element | null;
      
      // Cache the result (use original xpath as key)
      if (element) {
        this.xpathCache.set(xpath, element);
      }
      
      return element;
    } catch (error) {
      this.log('Error evaluating XPath:', xpath, error);
      return null;
    }
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log('[SectionTracking]', ...args);
    }
  }

  /**
   * Update sections configuration
   */
  updateSections(sections: SectionConfig[]): void {
    if (this.isDestroyed) return;

    this.log('Updating sections configuration');
    
    // Disconnect observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    // Clear state
    this.sectionStates.clear();
    this.xpathCache.clear();

    // Update configuration
    this.sections = sections;

    // Reinitialize
    this.setupIntersectionObserver();
    this.initializeSections();
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.log('Destroying section tracking manager');
    
    this.isDestroyed = true;

    // Stop all periodic tracking timers
    this.sectionTimers.forEach((timerId) => {
      clearInterval(timerId);
    });
    this.sectionTimers.clear();

    // Flush any pending events
    this.flushPendingEvents();

    // Clear timers
    if (this.scrollDebounceTimer !== null) {
      clearTimeout(this.scrollDebounceTimer);
      this.scrollDebounceTimer = null;
    }

    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Disconnect intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Destroy attention quality manager
    this.attentionQuality.destroy();

    // Clear state
    this.sectionStates.clear();
    this.xpathCache.clear();
    this.pendingEvents = [];
  }
}

