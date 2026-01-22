/**
 * ID Manager for Grain Analytics
 * Generates and manages user IDs based on consent mode
 * 
 * Privacy-first implementation:
 * - Cookieless mode: Daily rotating IDs (no persistence)
 * - GDPR Strict: Permanent IDs only with consent
 * - GDPR Opt-out: Permanent IDs by default
 */

export type IdMode = 'cookieless' | 'permanent';

export interface IdConfig {
  mode: IdMode;
  tenantId: string;
  useLocalStorage?: boolean; // For permanent IDs only
}

/**
 * Generate a simple hash from a string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get minimal browser fingerprint for daily ID generation
 * NOT for tracking, just for same-day continuity
 */
function getBrowserFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  
  const components: string[] = [
    screen.width?.toString() || '',
    screen.height?.toString() || '',
    navigator.language || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  ];
  
  return simpleHash(components.join('|'));
}

/**
 * Get current date string in local timezone (YYYY-MM-DD)
 */
function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ID Manager class
 * Handles both daily rotating IDs and permanent IDs
 */
export class IdManager {
  private config: IdConfig;
  private cachedDailyId: string | null = null;
  private dailyIdDate: string | null = null;
  private dailyRandomSeed: string | null = null; // Random component for daily ID
  private permanentId: string | null = null;
  
  constructor(config: IdConfig) {
    this.config = config;
    
    // Load permanent ID from localStorage if in permanent mode
    if (config.mode === 'permanent' && config.useLocalStorage) {
      this.loadPermanentId();
    }
    
    // Load daily random seed from sessionStorage if in cookieless mode
    if (config.mode === 'cookieless') {
      this.loadDailySeed();
    }
  }
  
  /**
   * Generate a daily rotating ID
   * Rotates at midnight in user's local timezone
   * Provides same-day continuity without persistent tracking
   */
  generateDailyRotatingId(): string {
    const currentDate = getLocalDateString();
    
    // Return cached ID if still the same day
    if (this.cachedDailyId && this.dailyIdDate === currentDate && this.dailyRandomSeed) {
      return this.cachedDailyId;
    }
    
    // Load seed from sessionStorage if available
    const storedSeed = this.loadDailySeed();
    
    // If date changed, clear the random seed
    if (this.dailyIdDate !== currentDate) {
      this.dailyRandomSeed = null;
      this.clearDailySeed();
    }
    
    // Generate new random seed for today if needed
    if (!this.dailyRandomSeed) {
      this.dailyRandomSeed = storedSeed || generateUUID();
      this.saveDailySeed(this.dailyRandomSeed, currentDate);
    }
    
    // Generate new daily ID using fingerprint + random seed
    const fingerprint = getBrowserFingerprint();
    const seed = `${this.config.tenantId}|${currentDate}|${fingerprint}|${this.dailyRandomSeed}`;
    const dailyId = `daily_${simpleHash(seed)}`;
    
    // Cache for same-day requests
    this.cachedDailyId = dailyId;
    this.dailyIdDate = currentDate;
    
    return dailyId;
  }
  
  /**
   * Generate or retrieve permanent user ID
   * Only used when consent is given
   */
  generatePermanentId(): string {
    if (this.permanentId) {
      return this.permanentId;
    }
    
    // Try to load from localStorage
    if (this.config.useLocalStorage) {
      const stored = this.loadPermanentId();
      if (stored) {
        return stored;
      }
    }
    
    // Generate new permanent ID
    const newId = generateUUID();
    this.permanentId = newId;
    
    // Store in localStorage if enabled
    if (this.config.useLocalStorage) {
      this.savePermanentId(newId);
    }
    
    return newId;
  }
  
  /**
   * Get the current user ID based on mode
   */
  getCurrentUserId(): string {
    if (this.config.mode === 'cookieless') {
      return this.generateDailyRotatingId();
    } else {
      return this.generatePermanentId();
    }
  }
  
  /**
   * Switch ID mode (e.g., when consent is granted/revoked)
   */
  setMode(mode: IdMode): void {
    this.config.mode = mode;
    
    // Clear cached daily ID when switching to permanent
    if (mode === 'permanent') {
      this.cachedDailyId = null;
      this.dailyIdDate = null;
      this.dailyRandomSeed = null;
      this.clearDailySeed();
    }
    
    // Clear permanent ID when switching to cookieless
    if (mode === 'cookieless') {
      this.permanentId = null;
      if (this.config.useLocalStorage) {
        this.clearPermanentId();
      }
      // Load daily seed for cookieless mode
      this.loadDailySeed();
    }
  }
  
  /**
   * Load permanent ID from localStorage
   */
  private loadPermanentId(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const storageKey = `grain_anonymous_user_id_${this.config.tenantId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        this.permanentId = stored;
        return stored;
      }
    } catch (error) {
      // Silent failure - localStorage might be disabled
    }
    
    return null;
  }
  
  /**
   * Save permanent ID to localStorage
   */
  private savePermanentId(id: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const storageKey = `grain_anonymous_user_id_${this.config.tenantId}`;
      localStorage.setItem(storageKey, id);
    } catch (error) {
      // Silent failure - localStorage might be disabled
    }
  }
  
  /**
   * Clear permanent ID from localStorage
   */
  private clearPermanentId(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const storageKey = `grain_anonymous_user_id_${this.config.tenantId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Silent failure
    }
  }
  
  /**
   * Load daily random seed from sessionStorage
   */
  private loadDailySeed(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const storageKey = `grain_daily_seed_${this.config.tenantId}`;
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        const currentDate = getLocalDateString();
        
        // Only use seed if it's from today
        if (data.date === currentDate && data.seed) {
          this.dailyRandomSeed = data.seed;
          this.dailyIdDate = data.date;
          return data.seed;
        } else {
          // Clear stale seed
          this.clearDailySeed();
        }
      }
    } catch (error) {
      // Silent failure - sessionStorage might be disabled
    }
    
    return null;
  }
  
  /**
   * Save daily random seed to sessionStorage
   */
  private saveDailySeed(seed: string, date: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const storageKey = `grain_daily_seed_${this.config.tenantId}`;
      const data = { seed, date };
      sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      // Silent failure - sessionStorage might be disabled
    }
  }
  
  /**
   * Clear daily seed from sessionStorage
   */
  private clearDailySeed(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const storageKey = `grain_daily_seed_${this.config.tenantId}`;
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      // Silent failure
    }
  }
  
  /**
   * Get info about current ID for debugging
   */
  getIdInfo(): { mode: IdMode; id: string; isDailyRotating: boolean } {
    const id = this.getCurrentUserId();
    return {
      mode: this.config.mode,
      id: id,
      isDailyRotating: id.startsWith('daily_')
    };
  }
}
