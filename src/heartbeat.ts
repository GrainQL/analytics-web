/**
 * Heartbeat Manager for Grain Analytics
 * Tracks session activity with consent-aware behavior
 */

import type { ActivityDetector } from './activity';

export interface HeartbeatConfig {
  activeInterval: number; // Interval when user is active (ms)
  inactiveInterval: number; // Interval when user is inactive (ms)
  debug?: boolean;
}

export interface HeartbeatTracker {
  trackSystemEvent(eventName: string, properties: Record<string, unknown>): void;
  hasConsent(category?: string): boolean;
  getEffectiveUserId(): string;
  getEphemeralSessionId(): string;
  getSessionId(): string;
  getCurrentPage(): string | null;
  getEventCountSinceLastHeartbeat(): number;
  resetEventCountSinceLastHeartbeat(): void;
}

export class HeartbeatManager {
  private config: HeartbeatConfig;
  private tracker: HeartbeatTracker;
  private activityDetector: ActivityDetector;
  private heartbeatTimer: number | null = null;
  private isDestroyed = false;
  private lastHeartbeatTime: number;
  private currentInterval: number;
  private hasSentPageLoadHeartbeat = false;

  constructor(
    tracker: HeartbeatTracker,
    activityDetector: ActivityDetector,
    config: HeartbeatConfig
  ) {
    this.tracker = tracker;
    this.activityDetector = activityDetector;
    this.config = config;
    this.lastHeartbeatTime = Date.now();
    this.currentInterval = config.activeInterval;

    // Send initial heartbeat when page loads (if allowed by consent)
    this.sendPageLoadHeartbeat();
    
    // Start periodic heartbeat tracking
    this.scheduleNextHeartbeat();
  }

  /**
   * Send initial heartbeat when page loads
   */
  private sendPageLoadHeartbeat(): void {
    if (this.isDestroyed || this.hasSentPageLoadHeartbeat) return;

    // Wait for page to be fully loaded
    if (typeof window !== 'undefined' && document.readyState !== 'complete') {
      const handleLoad = () => {
        this.sendHeartbeat('page_load');
        this.hasSentPageLoadHeartbeat = true;
        window.removeEventListener('load', handleLoad);
      };
      window.addEventListener('load', handleLoad);
    } else {
      // Page is already loaded or we're in a non-browser environment
      this.sendHeartbeat('page_load');
      this.hasSentPageLoadHeartbeat = true;
    }
  }

  /**
   * Schedule the next heartbeat based on current activity
   */
  private scheduleNextHeartbeat(): void {
    if (this.isDestroyed) return;

    // Clear existing timer
    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
    }

    // Determine interval based on activity
    const isActive = this.activityDetector.isActive(60000); // 1 minute threshold
    this.currentInterval = isActive ? this.config.activeInterval : this.config.inactiveInterval;

    // Schedule next heartbeat
    this.heartbeatTimer = window.setTimeout(() => {
      this.sendHeartbeat('periodic');
      this.scheduleNextHeartbeat();
    }, this.currentInterval);

    if (this.config.debug) {
      console.log(
        `[Heartbeat] Scheduled next heartbeat in ${this.currentInterval / 1000}s (${isActive ? 'active' : 'inactive'})`
      );
    }
  }

  /**
   * Send heartbeat event
   */
  private sendHeartbeat(heartbeatType: 'periodic' | 'page_load' = 'periodic'): void {
    if (this.isDestroyed) return;

    const now = Date.now();
    const isActive = this.activityDetector.isActive(60000); // 1 minute threshold
    const hasConsent = this.tracker.hasConsent('analytics');

    // Base properties (always included)
    const properties: Record<string, unknown> = {
      heartbeat_type: heartbeatType,
      status: isActive ? 'active' : 'inactive',
      timestamp: now,
    };

    // Enhanced properties when consent is granted
    if (hasConsent) {
      const page = this.tracker.getCurrentPage();
      if (page) {
        properties.page = page;
      }
      
      properties.session_id = this.tracker.getSessionId();
      
      // Only include duration and event count for periodic heartbeats
      if (heartbeatType === 'periodic') {
        properties.duration = now - this.lastHeartbeatTime;
        properties.event_count = this.tracker.getEventCountSinceLastHeartbeat();
        
        // Reset event count
        this.tracker.resetEventCountSinceLastHeartbeat();
      }
    }

    // Track the heartbeat event
    this.tracker.trackSystemEvent('_grain_heartbeat', properties);

    this.lastHeartbeatTime = now;

    if (this.config.debug) {
      console.log('[Heartbeat] Sent heartbeat:', properties);
    }
  }

  /**
   * Destroy the heartbeat manager
   */
  destroy(): void {
    if (this.isDestroyed) return;

    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.isDestroyed = true;

    if (this.config.debug) {
      console.log('[Heartbeat] Destroyed');
    }
  }
}

