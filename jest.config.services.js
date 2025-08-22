module.exports = {
  preset: 'jest-expo',
  displayName: 'services',
  testMatch: [
    '**/services/__tests__/**/*.(ts|js)',
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
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|@supabase|expo|@expo)'
  ],
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    '!src/services/**/*.d.ts',
    '!src/services/__tests__/**/*'
  ]
};