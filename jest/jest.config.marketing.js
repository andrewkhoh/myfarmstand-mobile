module.exports = {
  displayName: 'marketing',
  
  // Only scan src directory
  roots: ['<rootDir>/src'],
  
  testMatch: [
    '**/marketing/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/marketing/**/*.(test|spec).(ts|tsx|js)'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '__tests__.archived'
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
  
  // Use different setup based on test type
  setupFilesAfterEnv: ['<rootDir>/src/test/marketing-setup.ts'],
  
  // Marketing services use node environment, hooks use jsdom
  testEnvironment: 'node',
  
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
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
    'src/services/marketing/**/*.{ts,tsx}',
    'src/hooks/marketing/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**/*'
  ],
  
  coverageDirectory: '<rootDir>/coverage/marketing',
  
  globals: {
    TEST_MODE: 'marketing'
  }
};