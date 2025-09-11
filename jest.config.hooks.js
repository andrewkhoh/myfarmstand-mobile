module.exports = {
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  globals: {
    TEST_MODE: 'default'
  },
  testMatch: [
    '**/hooks/__tests__/**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '.*\\.race\\.test\\.(ts|tsx|js)$',
    '/src/hooks/__tests__/archive/',
    '/src/hooks/__tests__/prototypes/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
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
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react'
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  coverageDirectory: '<rootDir>/coverage/hooks'
};
