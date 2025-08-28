module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  globals: {
    TEST_MODE: 'default'
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
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
  ]
};