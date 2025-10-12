/**
 * GrainProvider - Context provider for Grain Analytics
 * 
 * Supports two patterns:
 * 1. Provider-managed: Pass `config` prop, provider creates and manages client lifecycle
 * 2. External client: Pass `client` prop, user manages lifecycle
 */

import * as React from 'react';
import { GrainAnalytics } from '../index';
import { GrainContext } from './context';
import type { GrainProviderProps } from './types';

export function GrainProvider({ children, client, config }: GrainProviderProps) {
  // Validate props
  if (client && config) {
    throw new Error(
      'GrainProvider: Cannot provide both "client" and "config" props. ' +
      'Use "client" for external management or "config" for provider-managed client.'
    );
  }

  if (!client && !config) {
    throw new Error(
      'GrainProvider: Must provide either "client" or "config" prop. ' +
      'Use "client" to pass an existing GrainAnalytics instance, or "config" to create one automatically.'
    );
  }

  const isProviderManaged = Boolean(config);
  const clientRef = React.useRef<GrainAnalytics | null>(null);

  // Initialize client if config is provided
  if (isProviderManaged && !clientRef.current && config) {
    clientRef.current = new GrainAnalytics(config);
  }

  // Use external client if provided
  const activeClient = client || clientRef.current;

  if (!activeClient) {
    throw new Error('GrainProvider: Failed to initialize client');
  }

  // Cleanup on unmount (only for provider-managed clients)
  React.useEffect(() => {
    return () => {
      if (isProviderManaged && clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
    };
  }, [isProviderManaged]);

  return (
    <GrainContext.Provider value={{ client: activeClient, isProviderManaged }}>
      {children}
    </GrainContext.Provider>
  );
}

