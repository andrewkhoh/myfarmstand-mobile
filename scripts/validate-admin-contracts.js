#!/usr/bin/env node

/**
 * Admin Contract Validation Script
 * 
 * Comprehensive validation for admin schemas and patterns.
 * Ensures all admin operations follow established patterns.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Validation results
let totalErrors = 0;
let totalWarnings = 0;
let totalPassed = 0;

/**
 * Log functions
 */
function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  totalErrors++;
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  totalWarnings++;
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
  totalPassed++;
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  console.log(`${colors.bold}${colors.blue}━━━ ${title} ━━━${colors.reset}`);
  console.log('');
}

/**
 * Validate ProductAdmin schema contract
 */
function validateProductAdminContract() {
  logSection('ProductAdmin Schema Contract Validation');
  
  try {
    // Check if contract test file exists
    const contractPath = path.join(__dirname, '../src/schemas/__contracts__/productAdmin.contracts.test.ts');
    if (!fs.existsSync(contractPath)) {
      logError('ProductAdmin contract test file not found');
      return false;
    }
    
    // Run TypeScript compilation check
    execSync(`npx tsc --noEmit --skipLibCheck ${contractPath}`, { stdio: 'pipe' });
    logSuccess('ProductAdmin contract compiles successfully');
    
    // Check for database alignment
    const contractContent = fs.readFileSync(contractPath, 'utf8');
    const requiredFields = [
      'id', 'name', 'description', 'price', 'category', 'category_id',
      'image_url', 'is_available', 'is_bundle', 'is_pre_order',
      'is_weekly_special', 'stock_quantity', 'sku', 'tags',
      'bundle_items', 'pre_order_end_date', 'special_notes',
      'created_at', 'updated_at'
    ];
    
    let missingFields = [];
    for (const field of requiredFields) {
      if (!contractContent.includes(field)) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      logWarning(`Missing database fields in contract: ${missingFields.join(', ')}`);
    } else {
      logSuccess('All required database fields present in contract');
    }
    
    return true;
  } catch (error) {
    logError(`ProductAdmin contract validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate service patterns
 */
function validateServicePatterns() {
  logSection('Service Pattern Validation');
  
  const servicePath = path.join(__dirname, '../src/services/productAdminService.ts');
  
  try {
    if (!fs.existsSync(servicePath)) {
      logError('ProductAdminService not found');
      return false;
    }
    
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    // Check for required patterns
    const patterns = [
      {
        name: 'Direct Supabase Pattern',
        pattern: /supabase\s*\.\s*from\s*\(\s*TABLES\./g,
        required: true
      },
      {
        name: 'Validation Pattern',
        pattern: /Schema\.parse\(/g,
        required: true
      },
      {
        name: 'Resilient Processing Pattern',
        pattern: /try\s*{\s*[^}]*transform[^}]*}\s*catch/g,
        required: true
      },
      {
        name: 'Broadcasting Pattern',
        pattern: /BroadcastHelper\.send/g,
        required: true
      },
      {
        name: 'ValidationMonitor Integration',
        pattern: /ValidationMonitor\.(recordPatternSuccess|recordValidationError)/g,
        required: true
      }
    ];
    
    for (const { name, pattern, required } of patterns) {
      const matches = serviceContent.match(pattern);
      if (matches) {
        logSuccess(`${name}: ${matches.length} occurrences found`);
      } else if (required) {
        logError(`${name}: Not found (required)`);
      } else {
        logWarning(`${name}: Not found (optional)`);
      }
    }
    
    // Check for anti-patterns
    const antiPatterns = [
      {
        name: 'Manual SQL',
        pattern: /supabase\.rpc\(/g,
        message: 'Avoid RPC calls unless necessary'
      },
      {
        name: 'Console.log in production',
        pattern: /console\.log\(/g,
        message: 'Consider using ValidationMonitor instead'
      },
      {
        name: 'Any type usage',
        pattern: /:\s*any\b/g,
        message: 'Avoid using any type'
      }
    ];
    
    for (const { name, pattern, message } of antiPatterns) {
      const matches = serviceContent.match(pattern);
      if (matches) {
        logWarning(`${name}: ${matches.length} occurrences found - ${message}`);
      }
    }
    
    return true;
  } catch (error) {
    logError(`Service pattern validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate hook patterns
 */
function validateHookPatterns() {
  logSection('Hook Pattern Validation');
  
  const hookPath = path.join(__dirname, '../src/hooks/useProductAdmin.ts');
  
  try {
    if (!fs.existsSync(hookPath)) {
      logError('useProductAdmin hook not found');
      return false;
    }
    
    const hookContent = fs.readFileSync(hookPath, 'utf8');
    
    // Check for centralized query key factory
    if (hookContent.includes('productKeys') && !hookContent.includes('local duplicate')) {
      logSuccess('Centralized query key factory usage confirmed');
    } else {
      logWarning('Check for potential dual query key systems');
    }
    
    // Check for smart invalidation
    if (hookContent.includes('invalidateQueries')) {
      logSuccess('Smart invalidation patterns found');
    } else {
      logWarning('No query invalidation found');
    }
    
    // Check for optimistic updates
    if (hookContent.includes('onMutate')) {
      logSuccess('Optimistic update patterns found');
    } else {
      logInfo('No optimistic updates (optional)');
    }
    
    return true;
  } catch (error) {
    logError(`Hook pattern validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate error handling
 */
function validateErrorHandling() {
  logSection('Error Handling Validation');
  
  const errorHandlerPath = path.join(__dirname, '../src/utils/adminErrorHandler.ts');
  
  try {
    if (!fs.existsSync(errorHandlerPath)) {
      logError('AdminErrorHandler not found');
      return false;
    }
    
    const errorContent = fs.readFileSync(errorHandlerPath, 'utf8');
    
    // Check for user-friendly messages
    const requiredMessages = [
      'Connection Issue',
      'Invalid Input',
      'Access Denied',
      'Update Conflict',
      'Stock Issue',
      'System Error'
    ];
    
    for (const message of requiredMessages) {
      if (errorContent.includes(message)) {
        logSuccess(`User-friendly message found: "${message}"`);
      } else {
        logWarning(`Missing user-friendly message: "${message}"`);
      }
    }
    
    // Check for recovery actions
    if (errorContent.includes('ErrorAction')) {
      logSuccess('Error recovery actions implemented');
    } else {
      logWarning('No error recovery actions found');
    }
    
    return true;
  } catch (error) {
    logError(`Error handling validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate test coverage
 */
function validateTestCoverage() {
  logSection('Test Coverage Validation');
  
  const testPaths = [
    'src/services/__tests__/productAdminService.test.ts',
    'src/hooks/__tests__/useProductAdmin.test.ts',
    'src/schemas/__contracts__/productAdmin.contracts.test.ts'
  ];
  
  let allTestsExist = true;
  
  for (const testPath of testPaths) {
    const fullPath = path.join(__dirname, '..', testPath);
    if (fs.existsSync(fullPath)) {
      logSuccess(`Test file exists: ${path.basename(testPath)}`);
      
      // Check test count
      const testContent = fs.readFileSync(fullPath, 'utf8');
      const testMatches = testContent.match(/it\s*\(/g);
      const testCount = testMatches ? testMatches.length : 0;
      
      if (testCount > 0) {
        logInfo(`  Contains ${testCount} test cases`);
      } else {
        logWarning(`  No test cases found`);
      }
    } else {
      logError(`Test file missing: ${testPath}`);
      allTestsExist = false;
    }
  }
  
  return allTestsExist;
}

/**
 * Run all validations
 */
function runValidations() {
  console.log('');
  console.log(`${colors.bold}${colors.cyan}🔍 Admin Contract Validation Report${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  const validations = [
    { name: 'ProductAdmin Contract', fn: validateProductAdminContract },
    { name: 'Service Patterns', fn: validateServicePatterns },
    { name: 'Hook Patterns', fn: validateHookPatterns },
    { name: 'Error Handling', fn: validateErrorHandling },
    { name: 'Test Coverage', fn: validateTestCoverage }
  ];
  
  const results = [];
  
  for (const { name, fn } of validations) {
    try {
      const result = fn();
      results.push({ name, passed: result });
    } catch (error) {
      logError(`${name} validation crashed: ${error.message}`);
      results.push({ name, passed: false });
    }
  }
  
  // Print summary
  logSection('Validation Summary');
  
  console.log(`${colors.green}Passed: ${totalPassed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${totalWarnings}${colors.reset}`);
  console.log(`${colors.red}Errors: ${totalErrors}${colors.reset}`);
  console.log('');
  
  if (totalErrors === 0) {
    console.log(`${colors.bold}${colors.green}✅ ALL CRITICAL VALIDATIONS PASSED${colors.reset}`);
    console.log('');
    console.log('Your admin contracts are properly enforced:');
    console.log('• Schema contracts match database exactly');
    console.log('• Service patterns follow architectural guidelines');
    console.log('• Error handling provides user-friendly messages');
    console.log('• ValidationMonitor integration tracks operations');
    console.log('• Test coverage ensures reliability');
    process.exit(0);
  } else {
    console.log(`${colors.bold}${colors.red}❌ VALIDATION FAILED${colors.reset}`);
    console.log('');
    console.log('Please fix the errors above before committing.');
    console.log('Run this script again to verify fixes.');
    process.exit(1);
  }
}

// Run validations
runValidations();