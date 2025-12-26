// Jest setup file for Grain Analytics tests

// Test configuration
export const TEST_TENANT_ID = 'grain-test-lab';
export const TEST_API_URL = 'https://api.grainql.com';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(public callback: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
} as any;

// Cleanup and reset before each test
beforeEach(() => {
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Setup basic DOM
  document.body.innerHTML = `
    <div id="root">
      <div id="hero-section">Hero Content</div>
      <div id="content-section">Main Content</div>
    </div>
  `;
});
