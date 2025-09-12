module.exports = {
  displayName: 'inventory-typescript',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
  // Ignore Docker volumes to prevent Jest from scanning them
  testPathIgnorePatterns: [
    '/node_modules/',
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
  
  testMatch: [
    '<rootDir>/src/services/inventory/__tests__/**/*.test.ts'
  ],
  
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  setupFiles: ['<rootDir>/src/test/globals.js'],
  setupFilesAfterEnv: ['<rootDir>/src/test/serviceSetup.ts'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/test/__mocks__/@supabase/supabase-js',
    '^expo-constants$': '<rootDir>/src/test/__mocks__/expo-constants',
    '^expo-secure-store$': '<rootDir>/src/test/__mocks__/expo-secure-store',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/test/__mocks__/@react-native-async-storage/async-storage',
    '../../utils/broadcastFactory': '<rootDir>/src/test/__mocks__/broadcastFactory'
  },
  
  clearMocks: true,
  testTimeout: 10000,
  verbose: true,
  
  collectCoverageFrom: [
    'src/services/inventory/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**/*'
  ],
  coverageDirectory: '<rootDir>/coverage/inventory-ts'
};