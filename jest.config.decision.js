module.exports = {
  displayName: 'Decision Support Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/features/decision-support'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@schemas/(.*)$': '<rootDir>/src/schemas/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^react-native$': '<rootDir>/node_modules/react-native-web',
    '\\.svg': '<rootDir>/src/test/mocks/svgMock.js'
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo-.*|@expo/.*|react-native|@react-native|@react-native-community|@react-navigation|@tanstack/react-query|@supabase/.*)/)'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts'  // Use existing setup file instead of missing decision-support-setup.ts
  ],
  collectCoverageFrom: [
    'src/features/decision-support/**/*.{ts,tsx}',
    '!src/features/decision-support/**/*.d.ts',
    '!src/features/decision-support/**/__tests__/**',
    '!src/features/decision-support/**/types/**'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  verbose: true,
  testTimeout: 10000
};