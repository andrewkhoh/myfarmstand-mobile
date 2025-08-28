module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/race-condition-setup.ts'],
  globals: {
    TEST_MODE: 'real-timers'
  },
  testMatch: ['**/src/components/**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    '!src/components/**/__tests__/**',
    '!src/components/**/index.ts'
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