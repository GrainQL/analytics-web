/**
 * Attribution and Referral Tracking for Grain Analytics
 * Handles referral categorization and first-touch attribution
 */

export type ReferrerCategory = 'organic' | 'paid' | 'social' | 'direct' | 'email' | 'referral';

export interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface FirstTouchAttribution {
  source: string;
  medium: string;
  campaign: string;
  referrer: string;
  referrer_category: ReferrerCategory;
  timestamp: number;
}

/**
 * Known paid search parameters
 */
const PAID_SEARCH_PARAMS = [
  'gclid', // Google Ads
  'msclkid', // Microsoft Ads
  'fbclid', // Facebook Ads
  'ttclid', // TikTok Ads
  'li_fat_id', // LinkedIn Ads
  'twclid', // Twitter Ads
  'ScCid', // Snapchat Ads
];

/**
 * Known social media domains
 */
const SOCIAL_DOMAINS = [
  'facebook.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'instagram.com',
  'pinterest.com',
  'reddit.com',
  'tiktok.com',
  'youtube.com',
  'snapchat.com',
  't.co', // Twitter short links
  'fb.me', // Facebook short links
  'lnkd.in', // LinkedIn short links
];

/**
 * Known organic search engines
 */
const SEARCH_ENGINES = [
  'google.',
  'bing.com',
  'yahoo.com',
  'duckduckgo.com',
  'baidu.com',
  'yandex.com',
  'ecosia.org',
  'ask.com',
];

/**
 * Email client domains
 */
const EMAIL_DOMAINS = [
  'mail.google.com',
  'outlook.live.com',
  'mail.yahoo.com',
  'mail.aol.com',
];

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if URL contains paid search parameters
 */
function hasPaidSearchParams(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return PAID_SEARCH_PARAMS.some(param => urlObj.searchParams.has(param));
  } catch {
    return false;
  }
}

/**
 * Categorize referrer based on domain and parameters
 */
export function categorizeReferrer(referrer: string, currentUrl: string = ''): ReferrerCategory {
  // Direct traffic (no referrer)
  if (!referrer || referrer.trim() === '') {
    return 'direct';
  }

  const domain = extractDomain(referrer);
  
  // Same domain = direct
  if (currentUrl) {
    const currentDomain = extractDomain(currentUrl);
    if (domain === currentDomain) {
      return 'direct';
    }
  }

  // Check for paid search parameters
  if (hasPaidSearchParams(referrer) || hasPaidSearchParams(currentUrl)) {
    return 'paid';
  }

  // Email clients
  if (EMAIL_DOMAINS.some(emailDomain => domain.includes(emailDomain))) {
    return 'email';
  }

  // Social media
  if (SOCIAL_DOMAINS.some(socialDomain => domain.includes(socialDomain))) {
    return 'social';
  }

  // Organic search engines
  if (SEARCH_ENGINES.some(searchEngine => domain.includes(searchEngine))) {
    return 'organic';
  }

  // Everything else is referral
  return 'referral';
}

/**
 * Parse UTM parameters from URL
 */
export function parseUTMParameters(url: string): UTMParameters {
  try {
    const urlObj = new URL(url);
    const params: UTMParameters = {};

    const utmSource = urlObj.searchParams.get('utm_source');
    const utmMedium = urlObj.searchParams.get('utm_medium');
    const utmCampaign = urlObj.searchParams.get('utm_campaign');
    const utmTerm = urlObj.searchParams.get('utm_term');
    const utmContent = urlObj.searchParams.get('utm_content');

    if (utmSource) params.utm_source = utmSource;
    if (utmMedium) params.utm_medium = utmMedium;
    if (utmCampaign) params.utm_campaign = utmCampaign;
    if (utmTerm) params.utm_term = utmTerm;
    if (utmContent) params.utm_content = utmContent;

    return params;
  } catch {
    return {};
  }
}

/**
 * Get first-touch attribution from localStorage
 */
export function getFirstTouchAttribution(tenantId: string): FirstTouchAttribution | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const key = `_grain_first_touch_${tenantId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as FirstTouchAttribution;
    }
  } catch (error) {
    console.warn('[Grain Attribution] Failed to retrieve first-touch attribution:', error);
  }

  return null;
}

/**
 * Set first-touch attribution in localStorage
 */
export function setFirstTouchAttribution(
  tenantId: string,
  attribution: FirstTouchAttribution
): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    const key = `_grain_first_touch_${tenantId}`;
    localStorage.setItem(key, JSON.stringify(attribution));
  } catch (error) {
    console.warn('[Grain Attribution] Failed to store first-touch attribution:', error);
  }
}

/**
 * Get or create first-touch attribution
 */
export function getOrCreateFirstTouchAttribution(
  tenantId: string,
  referrer: string,
  currentUrl: string,
  utmParams: UTMParameters
): FirstTouchAttribution {
  // Try to get existing first-touch
  const existing = getFirstTouchAttribution(tenantId);
  if (existing) {
    return existing;
  }

  // Create new first-touch attribution
  const referrerCategory = categorizeReferrer(referrer, currentUrl);
  const referrerDomain = extractDomain(referrer);

  const firstTouch: FirstTouchAttribution = {
    source: utmParams.utm_source || referrerDomain || 'direct',
    medium: utmParams.utm_medium || referrerCategory,
    campaign: utmParams.utm_campaign || 'none',
    referrer: referrer || 'direct',
    referrer_category: referrerCategory,
    timestamp: Date.now(),
  };

  // Store it
  setFirstTouchAttribution(tenantId, firstTouch);

  return firstTouch;
}

/**
 * Get session UTM parameters (memory-only, not persisted across page loads)
 */
let sessionUTMParams: UTMParameters | null = null;

export function getSessionUTMParameters(): UTMParameters | null {
  return sessionUTMParams;
}

export function setSessionUTMParameters(params: UTMParameters): void {
  sessionUTMParams = params;
}

/**
 * Clear session UTM parameters
 */
export function clearSessionUTMParameters(): void {
  sessionUTMParams = null;
}

