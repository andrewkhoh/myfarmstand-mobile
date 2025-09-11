/**
 * Jest Configuration for Performance Tests
 * Phase 5: Production Readiness - Performance test configuration
 * 
 * Optimized for performance testing with extended timeouts and forceExit
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
    '<rootDir>/src/__tests__/performance/**/*.test.{js,jsx,ts,tsx}',
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
  testTimeout: 30000, // 30 seconds for performance tests
  forceExit: true, // Force exit to prevent hanging
  detectOpenHandles: true,
  maxWorkers: 1, // Single worker for consistent performance measurements
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**/*',
  ],
  coverageDirectory: '<rootDir>/coverage/performance',
  coverageReporters: ['text', 'lcov', 'html'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
    TEST_MODE: 'performance'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  // Performance test specific settings
  verbose: true,
  bail: false, // Continue running tests even if some fail
  cache: false, // Disable cache for accurate performance measurements
};