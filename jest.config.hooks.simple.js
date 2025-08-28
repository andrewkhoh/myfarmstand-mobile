module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  testMatch: [
    '**/hooks/__tests__/**/*.(test|spec).(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { 
      presets: [
        '@babel/preset-env',
        '@babel/preset-typescript',
        '@babel/preset-react'
      ]
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@tanstack|@testing-library))'
  ]
};