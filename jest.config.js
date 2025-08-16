module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    'src/tests/rpcFunctions.test.ts',
    'src/tests/reactQueryHooks.test.tsx',
    'src/tests/atomicOperations.test.ts'
  ],
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
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|@supabase|expo|@expo)'
  ]
};
// Unified Jest configuration that routes to appropriate configs
// Based on test patterns or environment variables

const isServiceTest = process.env.TEST_TYPE === 'services' || 
                      process.argv.includes('--testPathPattern=.*services.*') ||
                      process.argv.includes('src/services') ||
                      process.argv.includes('src/tests');

if (isServiceTest) {
  // Use Node.js environment for service tests
  module.exports = require('./jest.config.services.js');
} else {
  // Use React Native environment for hook tests (default)
  module.exports = require('./jest.config.hooks.js');
}
