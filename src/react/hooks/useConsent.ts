/**
 * useConsent - Hook for managing user consent
 */

import * as React from 'react';
import { useGrainAnalytics } from './useGrainAnalytics';
import type { ConsentState } from '../../consent';

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

