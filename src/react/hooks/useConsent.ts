/**
 * useConsent - Hook for managing user consent (v2.0)
 * Updated for new consent modes: cookieless, gdpr-strict, gdpr-opt-out
 */

import * as React from 'react';
import { useGrainAnalytics } from './useGrainAnalytics';
import type { ConsentState, ConsentMode } from '../../consent';

export function useConsent() {
  const client = useGrainAnalytics();
  const [consentState, setConsentState] = React.useState<ConsentState | null>(null);

  React.useEffect(() => {
    if (!client) return;

    // Get initial consent state
    const initialState = client.getConsentState();
    setConsentState(initialState);

    // Listen for consent changes
    const listener = (state: ConsentState) => {
      setConsentState(state);
    };

    client.onConsentChange(listener);

    return () => {
      client.offConsentChange(listener);
    };
  }, [client]);

  const grantConsent = React.useCallback(
    (categories?: string[]) => {
      if (client) {
        client.grantConsent(categories);
      }
    },
    [client]
  );

  const revokeConsent = React.useCallback(
    (categories?: string[]) => {
      if (client) {
        client.revokeConsent(categories);
      }
    },
    [client]
  );

  const hasConsent = React.useCallback(
    (category?: string) => {
      if (!client) return false;
      return client.hasConsent(category);
    },
    [client]
  );

  return {
    consentState,
    grantConsent,
    revokeConsent,
    hasConsent,
    isGranted: consentState?.granted ?? false,
    categories: consentState?.categories ?? [],
  };
}

/**
 * useConsentMode - Hook to get current consent mode
 * v2.0: Returns 'cookieless' | 'gdpr-strict' | 'gdpr-opt-out'
 */
export function useConsentMode(): ConsentMode | null {
  const client = useGrainAnalytics();
  const [mode, setMode] = React.useState<ConsentMode | null>(null);

  React.useEffect(() => {
    if (!client) return;
    // Access internal consent manager via client methods
    // This is a simplified version - mode doesn't change at runtime
    const config = (client as any).config;
    setMode(config?.consentMode ?? 'cookieless');
  }, [client]);

  return mode;
}

/**
 * useTrackingId - Hook to get current tracking ID
 * v2.0: Returns daily rotating ID or permanent ID based on consent
 */
export function useTrackingId(): string | null {
  const client = useGrainAnalytics();
  const [trackingId, setTrackingId] = React.useState<string | null>(null);
  const { consentState } = useConsent();

  React.useEffect(() => {
    if (!client) return;
    
    try {
      const id = client.getEffectiveUserId();
      setTrackingId(id);
    } catch (error) {
      console.warn('Failed to get tracking ID:', error);
    }
  }, [client, consentState]); // Re-fetch when consent changes

  return trackingId;
}

/**
 * useCanTrack - Hook to check if tracking is allowed
 * v2.0: Always returns true (even cookieless mode allows basic tracking)
 */
export function useCanTrack(): boolean {
  const mode = useConsentMode();
  
  // All modes allow some form of tracking in v2.0
  return mode !== null;
}

