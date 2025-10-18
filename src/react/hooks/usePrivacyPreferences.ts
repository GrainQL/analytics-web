/**
 * usePrivacyPreferences - Hook for managing privacy preferences
 */

import * as React from 'react';
import { useConsent } from './useConsent';

export interface PrivacyPreferences {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
}

export function usePrivacyPreferences() {
  const { consentState, grantConsent, revokeConsent } = useConsent();

  const preferences = React.useMemo<PrivacyPreferences>(() => {
    const categories = consentState?.categories ?? [];
    return {
      necessary: categories.includes('necessary'),
      analytics: categories.includes('analytics'),
      functional: categories.includes('functional'),
    };
  }, [consentState]);

  const updatePreferences = React.useCallback(
    (newPreferences: Partial<PrivacyPreferences>) => {
      const categories: string[] = [];
      
      // Necessary is always enabled
      categories.push('necessary');
      
      if (newPreferences.analytics ?? preferences.analytics) {
        categories.push('analytics');
      }
      
      if (newPreferences.functional ?? preferences.functional) {
        categories.push('functional');
      }

      if (categories.length > 0) {
        grantConsent(categories);
      } else {
        revokeConsent();
      }
    },
    [preferences, grantConsent, revokeConsent]
  );

  const acceptAll = React.useCallback(() => {
    grantConsent(['necessary', 'analytics', 'functional']);
  }, [grantConsent]);

  const rejectAll = React.useCallback(() => {
    grantConsent(['necessary']); // Keep only necessary
  }, [grantConsent]);

  return {
    preferences,
    updatePreferences,
    acceptAll,
    rejectAll,
  };
}

