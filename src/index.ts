/**
 * Grain Analytics Web SDK
 * A lightweight, dependency-free TypeScript SDK for sending analytics events to Grain's REST API
 */

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
}

export interface SendEventOptions {
  flush?: boolean; // Force immediate send
}

export interface SetPropertyOptions {
  userId?: string; // Override global userId
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

/**
 * Main Grain Analytics client
 */
type RequiredConfig = Required<Omit<GrainConfig, 'secretKey' | 'authProvider' | 'userId'>> & {
  secretKey?: string;
  authProvider?: AuthProvider;
  userId?: string;
};

export class GrainAnalytics {
  private config: RequiredConfig;
  private eventQueue: EventPayload[] = [];
  private flushTimer: number | null = null;
  private isDestroyed = false;
  private globalUserId: string | null = null;
  private persistentAnonymousUserId: string | null = null;
  // Remote Config properties
  private configCache: RemoteConfigCache | null = null;
  private configRefreshTimer: number | null = null;
  private configChangeListeners: ConfigChangeListener[] = [];
  private configFetchPromise: Promise<RemoteConfigResponse> | null = null;

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
      ...config,
      tenantId: config.tenantId,
    };

    // Set global userId if provided in config
    if (config.userId) {
      this.globalUserId = config.userId;
    }

    this.validateConfig();
    this.initializePersistentAnonymousUserId();
    this.setupBeforeUnload();
    this.startFlushTimer();
    this.initializeConfigCache();
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
   * Format UUID for anonymous user ID (remove dashes and prefix with 'temp:')
   */
  private formatAnonymousUserId(uuid: string): string {
    return `temp:${uuid.replace(/-/g, '')}`;
  }

  /**
   * Initialize persistent anonymous user ID from localStorage or create new one
   */
  private initializePersistentAnonymousUserId(): void {
    if (typeof window === 'undefined') return;

    const storageKey = `grain_anonymous_user_id_${this.config.tenantId}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        this.persistentAnonymousUserId = stored;
        this.log('Loaded persistent anonymous user ID:', this.persistentAnonymousUserId);
      } else {
        // Generate new anonymous user ID
        const uuid = this.generateUUID();
        this.persistentAnonymousUserId = this.formatAnonymousUserId(uuid);
        localStorage.setItem(storageKey, this.persistentAnonymousUserId);
        this.log('Generated new persistent anonymous user ID:', this.persistentAnonymousUserId);
      }
    } catch (error) {
      this.log('Failed to initialize persistent anonymous user ID:', error);
      // Fallback: generate temporary ID without persistence
      const uuid = this.generateUUID();
      this.persistentAnonymousUserId = this.formatAnonymousUserId(uuid);
    }
  }

  /**
   * Get the effective user ID (global userId or persistent anonymous ID)
   */
  private getEffectiveUserId(): string {
    return this.globalUserId || this.persistentAnonymousUserId || 'anonymous';
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[Grain Analytics]', ...args);
    }
  }

  private formatEvent(event: GrainEvent): EventPayload {
    return {
      eventName: event.eventName,
      userId: event.userId || this.getEffectiveUserId(),
      properties: event.properties || {},
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

        this.log(`Sending ${events.length} events to ${url} (attempt ${attempt + 1})`);

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ events }),
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
          // Last attempt, don't retry
          break;
        }
        
        if (!this.isRetriableError(error)) {
          // Non-retriable error, don't retry
          break;
        }
        
        const delayMs = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
        this.log(`Retrying in ${delayMs}ms after error:`, error);
        await this.delay(delayMs);
      }
    }

    console.error('[Grain Analytics] Failed to send events after all retries:', lastError);
    throw lastError;
  }

  private async sendEventsWithBeacon(events: EventPayload[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.config.apiUrl}/v1/events/${encodeURIComponent(this.config.tenantId)}/multi`;

      const body = JSON.stringify({ events });

      // Try beacon API first (more reliable for page unload)
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' });
        const success = navigator.sendBeacon(url, blob);
        
        if (success) {
          this.log(`Successfully sent ${events.length} events via beacon`);
          return;
        }
      }

      // Fallback to fetch with keepalive
      await fetch(url, {
        method: 'POST',
        headers,
        body,
        keepalive: true,
      });

      this.log(`Successfully sent ${events.length} events via fetch (keepalive)`);
    } catch (error) {
      console.error('[Grain Analytics] Failed to send events via beacon:', error);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = window.setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush().catch((error) => {
          console.error('[Grain Analytics] Auto-flush failed:', error);
        });
      }
    }, this.config.flushInterval);
  }

  private setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
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
   * Track an analytics event
   */
  async track(eventName: string, properties?: Record<string, unknown>, options?: SendEventOptions): Promise<void>;
  async track(event: GrainEvent, options?: SendEventOptions): Promise<void>;
  async track(
    eventOrName: string | GrainEvent,
    propertiesOrOptions?: Record<string, unknown> | SendEventOptions,
    options?: SendEventOptions
  ): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Grain Analytics: Client has been destroyed');
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

    const formattedEvent = this.formatEvent(event);
    this.eventQueue.push(formattedEvent);

    this.log(`Queued event: ${event.eventName}`, event.properties);

    // Check if we should flush immediately
    if (opts.flush || this.eventQueue.length >= this.config.batchSize) {
      await this.flush();
    }
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
    // Clear persistent anonymous user ID if setting a real user ID
    if (userId) {
      this.persistentAnonymousUserId = null;
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
    return this.getEffectiveUserId();
  }

  /**
   * Set user properties
   */
  async setProperty(properties: Record<string, unknown>, options?: SetPropertyOptions): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Grain Analytics: Client has been destroyed');
    }

    const userId = options?.userId || this.getEffectiveUserId();
    
    // Validate property count (max 4 properties)
    const propertyKeys = Object.keys(properties);
    if (propertyKeys.length > 4) {
      throw new Error('Grain Analytics: Maximum 4 properties allowed per request');
    }

    if (propertyKeys.length === 0) {
      throw new Error('Grain Analytics: At least one property is required');
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

        this.log(`Setting properties for user ${payload.userId} (attempt ${attempt + 1})`);

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
          // Last attempt, don't retry
          break;
        }
        
        if (!this.isRetriableError(error)) {
          // Non-retriable error, don't retry
          break;
        }
        
        const delayMs = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
        this.log(`Retrying in ${delayMs}ms after error:`, error);
        await this.delay(delayMs);
      }
    }

    console.error('[Grain Analytics] Failed to set properties after all retries:', lastError);
    throw lastError;
  }

  // Template event methods

  /**
   * Track user login event
   */
  async trackLogin(properties?: LoginEventProperties, options?: SendEventOptions): Promise<void> {
    return this.track('login', properties, options);
  }

  /**
   * Track user signup event
   */
  async trackSignup(properties?: SignupEventProperties, options?: SendEventOptions): Promise<void> {
    return this.track('signup', properties, options);
  }

  /**
   * Track checkout event
   */
  async trackCheckout(properties?: CheckoutEventProperties, options?: SendEventOptions): Promise<void> {
    return this.track('checkout', properties, options);
  }

  /**
   * Track page view event
   */
  async trackPageView(properties?: PageViewEventProperties, options?: SendEventOptions): Promise<void> {
    return this.track('page_view', properties, options);
  }

  /**
   * Track purchase event
   */
  async trackPurchase(properties?: PurchaseEventProperties, options?: SendEventOptions): Promise<void> {
    return this.track('purchase', properties, options);
  }

  /**
   * Track search event
   */
  async trackSearch(properties?: SearchEventProperties, options?: SendEventOptions): Promise<void> {
    return this.track('search', properties, options);
  }

  /**
   * Track add to cart event
   */
  async trackAddToCart(properties?: AddToCartEventProperties, options?: SendEventOptions): Promise<void> {
    return this.track('add_to_cart', properties, options);
  }

  /**
   * Track remove from cart event
   */
  async trackRemoveFromCart(properties?: RemoveFromCartEventProperties, options?: SendEventOptions): Promise<void> {
    return this.track('remove_from_cart', properties, options);
  }

  /**
   * Manually flush all queued events
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    // Split events into chunks to respect maxEventsPerRequest limit
    const chunks = this.chunkEvents(eventsToSend, this.config.maxEventsPerRequest);
    
    // Send all chunks sequentially to maintain order
    for (const chunk of chunks) {
      await this.sendEvents(chunk);
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
  async fetchConfig(options: RemoteConfigOptions = {}): Promise<RemoteConfigResponse> {
    if (this.isDestroyed) {
      throw new Error('Grain Analytics: Client has been destroyed');
    }

    const userId = options.userId || this.getEffectiveUserId();
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

        this.log(`Fetching configurations for user ${userId} (attempt ${attempt + 1})`);

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

        this.log(`Successfully fetched configurations for user ${userId}:`, configResponse);
        return configResponse;
        
      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.retryAttempts) {
          break;
        }
        
        if (!this.isRetriableError(error)) {
          break;
        }
        
        const delayMs = this.config.retryDelay * Math.pow(2, attempt);
        this.log(`Retrying config fetch in ${delayMs}ms after error:`, error);
        await this.delay(delayMs);
      }
    }

    console.error('[Grain Analytics] Failed to fetch configurations after all retries:', lastError);
    throw lastError;
  }

  /**
   * Get configuration asynchronously (cache-first with fallback to API)
   */
  async getConfigAsync(key: string, options: RemoteConfigOptions = {}): Promise<string | undefined> {
    // Return immediately if we have it in cache and not forcing refresh
    if (!options.forceRefresh && this.configCache?.configurations?.[key]) {
      return this.configCache.configurations[key];
    }

    // Return default if available and not forcing refresh
    if (!options.forceRefresh && this.config.defaultConfigurations?.[key]) {
      return this.config.defaultConfigurations[key];
    }

    // Fetch from API
    try {
      const response = await this.fetchConfig(options);
      return response.configurations[key];
    } catch (error) {
      this.log(`Failed to fetch config for key "${key}":`, error);
      // Return default as fallback
      return this.config.defaultConfigurations?.[key];
    }
  }

  /**
   * Get all configurations asynchronously (cache-first with fallback to API)
   */
  async getAllConfigsAsync(options: RemoteConfigOptions = {}): Promise<Record<string, string>> {
    // Return cache if available and not forcing refresh
    if (!options.forceRefresh && this.configCache?.configurations) {
      return { ...this.config.defaultConfigurations, ...this.configCache.configurations };
    }

    // Fetch from API
    try {
      const response = await this.fetchConfig(options);
      return { ...this.config.defaultConfigurations, ...response.configurations };
    } catch (error) {
      this.log('Failed to fetch all configs:', error);
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
    if (this.configRefreshTimer) {
      clearInterval(this.configRefreshTimer);
    }

    this.configRefreshTimer = window.setInterval(() => {
      if (!this.isDestroyed && this.globalUserId) {
        this.fetchConfig().catch((error) => {
          console.error('[Grain Analytics] Auto-config refresh failed:', error);
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
    if (!this.globalUserId) {
      this.log('Cannot preload config: no user ID set');
      return;
    }

    try {
      await this.fetchConfig({ immediateKeys, properties });
      this.startConfigRefreshTimer();
    } catch (error) {
      this.log('Failed to preload config:', error);
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