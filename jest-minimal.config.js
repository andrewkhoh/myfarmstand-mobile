module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: [
    '**/services/__tests__/rolePermissionService.test.ts',
    '**/services/__tests__/userRoleService.test.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|@supabase|expo|@expo)'
  ],
  testTimeout: 5000,
  maxWorkers: 1,
  bail: true,
  // No setupFilesAfterEnv to avoid the problematic test-setup.ts
};