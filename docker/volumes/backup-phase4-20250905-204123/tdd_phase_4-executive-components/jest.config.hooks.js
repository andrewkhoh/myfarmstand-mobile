module.exports = {
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
  ],
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
  }
};
