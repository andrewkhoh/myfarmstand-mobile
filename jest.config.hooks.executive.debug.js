module.exports = {
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
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
  displayName: 'Executive Hooks Tests - Debug',
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/hooks/executive/__tests__/**/*.test.{ts,tsx}'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@/test/(.*)$': '<rootDir>/src/test/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/__mocks__/supabase.ts'
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '<rootDir>/src/test/serviceSetup.ts'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  verbose: true,
  bail: 1,  // Stop after first test failure
  testTimeout: 5000,  // 5 second timeout instead of 10
  maxWorkers: 1,  // Force single threaded to see errors better
  detectOpenHandles: true,
  forceExit: false,  // Don't force exit, let it show what's hanging
  errorOnDeprecated: true,
  // Show better errors for module resolution
  resolver: undefined,
  modulePathIgnorePatterns: [],
  unmockedModulePathPatterns: [],
  coverageDirectory: '<rootDir>/coverage/hooks-executive-debug'
};