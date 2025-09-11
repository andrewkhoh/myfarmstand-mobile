module.exports = {
  displayName: 'Executive Hooks Tests',
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes with duplicate mocks
  roots: ['<rootDir>/src'],
  
  testMatch: [
    '<rootDir>/src/hooks/executive/__tests__/**/*.test.{ts,tsx}'
  ],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/docker/'],
  modulePathIgnorePatterns: ['<rootDir>/docker/'],
  watchPathIgnorePatterns: ['<rootDir>/docker/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@/test/(.*)$': '<rootDir>/src/test/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/__mocks__/supabase.ts'
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '<rootDir>/src/test/serviceSetup.ts'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '<rootDir>/coverage/executive-hooks',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/hooks/executive/**/*.{ts,tsx}',
    '!src/hooks/executive/**/*.test.{ts,tsx}',
    '!src/hooks/executive/**/__tests__/**',
    '!src/hooks/executive/**/*.d.ts'
  ],
  verbose: true,
  bail: false,
  testTimeout: 10000
};