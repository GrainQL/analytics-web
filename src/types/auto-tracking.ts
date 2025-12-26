/**
 * Auto-tracking types for Grain Analytics SDK
 */

export interface InteractionConfig {
  eventName: string;
  description: string;
  selector: string; // XPath selector
  priority: number; // 1-5, where 5 is highest priority
  label: string;
}

export interface SectionConfig {
  sectionName: string;
  description: string;
  sectionType: string; // Flexible string to allow future section types
  selector: string; // XPath selector
  importance: number; // 1-5, where 5 is most important
}

export interface AutoTrackingConfig {
  interactions: InteractionConfig[];
  sections: SectionConfig[];
}

export interface SectionViewData {
  sectionName: string;
  sectionType: string;
  entryTime: number;
  exitTime: number;
  duration: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollDepth: number; // percentage
  visibleAreaPercentage: number;
  scrollSpeedAtEntry?: number;
  scrollSpeedAtExit?: number;
}

export interface SectionTrackingOptions {
  minDwellTime: number; // Minimum time (ms) to count as a view
  scrollVelocityThreshold: number; // Pixels per second to consider as meaningful engagement
  intersectionThreshold: number; // Percentage of section that must be visible (0-1)
  debounceDelay: number; // Delay for debouncing scroll events
  batchDelay: number; // Delay before batching and sending events
  debug?: boolean;
  // Attention quality options (applied via AttentionQualityManager)
  maxSectionDuration?: number; // Max continuous attention per section (default: 9000ms)
  minScrollDistance?: number; // Min scroll to reset attention (default: 100px)
  idleThreshold?: number; // Idle time before pausing tracking (default: 30000ms)
}

export interface SectionTrackingState {
  element: Element;
  config: SectionConfig;
  entryTime: number | null;
  exitTime: number | null;
  isVisible: boolean;
  lastScrollPosition: number;
  lastScrollTime: number;
  entryScrollSpeed: number;
  exitScrollSpeed: number;
  maxVisibleArea: number;
}

