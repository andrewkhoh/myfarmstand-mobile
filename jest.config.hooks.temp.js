module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/hooks/__tests__/**/*.(test|spec).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '.*\\.race\\.test\\.(ts|tsx|js)$',
    '/src/hooks/__tests__/archive/',
    '/src/hooks/__tests__/prototypes/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript']
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
