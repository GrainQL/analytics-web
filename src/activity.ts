/**
 * Activity Detection for Grain Analytics
 * Tracks user activity (mouse, keyboard, touch, scroll) to determine if user is active
 */

export class ActivityDetector {
  private lastActivityTime: number;
  private activityThreshold: number = 30000; // 30 seconds
  private listeners: Array<() => void> = [];
  private boundActivityHandler: () => void;
  private isDestroyed = false;

  // Events that indicate user activity
  private readonly activityEvents = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'click',
  ] as const;

  constructor() {
    this.lastActivityTime = Date.now();
    this.boundActivityHandler = this.debounce(this.handleActivity.bind(this), 500);
    this.setupListeners();
  }

  /**
   * Setup event listeners for activity detection
   */
  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    for (const event of this.activityEvents) {
      window.addEventListener(event, this.boundActivityHandler, { passive: true });
    }
  }

  /**
   * Handle activity event
   */
  private handleActivity(): void {
    if (this.isDestroyed) return;
    this.lastActivityTime = Date.now();
    this.notifyListeners();
  }

  /**
   * Debounce function to limit how often activity handler is called
   */
  private debounce(func: () => void, wait: number): () => void {
    let timeout: number | null = null;
    
    return () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      
      timeout = window.setTimeout(() => {
        func();
        timeout = null;
      }, wait);
    };
  }

  /**
   * Check if user is currently active
   * @param threshold Time in ms to consider user inactive (default: 30s)
   */
  isActive(threshold?: number): boolean {
    const thresholdToUse = threshold ?? this.activityThreshold;
    const now = Date.now();
    return (now - this.lastActivityTime) < thresholdToUse;
  }

  /**
   * Get time since last activity in milliseconds
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Get last activity timestamp
   */
  getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  /**
   * Set activity threshold
   */
  setActivityThreshold(threshold: number): void {
    this.activityThreshold = threshold;
  }

  /**
   * Add listener for activity changes
   */
  addListener(listener: () => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove listener
   */
  removeListener(listener: () => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        // Silent failure - listener threw an error
      }
    }
  }

  /**
   * Cleanup and remove listeners
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    if (typeof window !== 'undefined') {
      for (const event of this.activityEvents) {
        window.removeEventListener(event, this.boundActivityHandler);
      }
    }
    
    this.listeners = [];
    this.isDestroyed = true;
  }
}

