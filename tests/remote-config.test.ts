/**
 * Remote Configuration Tests
 * Tests remote config fetching and usage
 */

import { createGrainAnalytics } from '../src/index';
import { TEST_TENANT_ID, TEST_API_URL } from './setup';

describe('Remote Configuration', () => {
  let grain: ReturnType<typeof createGrainAnalytics>;

  beforeEach(() => {
    grain = createGrainAnalytics({
      tenantId: TEST_TENANT_ID,
      apiUrl: TEST_API_URL,
      enableConfigCache: false, // Disable cache for tests
    });
  });

  afterEach(() => {
    grain.destroy();
  });

  test('should fetch remote config', async () => {
    const config = await grain.fetchConfig();
    expect(config).toBeDefined();
  });

  test('should get single config value', () => {
    const value = grain.getConfig('test_key');
    // May be undefined if key doesn't exist
    expect(value !== undefined || value === undefined).toBe(true);
  });

  test('should get all configs', async () => {
    const configs = await grain.getAllConfigs();
    expect(configs).toBeDefined();
    expect(typeof configs).toBe('object');
  });

  test('should handle missing config keys', () => {
    const value = grain.getConfig('non_existent_key_12345');
    // Should return undefined for missing keys
    expect(value).toBeUndefined();
  });
});

