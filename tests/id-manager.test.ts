/**
 * Tests for ID Manager (v2.0)
 * Tests daily rotating IDs and permanent IDs
 */

import { IdManager } from '../src/id-manager';

describe('IdManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Mock Date for consistent testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Cookieless Mode (Daily Rotating IDs)', () => {
    it('should generate daily rotating ID in cookieless mode', () => {
      const idManager = new IdManager({
        mode: 'cookieless',
        tenantId: 'test-tenant',
      });

      const id = idManager.getCurrentUserId();
      expect(id).toMatch(/^daily_/);
    });

    it('should return same ID on same day', () => {
      const idManager = new IdManager({
        mode: 'cookieless',
        tenantId: 'test-tenant',
      });

      const id1 = idManager.getCurrentUserId();
      const id2 = idManager.getCurrentUserId();

      expect(id1).toBe(id2);
    });

    it('should generate different ID on different day', () => {
      const idManager = new IdManager({
        mode: 'cookieless',
        tenantId: 'test-tenant',
      });

      const id1 = idManager.getCurrentUserId();

      // Advance time by 25 hours (next day)
      jest.advanceTimersByTime(25 * 60 * 60 * 1000);

      const id2 = idManager.getCurrentUserId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^daily_/);
      expect(id2).toMatch(/^daily_/);
    });

    it('should not persist daily ID to localStorage', () => {
      const idManager = new IdManager({
        mode: 'cookieless',
        tenantId: 'test-tenant',
        useLocalStorage: true,
      });

      idManager.getCurrentUserId();

      // Check that no permanent ID is stored
      const stored = localStorage.getItem('grain_anonymous_user_id_test-tenant');
      expect(stored).toBeNull();
    });
  });

  describe('Permanent Mode', () => {
    it('should generate permanent ID in permanent mode', () => {
      const idManager = new IdManager({
        mode: 'permanent',
        tenantId: 'test-tenant',
        useLocalStorage: true,
      });

      const id = idManager.getCurrentUserId();
      expect(id).not.toMatch(/^daily_/);
      expect(id).toMatch(/^[0-9a-f-]+$/); // UUID format
    });

    it('should return same permanent ID across instances', () => {
      const idManager1 = new IdManager({
        mode: 'permanent',
        tenantId: 'test-tenant',
        useLocalStorage: true,
      });

      const id1 = idManager1.getCurrentUserId();

      // Create new instance (simulates page reload)
      const idManager2 = new IdManager({
        mode: 'permanent',
        tenantId: 'test-tenant',
        useLocalStorage: true,
      });

      const id2 = idManager2.getCurrentUserId();

      expect(id1).toBe(id2);
    });

    it('should persist permanent ID to localStorage', () => {
      const idManager = new IdManager({
        mode: 'permanent',
        tenantId: 'test-tenant',
        useLocalStorage: true,
      });

      const id = idManager.getCurrentUserId();

      const stored = localStorage.getItem('grain_anonymous_user_id_test-tenant');
      expect(stored).toBe(id);
    });
  });

  describe('Mode Switching', () => {
    it('should switch from cookieless to permanent mode', () => {
      const idManager = new IdManager({
        mode: 'cookieless',
        tenantId: 'test-tenant',
        useLocalStorage: true,
      });

      const dailyId = idManager.getCurrentUserId();
      expect(dailyId).toMatch(/^daily_/);

      // Grant consent -> switch to permanent
      idManager.setMode('permanent');

      const permanentId = idManager.getCurrentUserId();
      expect(permanentId).not.toMatch(/^daily_/);
      expect(permanentId).not.toBe(dailyId);
    });

    it('should switch from permanent to cookieless mode', () => {
      const idManager = new IdManager({
        mode: 'permanent',
        tenantId: 'test-tenant',
        useLocalStorage: true,
      });

      const permanentId = idManager.getCurrentUserId();

      // Revoke consent -> switch to cookieless
      idManager.setMode('cookieless');

      const dailyId = idManager.getCurrentUserId();
      expect(dailyId).toMatch(/^daily_/);
      expect(dailyId).not.toBe(permanentId);

      // Verify localStorage is cleared
      const stored = localStorage.getItem('grain_anonymous_user_id_test-tenant');
      expect(stored).toBeNull();
    });
  });

  describe('ID Info', () => {
    it('should return correct ID info for cookieless mode', () => {
      const idManager = new IdManager({
        mode: 'cookieless',
        tenantId: 'test-tenant',
      });

      const info = idManager.getIdInfo();

      expect(info.mode).toBe('cookieless');
      expect(info.isDailyRotating).toBe(true);
      expect(info.id).toMatch(/^daily_/);
    });

    it('should return correct ID info for permanent mode', () => {
      const idManager = new IdManager({
        mode: 'permanent',
        tenantId: 'test-tenant',
        useLocalStorage: true,
      });

      const info = idManager.getIdInfo();

      expect(info.mode).toBe('permanent');
      expect(info.isDailyRotating).toBe(false);
      expect(info.id).not.toMatch(/^daily_/);
    });
  });
});
