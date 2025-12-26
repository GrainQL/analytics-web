/**
 * Grain Analytics Web SDK
 * A lightweight, dependency-free TypeScript SDK for sending analytics events to Grain's REST API
 */

import { ConsentManager, ConsentState, ConsentMode } from './consent';
import { setCookie, getCookie, deleteCookie, areCookiesEnabled, CookieConfig } from './cookies';
import { ActivityDetector } from './activity';
import { HeartbeatManager, type HeartbeatTracker } from './heartbeat';
import { PageTrackingManager, type PageTracker } from './page-tracking';
import {
  categorizeReferrer,
  parseUTMParameters,
  getOrCreateFirstTouchAttribution,
  getSessionUTMParameters,
  getFirstTouchAttribution,
  type ReferrerCategory,
  type UTMParameters,
  type FirstTouchAttribution,
} from './attribution';

// Re-export attribution types and functions
export type { ReferrerCategory, UTMParameters, FirstTouchAttribution };
export { categorizeReferrer, parseUTMParameters };

// Re-export timezone-country utilities
export { getCountry, getCountryCodeFromTimezone, getState } from './countries';

// Re-export auto-tracking types
export type {
  InteractionConfig,
  SectionConfig,
  AutoTrackingConfig,
  SectionViewData,
  SectionTrackingOptions,
} from './types/auto-tracking';

export interface GrainEvent {
  eventName: string;
  userId?: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

export interface EventPayload {
  eventName: string;
  userId: string;
  properties: Record<string, unknown>;
}

export type AuthStrategy = 'NONE' | 'SERVER_SIDE' | 'JWT';

export interface AuthProvider {
  getToken(): Promise<string> | string;
}

// Re-export privacy types
export type { ConsentState, ConsentMode, CookieConfig };

export interface GrainConfig {
  tenantId: string;
  apiUrl?: string;
  authStrategy?: AuthStrategy;
  secretKey?: string; // For SERVER_SIDE auth
  authProvider?: AuthProvider; // For JWT auth
  userId?: string; // Global user ID for all events
  batchSize?: number;
  flushInterval?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
  maxEventsPerRequest?: number; // Maximum events to send in a single API request
  debug?: boolean;
  // Remote Config options
  defaultConfigurations?: Record<string, string>; // Default values for configurations
  configCacheKey?: string; // Custom cache key for configurations
  configRefreshInterval?: number; // Auto-refresh interval in milliseconds (default: 5 minutes)
  enableConfigCache?: boolean; // Enable/disable configuration caching (default: true)
  // Privacy & Consent options
  consentMode?: ConsentMode; // 'opt-in' | 'opt-out' | 'disabled' (default: 'opt-out')
  waitForConsent?: boolean; // Queue events until consent is granted (default: false)
  enableCookies?: boolean; // Use cookies for persistent user ID (default: false)
  cookieOptions?: CookieConfig; // Cookie configuration options
  anonymizeIP?: boolean; // Anonymize IP addresses (default: false)
  disableAutoProperties?: boolean; // Disable automatic property collection (default: false)
  allowedProperties?: string[]; // Whitelist of allowed event properties (default: all)
  // Automatic Tracking options
  enableHeartbeat?: boolean; // Enable heartbeat tracking (default: true)
  heartbeatActiveInterval?: number; // Active interval in ms (default: 120000 - 2 min)
  heartbeatInactiveInterval?: number; // Inactive interval in ms (default: 300000 - 5 min)
  enableAutoPageView?: boolean; // Enable automatic page view tracking (default: true)
  stripQueryParams?: boolean; // Strip query params from URLs (default: true)
  // Heatmap Tracking options
  enableHeatmapTracking?: boolean; // Enable heatmap tracking (default: true)
}

export interface SendEventOptions {
  flush?: boolean; // Force immediate send
}

export interface SetPropertyOptions {
  userId?: string; // Override global userId
}

export interface LoginOptions {
  userId?: string; // User ID to set
  authToken?: string; // Auth token to set for JWT auth
  authStrategy?: AuthStrategy; // Override auth strategy
}

export interface PropertyPayload {
  userId: string;
  [key: string]: string; // All property values must be strings
}

// Remote Config interfaces
export interface RemoteConfigRequest {
  userId: string;
  immediateKeys: string[];
  properties?: Record<string, string>;
  currentUrl?: string; // Optional current URL for page-specific configs
}

export interface RemoteConfigResponse {
  userId: string;
  snapshotId: string;
  configurations: Record<string, string>;
  isFinal: boolean;
  qualifiedSegments: string[];
  qualifiedRuleSets: string[];
  timestamp: string;
  isFromCache: boolean;
  autoTrackingConfig?: {
    interactions: Array<{
      eventName: string;
      description: string;
      selector: string;
      priority: number;
      label: string;
    }>;
    sections: Array<{
      sectionName: string;
      description: string;
      sectionType: string;
      selector: string;
      importance: number;
    }>;
  };
}

export interface RemoteConfigOptions {
  immediateKeys?: string[];
  properties?: Record<string, string>;
  userId?: string; // Override global userId
  forceRefresh?: boolean; // Force fetch from API, bypass cache
}

export interface RemoteConfigCache {
  configurations: Record<string, string>;
  snapshotId: string;
  timestamp: string;
  userId: string;
}

export type ConfigChangeListener = (configurations: Record<string, string>) => void;

// Template event interfaces
export interface LoginEventProperties extends Record<string, unknown> {
  method?: string; // 'email', 'google', 'facebook', etc.
  success?: boolean;
  errorMessage?: string;
  loginAttempt?: number;
  rememberMe?: boolean;
  twoFactorEnabled?: boolean;
}

export interface SignupEventProperties extends Record<string, unknown> {
  method?: string; // 'email', 'google', 'facebook', etc.
  source?: string; // 'landing_page', 'referral', 'ad', etc.
  plan?: string; // 'free', 'pro', 'enterprise', etc.
  success?: boolean;
  errorMessage?: string;
}

export interface CheckoutEventProperties extends Record<string, unknown> {
  orderId?: string;
  total?: number;
  currency?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  paymentMethod?: string; // 'credit_card', 'paypal', 'stripe', etc.
  success?: boolean;
  errorMessage?: string;
  couponCode?: string;
  discount?: number;
}

export interface PageViewEventProperties extends Record<string, unknown> {
  page?: string;
  title?: string;
  referrer?: string;
  url?: string;
  userAgent?: string;
  screenResolution?: string;
  viewportSize?: string;
}

export interface PurchaseEventProperties extends Record<string, unknown> {
  orderId?: string;
  total?: number;
  currency?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }>;
  paymentMethod?: string;
  shippingMethod?: string;
  tax?: number;
  shipping?: number;
  discount?: number;
  couponCode?: string;
}

export interface SearchEventProperties extends Record<string, unknown> {
  query?: string;
  results?: number;
  filters?: Record<string, unknown>;
  sortBy?: string;
  category?: string;
  success?: boolean;
}

export interface AddToCartEventProperties extends Record<string, unknown> {
  itemId?: string;
  itemName?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  category?: string;
  variant?: string;
}

export interface RemoveFromCartEventProperties extends Record<string, unknown> {
  itemId?: string;
  itemName?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  category?: string;
  variant?: string;
}

// Error handling interfaces
export interface ErrorDigest {
  eventCount: number;
  totalProperties: number;
  totalSize: number;
  eventNames: string[];
  userIds: string[];
}

export interface FormattedError {
  code: string;
  message: string;
  digest: ErrorDigest;
  timestamp: string;
  context: string;
  originalError?: unknown;
}

/**
 * Main Grain Analytics client
 * 
 * Features:
 * - Automatic UUIDv4 generation for anonymous users
 * - Login/logout functionality for dynamic auth token injection
 * - Persistent anonymous user ID across sessions (when consent is granted)
 * - Support for multiple auth strategies (NONE, SERVER_SIDE, JWT)
 * - GDPR-compliant consent management with strict opt-in mode
 * - Optional cookie support for cross-session tracking
 * 
 * GDPR Compliance (Opt-in Mode):
 * - Without consent: Only ephemeral session IDs (memory-only) are used
 * - No cookies or localStorage identifiers until consent is granted
 * - Exceptions: User explicitly identified via identify()/login() or JWT auth
 * - Remote config cache and consent preferences use localStorage (functional/necessary)
 */
type RequiredConfig = Required<Omit<GrainConfig, 'secretKey' | 'authProvider' | 'userId' | 'cookieOptions' | 'allowedProperties'>> & {
  secretKey?: string;
  authProvider?: AuthProvider;
  userId?: string;
  cookieOptions?: CookieConfig;
  allowedProperties?: string[];
};

export class GrainAnalytics implements HeartbeatTracker, PageTracker {
  private config: RequiredConfig;
  private eventQueue: EventPayload[] = [];
  private waitingForConsentQueue: EventPayload[] = [];
  private flushTimer: number | null = null;
  private isDestroyed = false;
  private globalUserId: string | null = null;
  private persistentAnonymousUserId: string | null = null;
  // Remote Config properties
  private configCache: RemoteConfigCache | null = null;
  private configRefreshTimer: number | null = null;
  private configChangeListeners: ConfigChangeListener[] = [];
  private configFetchPromise: Promise<RemoteConfigResponse> | null = null;
  // Privacy & Consent properties
  private consentManager: ConsentManager;
  private cookiesEnabled: boolean = false;
  // Automatic Tracking properties
  private activityDetector: ActivityDetector | null = null;
  private heartbeatManager: HeartbeatManager | null = null;
  private pageTrackingManager: PageTrackingManager | null = null;
  private ephemeralSessionId: string | null = null;
  private eventCountSinceLastHeartbeat: number = 0;
  // Auto-tracking properties
  private interactionTrackingManager: any | null = null;
  private sectionTrackingManager: any | null = null;
  private heatmapTrackingManager: any | null = null;
  // Session tracking
  private sessionStartTime: number = Date.now();
  private sessionEventCount: number = 0;
  // Debug mode properties
  private debugAgent: any | null = null;
  private isDebugMode: boolean = false;

  constructor(config: GrainConfig) {
    this.config = {
      apiUrl: 'https://api.grainql.com',
      authStrategy: 'NONE',
      batchSize: 50,
      flushInterval: 5000, // 5 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      maxEventsPerRequest: 160, // Maximum events per API request
      debug: false,
      // Remote Config defaults
      defaultConfigurations: {},
      configCacheKey: 'grain_config',
      configRefreshInterval: 300000, // 5 minutes
      enableConfigCache: true,
      // Privacy defaults
      consentMode: 'opt-out',
      waitForConsent: false,
      enableCookies: false,
      anonymizeIP: false,
      disableAutoProperties: false,
      // Automatic Tracking defaults
      enableHeartbeat: true,
      heartbeatActiveInterval: 120000, // 2 minutes
      heartbeatInactiveInterval: 300000, // 5 minutes
      enableAutoPageView: true,
      stripQueryParams: true,
      // Heatmap Tracking defaults
      enableHeatmapTracking: true,
      ...config,
      tenantId: config.tenantId,
    };

    // Initialize consent manager
    this.consentManager = new ConsentManager(this.config.tenantId, this.config.consentMode);

    // Check if cookies are enabled
    if (this.config.enableCookies) {
      this.cookiesEnabled = areCookiesEnabled();
      if (!this.cookiesEnabled && this.config.debug) {
        console.warn('[Grain Analytics] Cookies are not available, falling back to localStorage');
      }
    }

    // Set global userId if provided in config
    if (config.userId) {
      this.globalUserId = config.userId;
    }

    this.validateConfig();
    this.initializePersistentAnonymousUserId();
    this.setupBeforeUnload();
    this.startFlushTimer();
    this.initializeConfigCache();

    // Initialize ephemeral session ID (memory-only, not persisted)
    this.ephemeralSessionId = this.generateUUID();

    // Initialize automatic tracking (browser only)
    if (typeof window !== 'undefined') {
      // Check for debug mode before initializing tracking
      this.checkAndInitializeDebugMode();
      
      this.initializeAutomaticTracking();
      // Track session start
      this.trackSessionStart();
      // Initialize heatmap tracking if enabled
      if (this.config.enableHeatmapTracking) {
        this.initializeHeatmapTracking();
      }
    }

    // Set up consent change listener to flush waiting events and handle consent upgrade
    this.consentManager.addListener((state) => {
      if (state.granted) {
        this.handleConsentGranted();
      }
    });
  }

  private validateConfig(): void {
    if (!this.config.tenantId) {
      throw new Error('Grain Analytics: tenantId is required');
    }

    if (this.config.authStrategy === 'SERVER_SIDE' && !this.config.secretKey) {
      throw new Error('Grain Analytics: secretKey is required for SERVER_SIDE auth strategy');
    }

    if (this.config.authStrategy === 'JWT' && !this.config.authProvider) {
      throw new Error('Grain Analytics: authProvider is required for JWT auth strategy');
    }
  }

  /**
   * Generate a UUID v4 string
   */
  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Check if we should allow persistent storage (GDPR compliance)
   * 
   * Returns true if:
   * - Consent has been granted, OR
   * - Not in opt-in mode, OR
   * - User has been explicitly identified by the site (login/identify), OR
   * - Using JWT auth strategy (functional/essential purpose)
   */
  private shouldAllowPersistentStorage(): boolean {
    const hasConsent = this.consentManager.hasConsent('analytics');
    const isOptInMode = this.config.consentMode === 'opt-in';
    const userExplicitlyIdentified = !!this.globalUserId;
    const isJWTAuth = this.config.authStrategy === 'JWT';
    
    // Allow persistent storage if any of these conditions are met
    return hasConsent || !isOptInMode || userExplicitlyIdentified || isJWTAuth;
  }

  /**
   * Generate a proper UUIDv4 identifier for anonymous user ID
   */
  private generateAnonymousUserId(): string {
    return this.generateUUID();
  }

  /**
   * Initialize persistent anonymous user ID from cookies or localStorage
   * Priority: Cookie → localStorage → generate new
   * 
   * GDPR Compliance: In opt-in mode without consent, we skip loading/saving
   * persistent IDs unless the user has been explicitly identified by the site
   * or when using JWT auth (functional/essential purpose)
   */
  private initializePersistentAnonymousUserId(): void {
    if (typeof window === 'undefined') return;

    // Check if we should avoid persistent storage (GDPR compliance)
    if (!this.shouldAllowPersistentStorage()) {
      this.log('Opt-in mode without consent: skipping persistent ID initialization (GDPR compliance)');
      return; // Don't load or create persistent ID
    }

    const storageKey = `grain_anonymous_user_id_${this.config.tenantId}`;
    const cookieName = '_grain_uid';
    
    try {
      // Try to load from cookie first if enabled
      if (this.cookiesEnabled) {
        const cookieValue = getCookie(cookieName);
        if (cookieValue) {
          this.persistentAnonymousUserId = cookieValue;
          this.log('Loaded persistent anonymous user ID from cookie:', this.persistentAnonymousUserId);
          return;
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        this.persistentAnonymousUserId = stored;
        this.log('Loaded persistent anonymous user ID from localStorage:', this.persistentAnonymousUserId);
        
        // Migrate to cookie if enabled
        if (this.cookiesEnabled) {
          this.savePersistentAnonymousUserId(stored);
        }
      } else {
        // Generate new UUIDv4 anonymous user ID
        this.persistentAnonymousUserId = this.generateAnonymousUserId();
        this.savePersistentAnonymousUserId(this.persistentAnonymousUserId);
        this.log('Generated new persistent anonymous user ID:', this.persistentAnonymousUserId);
      }
    } catch (error) {
      this.log('Failed to initialize persistent anonymous user ID:', error);
      // Fallback: generate temporary ID without persistence
      this.persistentAnonymousUserId = this.generateAnonymousUserId();
    }
  }

  /**
   * Save persistent anonymous user ID to cookie and/or localStorage
   * 
   * GDPR Compliance: In opt-in mode without consent, we don't persist IDs
   * unless the user has been explicitly identified or using JWT auth
   */
  private savePersistentAnonymousUserId(userId: string): void {
    if (typeof window === 'undefined') return;

    // Check if we should avoid persistent storage (GDPR compliance)
    if (!this.shouldAllowPersistentStorage()) {
      this.log('Opt-in mode without consent: skipping persistent ID save (GDPR compliance)');
      return; // Don't save persistent ID
    }

    const storageKey = `grain_anonymous_user_id_${this.config.tenantId}`;
    const cookieName = '_grain_uid';

    try {
      // Save to cookie if enabled
      if (this.cookiesEnabled) {
        const cookieOptions: CookieConfig = {
          maxAge: 365 * 24 * 60 * 60, // 365 days
          sameSite: 'lax',
          secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
          ...this.config.cookieOptions,
        };
        setCookie(cookieName, userId, cookieOptions);
      }

      // Always save to localStorage as fallback
      localStorage.setItem(storageKey, userId);
    } catch (error) {
      this.log('Failed to save persistent anonymous user ID:', error);
    }
  }

  /**
   * Get the effective user ID (global userId or persistent anonymous ID)
   * 
   * GDPR Compliance: In opt-in mode without consent and no explicit user identification,
   * this should not be called. Use getEphemeralSessionId() instead.
   */
  private getEffectiveUserIdInternal(): string {
    if (this.globalUserId) {
      return this.globalUserId;
    }
    
    if (this.persistentAnonymousUserId) {
      return this.persistentAnonymousUserId;
    }
    
    // Generate a new UUIDv4 identifier as fallback
    this.persistentAnonymousUserId = this.generateAnonymousUserId();
    
    // Try to persist it (will be skipped in opt-in mode without consent)
    this.savePersistentAnonymousUserId(this.persistentAnonymousUserId);
    
    return this.persistentAnonymousUserId;
  }

  log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[Grain Analytics]', ...args);
    }
  }

  /**
   * Create error digest from events
   */
  private createErrorDigest(events: EventPayload[]): ErrorDigest {
    const eventNames = [...new Set(events.map(e => e.eventName))];
    const userIds = [...new Set(events.map(e => e.userId))];
    
    let totalProperties = 0;
    let totalSize = 0;
    
    events.forEach(event => {
      const properties = event.properties || {};
      totalProperties += Object.keys(properties).length;
      totalSize += JSON.stringify(event).length;
    });

    return {
      eventCount: events.length,
      totalProperties,
      totalSize,
      eventNames,
      userIds,
    };
  }

  /**
   * Format error with beautiful structure
   */
  private formatError(
    error: unknown,
    context: string,
    events?: EventPayload[]
  ): FormattedError {
    const digest = events ? this.createErrorDigest(events) : {
      eventCount: 0,
      totalProperties: 0,
      totalSize: 0,
      eventNames: [],
      userIds: [],
    };

    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';

    if (error instanceof Error) {
      message = error.message;
      
      // Determine error code based on error type and message
      if (message.includes('fetch failed') || message.includes('network error')) {
        code = 'NETWORK_ERROR';
      } else if (message.includes('timeout')) {
        code = 'TIMEOUT_ERROR';
      } else if (message.includes('HTTP 4')) {
        code = 'CLIENT_ERROR';
      } else if (message.includes('HTTP 5')) {
        code = 'SERVER_ERROR';
      } else if (message.includes('JSON')) {
        code = 'PARSE_ERROR';
      } else if (message.includes('auth') || message.includes('unauthorized')) {
        code = 'AUTH_ERROR';
      } else if (message.includes('rate limit') || message.includes('429')) {
        code = 'RATE_LIMIT_ERROR';
      } else {
        code = 'GENERAL_ERROR';
      }
    } else if (typeof error === 'string') {
      message = error;
      code = 'STRING_ERROR';
    } else if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      code = `HTTP_${status}`;
      message = `HTTP ${status} error`;
    }

    return {
      code,
      message,
      digest,
      timestamp: new Date().toISOString(),
      context,
      originalError: error,
    };
  }

  /**
   * Log formatted error gracefully
   */
  private logError(formattedError: FormattedError): void {
    // Only log errors in debug mode to reduce noise in production
    if (!this.config.debug) return;
    
    const { code, message, digest, timestamp, context } = formattedError;
    
    const errorOutput = {
      '🚨 Grain Analytics Error': {
        'Error Code': code,
        'Message': message,
        'Context': context,
        'Timestamp': timestamp,
        'Event Digest': {
          'Events': digest.eventCount,
          'Properties': digest.totalProperties,
          'Size (bytes)': digest.totalSize,
          'Event Names': digest.eventNames.length > 0 ? digest.eventNames.join(', ') : 'None',
          'User IDs': digest.userIds.length > 0 ? digest.userIds.slice(0, 3).join(', ') + (digest.userIds.length > 3 ? '...' : '') : 'None',
        }
      }
    };

    console.error('🚨 Grain Analytics Error:', errorOutput);
      console.error(`[Grain Analytics] ${code}: ${message} (${context}) - Events: ${digest.eventCount}, Props: ${digest.totalProperties}, Size: ${digest.totalSize}B`);
  }

  /**
   * Safely execute a function with error handling
   */
  private async safeExecute<T>(
    fn: () => Promise<T>,
    context: string,
    events?: EventPayload[]
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      const formattedError = this.formatError(error, context, events);
      this.logError(formattedError);
      return null;
    }
  }

  private formatEvent(event: GrainEvent): EventPayload {
    const properties = event.properties || {};
    
    // Auto-enrich events with session-level attribution properties
    // This ensures UTM parameters and attribution data are available on ALL events, not just page_view
    if (!this.config.disableAutoProperties && typeof window !== 'undefined') {
      const hasConsent = this.consentManager.hasConsent('analytics');
      
      // Only enrich if not a system event (they handle their own properties)
      const isSystemEvent = event.eventName.startsWith('_grain_');
      
      if (!isSystemEvent && hasConsent) {
        // Get session UTM parameters
        const sessionUTMs = getSessionUTMParameters();
        if (sessionUTMs) {
          if (sessionUTMs.utm_source) properties.utm_source = sessionUTMs.utm_source;
          if (sessionUTMs.utm_medium) properties.utm_medium = sessionUTMs.utm_medium;
          if (sessionUTMs.utm_campaign) properties.utm_campaign = sessionUTMs.utm_campaign;
          if (sessionUTMs.utm_term) properties.utm_term = sessionUTMs.utm_term;
          if (sessionUTMs.utm_content) properties.utm_content = sessionUTMs.utm_content;
        }
        
        // Get first-touch attribution
        const firstTouch = getFirstTouchAttribution(this.config.tenantId);
        if (firstTouch) {
          properties.first_touch_source = firstTouch.source;
          properties.first_touch_medium = firstTouch.medium;
          properties.first_touch_campaign = firstTouch.campaign;
          properties.first_touch_referrer_category = firstTouch.referrer_category;
        }
        
        // Add session ID if not already present
        if (!properties.session_id) {
          properties.session_id = this.getSessionId();
        }
      }
    }
    
    return {
      eventName: event.eventName,
      userId: event.userId || this.getEffectiveUserIdInternal(),
      properties,
    };
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.authStrategy) {
      case 'NONE':
        break;
      case 'SERVER_SIDE':
        headers['Authorization'] = `Chase ${this.config.secretKey}`;
        break;
      case 'JWT':
        if (this.config.authProvider) {
          const token = await this.config.authProvider.getToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;
    }

    return headers;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetriableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Check for specific network or fetch errors
      const message = error.message.toLowerCase();
      if (message.includes('fetch failed')) return true;
      if (message === 'network error') return true; // Exact match to avoid "Non-network error"
      if (message.includes('timeout')) return true;
      if (message.includes('connection')) return true;
    }
    
    // Check for HTTP status codes that are retriable
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status;
      return status >= 500 || status === 429; // Server errors or rate limiting
    }
    
    return false;
  }

  private async sendEvents(events: EventPayload[]): Promise<void> {
    if (events.length === 0) return;

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const headers = await this.getAuthHeaders();
        const url = `${this.config.apiUrl}/v1/events/${encodeURIComponent(this.config.tenantId)}/multi`;

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(events),
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorBody = await response.json();
            if (errorBody?.message) {
              errorMessage = errorBody.message;
            }
          } catch {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          }
          
          const error = new Error(`Failed to send events: ${errorMessage}`) as Error & { status?: number };
          error.status = response.status;
          throw error;
        }

        this.log(`Successfully sent ${events.length} events`);
        return; // Success, exit retry loop
        
      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.retryAttempts) {
          // Last attempt, don't retry - log error gracefully
          const formattedError = this.formatError(error, `sendEvents (attempt ${attempt + 1}/${this.config.retryAttempts + 1})`, events);
          this.logError(formattedError);
          return; // Don't throw, just return gracefully
        }
        
        if (!this.isRetriableError(error)) {
          // Non-retriable error, don't retry - log error gracefully
          const formattedError = this.formatError(error, `sendEvents (non-retriable error)`, events);
          this.logError(formattedError);
          return; // Don't throw, just return gracefully
        }
        
        const delayMs = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
        this.log(`Retrying in ${delayMs}ms after error:`, error);
        await this.delay(delayMs);
      }
    }
  }

  private async sendEventsWithBeacon(events: EventPayload[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.config.apiUrl}/v1/events/${encodeURIComponent(this.config.tenantId)}/multi`;

      // Send events array directly (not wrapped in object) to match API expectation
      const body = JSON.stringify(events);

      // Beacon API doesn't support custom headers, so only use it for unauthenticated requests
      const needsAuth = this.config.authStrategy !== 'NONE';

      // Try beacon API first (more reliable for page unload, but only if no auth needed)
      if (!needsAuth && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' });
        const success = navigator.sendBeacon(url, blob);
        
        if (success) {
          this.log(`Successfully sent ${events.length} events via beacon`);
          return;
        }
      }

      // Use fetch with keepalive (supports headers and works during page unload)
      await fetch(url, {
        method: 'POST',
        headers,
        body,
        keepalive: true,
      });
    } catch (error) {
      // Log error gracefully for beacon failures (page unload scenarios)
      const formattedError = this.formatError(error, 'sendEventsWithBeacon', events);
      this.logError(formattedError);
    }
  }

  private startFlushTimer(): void {
    if (typeof window === 'undefined') return;
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = window.setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush().catch((error) => {
          const formattedError = this.formatError(error, 'auto-flush');
          this.logError(formattedError);
        });
      }
    }, this.config.flushInterval);
  }

  private setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      // Track session end
      this.trackSessionEnd();
      
      if (this.eventQueue.length > 0) {
        // Use beacon API for reliable delivery during page unload
        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];
        
        const chunks = this.chunkEvents(eventsToSend, this.config.maxEventsPerRequest);
        
        // Send first chunk with beacon (most important for page unload)
        if (chunks.length > 0) {
          this.sendEventsWithBeacon(chunks[0]).catch(() => {
            // Silently fail - page is unloading
          });
        }
      }
    };

    // Handle page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    // Handle visibility change (page hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.eventQueue.length > 0) {
        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];
        
        const chunks = this.chunkEvents(eventsToSend, this.config.maxEventsPerRequest);
        
        // Send first chunk with beacon (most important for page hidden)
        if (chunks.length > 0) {
          this.sendEventsWithBeacon(chunks[0]).catch(() => {
            // Silently fail
          });
        }
      }
    });
  }

  /**
   * Initialize automatic tracking (heartbeat and page views)
   */
  private initializeAutomaticTracking(): void {
    if (this.config.enableHeartbeat) {
      try {
        this.activityDetector = new ActivityDetector();
        this.heartbeatManager = new HeartbeatManager(
          this,
          this.activityDetector,
          {
            activeInterval: this.config.heartbeatActiveInterval,
            inactiveInterval: this.config.heartbeatInactiveInterval,
            debug: this.config.debug,
          }
        );
      } catch (error) {
        this.log('Failed to initialize heartbeat tracking:', error);
      }
    }

    if (this.config.enableAutoPageView) {
      try {
        this.pageTrackingManager = new PageTrackingManager(
          this,
          {
            stripQueryParams: this.config.stripQueryParams,
            debug: this.config.debug,
            tenantId: this.config.tenantId,
          }
        );
      } catch (error) {
        this.log('Failed to initialize page view tracking:', error);
      }
    }

    // Initialize auto-tracking when config is available
    this.initializeAutoTracking();
  }

  /**
   * Initialize heatmap tracking
   */
  private initializeHeatmapTracking(): void {
    if (typeof window === 'undefined') return;
    
    try {
      this.log('Initializing heatmap tracking');
      
      import('./heatmap-tracking').then(({ HeatmapTrackingManager }) => {
        try {
          this.heatmapTrackingManager = new HeatmapTrackingManager(
            this,
            {
              scrollDebounceDelay: 100,
              batchDelay: 2000,
              maxBatchSize: 20,
              debug: this.config.debug,
            }
          );
          this.log('Heatmap tracking initialized');
        } catch (error) {
          this.log('Failed to initialize heatmap tracking:', error);
        }
      }).catch((error) => {
        this.log('Failed to load heatmap tracking module:', error);
      });
    } catch (error) {
      this.log('Failed to initialize heatmap tracking:', error);
    }
  }

  /**
   * Initialize auto-tracking (interactions and sections)
   */
  private async initializeAutoTracking(): Promise<void> {
    try {
      this.log('Initializing auto-tracking');
      
      // Fetch remote config to get auto-tracking configuration
      const userId = this.globalUserId || this.persistentAnonymousUserId || this.generateUUID();
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      
      // Fetch config with currentUrl
      const request: RemoteConfigRequest = {
        userId,
        immediateKeys: [],
        properties: {},
        currentUrl, // Add current URL to request
      };

      const headers = await this.getAuthHeaders();
      const url = `${this.config.apiUrl}/v1/client/${encodeURIComponent(this.config.tenantId)}/config/configurations`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        this.log('Failed to fetch auto-tracking config:', response.status);
        return;
      }

        const configResponse: RemoteConfigResponse = await response.json();
        
        if (configResponse.autoTrackingConfig) {
        this.log('Auto-tracking config loaded');
          this.setupAutoTrackingManagers(configResponse.autoTrackingConfig);
      }
    } catch (error) {
      this.log('Failed to initialize auto-tracking:', error);
      // Fail silently - auto-tracking is optional
    }
  }

  /**
   * Setup auto-tracking managers
   */
  private setupAutoTrackingManagers(config: NonNullable<RemoteConfigResponse['autoTrackingConfig']>): void {
    this.log('Setting up auto-tracking managers');
    
    // Lazy load the managers to avoid bundling them if not needed
    if (config.interactions && config.interactions.length > 0) {
      this.log('Loading interaction tracking:', config.interactions.length, 'interactions');
    import('./interaction-tracking').then(({ InteractionTrackingManager }) => {
      try {
          this.interactionTrackingManager = new InteractionTrackingManager(
            this,
            config.interactions,
            {
              debug: this.config.debug,
              enableMutationObserver: true,
              mutationDebounceDelay: 500,
              tenantId: this.config.tenantId,
              apiUrl: this.config.apiUrl,
            }
          );
          this.log('Interaction tracking initialized');
      } catch (error) {
          this.log('Failed to initialize interaction tracking:', error);
      }
    }).catch((error) => {
        this.log('Failed to load interaction tracking module:', error);
    });
    }

    if (config.sections && config.sections.length > 0) {
      this.log('Loading section tracking:', config.sections.length, 'sections');
    import('./section-tracking').then(({ SectionTrackingManager }) => {
      try {
          this.sectionTrackingManager = new SectionTrackingManager(
            this,
            config.sections,
            {
              minDwellTime: 1000,
              scrollVelocityThreshold: 500,
              intersectionThreshold: 0.1,
              debounceDelay: 100,
              batchDelay: 2000,
              debug: this.config.debug,
            }
          );
          this.log('Section tracking initialized');
      } catch (error) {
          this.log('Failed to initialize section tracking:', error);
      }
    }).catch((error) => {
        this.log('Failed to load section tracking module:', error);
    });
    }
  }

  /**
   * Track session start event
   */
  private trackSessionStart(): void {
    if (typeof window === 'undefined') return;

    const hasConsent = this.consentManager.hasConsent('analytics');
    
    const properties: Record<string, unknown> = {
      session_id: this.getSessionId(),
      timestamp: this.sessionStartTime,
    };

    if (hasConsent) {
      const referrer = document.referrer || '';
      const currentUrl = window.location.href;
      
      // Parse UTM parameters
      const utmParams = parseUTMParameters(currentUrl);
      const sessionUTMs = getSessionUTMParameters() || utmParams;
      
      // Get first-touch attribution
      const firstTouch = getOrCreateFirstTouchAttribution(
        this.config.tenantId,
        referrer,
        currentUrl,
        sessionUTMs
      );

      // Landing page
      properties.landing_page = window.location.pathname;
      
      // Referrer info
      if (referrer) {
        properties.referrer = referrer;
        properties.referrer_domain = new URL(referrer).hostname;
        properties.referrer_category = categorizeReferrer(referrer, currentUrl);
      } else {
        properties.referrer_category = 'direct';
      }

      // UTM parameters
      if (sessionUTMs.utm_source) properties.utm_source = sessionUTMs.utm_source;
      if (sessionUTMs.utm_medium) properties.utm_medium = sessionUTMs.utm_medium;
      if (sessionUTMs.utm_campaign) properties.utm_campaign = sessionUTMs.utm_campaign;
      if (sessionUTMs.utm_term) properties.utm_term = sessionUTMs.utm_term;
      if (sessionUTMs.utm_content) properties.utm_content = sessionUTMs.utm_content;

      // First-touch attribution
      properties.first_touch_source = firstTouch.source;
      properties.first_touch_medium = firstTouch.medium;
      properties.first_touch_campaign = firstTouch.campaign;
      properties.first_touch_referrer_category = firstTouch.referrer_category;

      // Device and browser info
      properties.device = this.getDeviceType();
      properties.screen_resolution = `${screen.width}x${screen.height}`;
      properties.viewport = `${window.innerWidth}x${window.innerHeight}`;
      properties.browser = this.getBrowser();
      properties.os = this.getOS();
      properties.language = navigator.language || '';
      properties.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    this.trackSystemEvent('_grain_session_start', properties);
    this.log('Session started');
  }

  /**
   * Track session end event
   */
  private trackSessionEnd(): void {
    if (typeof window === 'undefined') return;

    const hasConsent = this.consentManager.hasConsent('analytics');
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    const properties: Record<string, unknown> = {
      session_id: this.getSessionId(),
      session_duration: Math.floor(sessionDuration / 1000), // In seconds for easier querying
      duration: sessionDuration, // Keep for backward compatibility
      event_count: this.sessionEventCount,
      timestamp: Date.now(),
    };

    if (hasConsent && this.pageTrackingManager) {
      const pageCount = this.pageTrackingManager.getPageViewCount();
      properties.pages_per_session = pageCount;
      properties.page_count = pageCount; // Keep for backward compatibility
    }

    this.trackSystemEvent('_grain_session_end', properties);
    this.log('Session ended');
  }

  /**
   * Detect browser name
   */
  private getBrowser(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
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
    if (typeof navigator === 'undefined') return 'Unknown';
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
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Unknown';
    
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
   * Handle consent granted - upgrade ephemeral session to persistent user
   */
  private handleConsentGranted(): void {
    this.flushWaitingForConsentQueue();

    // Initialize persistent ID now that consent is granted (if not already initialized)
    if (!this.persistentAnonymousUserId) {
      this.initializePersistentAnonymousUserId();
      this.log('Initialized persistent ID after consent grant');
    }

    // Track consent granted event with mapping from ephemeral to persistent ID
    if (this.ephemeralSessionId) {
      this.trackSystemEvent('_grain_consent_granted', {
        previous_session_id: this.ephemeralSessionId,
        new_user_id: this.getEffectiveUserId(),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Track system events that bypass consent checks (for necessary/functional tracking)
   */
  trackSystemEvent(eventName: string, properties: Record<string, unknown>): void {
    if (this.isDestroyed) return;

    const hasConsent = this.consentManager.hasConsent('analytics');

    // Create event with appropriate user ID
    const event: EventPayload = {
      eventName,
      userId: hasConsent ? this.getEffectiveUserId() : this.getEphemeralSessionId(),
      properties: {
        ...properties,
        _minimal: !hasConsent, // Flag to indicate minimal tracking
        _consent_status: hasConsent ? 'granted' : 'pending',
      },
    };

    // Bypass consent check for necessary system events
    this.eventQueue.push(event);
    this.eventCountSinceLastHeartbeat++;

    this.log(`Queued system event: ${eventName}`);

    // Consider flushing
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush().catch((error) => {
        const formattedError = this.formatError(error, 'flush system event');
        this.logError(formattedError);
      });
    }
  }

  /**
   * Get ephemeral session ID (memory-only, not persisted)
   */
  getEphemeralSessionId(): string {
    if (!this.ephemeralSessionId) {
      this.ephemeralSessionId = this.generateUUID();
    }
    return this.ephemeralSessionId;
  }

  /**
   * Get the current page path from page tracker
   */
  getCurrentPage(): string | null {
    return this.pageTrackingManager?.getCurrentPage() || null;
  }

  /**
   * Get event count since last heartbeat
   */
  getEventCountSinceLastHeartbeat(): number {
    return this.eventCountSinceLastHeartbeat;
  }

  /**
   * Reset event count since last heartbeat
   */
  resetEventCountSinceLastHeartbeat(): void {
    this.eventCountSinceLastHeartbeat = 0;
  }

  /**
   * Get the activity detector (for internal use by tracking managers)
   */
  getActivityDetector(): ActivityDetector {
    if (!this.activityDetector) {
      throw new Error('Activity detector not initialized');
    }
    return this.activityDetector;
  }

  /**
   * Get the effective user ID (public method)
   */
  getEffectiveUserId(): string {
    return this.getEffectiveUserIdInternal();
  }

  /**
   * Get the session ID (ephemeral or persistent based on consent)
   */
  getSessionId(): string {
    const hasConsent = this.consentManager.hasConsent('analytics');
    return hasConsent ? this.getEffectiveUserId() : this.getEphemeralSessionId();
  }

  /**
   * Track an analytics event
   */
  async track(eventName: string, properties?: Record<string, unknown>, options?: SendEventOptions): Promise<void>;
  async track(event: GrainEvent, options?: SendEventOptions): Promise<void>;
  async track(
    eventOrName: string | GrainEvent,
    propertiesOrOptions?: Record<string, unknown> | SendEventOptions,
    options?: SendEventOptions
  ): Promise<void> {
    try {
      if (this.isDestroyed) {
        const error = new Error('Grain Analytics: Client has been destroyed');
        const formattedError = this.formatError(error, 'track (client destroyed)');
        this.logError(formattedError);
        return;
      }

      let event: GrainEvent;
      let opts: SendEventOptions = {};

      if (typeof eventOrName === 'string') {
        event = {
          eventName: eventOrName,
          properties: propertiesOrOptions as Record<string, unknown>,
        };
        opts = options || {};
      } else {
        event = eventOrName;
        opts = propertiesOrOptions as SendEventOptions || {};
      }

      // Filter properties if whitelist is enabled
      if (this.config.allowedProperties && event.properties) {
        const filtered: Record<string, unknown> = {};
        for (const key of this.config.allowedProperties) {
          if (key in event.properties) {
            filtered[key] = event.properties[key];
          }
        }
        event.properties = filtered;
      }

      const formattedEvent = this.formatEvent(event);

      // Check consent before tracking
      if (this.consentManager.shouldWaitForConsent() && this.config.waitForConsent) {
        // Queue event until consent is granted
        this.waitingForConsentQueue.push(formattedEvent);
        this.log(`Event waiting for consent: ${event.eventName}`, event.properties);
        return;
      }

      if (!this.consentManager.hasConsent('analytics')) {
        this.log(`Event blocked by consent: ${event.eventName}`);
        return;
      }

      this.eventQueue.push(formattedEvent);
      this.eventCountSinceLastHeartbeat++;
      this.sessionEventCount++;
      this.log(`Queued event: ${event.eventName}`);

      // Check if we should flush immediately
      if (opts.flush || this.eventQueue.length >= this.config.batchSize) {
        await this.flush();
      }
    } catch (error) {
      const formattedError = this.formatError(error, 'track');
      this.logError(formattedError);
    }
  }

  /**
   * Flush events that were waiting for consent
   */
  private flushWaitingForConsentQueue(): void {
    if (this.waitingForConsentQueue.length === 0) return;

    this.log(`Flushing ${this.waitingForConsentQueue.length} events waiting for consent`);
    
    // Move waiting events to main queue
    this.eventQueue.push(...this.waitingForConsentQueue);
    this.waitingForConsentQueue = [];

    // Flush immediately
    this.flush().catch((error) => {
      const formattedError = this.formatError(error, 'flush waiting for consent queue');
      this.logError(formattedError);
    });
  }

  /**
   * Identify a user (sets userId for subsequent events)
   */
  identify(userId: string): void {
    this.log(`Identified user: ${userId}`);
    this.globalUserId = userId;
    // Clear persistent anonymous user ID since we now have a real user ID
    this.persistentAnonymousUserId = null;
  }

  /**
   * Set global user ID for all subsequent events
   */
  setUserId(userId: string | null): void {
    this.log(`Set global user ID: ${userId}`);
    this.globalUserId = userId;
    
    if (userId) {
      // Clear persistent anonymous user ID if setting a real user ID
      this.persistentAnonymousUserId = null;
    } else {
      // If clearing user ID, ensure we have an identifier
      if (!this.persistentAnonymousUserId) {
        this.persistentAnonymousUserId = this.generateAnonymousUserId();
        
        // Try to persist the new anonymous ID (respects GDPR opt-in mode)
        this.savePersistentAnonymousUserId(this.persistentAnonymousUserId);
      }
    }
  }

  /**
   * Get current global user ID
   */
  getUserId(): string | null {
    return this.globalUserId;
  }

  /**
   * Get current effective user ID (global userId or persistent anonymous ID)
   */
  getEffectiveUserIdPublic(): string {
    return this.getEffectiveUserIdInternal();
  }

  /**
   * Login with auth token or userId on the fly
   * 
   * @example
   * // Login with userId only
   * client.login({ userId: 'user123' });
   * 
   * // Login with auth token (automatically sets authStrategy to JWT)
   * client.login({ authToken: 'jwt-token-here' });
   * 
   * // Login with both userId and auth token
   * client.login({ userId: 'user123', authToken: 'jwt-token-here' });
   * 
   * // Override auth strategy
   * client.login({ userId: 'user123', authStrategy: 'SERVER_SIDE' });
   */
  login(options: LoginOptions): void {
    try {
      if (this.isDestroyed) {
        const error = new Error('Grain Analytics: Client has been destroyed');
        const formattedError = this.formatError(error, 'login (client destroyed)');
        this.logError(formattedError);
        return;
      }

      // Set userId if provided
      if (options.userId) {
        this.log(`Login: Setting user ID to ${options.userId}`);
        this.globalUserId = options.userId;
        // Clear persistent anonymous user ID since we now have a real user ID
        this.persistentAnonymousUserId = null;
      }

      // Handle auth token if provided
      if (options.authToken) {
        this.log('Login: Setting auth token');
        // Update auth strategy to JWT if not already set
        if (this.config.authStrategy === 'NONE') {
          this.config.authStrategy = 'JWT';
        }
        
        // Create a simple auth provider that returns the provided token
        this.config.authProvider = {
          getToken: () => options.authToken!
        };
      }

      // Override auth strategy if provided
      if (options.authStrategy) {
        this.log(`Login: Setting auth strategy to ${options.authStrategy}`);
        this.config.authStrategy = options.authStrategy;
      }

      this.log(`Login successful. Effective user ID: ${this.getEffectiveUserIdInternal()}`);
    } catch (error) {
      const formattedError = this.formatError(error, 'login');
      this.logError(formattedError);
    }
  }

  /**
   * Logout and clear user session, fall back to UUIDv4 identifier
   * 
   * @example
   * // Logout user and return to anonymous mode
   * client.logout();
   * 
   * // After logout, events will use the persistent UUIDv4 identifier
   * client.track('page_view', { page: 'home' });
   */
  logout(): void {
    try {
      if (this.isDestroyed) {
        const error = new Error('Grain Analytics: Client has been destroyed');
        const formattedError = this.formatError(error, 'logout (client destroyed)');
        this.logError(formattedError);
        return;
      }

      this.log('Logout: Clearing user session');
      
      // Clear global user ID
      this.globalUserId = null;
      
      // Reset auth strategy to NONE
      this.config.authStrategy = 'NONE';
      this.config.authProvider = undefined;
      
      // Generate new UUIDv4 identifier if we don't have one
      if (!this.persistentAnonymousUserId) {
        this.persistentAnonymousUserId = this.generateAnonymousUserId();
        
        // Try to persist the new anonymous ID
        if (typeof window !== 'undefined') {
          try {
            const storageKey = `grain_anonymous_user_id_${this.config.tenantId}`;
            localStorage.setItem(storageKey, this.persistentAnonymousUserId);
          } catch (error) {
            this.log('Failed to persist new anonymous user ID after logout:', error);
          }
        }
      }
      
      this.log(`Logout successful. Effective user ID: ${this.getEffectiveUserIdInternal()}`);
    } catch (error) {
      const formattedError = this.formatError(error, 'logout');
      this.logError(formattedError);
    }
  }

  /**
   * Set user properties
   */
  async setProperty(properties: Record<string, unknown>, options?: SetPropertyOptions): Promise<void> {
    try {
      if (this.isDestroyed) {
        const error = new Error('Grain Analytics: Client has been destroyed');
        const formattedError = this.formatError(error, 'setProperty (client destroyed)');
        this.logError(formattedError);
        return;
      }

      const userId = options?.userId || this.getEffectiveUserIdInternal();
      
      // Validate property count (max 4 properties)
      const propertyKeys = Object.keys(properties);
      if (propertyKeys.length > 4) {
        const error = new Error('Grain Analytics: Maximum 4 properties allowed per request');
        const formattedError = this.formatError(error, 'setProperty (validation)');
        this.logError(formattedError);
        return;
      }

      if (propertyKeys.length === 0) {
        const error = new Error('Grain Analytics: At least one property is required');
        const formattedError = this.formatError(error, 'setProperty (validation)');
        this.logError(formattedError);
        return;
      }

      // Serialize all values to strings
      const serializedProperties: Record<string, string> = {};
      for (const [key, value] of Object.entries(properties)) {
        if (value === null || value === undefined) {
          serializedProperties[key] = '';
        } else if (typeof value === 'string') {
          serializedProperties[key] = value;
        } else {
          serializedProperties[key] = JSON.stringify(value);
        }
      }

      const payload: PropertyPayload = {
        userId,
        ...serializedProperties,
      };

      await this.sendProperties(payload);
    } catch (error) {
      const formattedError = this.formatError(error, 'setProperty');
      this.logError(formattedError);
    }
  }

  /**
   * Send properties to the API
   */
  private async sendProperties(payload: PropertyPayload): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const headers = await this.getAuthHeaders();
        const url = `${this.config.apiUrl}/v1/events/${encodeURIComponent(this.config.tenantId)}/properties`;

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorBody = await response.json();
            if (errorBody?.message) {
              errorMessage = errorBody.message;
            }
          } catch {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          }
          
          const error = new Error(`Failed to set properties: ${errorMessage}`) as Error & { status?: number };
          error.status = response.status;
          throw error;
        }

        this.log(`Successfully set properties for user ${payload.userId}`);
        return; // Success, exit retry loop
        
      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.retryAttempts) {
          // Last attempt, don't retry - log error gracefully
          const formattedError = this.formatError(error, `sendProperties (attempt ${attempt + 1}/${this.config.retryAttempts + 1})`);
          this.logError(formattedError);
          return; // Don't throw, just return gracefully
        }
        
        if (!this.isRetriableError(error)) {
          // Non-retriable error, don't retry - log error gracefully
          const formattedError = this.formatError(error, 'sendProperties (non-retriable error)');
          this.logError(formattedError);
          return; // Don't throw, just return gracefully
        }
        
        const delayMs = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
        this.log(`Retrying in ${delayMs}ms after error:`, error);
        await this.delay(delayMs);
      }
    }
  }

  // Template event methods

  /**
   * Track user login event
   */
  async trackLogin(properties?: LoginEventProperties, options?: SendEventOptions): Promise<void> {
    try {
      return await this.track('login', properties, options);
    } catch (error) {
      const formattedError = this.formatError(error, 'trackLogin');
      this.logError(formattedError);
    }
  }

  /**
   * Track user signup event
   */
  async trackSignup(properties?: SignupEventProperties, options?: SendEventOptions): Promise<void> {
    try {
      return await this.track('signup', properties, options);
    } catch (error) {
      const formattedError = this.formatError(error, 'trackSignup');
      this.logError(formattedError);
    }
  }

  /**
   * Track checkout event
   */
  async trackCheckout(properties?: CheckoutEventProperties, options?: SendEventOptions): Promise<void> {
    try {
      return await this.track('checkout', properties, options);
    } catch (error) {
      const formattedError = this.formatError(error, 'trackCheckout');
      this.logError(formattedError);
    }
  }

  /**
   * Track page view event
   */
  async trackPageView(properties?: PageViewEventProperties, options?: SendEventOptions): Promise<void> {
    try {
      return await this.track('page_view', properties, options);
    } catch (error) {
      const formattedError = this.formatError(error, 'trackPageView');
      this.logError(formattedError);
    }
  }

  /**
   * Track purchase event
   */
  async trackPurchase(properties?: PurchaseEventProperties, options?: SendEventOptions): Promise<void> {
    try {
      return await this.track('purchase', properties, options);
    } catch (error) {
      const formattedError = this.formatError(error, 'trackPurchase');
      this.logError(formattedError);
    }
  }

  /**
   * Track search event
   */
  async trackSearch(properties?: SearchEventProperties, options?: SendEventOptions): Promise<void> {
    try {
      return await this.track('search', properties, options);
    } catch (error) {
      const formattedError = this.formatError(error, 'trackSearch');
      this.logError(formattedError);
    }
  }

  /**
   * Track add to cart event
   */
  async trackAddToCart(properties?: AddToCartEventProperties, options?: SendEventOptions): Promise<void> {
    try {
      return await this.track('add_to_cart', properties, options);
    } catch (error) {
      const formattedError = this.formatError(error, 'trackAddToCart');
      this.logError(formattedError);
    }
  }

  /**
   * Track remove from cart event
   */
  async trackRemoveFromCart(properties?: RemoveFromCartEventProperties, options?: SendEventOptions): Promise<void> {
    try {
      return await this.track('remove_from_cart', properties, options);
    } catch (error) {
      const formattedError = this.formatError(error, 'trackRemoveFromCart');
      this.logError(formattedError);
    }
  }

  /**
   * Manually flush all queued events
   */
  async flush(): Promise<void> {
    try {
      if (this.eventQueue.length === 0) return;

      const eventsToSend = [...this.eventQueue];
      this.eventQueue = [];

      // Split events into chunks to respect maxEventsPerRequest limit
      const chunks = this.chunkEvents(eventsToSend, this.config.maxEventsPerRequest);
      
      // Send all chunks sequentially to maintain order
      for (const chunk of chunks) {
        await this.sendEvents(chunk);
      }
    } catch (error) {
      const formattedError = this.formatError(error, 'flush');
      this.logError(formattedError);
    }
  }

  // Remote Config Methods

  /**
   * Initialize configuration cache from localStorage
   */
  private initializeConfigCache(): void {
    if (!this.config.enableConfigCache || typeof window === 'undefined') return;

    try {
      const cached = localStorage.getItem(this.config.configCacheKey);
      if (cached) {
        this.configCache = JSON.parse(cached);
        this.log('Loaded configuration from cache:', this.configCache);
      }
    } catch (error) {
      this.log('Failed to load configuration cache:', error);
    }
  }

  /**
   * Save configuration cache to localStorage
   */
  private saveConfigCache(cache: RemoteConfigCache): void {
    if (!this.config.enableConfigCache || typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.config.configCacheKey, JSON.stringify(cache));
      this.log('Saved configuration to cache:', cache);
    } catch (error) {
      this.log('Failed to save configuration cache:', error);
    }
  }

  /**
   * Get configuration value with fallback to defaults
   */
  getConfig(key: string): string | undefined {
    // First check cache
    if (this.configCache?.configurations?.[key]) {
      return this.configCache.configurations[key];
    }

    // Then check defaults
    if (this.config.defaultConfigurations?.[key]) {
      return this.config.defaultConfigurations[key];
    }

    return undefined;
  }

  /**
   * Get all configurations with fallback to defaults
   */
  getAllConfigs(): Record<string, string> {
    const configs = { ...this.config.defaultConfigurations };
    
    if (this.configCache?.configurations) {
      Object.assign(configs, this.configCache.configurations);
    }

    return configs;
  }

  /**
   * Fetch configurations from API
   */
  async fetchConfig(options: RemoteConfigOptions = {}): Promise<RemoteConfigResponse | null> {
    try {
      if (this.isDestroyed) {
        const error = new Error('Grain Analytics: Client has been destroyed');
        const formattedError = this.formatError(error, 'fetchConfig (client destroyed)');
        this.logError(formattedError);
        return null;
      }

      const userId = options.userId || this.getEffectiveUserIdInternal();
      const immediateKeys = options.immediateKeys || [];
      const properties = options.properties || {};

      const request: RemoteConfigRequest = {
        userId,
        immediateKeys,
        properties,
      };

      let lastError: unknown;

      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const headers = await this.getAuthHeaders();
          const url = `${this.config.apiUrl}/v1/client/${encodeURIComponent(this.config.tenantId)}/config/configurations`;

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
              const errorBody = await response.json();
              if (errorBody?.message) {
                errorMessage = errorBody.message;
              }
            } catch {
              const errorText = await response.text();
              if (errorText) {
                errorMessage = errorText;
              }
            }
            
            const error = new Error(`Failed to fetch configurations: ${errorMessage}`) as Error & { status?: number };
            error.status = response.status;
            throw error;
          }

          const configResponse: RemoteConfigResponse = await response.json();
          
          // Update cache if successful
          if (configResponse.configurations) {
            this.updateConfigCache(configResponse, userId);
          }

          this.log('Successfully fetched configurations');
          return configResponse;
          
        } catch (error) {
          lastError = error;
          
          if (attempt === this.config.retryAttempts) {
            // Last attempt, don't retry - log error gracefully
            const formattedError = this.formatError(error, `fetchConfig (attempt ${attempt + 1}/${this.config.retryAttempts + 1})`);
            this.logError(formattedError);
            return null;
          }
          
          if (!this.isRetriableError(error)) {
            // Non-retriable error, don't retry - log error gracefully
            const formattedError = this.formatError(error, 'fetchConfig (non-retriable error)');
            this.logError(formattedError);
            return null;
          }
          
          const delayMs = this.config.retryDelay * Math.pow(2, attempt);
          this.log(`Retrying config fetch in ${delayMs}ms after error:`, error);
          await this.delay(delayMs);
        }
      }

      return null;
    } catch (error) {
      const formattedError = this.formatError(error, 'fetchConfig');
      this.logError(formattedError);
      return null;
    }
  }

  /**
   * Get configuration asynchronously (cache-first with fallback to API)
   */
  async getConfigAsync(key: string, options: RemoteConfigOptions = {}): Promise<string | undefined> {
    try {
      // Return immediately if we have it in cache and not forcing refresh
      if (!options.forceRefresh && this.configCache?.configurations?.[key]) {
        return this.configCache.configurations[key];
      }

      // Return default if available and not forcing refresh
      if (!options.forceRefresh && this.config.defaultConfigurations?.[key]) {
        return this.config.defaultConfigurations[key];
      }

      // Fetch from API
      const response = await this.fetchConfig(options);
      if (response) {
        return response.configurations[key];
      }
      
      // Return default as fallback
      return this.config.defaultConfigurations?.[key];
    } catch (error) {
      const formattedError = this.formatError(error, 'getConfigAsync');
      this.logError(formattedError);
      // Return default as fallback
      return this.config.defaultConfigurations?.[key];
    }
  }

  /**
   * Get all configurations asynchronously (cache-first with fallback to API)
   */
  async getAllConfigsAsync(options: RemoteConfigOptions = {}): Promise<Record<string, string>> {
    try {
      // Return cache if available and not forcing refresh
      if (!options.forceRefresh && this.configCache?.configurations) {
        return { ...this.config.defaultConfigurations, ...this.configCache.configurations };
      }

      // Fetch from API
      const response = await this.fetchConfig(options);
      if (response) {
        return { ...this.config.defaultConfigurations, ...response.configurations };
      }
      
      // Return defaults as fallback
      return { ...this.config.defaultConfigurations };
    } catch (error) {
      const formattedError = this.formatError(error, 'getAllConfigsAsync');
      this.logError(formattedError);
      // Return defaults as fallback
      return { ...this.config.defaultConfigurations };
    }
  }

  /**
   * Update configuration cache and notify listeners
   */
  private updateConfigCache(response: RemoteConfigResponse, userId: string): void {
    const newCache: RemoteConfigCache = {
      configurations: response.configurations,
      snapshotId: response.snapshotId,
      timestamp: response.timestamp,
      userId,
    };

    const oldConfigs = this.configCache?.configurations || {};
    this.configCache = newCache;
    this.saveConfigCache(newCache);

    // Notify listeners if configurations changed
    if (JSON.stringify(oldConfigs) !== JSON.stringify(response.configurations)) {
      this.notifyConfigChangeListeners(response.configurations);
    }
  }

  /**
   * Add configuration change listener
   */
  addConfigChangeListener(listener: ConfigChangeListener): void {
    this.configChangeListeners.push(listener);
  }

  /**
   * Remove configuration change listener
   */
  removeConfigChangeListener(listener: ConfigChangeListener): void {
    const index = this.configChangeListeners.indexOf(listener);
    if (index > -1) {
      this.configChangeListeners.splice(index, 1);
    }
  }

  /**
   * Notify all configuration change listeners
   */
  private notifyConfigChangeListeners(configurations: Record<string, string>): void {
    this.configChangeListeners.forEach(listener => {
      try {
        listener(configurations);
      } catch (error) {
        console.error('[Grain Analytics] Config change listener error:', error);
      }
    });
  }

  /**
   * Start automatic configuration refresh timer
   */
  private startConfigRefreshTimer(): void {
    if (typeof window === 'undefined') return;
    
    if (this.configRefreshTimer) {
      clearInterval(this.configRefreshTimer);
    }

    this.configRefreshTimer = window.setInterval(() => {
      if (!this.isDestroyed) {
        // Use effective userId (will be generated if not set)
        this.fetchConfig().catch((error) => {
          const formattedError = this.formatError(error, 'auto-config refresh');
          this.logError(formattedError);
        });
      }
    }, this.config.configRefreshInterval);
  }

  /**
   * Stop automatic configuration refresh timer
   */
  private stopConfigRefreshTimer(): void {
    if (this.configRefreshTimer) {
      clearInterval(this.configRefreshTimer);
      this.configRefreshTimer = null;
    }
  }

  /**
   * Preload configurations for immediate access
   */
  async preloadConfig(immediateKeys: string[] = [], properties?: Record<string, string>): Promise<void> {
    try {
      // Use effective userId (will be generated if not set)
      const effectiveUserId = this.getEffectiveUserIdInternal();
      this.log(`Preloading config for user: ${effectiveUserId}`);

      const response = await this.fetchConfig({ immediateKeys, properties });
      if (response) {
        this.startConfigRefreshTimer();
      }
    } catch (error) {
      const formattedError = this.formatError(error, 'preloadConfig');
      this.logError(formattedError);
    }
  }

  /**
   * Split events array into chunks of specified size
   */
  private chunkEvents(events: EventPayload[], chunkSize: number): EventPayload[][] {
    const chunks: EventPayload[][] = [];
    for (let i = 0; i < events.length; i += chunkSize) {
      chunks.push(events.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Privacy & Consent Methods

  /**
   * Grant consent for tracking
   * @param categories - Optional array of consent categories (e.g., ['analytics', 'functional'])
   */
  grantConsent(categories?: string[]): void {
    try {
      this.consentManager.grantConsent(categories);
      this.log('Consent granted', categories);
    } catch (error) {
      const formattedError = this.formatError(error, 'grantConsent');
      this.logError(formattedError);
    }
  }

  /**
   * Revoke consent for tracking (opt-out)
   * @param categories - Optional array of categories to revoke (if not provided, revokes all)
   */
  revokeConsent(categories?: string[]): void {
    try {
      this.consentManager.revokeConsent(categories);
      this.log('Consent revoked', categories);
      
      // Clear queued events when consent is revoked
      this.eventQueue = [];
      this.waitingForConsentQueue = [];
    } catch (error) {
      const formattedError = this.formatError(error, 'revokeConsent');
      this.logError(formattedError);
    }
  }

  /**
   * Get current consent state
   */
  getConsentState(): ConsentState | null {
    return this.consentManager.getConsentState();
  }

  /**
   * Check if user has granted consent
   * @param category - Optional category to check (if not provided, checks general consent)
   */
  hasConsent(category?: string): boolean {
    return this.consentManager.hasConsent(category);
  }

  /**
   * Add listener for consent state changes
   */
  onConsentChange(listener: (state: ConsentState) => void): void {
    this.consentManager.addListener(listener);
  }

  /**
   * Remove consent change listener
   */
  offConsentChange(listener: (state: ConsentState) => void): void {
    this.consentManager.removeListener(listener);
  }

  /**
   * Check for debug mode parameters and initialize debug agent if valid
   */
  private checkAndInitializeDebugMode(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isDebug = urlParams.get('grain_debug') === '1';
      const sessionId = urlParams.get('grain_session');
      
      if (!isDebug || !sessionId) {
        return;
      }
      
      this.log('Debug mode detected, verifying session:', sessionId);
      
      // Verify session with API
      this.verifyDebugSession(sessionId, window.location.hostname)
        .then((valid) => {
          if (valid) {
            this.log('Debug session verified, initializing debug agent');
            this.isDebugMode = true;
            this.initializeDebugAgent(sessionId);
          } else {
            this.log('Debug session verification failed');
          }
        })
        .catch((error) => {
          this.log('Failed to verify debug session:', error);
        });
    } catch (error) {
      this.log('Error checking debug mode:', error);
    }
  }
  
  /**
   * Verify debug session with API
   */
  private async verifyDebugSession(sessionId: string, domain: string): Promise<boolean> {
    try {
      const url = `${this.config.apiUrl}/v1/tenant/${encodeURIComponent(this.config.tenantId)}/debug-sessions/verify`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          domain,
        }),
      });
      
      if (!response.ok) {
        return false;
      }
      
      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      this.log('Debug session verification error:', error);
      return false;
    }
  }
  
  /**
   * Initialize debug agent
   */
  private initializeDebugAgent(sessionId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      this.log('Loading debug agent module');
      
      import('./debug-agent').then(({ DebugAgent }) => {
        try {
          this.debugAgent = new DebugAgent(
            this,
            sessionId,
            this.config.tenantId,
            this.config.apiUrl,
            {
              debug: this.config.debug,
            }
          );
          this.log('Debug agent initialized');
        } catch (error) {
          this.log('Failed to initialize debug agent:', error);
        }
      }).catch((error) => {
        this.log('Failed to load debug agent module:', error);
      });
    } catch (error) {
      this.log('Error initializing debug agent:', error);
    }
  }

  /**
   * Destroy the client and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Stop config refresh timer
    this.stopConfigRefreshTimer();

    // Clear config change listeners
    this.configChangeListeners = [];

    // Destroy automatic tracking managers
    if (this.heartbeatManager) {
      this.heartbeatManager.destroy();
      this.heartbeatManager = null;
    }

    if (this.pageTrackingManager) {
      this.pageTrackingManager.destroy();
      this.pageTrackingManager = null;
    }

    if (this.activityDetector) {
      this.activityDetector.destroy();
      this.activityDetector = null;
    }

    // Destroy auto-tracking managers
    if (this.interactionTrackingManager) {
      this.interactionTrackingManager.destroy();
      this.interactionTrackingManager = null;
    }

    if (this.sectionTrackingManager) {
      this.sectionTrackingManager.destroy();
      this.sectionTrackingManager = null;
    }

    if (this.heatmapTrackingManager) {
      this.heatmapTrackingManager.destroy();
      this.heatmapTrackingManager = null;
    }
    
    // Destroy debug agent
    if (this.debugAgent) {
      this.debugAgent.destroy();
      this.debugAgent = null;
    }

    // Send any remaining events (in chunks if necessary)
    if (this.eventQueue.length > 0) {
      const eventsToSend = [...this.eventQueue];
      this.eventQueue = [];
      
      const chunks = this.chunkEvents(eventsToSend, this.config.maxEventsPerRequest);
      
      // Send first chunk with beacon (most important for page unload)
      if (chunks.length > 0) {
        this.sendEventsWithBeacon(chunks[0]).catch(() => {
          // Silently fail during cleanup
        });
        
        // If there are more chunks, try to send them with regular fetch
        for (let i = 1; i < chunks.length; i++) {
          this.sendEventsWithBeacon(chunks[i]).catch(() => {
            // Silently fail during cleanup
          });
        }
      }
    }
  }
}

/**
 * Create a new Grain Analytics client
 */
export function createGrainAnalytics(config: GrainConfig): GrainAnalytics {
  return new GrainAnalytics(config);
}

// Default export for convenience
export default GrainAnalytics;

// Global interface for IIFE build
declare global {
  interface Window {
    Grain?: {
      GrainAnalytics: typeof GrainAnalytics;
      createGrainAnalytics: typeof createGrainAnalytics;
    };
  }
}

// Auto-setup for IIFE build
if (typeof window !== 'undefined') {
  window.Grain = {
    GrainAnalytics,
    createGrainAnalytics,
  };
}