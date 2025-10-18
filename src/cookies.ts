/**
 * Cookie utilities for Grain Analytics
 * Provides GDPR-compliant cookie management with configurable options
 */

export interface CookieConfig {
  domain?: string;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
  maxAge?: number; // seconds
}

/**
 * Set a cookie with configurable options
 */
export function setCookie(name: string, value: string, config?: CookieConfig): void {
  if (typeof document === 'undefined') return;

  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  
  if (config?.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`);
  }
  
  if (config?.domain) {
    parts.push(`domain=${config.domain}`);
  }
  
  if (config?.path) {
    parts.push(`path=${config.path}`);
  } else {
    parts.push('path=/');
  }
  
  if (config?.sameSite) {
    parts.push(`samesite=${config.sameSite}`);
  }
  
  if (config?.secure) {
    parts.push('secure');
  }
  
  document.cookie = parts.join('; ');
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const nameEQ = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  
  return null;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string, config?: Pick<CookieConfig, 'domain' | 'path'>): void {
  if (typeof document === 'undefined') return;

  const parts = [
    `${encodeURIComponent(name)}=`,
    'max-age=0',
  ];
  
  if (config?.domain) {
    parts.push(`domain=${config.domain}`);
  }
  
  if (config?.path) {
    parts.push(`path=${config.path}`);
  } else {
    parts.push('path=/');
  }
  
  document.cookie = parts.join('; ');
}

/**
 * Check if cookies are available and working
 */
export function areCookiesEnabled(): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const testCookie = '_grain_cookie_test';
    setCookie(testCookie, 'test', { maxAge: 1 });
    const result = getCookie(testCookie) === 'test';
    deleteCookie(testCookie);
    return result;
  } catch {
    return false;
  }
}

