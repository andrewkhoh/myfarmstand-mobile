module.exports = {
  displayName: 'inventory-minimal',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/inventory-minimal-setup.js'],
  testMatch: [
    '<rootDir>/src/hooks/inventory/__tests__/useBulkOperations.test.tsx'
  ],
  collectCoverageFrom: [
    'src/hooks/inventory/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**/*'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@tanstack|@testing-library))'
  ],
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true
};