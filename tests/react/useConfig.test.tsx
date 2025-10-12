/**
 * Tests for useConfig hook
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { GrainProvider } from '../../src/react/GrainProvider';
import { useConfig } from '../../src/react/hooks/useConfig';
import { GrainAnalytics } from '../../src/index';

function TestComponent({ configKey }: { configKey: string }) {
  const { value, isRefreshing, error } = useConfig(configKey);
  return (
    <div>
      <div>Value: {value || 'undefined'}</div>
      <div>Refreshing: {isRefreshing ? 'yes' : 'no'}</div>
      <div>Error: {error ? error.message : 'none'}</div>
    </div>
  );
}

describe('useConfig', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should return cached value immediately', () => {
    const client = new GrainAnalytics({
      tenantId: 'test',
      defaultConfigurations: { hero_variant: 'A' },
    });

    const { container } = render(
      <GrainProvider client={client}>
        <TestComponent configKey="hero_variant" />
      </GrainProvider>
    );

    expect(container.textContent).toContain('Value: A');
  });

  it('should return undefined for non-existent key', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });

    const { container } = render(
      <GrainProvider client={client}>
        <TestComponent configKey="non_existent" />
      </GrainProvider>
    );

    expect(container.textContent).toContain('Value: undefined');
  });

  it('should update when config changes', async () => {
    const client = new GrainAnalytics({
      tenantId: 'test',
      defaultConfigurations: { theme: 'light' },
    });

    const { container } = render(
      <GrainProvider client={client}>
        <TestComponent configKey="theme" />
      </GrainProvider>
    );

    expect(container.textContent).toContain('Value: light');

    // Simulate config change
    act(() => {
      // @ts-ignore - accessing private method for testing
      const listeners = client['configChangeListeners'];
      listeners.forEach((listener: (config: Record<string, string>) => void) => {
        listener({ theme: 'dark' });
      });
    });

    await waitFor(() => {
      expect(container.textContent).toContain('Value: dark');
    });
  });

  it('should cleanup listeners on unmount', () => {
    const client = new GrainAnalytics({
      tenantId: 'test',
      defaultConfigurations: { hero: 'A' },
    });

    const removeListenerSpy = jest.spyOn(client, 'removeConfigChangeListener');

    const { unmount } = render(
      <GrainProvider client={client}>
        <TestComponent configKey="hero" />
      </GrainProvider>
    );

    unmount();

    expect(removeListenerSpy).toHaveBeenCalled();
  });

  it('should handle multiple components with different keys', () => {
    const client = new GrainAnalytics({
      tenantId: 'test',
      defaultConfigurations: {
        hero: 'A',
        theme: 'light',
      },
    });

    function MultiConfigTest() {
      const { value: hero } = useConfig('hero');
      const { value: theme } = useConfig('theme');
      return (
        <div>
          Hero: {hero}, Theme: {theme}
        </div>
      );
    }

    const { container } = render(
      <GrainProvider client={client}>
        <MultiConfigTest />
      </GrainProvider>
    );

    expect(container.textContent).toContain('Hero: A');
    expect(container.textContent).toContain('Theme: light');
  });
});

