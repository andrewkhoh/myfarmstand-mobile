module.exports = {
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '.*\\.race\\.test\\.(ts|tsx|js)$',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }]
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