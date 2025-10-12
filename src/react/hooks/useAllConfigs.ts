/**
 * useAllConfigs - Get all configurations with automatic updates
 * 
 * Returns all configs as a reactive object with cache-first strategy.
 */

import * as React from 'react';
import { useGrainAnalytics } from './useGrainAnalytics';
import type { UseAllConfigsOptions, UseAllConfigsResult } from '../types';

export function useAllConfigs(options: UseAllConfigsOptions = {}): UseAllConfigsResult {
  const client = useGrainAnalytics();
  
  // Get initial configs from cache/defaults (synchronous, instant)
  const [configs, setConfigs] = React.useState<Record<string, string>>(() => client.getAllConfigs());
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const isMountedRef = React.useRef(true);

  // Fetch fresh configs from API
  const fetchConfigs = React.useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await client.fetchConfig({
        immediateKeys: options.immediateKeys || [],
        properties: options.properties,
        forceRefresh: options.forceRefresh,
      });

      if (isMountedRef.current && response) {
        setConfigs(response.configurations);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [client, options.immediateKeys, options.properties, options.forceRefresh]);

  // Manual refresh function
  const refresh = React.useCallback(async () => {
    await fetchConfigs();
  }, [fetchConfigs]);

  // Background fetch on mount and when options change
  React.useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Subscribe to config changes
  React.useEffect(() => {
    const listener = (configurations: Record<string, string>) => {
      if (isMountedRef.current) {
        setConfigs(configurations);
      }
    };

    client.addConfigChangeListener(listener);

    return () => {
      client.removeConfigChangeListener(listener);
    };
  }, [client]);

  // Track mount state
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    configs,
    isRefreshing,
    error,
    refresh,
  };
}

