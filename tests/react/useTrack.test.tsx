/**
 * Tests for useTrack hook
 */

import { describe, it, expect, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { GrainProvider } from '../../src/react/GrainProvider';
import { useTrack } from '../../src/react/hooks/useTrack';
import { GrainAnalytics } from '../../src/index';

function TestComponent() {
  const track = useTrack();
  return (
    <button onClick={() => track('button_clicked', { button: 'test' })}>
      Click Me
    </button>
  );
}

describe('useTrack', () => {
  it('should return a track function', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });

    const { getByText } = render(
      <GrainProvider client={client}>
        <TestComponent />
      </GrainProvider>
    );

    const button = getByText('Click Me');
    expect(button).toBeDefined();
  });

  it('should call track on client when invoked', async () => {
    const client = new GrainAnalytics({ tenantId: 'test' });
    const trackSpy = jest.spyOn(client, 'track');

    const { getByText } = render(
      <GrainProvider client={client}>
        <TestComponent />
      </GrainProvider>
    );

    const button = getByText('Click Me');
    fireEvent.click(button);

    expect(trackSpy).toHaveBeenCalledWith('button_clicked', { button: 'test' }, undefined);
  });

  it('should return stable function across renders', () => {
    const client = new GrainAnalytics({ tenantId: 'test' });
    let firstTrack: any = null;
    let secondTrack: any = null;

    function TestStableComponent() {
      const track = useTrack();
      if (!firstTrack) {
        firstTrack = track;
      } else if (!secondTrack) {
        secondTrack = track;
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

    expect(firstTrack).toBe(secondTrack);
  });

  it('should support flush option', async () => {
    const client = new GrainAnalytics({ tenantId: 'test', batchSize: 100 });
    const trackSpy = jest.spyOn(client, 'track');

    function TestFlushComponent() {
      const track = useTrack();
      return (
        <button onClick={() => track('event', {}, { flush: true })}>
          Track with Flush
        </button>
      );
    }

    const { getByText } = render(
      <GrainProvider client={client}>
        <TestFlushComponent />
      </GrainProvider>
    );

    const button = getByText('Track with Flush');
    fireEvent.click(button);

    expect(trackSpy).toHaveBeenCalledWith('event', {}, { flush: true });
  });
});

