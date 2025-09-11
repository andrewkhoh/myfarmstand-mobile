module.exports = {
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
  displayName: 'realdb',
  testMatch: [
    '**/inventory/__tests__/**/*.(ts|js)'
  ],
  testPathIgnorePatterns: ['/node_modules/',
    '/android/',
    '/ios/',
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
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  globals: {
    TEST_MODE: 'realdb'
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
    'node_modules/(?!(@supabase|uuid|expo)/)'
  ],
  collectCoverageFrom: [
    'src/services/inventory/**/*.{ts,tsx}',
    '!src/services/inventory/**/*.d.ts',
    '!src/services/inventory/__tests__/**/*'
  ],
  coverageDirectory: '<rootDir>/coverage/realdb'
};