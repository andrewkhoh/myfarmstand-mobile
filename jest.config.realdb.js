module.exports = {
  displayName: 'realdb',
  testMatch: [
    '**/inventory/__tests__/**/*.(ts|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/realDbSetup.ts'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|uuid|expo)/)'
  ],
  collectCoverageFrom: [
    'src/services/inventory/**/*.{ts,tsx}',
    '!src/services/inventory/**/*.d.ts',
    '!src/services/inventory/__tests__/**/*'
  ]
};