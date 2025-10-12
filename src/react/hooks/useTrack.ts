/**
 * useTrack - Get a stable, memoized track function
 * 
 * Returns a track function that doesn't cause re-renders when passed to child components.
 * Prevents unnecessary re-renders compared to using useCallback.
 */

import * as React from 'react';
import { useGrainAnalytics } from './useGrainAnalytics';
import type { TrackFunction } from '../types';

export function useTrack(): TrackFunction {
  const client = useGrainAnalytics();

  // Create stable track function that won't change across renders
  const track = React.useCallback<TrackFunction>(
    async (eventName, properties, options) => {
      await client.track(eventName, properties, options);
    },
    [client]
  );

  return track;
}

