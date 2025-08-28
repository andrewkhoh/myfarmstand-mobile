#!/usr/bin/env node

/**
 * Simple test runner for role services
 * Bypasses complex test setup to verify basic functionality
 */

const { execSync } = require('child_process');

console.log('Running Role Service Tests...\n');

try {
  // Run both test files
  const result = execSync(
    'npx jest --config jest.config.services.js --testMatch="**/rolePermissionService.test.ts" --testMatch="**/userRoleService.test.ts" --bail --testTimeout=5000 --forceExit',
    { 
      stdio: 'inherit',
      env: {
        ...process.env,
        TEST_MODE: 'service',
        NODE_ENV: 'test'
      }
    }
  );
  
  console.log('\n✅ Tests completed successfully');
} catch (error) {
  console.error('\n❌ Tests failed');
  process.exit(1);
}