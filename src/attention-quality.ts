/**
 * Attention Quality Manager for Grain Analytics
 * Enforces policies to ensure tracked data represents genuine user attention
 * 
 * Policies:
 * 1. Page Visibility: Stop tracking when tab is hidden/backgrounded
 * 2. User Activity: Stop tracking when user is idle (no mouse/keyboard/touch)
 * 3. Section Duration Cap: Max attention per section before requiring transition
 * 4. Scroll Distance: Minimum scroll distance to count as meaningful engagement
 * 
 * See: ATTENTION_QUALITY_POLICY.md for detailed policy documentation
 */

import type { ActivityDetector } from './activity';

export interface AttentionQualityOptions {
  /**
   * Maximum continuous attention duration per section (ms)
   * Default: 9000 (9 seconds)
   */
  maxSectionDuration?: number;

  /**
   * Minimum scroll distance to reset attention timer (px)
   * Default: 100
   */
  minScrollDistance?: number;

  /**
   * Idle threshold - stop tracking after this period of inactivity (ms)
   * Default: 30000 (30 seconds)
   */
  idleThreshold?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

interface SectionAttentionState {
  sectionName: string;
  currentDuration: number; // Cumulative duration in current attention block
  lastScrollPosition: number;
  lastResetTime: number;
}

const DEFAULT_OPTIONS: Required<Omit<AttentionQualityOptions, 'debug'>> = {
  maxSectionDuration: 9000, // 9 seconds
  minScrollDistance: 100, // 100 pixels
  idleThreshold: 30000, // 30 seconds
};

export class AttentionQualityManager {
  private options: Required<Omit<AttentionQualityOptions, 'debug'>> & { debug: boolean };
  private activityDetector: ActivityDetector;
  private isDestroyed = false;

  // Page visibility tracking
  private isPageVisible = true;
  private visibilityChangeHandler: (() => void) | null = null;

  // Section attention state
  private sectionStates = new Map<string, SectionAttentionState>();

  // Policies applied reasons (for debugging/traceability)
  private lastFilterReason: string | null = null;

  constructor(activityDetector: ActivityDetector, options: AttentionQualityOptions = {}) {
    this.activityDetector = activityDetector;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      debug: options.debug ?? false,
    };

    this.setupPageVisibilityTracking();
  }

  /**
   * Setup page visibility tracking
   */
  private setupPageVisibilityTracking(): void {
    if (typeof document === 'undefined') return;

    this.isPageVisible = document.visibilityState === 'visible';

    this.visibilityChangeHandler = () => {
      const wasVisible = this.isPageVisible;
      this.isPageVisible = document.visibilityState === 'visible';

      if (!this.isPageVisible && wasVisible) {
        this.log('Page hidden - tracking paused');
      } else if (this.isPageVisible && !wasVisible) {
        this.log('Page visible - tracking resumed');
        // Reset all section states when page becomes visible again
        this.resetAllSections();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * Check if tracking should be allowed (global check)
   * Returns true if tracking is allowed, false if it should be paused
   */
  shouldTrack(): boolean {
    // Policy 1: Page Visibility
    if (!this.isPageVisible) {
      this.lastFilterReason = 'page_hidden';
      return false;
    }

    // Policy 2: User Activity
    if (!this.activityDetector.isActive(this.options.idleThreshold)) {
      this.lastFilterReason = 'user_idle';
      return false;
    }

    this.lastFilterReason = null;
    return true;
  }

  /**
   * Check if section view tracking should be allowed for a specific section
   * @param sectionName - Section identifier
   * @param currentScrollY - Current scroll position
   * @returns Object with shouldTrack boolean and optional reason
   */
  shouldTrackSection(sectionName: string, currentScrollY: number): {
    shouldTrack: boolean;
    reason?: string;
    resetAttention?: boolean;
  } {
    // First check global tracking state
    if (!this.shouldTrack()) {
      return {
        shouldTrack: false,
        reason: this.lastFilterReason || 'global_policy',
      };
    }

    // Get or create section state
    let state = this.sectionStates.get(sectionName);
    if (!state) {
      state = {
        sectionName,
        currentDuration: 0,
        lastScrollPosition: currentScrollY,
        lastResetTime: Date.now(),
      };
      this.sectionStates.set(sectionName, state);
    }

    // Policy 4: Scroll Distance - Check if user has scrolled enough to reset attention
    const scrollDistance = Math.abs(currentScrollY - state.lastScrollPosition);
    const hasScrolledEnough = scrollDistance >= this.options.minScrollDistance;

    if (hasScrolledEnough) {
      // Reset attention timer due to meaningful scroll
      this.log(`Section "${sectionName}": Attention reset due to ${Math.round(scrollDistance)}px scroll`);
      state.currentDuration = 0;
      state.lastScrollPosition = currentScrollY;
      state.lastResetTime = Date.now();
      return {
        shouldTrack: true,
        resetAttention: true,
      };
    }

    // Policy 3: Section Duration Cap
    if (state.currentDuration >= this.options.maxSectionDuration) {
      return {
        shouldTrack: false,
        reason: 'max_duration_reached',
      };
    }

    return {
      shouldTrack: true,
    };
  }

  /**
   * Update section duration (call this when tracking a section view event)
   * @param sectionName - Section identifier
   * @param durationMs - Duration to add to current attention block
   */
  updateSectionDuration(sectionName: string, durationMs: number): void {
    const state = this.sectionStates.get(sectionName);
    if (state) {
      state.currentDuration += durationMs;
      
      if (state.currentDuration >= this.options.maxSectionDuration) {
        this.log(`Section "${sectionName}": Max duration cap reached (${state.currentDuration}ms)`);
      }
    }
  }

  /**
   * Reset attention for a specific section (call when user navigates to different section)
   * @param sectionName - Section identifier
   */
  resetSection(sectionName: string): void {
    const state = this.sectionStates.get(sectionName);
    if (state) {
      this.log(`Section "${sectionName}": Attention reset (section exit)`);
      state.currentDuration = 0;
      state.lastResetTime = Date.now();
    }
  }

  /**
   * Reset all section attention states
   */
  resetAllSections(): void {
    this.log('Resetting all section attention states');
    for (const state of this.sectionStates.values()) {
      state.currentDuration = 0;
      state.lastResetTime = Date.now();
    }
  }

  /**
   * Get current attention state for a section (for debugging/monitoring)
   */
  getSectionState(sectionName: string): SectionAttentionState | undefined {
    return this.sectionStates.get(sectionName);
  }

  /**
   * Get reason why last tracking attempt was filtered
   */
  getLastFilterReason(): string | null {
    return this.lastFilterReason;
  }

  /**
   * Check if scroll tracking should be allowed
   * Similar to shouldTrack() but also checks scroll-specific conditions
   */
  shouldTrackScroll(previousScrollY: number, currentScrollY: number): {
    shouldTrack: boolean;
    reason?: string;
  } {
    // First check global tracking state
    if (!this.shouldTrack()) {
      return {
        shouldTrack: false,
        reason: this.lastFilterReason || 'global_policy',
      };
    }

    // Check if scroll is meaningful
    const scrollDistance = Math.abs(currentScrollY - previousScrollY);
    if (scrollDistance < 10) { // Minimum 10px to count as scroll
      return {
        shouldTrack: false,
        reason: 'scroll_too_small',
      };
    }

    return {
      shouldTrack: true,
    };
  }

  /**
   * Get all active policies as object (for monitoring/debugging)
   */
  getPolicies(): {
    maxSectionDuration: number;
    minScrollDistance: number;
    idleThreshold: number;
  } {
    return {
      maxSectionDuration: this.options.maxSectionDuration,
      minScrollDistance: this.options.minScrollDistance,
      idleThreshold: this.options.idleThreshold,
    };
  }

  /**
   * Get current tracking state (for monitoring/debugging)
   */
  getTrackingState(): {
    isPageVisible: boolean;
    isUserActive: boolean;
    timeSinceLastActivity: number;
    activeSections: number;
  } {
    return {
      isPageVisible: this.isPageVisible,
      isUserActive: this.activityDetector.isActive(this.options.idleThreshold),
      timeSinceLastActivity: this.activityDetector.getTimeSinceLastActivity(),
      activeSections: this.sectionStates.size,
    };
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log('[AttentionQuality]', ...args);
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Remove visibility change listener
    if (this.visibilityChangeHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    // Clear section states
    this.sectionStates.clear();
  }
}

