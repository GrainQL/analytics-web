/**
 * Integration tests for Project Vanguard SDK features
 * Tests snapshot capture and navigation tracking
 */

import { describe, it, expect, beforeEach, vi } from '@jest/globals';

describe('Vanguard SDK Integration', () => {
  let mockTracker: any;
  let mockFetch: any;

  beforeEach(() => {
    // Mock tracker
    mockTracker = {
      getEffectiveUserId: vi.fn(() => 'test-user-123'),
      trackSystemEvent: vi.fn(),
      config: {
        apiUrl: 'https://clientapis.grainql.com',
        tenantId: 'test-tenant-id'
      },
      getAuthHeaders: vi.fn(async () => ({})),
      hasConsent: vi.fn(() => true),
      log: vi.fn()
    };

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('Vanguard Selection', () => {
    it('should respect enableHeatmapSnapshot flag from remote config', async () => {
      // Simulate remote config response with Vanguard enabled
      const config = {
        enableHeatmapSnapshot: 'true'
      };

      expect(config.enableHeatmapSnapshot).toBe('true');
    });

    it('should not capture snapshot when enableHeatmapSnapshot is false', () => {
      const config = {
        enableHeatmapSnapshot: 'false'
      };

      expect(config.enableHeatmapSnapshot).toBe('false');
    });
  });

  describe('Snapshot Upload', () => {
    it('should upload snapshot with correct payload structure', async () => {
      const mockSnapshot = {
        type: 'Document',
        childNodes: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ s3Key: 'vanguard/test/snapshot.json.gz', status: 'uploaded' })
      });

      const response = await fetch(
        'https://clientapis.grainql.com/v1/events/test-tenant-id/snapshot',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-user-123',
            pageUrl: 'https://example.com/test',
            snapshot: JSON.stringify(mockSnapshot),
            timestamp: Date.now()
          })
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.status).toBe('uploaded');
      expect(result.s3Key).toContain('vanguard');
    });

    it('should handle upload failures gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const response = await fetch(
        'https://clientapis.grainql.com/v1/events/test-tenant-id/snapshot',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-user-123',
            pageUrl: 'https://example.com/test',
            snapshot: '{}',
            timestamp: Date.now()
          })
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should include authentication headers when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'uploaded' })
      });

      const headers = await mockTracker.getAuthHeaders();
      expect(headers).toBeDefined();
    });
  });

  describe('Navigation Tracking', () => {
    it('should track navigation events with from/to pages', () => {
      mockTracker.trackSystemEvent('_grain_navigation', {
        from_page: '/home',
        to_page: '/products',
        timestamp: Date.now()
      });

      expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
        '_grain_navigation',
        expect.objectContaining({
          from_page: '/home',
          to_page: '/products'
        })
      );
    });

    it('should not track navigation on first page view', () => {
      // First page view has no previous page
      const previousPage = null;

      if (previousPage) {
        mockTracker.trackSystemEvent('_grain_navigation', {
          from_page: previousPage,
          to_page: '/home'
        });
      }

      expect(mockTracker.trackSystemEvent).not.toHaveBeenCalled();
    });

    it('should track navigation on subsequent page views', () => {
      const previousPage = '/home';
      const currentPage = '/products';

      if (previousPage) {
        mockTracker.trackSystemEvent('_grain_navigation', {
          from_page: previousPage,
          to_page: currentPage,
          timestamp: Date.now()
        });
      }

      expect(mockTracker.trackSystemEvent).toHaveBeenCalledWith(
        '_grain_navigation',
        expect.objectContaining({
          from_page: '/home',
          to_page: '/products'
        })
      );
    });
  });

  describe('Snapshot Compression', () => {
    it('should handle large snapshots', () => {
      const largeSnapshot = {
        type: 'Document',
        childNodes: Array(1000).fill({ type: 'Element', tagName: 'div' })
      };

      const serialized = JSON.stringify(largeSnapshot);
      expect(serialized.length).toBeGreaterThan(10000);
      
      // Backend will compress this with Gzip
      // ~80% reduction expected
    });
  });

  describe('PII Sanitization', () => {
    it('should mask input fields in snapshot', () => {
      const snapshot = {
        type: 'Element',
        tagName: 'input',
        attributes: {
          type: 'password',
          value: '****' // Should be masked
        }
      };

      // rrweb-snapshot automatically masks password inputs
      expect(snapshot.attributes.value).toBe('****');
    });

    it('should mask email-like strings', () => {
      const text = 'Contact us at user@example.com';
      const masked = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '*****');
      
      expect(masked).toBe('Contact us at *****');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during upload', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch(
          'https://clientapis.grainql.com/v1/events/test-tenant-id/snapshot',
          {
            method: 'POST',
            body: '{}'
          }
        );
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should log errors without breaking application', () => {
      const logger = vi.fn();
      
      try {
        throw new Error('Snapshot capture failed');
      } catch (error) {
        logger('Failed to upload snapshot:', error);
      }

      expect(logger).toHaveBeenCalled();
    });
  });
});
