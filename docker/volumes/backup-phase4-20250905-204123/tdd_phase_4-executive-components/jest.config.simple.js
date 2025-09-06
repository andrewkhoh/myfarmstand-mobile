module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.{ts,tsx,js,jsx}'],
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript', '@babel/preset-react'],
    }],
  },
};
