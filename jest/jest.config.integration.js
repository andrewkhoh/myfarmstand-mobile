/**
 * Jest Configuration for Integration Tests
 * Phase 5: Production Readiness - Integration test configuration
 * 
 * Optimized for cross-service integration testing
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
    '<rootDir>/src/__tests__/deployment/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/compliance/**/*.test.{js,jsx,ts,tsx}',
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
  testTimeout: 90000, // 90 seconds for integration tests
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 2, // Allow some parallelism for integration tests
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**/*',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
    TEST_MODE: 'integration'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  verbose: true,
  bail: false,
  cache: false,
};