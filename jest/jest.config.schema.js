module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/schemas/inventory/**/__tests__/**/*.test.ts?(x)',
    '**/schemas/inventory/**/__contracts__/**/*.test.ts?(x)',
    '**/schemas/inventory/**/?(*.)+(spec|test).ts?(x)'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        noUnusedLocals: false,
        noUnusedParameters: false
      },
      isolatedModules: false,
      diagnostics: {
        ignoreCodes: [6133] // Ignore unused variable warnings
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/docker/',
    '/backup-before-tdd/',
    '/archived-non-volume/'
  ],
  moduleDirectories: ['node_modules', 'src'],
  verbose: true,
  coverageDirectory: '<rootDir>/coverage/schema'
};