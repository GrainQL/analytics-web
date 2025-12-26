/**
 * Interaction Tracking Manager for Grain Analytics
 * Automatically attaches click and focus listeners to detected interactive elements
 */

import type { InteractionConfig } from './types/auto-tracking';
import { cleanElementText } from './text-utils';

export interface SendEventOptions {
  flush?: boolean;
}

export interface InteractionTracker {
  track(eventName: string, properties?: Record<string, unknown>, options?: SendEventOptions): void | Promise<void>;
  hasConsent(category: 'analytics' | 'marketing' | 'functional'): boolean;
  log(...args: unknown[]): void;
}

export interface InteractionTrackingConfig {
  debug?: boolean;
  enableMutationObserver?: boolean;
  mutationDebounceDelay?: number;
  tenantId?: string;
  apiUrl?: string;
}

export class InteractionTrackingManager {
  private tracker: InteractionTracker;
  private interactions: InteractionConfig[];
  private config: InteractionTrackingConfig;
  private isDestroyed = false;
  private attachedListeners: Map<Element, Array<{ event: string; handler: EventListener }>> = new Map();
  private xpathCache: Map<string, Element | null> = new Map();
  private mutationObserver: MutationObserver | null = null;
  private mutationDebounceTimer: number | null = null;

  constructor(
    tracker: InteractionTracker,
    interactions: InteractionConfig[],
    config: InteractionTrackingConfig = {}
  ) {
    this.tracker = tracker;
    this.interactions = interactions;
    this.config = {
      debug: config.debug ?? false,
      enableMutationObserver: config.enableMutationObserver ?? true,
      mutationDebounceDelay: config.mutationDebounceDelay ?? 500,
      tenantId: config.tenantId,
      apiUrl: config.apiUrl,
    };

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // Fetch and merge trackers if configured
      if (this.config.tenantId && this.config.apiUrl) {
        this.fetchAndMergeTrackers().then(() => {
          this.attachAllListeners();
        });
      } else {
      // Attach listeners after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.attachAllListeners());
      } else {
        // DOM already loaded
        setTimeout(() => this.attachAllListeners(), 0);
        }
      }

      // Setup mutation observer for dynamic content
      if (this.config.enableMutationObserver) {
        this.setupMutationObserver();
      }
    }
  }
  
  /**
   * Fetch trackers from API and merge with existing interactions
   */
  private async fetchAndMergeTrackers(): Promise<void> {
    if (!this.config.tenantId || !this.config.apiUrl) return;
    
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const url = `${this.config.apiUrl}/v1/client/${encodeURIComponent(this.config.tenantId)}/trackers?url=${encodeURIComponent(currentUrl)}`;
      
      this.log('Fetching trackers from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        this.log('Failed to fetch trackers:', response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.trackers && Array.isArray(result.trackers)) {
        this.log('Fetched', result.trackers.length, 'trackers');
        
        // Convert trackers to InteractionConfig format
        const trackerInteractions: InteractionConfig[] = result.trackers.map((tracker: any) => ({
          eventName: tracker.eventName,
          selector: tracker.selector,
          priority: 5, // High priority for manually created trackers
          label: tracker.eventName,
          description: `Tracker: ${tracker.eventName}`,
        }));
        
        // Merge with existing interactions (trackers take precedence)
        this.interactions = [...trackerInteractions, ...this.interactions];
        
        this.log('Merged trackers, total interactions:', this.interactions.length);
      }
    } catch (error) {
      this.log('Error fetching trackers:', error);
    }
  }

  /**
   * Attach listeners to all configured interactions
   */
  private attachAllListeners(): void {
    if (this.isDestroyed) return;

    this.log('Attaching interaction listeners');

    for (const interaction of this.interactions) {
      this.attachInteractionListener(interaction);
    }
  }

  /**
   * Attach listener to a specific interaction
   */
  private attachInteractionListener(interaction: InteractionConfig): void {
    if (this.isDestroyed) return;

    const element = this.findElementByXPath(interaction.selector);
    
    if (!element) {
      this.log('Element not found for interaction:', interaction.eventName, 'selector:', interaction.selector);
      return;
    }

    // Check if we already attached listeners to this element for this interaction
    if (this.attachedListeners.has(element)) {
      this.log('Listeners already attached for element:', element);
      return;
    }

    const handlers: Array<{ event: string; handler: EventListener }> = [];

    // Click handler
    const clickHandler = (event: Event) => this.handleInteractionClick(interaction, event);
    element.addEventListener('click', clickHandler, { passive: true });
    handlers.push({ event: 'click', handler: clickHandler });

    // Focus handler (for form inputs)
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      const focusHandler = (event: Event) => this.handleInteractionFocus(interaction, event);
      element.addEventListener('focus', focusHandler, { passive: true });
      handlers.push({ event: 'focus', handler: focusHandler });
    }

    this.attachedListeners.set(element, handlers);
  }

  /**
   * Handle click event on interaction
   */
  private handleInteractionClick(interaction: InteractionConfig, event: Event): void {
    if (this.isDestroyed) return;
    if (!this.tracker.hasConsent('analytics')) return;

    const element = event.target as HTMLElement;
    
    // Check if this is a navigation link (has href attribute)
    const isNavigationLink = element instanceof HTMLAnchorElement && element.href;
    
    const eventProperties = {
      interaction_type: 'click',
      interaction_label: interaction.label,
      interaction_description: interaction.description,
      interaction_priority: interaction.priority,
      element_tag: element.tagName?.toLowerCase(),
      element_text: cleanElementText(element.textContent),
      element_id: element.id || undefined,
      element_class: element.className || undefined,
      ...(isNavigationLink && { href: element.href }),
      timestamp: Date.now(),
    };
    
    // Always use flush for auto-tracked clicks to ensure delivery
    // This is especially important for navigation links and quick interactions
      const result = this.tracker.track(interaction.eventName, eventProperties, { flush: true });
      if (result instanceof Promise) {
        result.catch((error: unknown) => {
        // Log error but don't block interaction
        this.log('Failed to track click:', error);
        });
    }
  }

  /**
   * Handle focus event on interaction (for form fields)
   */
  private handleInteractionFocus(interaction: InteractionConfig, event: Event): void {
    if (this.isDestroyed) return;
    if (!this.tracker.hasConsent('analytics')) return;

    const element = event.target as HTMLElement;
    
    this.tracker.track(interaction.eventName, {
      interaction_type: 'focus',
      interaction_label: interaction.label,
      interaction_description: interaction.description,
      interaction_priority: interaction.priority,
      element_tag: element.tagName?.toLowerCase(),
      element_id: element.id || undefined,
      element_class: element.className || undefined,
      timestamp: Date.now(),
    });
  }

  /**
   * Find element by XPath selector
   */
  private findElementByXPath(xpath: string): Element | null {
    // Check cache first
    if (this.xpathCache.has(xpath)) {
      const cached = this.xpathCache.get(xpath);
      // Verify element is still in DOM
      if (cached && document.contains(cached)) {
        return cached;
      }
      // Clear invalid cache entry
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
   * Setup mutation observer to handle dynamic content
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') {
      this.log('MutationObserver not supported');
      return;
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      // Debounce the re-attachment
      if (this.mutationDebounceTimer !== null) {
        clearTimeout(this.mutationDebounceTimer);
      }

      this.mutationDebounceTimer = window.setTimeout(() => {
        this.handleMutations(mutations);
        this.mutationDebounceTimer = null;
      }, this.config.mutationDebounceDelay);
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.log('Mutation observer setup');
  }

  /**
   * Handle DOM mutations
   */
  private handleMutations(mutations: MutationRecord[]): void {
    if (this.isDestroyed) return;

    // Clear XPath cache on mutations
    this.xpathCache.clear();

    // Check if any of our tracked elements were removed
    const removedElements = new Set<Element>();
    for (const mutation of mutations) {
      mutation.removedNodes.forEach((node) => {
        if (node instanceof Element) {
          removedElements.add(node);
          // Also check for child elements we were tracking
          this.attachedListeners.forEach((handlers, element) => {
            if (node.contains(element)) {
              removedElements.add(element);
            }
          });
        }
      });
    }

    // Clean up removed elements
    removedElements.forEach((element) => {
      this.detachListeners(element);
    });

    // Try to re-attach listeners for any interactions that might now be available
    this.attachAllListeners();
  }

  /**
   * Detach listeners from an element
   */
  private detachListeners(element: Element): void {
    const handlers = this.attachedListeners.get(element);
    if (!handlers) return;

    handlers.forEach(({ event, handler }) => {
      element.removeEventListener(event, handler);
    });

    this.attachedListeners.delete(element);
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[InteractionTracking]', ...args);
    }
  }

  /**
   * Update interactions configuration
   */
  updateInteractions(interactions: InteractionConfig[]): void {
    if (this.isDestroyed) return;

    this.log('Updating interactions configuration');
    
    // Detach all existing listeners
    this.attachedListeners.forEach((handlers, element) => {
      this.detachListeners(element);
    });

    // Clear cache
    this.xpathCache.clear();

    // Update configuration
    this.interactions = interactions;

    // Reattach listeners
    this.attachAllListeners();
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.log('Destroying interaction tracking manager');
    
    this.isDestroyed = true;

    // Clear debounce timer
    if (this.mutationDebounceTimer !== null) {
      clearTimeout(this.mutationDebounceTimer);
      this.mutationDebounceTimer = null;
    }

    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Detach all listeners
    this.attachedListeners.forEach((handlers, element) => {
      this.detachListeners(element);
    });

    // Clear caches
    this.attachedListeners.clear();
    this.xpathCache.clear();
  }
}

