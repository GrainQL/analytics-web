/**
 * Tests for Consent Manager v2.0
 * Tests new consent modes: cookieless, gdpr-strict, gdpr-opt-out
 */

import { ConsentManager } from '../src/consent';

describe('ConsentManager v2.0', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Cookieless Mode', () => {
    it('should default to cookieless mode', () => {
      const manager = new ConsentManager('test-tenant');
      expect(manager.getConsentMode()).toBe('cookieless');
    });

    it('should not allow permanent IDs in cookieless mode', () => {
      const manager = new ConsentManager('test-tenant', 'cookieless');
      expect(manager.shouldUsePermanentId()).toBe(false);
      expect(manager.hasConsent()).toBe(false);
    });

    it('should always strip query params in cookieless mode', () => {
      const manager = new ConsentManager('test-tenant', 'cookieless');
      expect(manager.shouldStripQueryParams()).toBe(true);
    });

    it('should allow tracking in cookieless mode', () => {
      const manager = new ConsentManager('test-tenant', 'cookieless');
      expect(manager.canTrack()).toBe(true);
    });

    it('should not wait for consent in cookieless mode', () => {
      const manager = new ConsentManager('test-tenant', 'cookieless');
      expect(manager.shouldWaitForConsent()).toBe(false);
    });

    it('should return cookieless ID mode', () => {
      const manager = new ConsentManager('test-tenant', 'cookieless');
      expect(manager.getIdMode()).toBe('cookieless');
    });
  });

  describe('GDPR Strict Mode', () => {
    it('should not allow permanent IDs without consent', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      expect(manager.shouldUsePermanentId()).toBe(false);
      expect(manager.hasConsent()).toBe(false);
    });

    it('should allow permanent IDs after consent', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      manager.grantConsent(['analytics']);

      expect(manager.shouldUsePermanentId()).toBe(true);
      expect(manager.hasConsent()).toBe(true);
    });

    it('should strip query params without consent', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      expect(manager.shouldStripQueryParams()).toBe(true);
    });

    it('should not strip query params with consent', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      manager.grantConsent(['analytics']);
      expect(manager.shouldStripQueryParams()).toBe(false);
    });

    it('should wait for consent before permanent tracking', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      expect(manager.shouldWaitForConsent()).toBe(true);
    });

    it('should return appropriate ID mode based on consent', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      expect(manager.getIdMode()).toBe('cookieless');

      manager.grantConsent(['analytics']);
      expect(manager.getIdMode()).toBe('permanent');
    });

    it('should persist consent state', () => {
      const manager1 = new ConsentManager('test-tenant', 'gdpr-strict');
      manager1.grantConsent(['analytics']);

      // Simulate page reload
      const manager2 = new ConsentManager('test-tenant', 'gdpr-strict');
      expect(manager2.hasConsent()).toBe(true);
    });

    it('should revoke consent', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      manager.grantConsent(['analytics']);
      expect(manager.hasConsent()).toBe(true);

      manager.revokeConsent();
      expect(manager.hasConsent()).toBe(false);
      expect(manager.getIdMode()).toBe('cookieless');
    });
  });

  describe('GDPR Opt-out Mode', () => {
    it('should allow permanent IDs by default', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-opt-out');
      expect(manager.shouldUsePermanentId()).toBe(true);
      expect(manager.hasConsent()).toBe(true);
    });

    it('should not strip query params in opt-out mode', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-opt-out');
      expect(manager.shouldStripQueryParams()).toBe(false);
    });

    it('should not wait for consent in opt-out mode', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-opt-out');
      expect(manager.shouldWaitForConsent()).toBe(false);
    });

    it('should switch to cookieless when user opts out', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-opt-out');
      expect(manager.hasConsent()).toBe(true);

      manager.revokeConsent();
      expect(manager.hasConsent()).toBe(false);
      expect(manager.getIdMode()).toBe('cookieless');
    });

    it('should return permanent ID mode by default', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-opt-out');
      expect(manager.getIdMode()).toBe('permanent');
    });
  });

  describe('Consent Change Listeners', () => {
    it('should notify listeners on consent grant', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      const listener = jest.fn();

      manager.addListener(listener);
      manager.grantConsent(['analytics']);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          granted: true,
          categories: ['analytics'],
        })
      );
    });

    it('should notify listeners on consent revoke', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      const listener = jest.fn();

      manager.grantConsent(['analytics']);
      manager.addListener(listener);
      manager.revokeConsent();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          granted: false,
          categories: [],
        })
      );
    });

    it('should allow removing listeners', () => {
      const manager = new ConsentManager('test-tenant', 'gdpr-strict');
      const listener = jest.fn();

      manager.addListener(listener);
      manager.removeListener(listener);
      manager.grantConsent(['analytics']);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
