module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/integration/cross-role/**/*.test.ts',
    '**/integration/cross-role/**/*.test.tsx'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        baseUrl: '.',
        paths: {
          '@/*': ['src/*']
        }
      }
    }]
  },
  collectCoverageFrom: [
    'src/services/integration/**/*.{ts,tsx}',
    '!src/services/integration/**/*.test.{ts,tsx}',
    '!src/services/integration/**/index.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/integration-setup.ts'],
  testTimeout: 10000,
  maxWorkers: 2,
  forceExit: true
};