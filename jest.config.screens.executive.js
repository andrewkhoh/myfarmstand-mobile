module.exports = {
  preset: 'jest-expo',
  
  // Fix: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
  setupFilesAfterEnv: ['<rootDir>/src/test/component-setup.ts'],
  globals: {
    TEST_MODE: 'screen'
  },
  testMatch: [
    '<rootDir>/src/screens/executive/__tests__/**/*.test.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/screens/executive/**/*.{ts,tsx}',
    '!src/screens/executive/__tests__/**',
    '!src/screens/executive/index.ts'
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
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true
};