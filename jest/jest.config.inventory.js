module.exports = {
  // Fix root directory
  rootDir: '../',
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
  haste: {
    throwOnModuleCollision: false
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  globals: {
    TEST_MODE: 'default'
  },
  testMatch: [
    '<rootDir>/src/hooks/inventory/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/src/screens/inventory/__tests__/**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/hooks/inventory/**/*.{ts,tsx}',
    'src/screens/inventory/**/*.{ts,tsx}',
    'src/services/inventory/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**/*'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': '<rootDir>/src/test/__mocks__/react-native.js',
    '^@supabase/supabase-js$': '<rootDir>/src/test/__mocks__/@supabase/supabase-js',
    '^expo-constants$': '<rootDir>/src/test/__mocks__/expo-constants',
    '^expo-secure-store$': '<rootDir>/src/test/__mocks__/expo-secure-store',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/test/__mocks__/@react-native-async-storage/async-storage',
    '../../utils/broadcastFactory': '<rootDir>/src/test/__mocks__/broadcastFactory'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@tanstack|@testing-library|expo|@expo|@supabase|isows))'
  ],
  testTimeout: 10000,
  verbose: true,
  coverageDirectory: '<rootDir>/coverage/inventory'
};