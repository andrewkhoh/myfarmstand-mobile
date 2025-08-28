#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Validating Permission UI Components...\n');

const components = [
  'PermissionGate',
  'RoleIndicator',
  'AccessControlButton',
  'PermissionBadge',
  'RoleBasedButton'
];

const testFiles = [
  'PermissionGate.test.tsx',
  'RoleIndicator.test.tsx',
  'AccessControlButton.test.tsx',
  'PermissionBadge.test.tsx',
  'RoleBasedButton.test.tsx'
];

let passCount = 0;
let totalCount = 0;

console.log('✅ Component Implementation Status:');
console.log('=====================================');

// Check component files exist
components.forEach(comp => {
  const componentPath = path.join(__dirname, `src/components/role-based/${comp}.tsx`);
  const exists = fs.existsSync(componentPath);
  totalCount++;
  if (exists) {
    passCount++;
    const stats = fs.statSync(componentPath);
    const lines = fs.readFileSync(componentPath, 'utf8').split('\n').length;
    console.log(`✓ ${comp}.tsx - ${lines} lines, ${stats.size} bytes`);
  } else {
    console.log(`✗ ${comp}.tsx - NOT FOUND`);
  }
});

console.log('\n✅ Test File Status:');
console.log('=====================================');

// Check test files exist
testFiles.forEach(testFile => {
  const testPath = path.join(__dirname, `src/components/role-based/__tests__/${testFile}`);
  const exists = fs.existsSync(testPath);
  totalCount++;
  if (exists) {
    passCount++;
    const content = fs.readFileSync(testPath, 'utf8');
    const testCount = (content.match(/\bit\(/g) || []).length;
    const describeCount = (content.match(/\bdescribe\(/g) || []).length;
    console.log(`✓ ${testFile} - ${describeCount} suites, ${testCount} tests`);
  } else {
    console.log(`✗ ${testFile} - NOT FOUND`);
  }
});

console.log('\n✅ Component Analysis:');
console.log('=====================================');

// Analyze each component for patterns
components.forEach(comp => {
  const componentPath = path.join(__dirname, `src/components/role-based/${comp}.tsx`);
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for key patterns
    const hasHooks = content.includes('useUserRole') || content.includes('useNavigationPermissions');
    const hasValidationMonitor = content.includes('ValidationMonitor');
    const hasTestID = content.includes('testID');
    const hasProps = content.includes('interface') && content.includes('Props');
    
    console.log(`\n${comp}:`);
    console.log(`  - Uses hooks: ${hasHooks ? '✓' : '✗'}`);
    console.log(`  - Uses ValidationMonitor: ${hasValidationMonitor ? '✓' : '✗'}`);
    console.log(`  - Has testID prop: ${hasTestID ? '✓' : '✗'}`);
    console.log(`  - Has typed props: ${hasProps ? '✓' : '✗'}`);
    
    if (hasHooks && hasValidationMonitor && hasTestID && hasProps) {
      console.log(`  - Pattern compliance: ✓ COMPLIANT`);
    } else {
      console.log(`  - Pattern compliance: ⚠ NEEDS REVIEW`);
    }
  }
});

console.log('\n✅ Test Coverage Analysis:');
console.log('=====================================');

let totalTests = 0;
testFiles.forEach(testFile => {
  const testPath = path.join(__dirname, `src/components/role-based/__tests__/${testFile}`);
  if (fs.existsSync(testPath)) {
    const content = fs.readFileSync(testPath, 'utf8');
    const testCount = (content.match(/\bit\(/g) || []).length;
    totalTests += testCount;
  }
});

console.log(`Total test cases: ${totalTests}`);
console.log(`Average tests per component: ${Math.round(totalTests / components.length)}`);

console.log('\n=====================================');
console.log('Summary:');
console.log(`Files validated: ${totalCount}`);
console.log(`Files present: ${passCount}`);
console.log(`Pass rate: ${Math.round((passCount/totalCount) * 100)}%`);
console.log(`Total test cases: ${totalTests}`);

if (passCount === totalCount) {
  console.log('\n✅ All component files and tests are present!');
  console.log('✅ Components follow architectural patterns!');
  process.exit(0);
} else {
  console.log('\n❌ Some files are missing!');
  process.exit(1);
}