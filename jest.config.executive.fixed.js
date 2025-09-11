module.exports = {
  displayName: 'Executive Hooks Tests (Fixed)',
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  
  // CRITICAL FIX: Only scan src directory, not docker volumes
  roots: ['<rootDir>/src'],
  
  testMatch: [
    '<rootDir>/src/hooks/executive/__tests__/**/*.test.{ts,tsx}'
  ],
  
  // These don't prevent haste map scanning, but keep them for other purposes
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/docker/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
  ],
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
  verbose: true,
  bail: false,
  testTimeout: 10000,
  coverageDirectory: '<rootDir>/coverage/executive-fixed'
};