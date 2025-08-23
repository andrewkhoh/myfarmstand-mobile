module.exports = {
  preset: 'jest-expo',
  displayName: 'Navigation Tests',
  testMatch: [
    '**/navigation/__tests__/**/*.(ts|tsx)',
    '**/navigation/**/*.test.(ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/.expo/'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/serviceSetup.ts',
    '<rootDir>/src/test/navigationSetup.ts'
  ],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  collectCoverageFrom: [
    'src/navigation/**/*.{ts,tsx}',
    '!src/navigation/**/__tests__/**',
    '!src/navigation/**/*.test.{ts,tsx}',
    '!src/navigation/**/index.{ts,tsx}'
  ],
  coverageDirectory: '<rootDir>/coverage/navigation',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  clearMocks: true,
  restoreMocks: true,
  fakeTimers: {
    enableGlobally: false,
  },
  verbose: true
};