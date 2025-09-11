module.exports = {
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/hooks/executive/__tests__/minimal.test.tsx"
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/node_modules/'
  ],
  haste: {
    throwOnModuleCollision: false
  },
  roots: ['<rootDir>/src'],
  coverageDirectory: '<rootDir>/coverage/minimal'
};
