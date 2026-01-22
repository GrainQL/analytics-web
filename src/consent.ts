/**
 * Consent management for Grain Analytics v2.0
 * Privacy-first, cookieless by default
 * 
 * Consent Modes:
 * - cookieless: Default mode, daily rotating IDs, no consent needed
 * - gdpr-strict: Requires explicit consent, falls back to cookieless
 * - gdpr-opt-out: Permanent IDs by default, cookieless on opt-out
 */

export type ConsentMode = 'COOKIELESS' | 'GDPR_STRICT' | 'GDPR_OPT_OUT';

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
 * v2.0: Cookieless by default, privacy-first approach
 */
export class ConsentManager {
  private consentState: ConsentState | null = null;
  private consentMode: ConsentMode;
  private storageKey: string;
  private listeners: Array<(state: ConsentState) => void> = [];

  constructor(tenantId: string, consentMode: ConsentMode = 'COOKIELESS') {
    this.consentMode = consentMode;
    this.storageKey = `grain_consent_${tenantId}`;
    this.loadConsentState();
  }

  /**
   * Load consent state from localStorage
   * 
   * GDPR Compliance: localStorage only used for storing consent preferences
   * (not for tracking), which is a legitimate interest for compliance.
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
      } else if (this.consentMode === 'GDPR_OPT_OUT') {
        // Auto-grant consent for opt-out mode (user hasn't opted out yet)
        this.consentState = {
          granted: true,
          categories: DEFAULT_CONSENT_CATEGORIES,
          timestamp: new Date(),
          version: CONSENT_VERSION,
        };
        this.saveConsentState();
      }
      // Note: cookieless and gdpr-strict modes without stored consent → no permanent tracking
    } catch (error) {
      // Silent failure - will use cookieless mode by default
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
   * Check if user has granted consent for permanent IDs
   */
  hasConsent(category?: string): boolean {
    // Cookieless mode: no consent needed (no permanent tracking)
    if (this.consentMode === 'COOKIELESS') {
      return false; // No permanent IDs
    }

    // GDPR Strict: requires explicit consent
    if (this.consentMode === 'GDPR_STRICT') {
      if (!this.consentState?.granted) {
        return false;
      }
    }

    // GDPR Opt-out: consent by default unless explicitly revoked
    if (this.consentMode === 'GDPR_OPT_OUT') {
      // If no state, assume consent (opt-out model)
      if (!this.consentState) {
        return true;
      }
      // Check if consent was revoked
      if (!this.consentState.granted) {
        return false;
      }
    }

    // Check specific category if provided
    if (category && this.consentState) {
      return this.consentState.categories.includes(category);
    }

    return this.consentState?.granted ?? (this.consentMode === 'GDPR_OPT_OUT');
  }

  /**
   * Check if permanent IDs are allowed
   */
  shouldUsePermanentId(): boolean {
    return this.hasConsent();
  }

  /**
   * Check if we should strip query parameters from URLs
   * Query params stripped unless:
   * - Mode is gdpr-opt-out, OR
   * - Mode is gdpr-strict AND consent given
   */
  shouldStripQueryParams(): boolean {
    if (this.consentMode === 'COOKIELESS') {
      return true; // Always strip in cookieless mode
    }
    
    if (this.consentMode === 'GDPR_STRICT') {
      return !this.hasConsent(); // Strip unless consented
    }
    
    if (this.consentMode === 'GDPR_OPT_OUT') {
      return false; // Don't strip in opt-out mode
    }
    
    return true; // Default: strip
  }

  /**
   * Check if we can track events (always true in v2.0)
   * Even cookieless mode allows basic analytics with daily IDs
   */
  canTrack(): boolean {
    return true; // All modes allow some form of tracking
  }

  /**
   * Check if we should wait for consent before tracking
   * Only relevant for GDPR Strict mode
   */
  shouldWaitForConsent(): boolean {
    return this.consentMode === 'GDPR_STRICT' && !this.consentState?.granted;
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

  /**
   * Get current consent mode
   */
  getConsentMode(): ConsentMode {
    return this.consentMode;
  }

  /**
   * Get ID mode based on consent state
   * Returns 'cookieless' or 'permanent' for IdManager
   */
  getIdMode(): 'cookieless' | 'permanent' {
    return this.shouldUsePermanentId() ? 'permanent' : 'cookieless';
  }
}

