/**
 * React context for Grain Analytics
 */

import * as React from 'react';
import type { GrainAnalytics } from '../index';

export interface GrainContextValue {
  client: GrainAnalytics;
  isProviderManaged: boolean;
}

export const GrainContext = React.createContext<GrainContextValue | null>(null);

GrainContext.displayName = 'GrainContext';

