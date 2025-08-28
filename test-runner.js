// Simple test runner to verify our tests work
const jest = require('jest');

async function runTests() {
  const options = {
    projects: [__dirname],
    testMatch: [
      '**/services/__tests__/rolePermissionService.test.ts',
      '**/services/__tests__/userRoleService.test.ts'
    ],
    testEnvironment: 'node',
    bail: true,
    verbose: true,
    detectOpenHandles: true,
    forceExit: true,
    setupFilesAfterEnv: [],  // Skip the problematic setup
    transform: {
      '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
    },
  };

  try {
    const result = await jest.runCLI(options, [__dirname]);
    console.log('\nTest Summary:');
    console.log(`Total tests: ${result.results.numTotalTests}`);
    console.log(`Passed: ${result.results.numPassedTests}`);
    console.log(`Failed: ${result.results.numFailedTests}`);
    console.log(`Pass rate: ${(result.results.numPassedTests / result.results.numTotalTests * 100).toFixed(2)}%`);
  } catch (error) {
    console.error('Test run failed:', error);
  }
}

runTests();