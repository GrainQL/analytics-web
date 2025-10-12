/**
 * React-specific types for Grain Analytics
 */

import type { GrainAnalytics, GrainConfig, SendEventOptions } from '../index';

export interface GrainProviderProps {
  children: React.ReactNode;
  client?: GrainAnalytics;
  config?: GrainConfig;
}

export interface UseConfigOptions {
  forceRefresh?: boolean;
  immediateKeys?: string[];
  properties?: Record<string, string>;
}

export interface UseConfigResult {
  value: string | undefined;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseAllConfigsOptions {
  forceRefresh?: boolean;
  immediateKeys?: string[];
  properties?: Record<string, string>;
}

export interface UseAllConfigsResult {
  configs: Record<string, string>;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export type TrackFunction = (
  eventName: string,
  properties?: Record<string, unknown>,
  options?: SendEventOptions
) => Promise<void>;

