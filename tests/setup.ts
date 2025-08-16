// Jest setup file
import { jest } from '@jest/globals';

// Mock fetch globally for all tests
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock navigator.sendBeacon
Object.defineProperty(global.navigator, 'sendBeacon', {
  value: jest.fn(),
  writable: true,
});

// Mock window.addEventListener
Object.defineProperty(global.window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
});

// Mock document.addEventListener
Object.defineProperty(global.document, 'addEventListener', {
  value: jest.fn(),
  writable: true,
});

// Mock setTimeout and clearInterval for timer tests
global.setTimeout = jest.fn() as any;
global.clearInterval = jest.fn() as any;
global.setInterval = jest.fn() as any;

beforeEach(() => {
  jest.clearAllMocks();
});
