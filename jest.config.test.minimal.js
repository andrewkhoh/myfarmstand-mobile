module.exports = {
  displayName: 'Minimal Test',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/hooks/executive/__tests__/**/*.test.{ts,tsx}'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  verbose: true
};