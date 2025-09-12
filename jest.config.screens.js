module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/src/screens/**/__tests__/**/*.test.ts?(x)',
    '**/src/screens/**/?(*.)+(spec|test).ts?(x)'
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
  setupFilesAfterEnv: ['<rootDir>/src/test/component-setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/docker/',
    '/backup-before-tdd/',
    '/archived-non-volume/'
  ],
  moduleDirectories: ['node_modules', 'src'],
  globals: {
    __DEV__: true,
    TEST_MODE: 'screen'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@react-native|react-native|@react-native-community|@react-navigation|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^components/(.*)$': '<rootDir>/src/components/$1',
    '^screens/(.*)$': '<rootDir>/src/screens/$1',
    '^services/(.*)$': '<rootDir>/src/services/$1',
    '^types/(.*)$': '<rootDir>/src/types/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^schemas/(.*)$': '<rootDir>/src/schemas/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy'
  },
  verbose: true,
  collectCoverageFrom: [
    'src/screens/**/*.{ts,tsx}',
    '!src/screens/**/*.d.ts',
    '!src/screens/**/index.{ts,tsx}'
  ]
};