module.exports = {
  displayName: 'services',
  
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
  testMatch: [
    '**/services/__tests__/**/*.(ts|js)',
    '**/services/**/*.test.(ts|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    'simpleServices.test.ts',
    'allServices.test.ts',
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
  setupFilesAfterEnv: ['<rootDir>/src/test/serviceSetup.ts'],
  globals: {
    TEST_MODE: 'service'
  },
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
  ],
  coverageDirectory: '<rootDir>/coverage/services'
};