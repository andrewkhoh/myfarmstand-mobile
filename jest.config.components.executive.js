module.exports = {
  // Ignore Docker volumes to prevent Jest from scanning them
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/docker/volumes/**',
    '<rootDir>/docker/projects/**'
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
  displayName: 'Executive Components',
  preset: 'react-native',
  testEnvironment: 'jsdom',
  
  // Fix: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
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