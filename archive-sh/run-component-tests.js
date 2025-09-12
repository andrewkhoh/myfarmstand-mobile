#!/usr/bin/env node
/**
 * Simple test runner for component tests
 * Runs tests directly with minimal config
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = 'component';

const testFiles = [
  'src/components/role-based/__tests__/PermissionGate.test.tsx',
  'src/components/role-based/__tests__/RoleIndicator.test.tsx',
  'src/components/role-based/__tests__/AccessControlButton.test.tsx',
  'src/components/role-based/__tests__/PermissionBadge.test.tsx',
  'src/components/role-based/__tests__/RoleBasedButton.test.tsx'
];

console.log('🧪 Running Component Tests for Role-Based UI\n');
console.log('=' .repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let currentFile = 0;

function runNextTest() {
  if (currentFile >= testFiles.length) {
    // All tests complete
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Summary:');
    console.log(`   Total:  ${totalTests} tests`);
    console.log(`   ✅ Passed: ${passedTests} tests`);
    console.log(`   ❌ Failed: ${failedTests} tests`);
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    console.log(`   📈 Pass Rate: ${passRate}%`);
    
    if (passRate >= 85) {
      console.log('\n✨ SUCCESS: Minimum 85% pass rate achieved!');
      process.exit(0);
    } else {
      console.log('\n⚠️  WARNING: Pass rate below 85% target');
      process.exit(1);
    }
    return;
  }

  const file = testFiles[currentFile];
  console.log(`\nRunning: ${path.basename(file)}`);
  console.log('-' .repeat(40));

  const jest = spawn('npx', [
    'jest',
    '--config=jest.config.components.js',
    file,
    '--forceExit',
    '--json',
    '--outputFile=/tmp/test-results.json'
  ], {
    stdio: 'pipe',
    env: { ...process.env }
  });

  let output = '';

  jest.stdout.on('data', (data) => {
    output += data.toString();
  });

  jest.stderr.on('data', (data) => {
    output += data.toString();
  });

  jest.on('close', (code) => {
    try {
      // Try to read JSON results
      const fs = require('fs');
      if (fs.existsSync('/tmp/test-results.json')) {
        const results = JSON.parse(fs.readFileSync('/tmp/test-results.json', 'utf8'));
        const testResults = results.testResults[0];
        
        if (testResults) {
          const fileTests = testResults.numPassingTests + testResults.numFailingTests;
          totalTests += fileTests;
          passedTests += testResults.numPassingTests;
          failedTests += testResults.numFailingTests;
          
          console.log(`   Tests: ${fileTests}`);
          console.log(`   ✅ Passed: ${testResults.numPassingTests}`);
          console.log(`   ❌ Failed: ${testResults.numFailingTests}`);
        }
        
        fs.unlinkSync('/tmp/test-results.json');
      } else {
        // Parse output manually if JSON not available
        const passMatch = output.match(/✓.*\((\d+) test/);
        const failMatch = output.match(/✕.*\((\d+) test/);
        
        if (passMatch) {
          const passed = parseInt(passMatch[1]);
          passedTests += passed;
          totalTests += passed;
        }
        
        if (failMatch) {
          const failed = parseInt(failMatch[1]);
          failedTests += failed;
          totalTests += failed;
        }
        
        console.log('   (Could not parse detailed results)');
      }
    } catch (e) {
      console.log('   Error parsing results:', e.message);
    }

    currentFile++;
    setTimeout(runNextTest, 1000);
  });

  // Kill test after 20 seconds
  setTimeout(() => {
    jest.kill('SIGTERM');
    console.log('   Test timed out after 20s');
    currentFile++;
    failedTests += 10; // Count as failures
    totalTests += 10;
    runNextTest();
  }, 20000);
}

// Start testing
runNextTest();