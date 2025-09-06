module.exports = {
  displayName: 'Executive Components',
  preset: 'react-native',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/src/test/setup.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: [
    '<rootDir>/src/components/executive/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/executive/__tests__/**/*.{ts,tsx}'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons|react-native-safe-area-context|react-native-screens|victory-native)/)'
  ],
  collectCoverageFrom: [
    'src/components/executive/**/*.{ts,tsx}',
    '!src/components/executive/**/*.test.{ts,tsx}',
    '!src/components/executive/__tests__/**',
    '!src/components/executive/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
};