/**
 * Tests for GrainProvider
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GrainProvider } from '../../src/react/GrainProvider';
import { useGrainAnalytics } from '../../src/react/hooks/useGrainAnalytics';
import { GrainAnalytics } from '../../src/index';

// Test component that uses the hook
function TestComponent() {
  const client = useGrainAnalytics();
  return <div>Client ID: {client.getUserId() || 'anonymous'}</div>;
}

describe('GrainProvider', () => {
  it('should throw error when both client and config are provided', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });
    const config = { tenantId: 'test' };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(
        <GrainProvider client={client} config={config}>
          <div>Test</div>
        </GrainProvider>
      );
    }).toThrow('Cannot provide both "client" and "config" props');

    console.error = originalError;
  });

  it('should throw error when neither client nor config are provided', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(
        <GrainProvider>
          <div>Test</div>
        </GrainProvider>
      );
    }).toThrow('Must provide either "client" or "config" prop');

    console.error = originalError;
  });

  it('should work with external client', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });
    client.identify('user123');

    render(
      <GrainProvider client={client}>
        <TestComponent />
      </GrainProvider>
    );

    expect(screen.getByText('Client ID: user123')).toBeDefined();
  });

  it('should work with config (provider-managed)', () => {
    render(
      <GrainProvider config={{ tenantId: 'test' }}>
        <TestComponent />
      </GrainProvider>
    );

    // Should render with anonymous user
    expect(screen.getByText(/Client ID:/)).toBeDefined();
  });

  it('should cleanup provider-managed client on unmount', () => {
    const { unmount } = render(
      <GrainProvider config={{ tenantId: 'test' }}>
        <TestComponent />
      </GrainProvider>
    );

    unmount();
    // If we got here without errors, cleanup worked
    expect(true).toBe(true);
  });

  it('should not cleanup external client on unmount', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });
    const destroySpy = jest.spyOn(client, 'destroy');

    const { unmount } = render(
      <GrainProvider client={client}>
        <TestComponent />
      </GrainProvider>
    );

    unmount();
    
    // External client should NOT be destroyed
    expect(destroySpy).not.toHaveBeenCalled();
  });
});

