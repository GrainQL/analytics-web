/**
 * Type definitions for Heatmap Tracking
 */

export interface HeatmapClickData {
  pageUrl: string;
  xpath: string;
  viewportX: number;
  viewportY: number;
  pageX: number;
  pageY: number;
  elementTag: string;
  elementText?: string;
  timestamp: number;
}

export interface HeatmapScrollData {
  pageUrl: string;
  viewportSection: number; // 0, 1, 2, 3... (0 = 0-100vh, 1 = 100-200vh)
  scrollDepthPx: number;
  durationMs: number;
  entryTimestamp: number;
  exitTimestamp: number;
  pageHeight: number;
  viewportHeight: number;
}

export interface HeatmapTrackingOptions {
  scrollDebounceDelay: number; // Delay for debouncing scroll events
  batchDelay: number; // Delay before batching and sending events
  maxBatchSize: number; // Maximum events to batch before sending
  debug?: boolean;
  // Attention quality options (applied via AttentionQualityManager)
  maxSectionDuration?: number; // Max continuous attention per viewport section (default: 9000ms)
  minScrollDistance?: number; // Min scroll to reset attention (default: 100px)
  idleThreshold?: number; // Idle time before pausing tracking (default: 30000ms)
}

export interface HeatmapScrollState {
  viewportSection: number;
  entryTime: number;
  scrollDepthPx: number;
}

export interface HeatmapTrackingState {
  currentScrollState: HeatmapScrollState | null;
  pendingClicks: HeatmapClickData[];
  pendingScrolls: HeatmapScrollData[];
}

