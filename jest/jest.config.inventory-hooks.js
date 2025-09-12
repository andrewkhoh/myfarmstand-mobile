module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/hooks/inventory/**/__tests__/**/*.test.ts?(x)',
    '**/hooks/inventory/**/?(*.)+(spec|test).ts?(x)'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      },
      isolatedModules: true,
      diagnostics: false
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/test/mocks/supabase.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/inventory-hooks-setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/docker/',
    '/backup-before-tdd/',
    '/archived-non-volume/'
  ],
  moduleDirectories: ['node_modules', 'src'],
  globals: {
    __DEV__: true
  }
};