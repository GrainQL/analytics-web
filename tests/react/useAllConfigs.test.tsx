/**
 * Tests for useAllConfigs hook
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { GrainProvider } from '../../src/react/GrainProvider';
import { useAllConfigs } from '../../src/react/hooks/useAllConfigs';
import { GrainAnalytics } from '../../src/index';

function TestComponent() {
  const { configs, isRefreshing, error } = useAllConfigs();
  return (
    <div>
      <div>Configs: {JSON.stringify(configs)}</div>
      <div>Refreshing: {isRefreshing ? 'yes' : 'no'}</div>
      <div>Error: {error ? error.message : 'none'}</div>
    </div>
  );
}

describe('useAllConfigs', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should return all default configs immediately', () => {
    const client = new GrainAnalytics({
      tenantId: 'test',
      defaultConfigurations: {
        hero_variant: 'A',
        theme: 'light',
        feature_flag: 'enabled',
      },
    });

    const { container } = render(
      <GrainProvider client={client}>
        <TestComponent />
      </GrainProvider>
    );

    expect(container.textContent).toContain('"hero_variant":"A"');
    expect(container.textContent).toContain('"theme":"light"');
    expect(container.textContent).toContain('"feature_flag":"enabled"');
  });

  it('should return empty object when no defaults', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });

    const { container } = render(
      <GrainProvider client={client}>
        <TestComponent />
      </GrainProvider>
    );

    expect(container.textContent).toContain('Configs: {}');
  });

  it('should update when all configs change', async () => {
    const client = new GrainAnalytics({
      tenantId: 'test',
      defaultConfigurations: {
        hero: 'A',
        theme: 'light',
      },
    });

    const { container } = render(
      <GrainProvider client={client}>
        <TestComponent />
      </GrainProvider>
    );

    expect(container.textContent).toContain('"hero":"A"');
    expect(container.textContent).toContain('"theme":"light"');

    // Simulate config change
    act(() => {
      // @ts-ignore - accessing private method for testing
      const listeners = client['configChangeListeners'];
      listeners.forEach((listener: (config: Record<string, string>) => void) => {
        listener({
          hero: 'B',
          theme: 'dark',
          newKey: 'newValue',
        });
      });
    });

    await waitFor(() => {
      expect(container.textContent).toContain('"hero":"B"');
      expect(container.textContent).toContain('"theme":"dark"');
      expect(container.textContent).toContain('"newKey":"newValue"');
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
        <TestComponent />
      </GrainProvider>
    );

    unmount();

    expect(removeListenerSpy).toHaveBeenCalled();
  });

  it('should handle multiple components using same configs', () => {
    const client = new GrainAnalytics({
      tenantId: 'test',
      defaultConfigurations: {
        shared: 'value',
      },
    });

    function MultiUseComponent() {
      const { configs: configs1 } = useAllConfigs();
      const { configs: configs2 } = useAllConfigs();
      return (
        <div>
          <div>Configs1: {JSON.stringify(configs1)}</div>
          <div>Configs2: {JSON.stringify(configs2)}</div>
        </div>
      );
    }

    const { container } = render(
      <GrainProvider client={client}>
        <MultiUseComponent />
      </GrainProvider>
    );

    expect(container.textContent).toContain('Configs1: {"shared":"value"}');
    expect(container.textContent).toContain('Configs2: {"shared":"value"}');
  });
});

