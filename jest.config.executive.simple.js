module.exports = {
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes
  roots: ['<rootDir>/src'],
  
  // Ignore Docker volumes to prevent Jest from scanning them
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/docker/volumes/**',
    '<rootDir>/docker/projects/**'
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/node_modules/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
  ],
  haste: {
    throwOnModuleCollision: false
  },
  preset: 'react-native',
  testMatch: [
    '**/src/components/executive/**/*.test.tsx',
    '**/src/hooks/executive/**/*.test.tsx',
    '**/src/screens/executive/**/*.test.tsx'
  ],
  coverageDirectory: '<rootDir>/coverage/executive-simple'
};