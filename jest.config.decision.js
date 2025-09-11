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
  displayName: 'Decision Support Tests',
  testEnvironment: 'node',
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
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
  testTimeout: 10000,
  coverageDirectory: '<rootDir>/coverage/decision'
};