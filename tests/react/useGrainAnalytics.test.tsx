/**
 * Tests for useGrainAnalytics hook
 */

import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react';
import { GrainProvider } from '../../src/react/GrainProvider';
import { useGrainAnalytics } from '../../src/react/hooks/useGrainAnalytics';
import { GrainAnalytics } from '../../src/index';

function TestComponent() {
  const client = useGrainAnalytics();
  return <div>Has Client: {client ? 'yes' : 'no'}</div>;
}

describe('useGrainAnalytics', () => {
  it('should return client from context', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });

    const { container } = render(
      <GrainProvider client={client}>
        <TestComponent />
      </GrainProvider>
    );

    expect(container.textContent).toContain('Has Client: yes');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useGrainAnalytics must be used within a GrainProvider');

    console.error = originalError;
  });

  it('should return same client instance across renders', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });
    let firstClient: GrainAnalytics | null = null;
    let secondClient: GrainAnalytics | null = null;

    function TestStableComponent() {
      const client = useGrainAnalytics();
      if (!firstClient) {
        firstClient = client;
      } else if (!secondClient) {
        secondClient = client;
      }
      return <div>Test</div>;
    }

    const { rerender } = render(
      <GrainProvider client={client}>
        <TestStableComponent />
      </GrainProvider>
    );

    rerender(
      <GrainProvider client={client}>
        <TestStableComponent />
      </GrainProvider>
    );

    expect(firstClient).toBe(secondClient);
  });
});

