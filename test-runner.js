#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('Starting component tests...');

try {
  const result = execSync('npx jest src/components/role-based/__tests__/PermissionGate.test.tsx --detectOpenHandles --no-coverage --bail', {
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });
  console.log(result);
} catch (error) {
  console.error('Test failed with error:', error.stdout || error.message);
  process.exit(1);
}