import '@testing-library/jest-dom';

// Mock React Native modules that might be imported
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: jest.fn((obj) => obj.web || obj.default)
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 }))
  },
  StyleSheet: {
    create: (styles: any) => styles
  }
}));

// Global test utilities
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn()
};

// Mock fetch if needed
global.fetch = jest.fn();

// Add matchMedia mock for jsdom environment
(global as any).matchMedia = (global as any).matchMedia || function() {
  return {
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};