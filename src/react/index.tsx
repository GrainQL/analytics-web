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

// Types
export type {
  GrainProviderProps,
  UseConfigOptions,
  UseConfigResult,
  UseAllConfigsOptions,
  UseAllConfigsResult,
  TrackFunction,
} from './types';

