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
  batchSize?: number;
  flushInterval?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
  maxEventsPerRequest?: number; // Maximum events to send in a single API request
  debug?: boolean;
}

export interface SendEventOptions {
  flush?: boolean; // Force immediate send
}

/**
 * Main Grain Analytics client
 */
type RequiredConfig = Required<Omit<GrainConfig, 'secretKey' | 'authProvider'>> & {
  secretKey?: string;
  authProvider?: AuthProvider;
};

export class GrainAnalytics {
  private config: RequiredConfig;
  private eventQueue: EventPayload[] = [];
  private flushTimer: number | null = null;
  private isDestroyed = false;

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
      ...config,
      tenantId: config.tenantId,
    };

    this.validateConfig();
    this.setupBeforeUnload();
    this.startFlushTimer();
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

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[Grain Analytics]', ...args);
    }
  }

  private formatEvent(event: GrainEvent): EventPayload {
    return {
      eventName: event.eventName,
      userId: event.userId || 'anonymous',
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
        const url = `${this.config.apiUrl}/v1/events/${encodeURIComponent(this.config.tenantId)}`;

        this.log(`Sending ${events.length} events to ${url} (attempt ${attempt + 1})`);

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
      const url = `${this.config.apiUrl}/v1/events/${encodeURIComponent(this.config.tenantId)}`;

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
    // Store userId for future events - this would typically be handled
    // by the application layer, but we can provide a helper
    this.log(`Identified user: ${userId}`);
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