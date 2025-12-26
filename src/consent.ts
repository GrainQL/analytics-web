/**
 * Consent management for Grain Analytics
 * Handles GDPR-compliant consent tracking and state management
 */

export type ConsentMode = 'opt-in' | 'opt-out' | 'disabled';

export interface ConsentState {
  granted: boolean;
  categories: string[];
  timestamp: Date;
  version: string;
}

export const DEFAULT_CONSENT_CATEGORIES = ['necessary', 'analytics', 'functional'];
export const CONSENT_VERSION = '1.0.0';

/**
 * Consent manager for handling user consent state
 */
export class ConsentManager {
  private consentState: ConsentState | null = null;
  private consentMode: ConsentMode;
  private storageKey: string;
  private listeners: Array<(state: ConsentState) => void> = [];

  constructor(tenantId: string, consentMode: ConsentMode = 'opt-out') {
    this.consentMode = consentMode;
    this.storageKey = `grain_consent_${tenantId}`;
    this.loadConsentState();
  }

  /**
   * Load consent state from localStorage
   * 
   * GDPR Compliance: In opt-in mode, we can use localStorage for consent preferences
   * since storing consent choices is a legitimate interest and necessary for compliance.
   * The consent preference itself is not tracking data.
   */
  private loadConsentState(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.consentState = {
          ...parsed,
          timestamp: new Date(parsed.timestamp),
        };
      } else if (this.consentMode === 'opt-out' || this.consentMode === 'disabled') {
        // Auto-grant consent for opt-out and disabled modes
        this.consentState = {
          granted: true,
          categories: DEFAULT_CONSENT_CATEGORIES,
          timestamp: new Date(),
          version: CONSENT_VERSION,
        };
        this.saveConsentState();
      }
      // Note: In opt-in mode without stored consent, consentState remains null (no consent)
    } catch (error) {
      // Silent failure - consent will be requested when needed
    }
  }

  /**
   * Save consent state to localStorage
   */
  private saveConsentState(): void {
    if (typeof window === 'undefined' || !this.consentState) return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.consentState));
    } catch (error) {
      // Silent failure - consent state won't persist
    }
  }

  /**
   * Grant consent with optional categories
   */
  grantConsent(categories?: string[]): void {
    const grantedCategories = categories || DEFAULT_CONSENT_CATEGORIES;
    
    this.consentState = {
      granted: true,
      categories: grantedCategories,
      timestamp: new Date(),
      version: CONSENT_VERSION,
    };

    this.saveConsentState();
    this.notifyListeners();
  }

  /**
   * Revoke consent (opt-out)
   */
  revokeConsent(categories?: string[]): void {
    if (!this.consentState) {
      this.consentState = {
        granted: false,
        categories: [],
        timestamp: new Date(),
        version: CONSENT_VERSION,
      };
    } else if (categories) {
      // Remove specific categories
      this.consentState = {
        ...this.consentState,
        categories: this.consentState.categories.filter(cat => !categories.includes(cat)),
        granted: this.consentState.categories.length > 0,
        timestamp: new Date(),
      };
    } else {
      // Revoke all consent
      this.consentState = {
        granted: false,
        categories: [],
        timestamp: new Date(),
        version: CONSENT_VERSION,
      };
    }

    this.saveConsentState();
    this.notifyListeners();
  }

  /**
   * Get current consent state
   */
  getConsentState(): ConsentState | null {
    return this.consentState ? { ...this.consentState } : null;
  }

  /**
   * Check if user has granted consent
   */
  hasConsent(category?: string): boolean {
    // Disabled mode always returns true (no consent required)
    if (this.consentMode === 'disabled') {
      return true;
    }

    // No consent state in opt-in mode means no consent
    if (this.consentMode === 'opt-in' && !this.consentState) {
      return false;
    }

    // Check consent state
    if (!this.consentState?.granted) {
      return false;
    }

    // Check specific category if provided
    if (category) {
      return this.consentState.categories.includes(category);
    }

    return true;
  }

  /**
   * Check if we should wait for consent before tracking
   */
  shouldWaitForConsent(): boolean {
    return this.consentMode === 'opt-in' && !this.consentState?.granted;
  }

  /**
   * Add consent change listener
   */
  addListener(listener: (state: ConsentState) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove consent change listener
   */
  removeListener(listener: (state: ConsentState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of consent state change
   */
  private notifyListeners(): void {
    if (!this.consentState) return;

    this.listeners.forEach(listener => {
      try {
        listener(this.consentState!);
      } catch (error) {
        // Silent failure - listener threw an error
      }
    });
  }

  /**
   * Clear all consent data
   */
  clearConsent(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.storageKey);
      this.consentState = null;
    } catch (error) {
      // Silent failure - consent state may not be fully cleared
    }
  }
}

