// Minimal test setup for hooks testing

// Set test-only environment variables
process.env.EXPO_PUBLIC_CHANNEL_SECRET = 'test-secret-key-for-jest-only-a1b2c3d4e5f6789012345678901234567890abcdef';

global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);