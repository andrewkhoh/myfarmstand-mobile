module.exports = {
  displayName: 'services',
  testMatch: [
    '**/services/**/*.test.(ts|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    'simpleServices.test.ts',
    'allServices.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/serviceSetup.ts'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|uuid)/)'
  ],
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    '!src/services/**/*.d.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/'
  ]
};