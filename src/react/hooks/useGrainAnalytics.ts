/**
 * useGrainAnalytics - Access the GrainAnalytics client from context
 */

import * as React from 'react';
import { GrainContext } from '../context';
import type { GrainAnalytics } from '../../index';

export function useGrainAnalytics(): GrainAnalytics {
  const context = React.useContext(GrainContext);

  if (!context) {
    throw new Error(
      'useGrainAnalytics must be used within a GrainProvider. ' +
      'Wrap your component tree with <GrainProvider client={client}> or <GrainProvider config={{...}}>'
    );
  }

  return context.client;
}

