module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    'src/tests/rpcFunctions.test.ts',
    'src/tests/reactQueryHooks.test.tsx',
    'src/tests/atomicOperations.test.ts',
    // Phase 2 Update: Only ignore true archives and prototypes
    // This ensures ALL extension modules (executive, inventory, marketing, role-based) are tested
    '/archives/',
    '/ARCHIVE/',
    'archive/',
    'prototypes/',
    // Skip race condition tests (they need special jest config)
    '\\.race\\.(test|spec)\\.',
    // Skip legacy files that are deprecated  
    '\\.legacy\\.(test|spec)\\.',
    '\\.deprecated\\.(test|spec)\\.',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/__tests__/**/*'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|@supabase|expo|@expo)'
  ]
};
