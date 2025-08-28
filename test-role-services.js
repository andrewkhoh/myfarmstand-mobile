#!/usr/bin/env node

/**
 * Simple test runner for role services
 * Bypasses Jest config issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Role Services...\n');

// Test files
const testFiles = [
  'src/services/__tests__/rolePermissionService.test.ts',
  'src/services/__tests__/userRoleService.test.ts'
];

// Check if files exist
testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Test file not found: ${file}`);
    process.exit(1);
  }
  console.log(`✓ Found: ${file}`);
});

console.log('\n📊 Running tests...\n');

try {
  // Run Jest with minimal config
  const result = execSync(
    `npx jest ${testFiles.join(' ')} --testEnvironment=node --no-coverage --bail --forceExit`,
    {
      encoding: 'utf8',
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_MODE: 'service'
      }
    }
  );
} catch (error) {
  console.error('\n❌ Tests failed or timed out');
  console.error('Exit code:', error.status);
  process.exit(1);
}

console.log('\n✅ All role service tests completed!');