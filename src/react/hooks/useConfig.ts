/**
 * useConfig - Cache-first config access with automatic background refresh
 * 
 * Returns cached/default value immediately, fetches fresh data in background,
 * and automatically updates when configuration changes.
 */

import * as React from 'react';
import { useGrainAnalytics } from './useGrainAnalytics';
import type { UseConfigOptions, UseConfigResult } from '../types';

export function useConfig(key: string, options: UseConfigOptions = {}): UseConfigResult {
  const client = useGrainAnalytics();
  
  // Get initial value from cache/defaults (synchronous, instant)
  const [value, setValue] = React.useState<string | undefined>(() => client.getConfig(key));
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const isMountedRef = React.useRef(true);

  // Fetch fresh config from API
  const fetchConfig = React.useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await client.fetchConfig({
        immediateKeys: options.immediateKeys || [key],
        properties: options.properties,
        forceRefresh: options.forceRefresh,
      });

      if (isMountedRef.current && response) {
        const newValue = response.configurations[key];
        if (newValue !== undefined) {
          setValue(newValue);
        }
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
  }, [client, key, options.immediateKeys, options.properties, options.forceRefresh]);

  // Manual refresh function
  const refresh = React.useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  // Background fetch on mount and when key/options change
  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Subscribe to config changes
  React.useEffect(() => {
    const listener = (configurations: Record<string, string>) => {
      if (isMountedRef.current && configurations[key] !== undefined) {
        setValue(configurations[key]);
      }
    };

    client.addConfigChangeListener(listener);

    return () => {
      client.removeConfigChangeListener(listener);
    };
  }, [client, key]);

  // Track mount state
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    value,
    isRefreshing,
    error,
    refresh,
  };
}

