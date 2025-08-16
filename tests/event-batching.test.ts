import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GrainAnalytics, GrainConfig } from '../src/index';

describe('Event Batching and Limits', () => {
  let analytics: GrainAnalytics;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockConsoleError: jest.SpiedFunction<typeof console.error>;

  const defaultConfig: GrainConfig = {
    tenantId: 'test-tenant',
    apiUrl: 'https://test-api.com',
    debug: false,
  };

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock successful API response by default
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    } as Response);
  });

  afterEach(() => {
    if (analytics) {
      analytics.destroy();
    }
    jest.clearAllMocks();
    mockConsoleError.mockRestore();
  });

  describe('Default Event Limit', () => {
    it('should have default maxEventsPerRequest of 160', () => {
      analytics = new GrainAnalytics(defaultConfig);
      const config = (analytics as any).config;
      expect(config.maxEventsPerRequest).toBe(160);
    });

    it('should allow custom maxEventsPerRequest configuration', () => {
      const customConfig = { ...defaultConfig, maxEventsPerRequest: 50 };
      analytics = new GrainAnalytics(customConfig);
      const config = (analytics as any).config;
      expect(config.maxEventsPerRequest).toBe(50);
    });
  });

  describe('Event Chunking', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should split events into chunks using chunkEvents method', () => {
      const events = Array.from({ length: 300 }, (_, i) => ({
        eventName: `event_${i}`,
        userId: 'anonymous',
        properties: { index: i },
      }));

      const chunks = (analytics as any).chunkEvents(events, 160);
      
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toHaveLength(160);
      expect(chunks[1]).toHaveLength(140);
      expect(chunks[0][0].eventName).toBe('event_0');
      expect(chunks[0][159].eventName).toBe('event_159');
      expect(chunks[1][0].eventName).toBe('event_160');
      expect(chunks[1][139].eventName).toBe('event_299');
    });

    it('should handle events that exactly match chunk size', () => {
      const events = Array.from({ length: 160 }, (_, i) => ({
        eventName: `event_${i}`,
        userId: 'anonymous',
        properties: { index: i },
      }));

      const chunks = (analytics as any).chunkEvents(events, 160);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(160);
    });

    it('should handle events smaller than chunk size', () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        eventName: `event_${i}`,
        userId: 'anonymous',
        properties: { index: i },
      }));

      const chunks = (analytics as any).chunkEvents(events, 160);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(50);
    });

    it('should handle empty events array', () => {
      const events: any[] = [];
      const chunks = (analytics as any).chunkEvents(events, 160);
      
      expect(chunks).toHaveLength(0);
    });
  });

  describe('Flush with Large Event Batches', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should split large batches into multiple API calls during flush', async () => {
      // Disable auto-flush by setting a very high batch size
      const config = { ...defaultConfig, batchSize: 1000 };
      analytics.destroy();
      analytics = new GrainAnalytics(config);

      // Add 250 events to the queue
      for (let i = 0; i < 250; i++) {
        await analytics.track(`event_${i}`, { index: i });
      }

      // Clear any calls that might have happened
      mockFetch.mockClear();

      await analytics.flush();

      // Should make 2 API calls: 160 + 90 events
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Check first call has 160 events
      const firstCall = mockFetch.mock.calls[0];
      const firstBody = JSON.parse(firstCall![1]!.body as string);
      expect(firstBody.events).toHaveLength(160);
      expect(firstBody.events[0].eventName).toBe('event_0');
      expect(firstBody.events[159].eventName).toBe('event_159');

      // Check second call has 90 events
      const secondCall = mockFetch.mock.calls[1];
      const secondBody = JSON.parse(secondCall![1]!.body as string);
      expect(secondBody.events).toHaveLength(90);
      expect(secondBody.events[0].eventName).toBe('event_160');
      expect(secondBody.events[89].eventName).toBe('event_249');
    });

    it('should respect custom maxEventsPerRequest setting', async () => {
      const customConfig = { ...defaultConfig, maxEventsPerRequest: 50 };
      analytics.destroy();
      analytics = new GrainAnalytics(customConfig);

      // Add 120 events to the queue
      for (let i = 0; i < 120; i++) {
        await analytics.track(`event_${i}`, { index: i });
      }

      await analytics.flush();

      // Should make 3 API calls: 50 + 50 + 20 events
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // Check each call has correct number of events
      const calls = mockFetch.mock.calls;
      
      const firstBody = JSON.parse(calls[0]![1]!.body as string);
      expect(firstBody.events).toHaveLength(50);
      
      const secondBody = JSON.parse(calls[1]![1]!.body as string);
      expect(secondBody.events).toHaveLength(50);
      
      const thirdBody = JSON.parse(calls[2]![1]!.body as string);
      expect(thirdBody.events).toHaveLength(20);
    });

    it('should maintain event order across chunks', async () => {
      // Disable auto-flush by setting a very high batch size
      const config = { ...defaultConfig, batchSize: 1000 };
      analytics.destroy();
      analytics = new GrainAnalytics(config);

      // Add 200 events with specific properties
      for (let i = 0; i < 200; i++) {
        await analytics.track(`event_${i}`, { 
          index: i, 
          batch: Math.floor(i / 50) // Group in batches of 50
        });
      }

      // Clear any calls that might have happened
      mockFetch.mockClear();

      await analytics.flush();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Check that events maintain their order
      const firstCall = mockFetch.mock.calls[0];
      const firstBody = JSON.parse(firstCall![1]!.body as string);
      expect(firstBody.events[0].eventName).toBe('event_0');
      expect(firstBody.events[0].properties.index).toBe(0);
      expect(firstBody.events[159].eventName).toBe('event_159');
      expect(firstBody.events[159].properties.index).toBe(159);

      const secondCall = mockFetch.mock.calls[1];
      const secondBody = JSON.parse(secondCall![1]!.body as string);
      expect(secondBody.events[0].eventName).toBe('event_160');
      expect(secondBody.events[0].properties.index).toBe(160);
      expect(secondBody.events[39].eventName).toBe('event_199');
      expect(secondBody.events[39].properties.index).toBe(199);
    });

    it.skip('should handle errors in chunked requests properly', async () => {
      // Disable auto-flush by setting a very high batch size
      const config = { ...defaultConfig, batchSize: 1000 };
      analytics.destroy();
      analytics = new GrainAnalytics(config);

      // Add 200 events
      for (let i = 0; i < 200; i++) {
        await analytics.track(`event_${i}`, { index: i });
      }

      // Clear previous calls and set up new mock responses
      mockFetch.mockClear();
      
      // Make first request succeed, second fail
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server Error' }),
        } as Response);

      await expect(analytics.flush()).rejects.toThrow('Failed to send events: Server Error');
      
      // Should have attempted both requests
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  describe('Event Batching in Auto-flush Scenarios', () => {
    it('should respect maxEventsPerRequest during auto-flush when batch size is reached', async () => {
      // Configure small batch size but large maxEventsPerRequest
      const config = { 
        ...defaultConfig, 
        batchSize: 200, // Larger than maxEventsPerRequest
        maxEventsPerRequest: 100 
      };
      analytics = new GrainAnalytics(config);

      // Add exactly batchSize events to trigger auto-flush
      for (let i = 0; i < 200; i++) {
        await analytics.track(`event_${i}`, { index: i });
      }

      // Should have made 2 API calls due to maxEventsPerRequest limit
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      const firstBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(firstBody.events).toHaveLength(100);
      
      const secondBody = JSON.parse(mockFetch.mock.calls[1]![1]!.body as string);
      expect(secondBody.events).toHaveLength(100);
    });
  });

  describe('Beacon API with Event Chunking', () => {
    it.skip('should only send first chunk via beacon during page unload', async () => {
      const mockSendBeacon = jest.fn().mockReturnValue(true);
      Object.defineProperty(global.navigator, 'sendBeacon', {
        value: mockSendBeacon,
        writable: true,
        configurable: true,
      });

      // Use high batch size to prevent auto-flush during tracking
      const config = { ...defaultConfig, batchSize: 1000 };
      analytics.destroy();
      analytics = new GrainAnalytics(config);

      // Add 200 events and destroy (simulating page unload)
      for (let i = 0; i < 200; i++) {
        await analytics.track(`event_${i}`, { index: i });
      }
      
      analytics.destroy();

      // Should call sendBeacon for chunks (160 events + 40 events)
      expect(mockSendBeacon).toHaveBeenCalledTimes(2);
      
      // Verify the beacon was called with correct data
      const beaconCall = mockSendBeacon.mock.calls[0];
      expect(beaconCall[0]).toBe('https://test-api.com/v1/events/test-tenant');
      expect(beaconCall[1]).toBeInstanceOf(Blob);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      analytics = new GrainAnalytics(defaultConfig);
    });

    it('should handle maxEventsPerRequest of 1', async () => {
      const config = { ...defaultConfig, maxEventsPerRequest: 1 };
      analytics.destroy();
      analytics = new GrainAnalytics(config);

      await analytics.track('event1');
      await analytics.track('event2');
      await analytics.track('event3');

      await analytics.flush();

      // Should make 3 separate API calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // Each call should have exactly 1 event
      for (let i = 0; i < 3; i++) {
        const body = JSON.parse(mockFetch.mock.calls[i]![1]!.body as string);
        expect(body.events).toHaveLength(1);
      }
    });

    it('should handle very large maxEventsPerRequest value', async () => {
      const config = { ...defaultConfig, maxEventsPerRequest: 10000, batchSize: 1000 };
      analytics.destroy();
      analytics = new GrainAnalytics(config);

      // Add 300 events
      for (let i = 0; i < 300; i++) {
        await analytics.track(`event_${i}`);
      }

      // Clear any calls that might have happened
      mockFetch.mockClear();

      await analytics.flush();

      // Should make only 1 API call since all events fit in one chunk
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(body.events).toHaveLength(300);
    });
  });
});
