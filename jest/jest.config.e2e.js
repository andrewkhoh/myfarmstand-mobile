/**
 * Jest Configuration for End-to-End Integration Tests
 * Phase 5: Production Readiness - E2E test configuration
 * 
 * Optimized for integration testing with extended timeouts and cleanup
 */

module.exports = {
  // Ignore Docker volumes to prevent Jest from scanning them
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/docker/volumes/**',
    '<rootDir>/docker/projects/**'
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/node_modules/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
  ],
  haste: {
    throwOnModuleCollision: false
  },
  preset: 'react-native',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@supabase|@tanstack/react-query)/)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/test-setup.ts',
  ],
  globals: {
    TEST_MODE: 'e2e'
  },
  testTimeout: 120000, // 2 minutes for E2E tests
  forceExit: true, // Force exit to prevent hanging
  detectOpenHandles: true,
  maxWorkers: 1, // Single worker for E2E consistency
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**/*',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  // E2E test specific settings
  verbose: true,
  bail: false, // Continue running tests even if some fail
  cache: false, // Disable cache for integration tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};