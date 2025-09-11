module.exports = {
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/hooks/executive/__tests__/minimal.test.tsx"
  ],
  testPathIgnorePatterns: ['/node_modules/', '/docker/'],
  modulePathIgnorePatterns: ['/docker/'],
  watchPathIgnorePatterns: ['/docker/'],
  haste: {
    throwOnModuleCollision: false
  },
  roots: ['<rootDir>/src']
};
