/**
 * Grain Analytics React Hooks
 * 
 * React integration for @grainql/analytics-web
 * 
 * @example
 * ```tsx
 * import { GrainProvider, useConfig, useTrack } from '@grainql/analytics-web/react';
 * 
 * // Pattern 1: Provider-managed client
 * <GrainProvider config={{ tenantId: 'xxx' }}>
 *   <App />
 * </GrainProvider>
 * 
 * // Pattern 2: External client
 * const grain = new GrainAnalytics({ tenantId: 'xxx' });
 * <GrainProvider client={grain}>
 *   <App />
 * </GrainProvider>
 * 
 * // Use hooks in components
 * function MyComponent() {
 *   const { value } = useConfig('hero_variant');
 *   const track = useTrack();
 *   
 *   return <button onClick={() => track('clicked')}>Click</button>;
 * }
 * ```
 */

// Provider
export { GrainProvider } from './GrainProvider';

// Hooks
export { useGrainAnalytics } from './hooks/useGrainAnalytics';
export { useConfig } from './hooks/useConfig';
export { useAllConfigs } from './hooks/useAllConfigs';
export { useTrack } from './hooks/useTrack';

// Privacy hooks
export { useConsent } from './hooks/useConsent';
export { usePrivacyPreferences } from './hooks/usePrivacyPreferences';
export { useDataDeletion } from './hooks/useDataDeletion';

// Privacy components
export { ConsentBanner } from './components/ConsentBanner';
export { PrivacyPreferenceCenter } from './components/PrivacyPreferenceCenter';
export { CookieNotice } from './components/CookieNotice';

// Types
export type {
  GrainProviderProps,
  UseConfigOptions,
  UseConfigResult,
  UseAllConfigsOptions,
  UseAllConfigsResult,
  TrackFunction,
} from './types';

// Privacy component types
export type { ConsentBannerProps } from './components/ConsentBanner';
export type { PrivacyPreferenceCenterProps } from './components/PrivacyPreferenceCenter';
export type { CookieNoticeProps } from './components/CookieNotice';
export type { PrivacyPreferences } from './hooks/usePrivacyPreferences';
export type { DataDeletionOptions } from './hooks/useDataDeletion';

