module.exports = {
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  globals: {
    TEST_MODE: 'race'
  },
  testMatch: [
    '**/*race.test.(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
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
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/__tests__/**/*'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/test/__mocks__/@supabase/supabase-js',
    '^expo-constants$': '<rootDir>/src/test/__mocks__/expo-constants',
    '^expo-secure-store$': '<rootDir>/src/test/__mocks__/expo-secure-store',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/test/__mocks__/@react-native-async-storage/async-storage',
    '../../utils/broadcastFactory': '<rootDir>/src/test/__mocks__/broadcastFactory'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@tanstack|@testing-library|expo|@expo|@supabase|isows))'
  ],
  // Use React Native environment (not jsdom) for React Native components
  testEnvironment: 'node',
  // Increase timeout for race condition tests
  testTimeout: 20000,
  // Prevent memory leaks in race condition tests
  maxWorkers: 1,
  // Handle unhandled promise rejections
  errorOnDeprecated: false,
  coverageDirectory: '<rootDir>/coverage/hooks-race'
};