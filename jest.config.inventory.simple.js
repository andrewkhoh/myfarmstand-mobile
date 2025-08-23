module.exports = {
  displayName: 'inventory',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  globals: {
    TEST_MODE: 'default'
  },
  testMatch: [
    '<rootDir>/src/hooks/inventory/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '<rootDir>/src/screens/inventory/__tests__/**/*.(test|spec).(ts|tsx|js)', 
    '<rootDir>/src/services/inventory/__tests__/**/*.(test|spec).(ts|tsx|js)'
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
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@tanstack|@testing-library|@supabase))'
  ],
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true
};