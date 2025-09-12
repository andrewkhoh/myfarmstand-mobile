#!/usr/bin/env node

/**
 * Direct test runner for role services
 * Bypasses all Jest configuration issues
 */

const { execSync } = require('child_process');

console.log('🧪 Running Role Service Tests Directly...\n');

// Set environment to bypass problematic setup
const env = {
  ...process.env,
  NODE_ENV: 'test',
  TEST_MODE: 'service',
  NODE_OPTIONS: '--max-old-space-size=4096',
};

try {
  // Run tests with minimal Jest config and no setup files
  const result = execSync(
    `npx jest src/services/__tests__/rolePermissionService.test.ts src/services/__tests__/userRoleService.test.ts --testEnvironment=node --no-coverage --bail --maxWorkers=1 --testTimeout=5000 --setupFilesAfterEnv=[] --globals='{"TEST_MODE":"service"}'`,
    {
      encoding: 'utf8',
      stdio: 'inherit',
      env,
      timeout: 15000 // 15 second timeout
    }
  );
  console.log('\n✅ Tests completed successfully!');
} catch (error) {
  if (error.signal === 'SIGTERM') {
    console.error('\n⏱️ Tests timed out');
  } else if (error.status) {
    console.error(`\n❌ Tests failed with exit code: ${error.status}`);
  } else {
    console.error('\n❌ Test execution failed:', error.message);
  }
  process.exit(1);
}