module.exports = {
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
  // Ignore Docker volumes to prevent Jest from scanning them
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
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
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/role-test-setup.ts'],
  testMatch: [
    '**/useUserRole.test.tsx',
    '**/useRolePermissions.test.tsx',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react'
      },
      isolatedModules: true,
      diagnostics: false
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library/jest-native|react-native-.*|@react-navigation|@react-native-community|expo|expo-.*|@expo|@unimodules|unimodules|@sentry|sentry-expo|native-base|react-native-svg|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '<rootDir>/coverage/role-hooks'
};