#!/usr/bin/env node
/**
 * ✅ SAFETY NET 4: Automated schema pattern validation
 * Prevents Pattern 2 & 4 violations from being committed
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ERRORS = [];
const WARNINGS = [];

// Find all schema files and service files
const schemaFiles = glob.sync('src/schemas/*.ts', { cwd: process.cwd() });
const serviceFiles = glob.sync('src/services/*.ts', { cwd: process.cwd() });

console.log('🔍 Validating schema and service patterns...');
console.log(`Found ${schemaFiles.length} schema files and ${serviceFiles.length} service files to check\n`);

schemaFiles.forEach(file => {
  const filePath = path.resolve(file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`Checking: ${file}`);
  
  // ✅ Safety Net 4.1: Check for missing TypeScript return annotations
  const transformLines = content.split('\n').filter(line => 
    line.includes('.transform(') && !line.includes('//') // Not commented
  );
  
  transformLines.forEach((line, index) => {
    if (!line.includes('): ') && line.includes('.transform(')) {
      ERRORS.push({
        file,
        line: index + 1,
        type: 'MISSING_RETURN_TYPE',
        message: 'Transform function missing TypeScript return type annotation',
        code: line.trim(),
        fix: 'Add `: InterfaceName =>` after the transform function parameter'
      });
    }
  });
  
  // ✅ Safety Net 4.2: Check for suspicious field mappings
  const suspiciousPatterns = [
    { pattern: /category_id.*:.*data\.category[^_]/g, error: 'Mapping category NAME to category_id field' },
    { pattern: /user_id.*:.*data\.user[^_]/g, error: 'Mapping user NAME to user_id field' },
    { pattern: /product_id.*:.*data\.product[^_]/g, error: 'Mapping product NAME to product_id field' },
  ];
  
  suspiciousPatterns.forEach(({ pattern, error }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        ERRORS.push({
          file,
          type: 'WRONG_FIELD_MAPPING',
          message: error,
          code: match,
          fix: 'Use the correct ID field (e.g., data.category_id instead of data.category)'
        });
      });
    }
  });
  
  // ✅ Safety Net 4.3: Check for hardcoded column name issues
  const columnIssues = [
    { pattern: /is_available.*true|is_available.*false/g, warning: 'Using is_available - verify this column exists (some tables use is_active)' },
    { pattern: /\.eq\(['"]\s*is_available/g, warning: 'Filtering by is_available - verify column name' },
  ];
  
  columnIssues.forEach(({ pattern, warning }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        WARNINGS.push({
          file,
          type: 'COLUMN_NAME_WARNING',
          message: warning,
          code: match,
          fix: 'Check database.generated.ts for correct column name'
        });
      });
    }
  });
  
  console.log(`  ✅ Completed\n`);
});

// ✅ NEW: Validate service files for field selection issues
serviceFiles.forEach(file => {
  const filePath = path.resolve(file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`Checking service: ${file}`);
  
  // ✅ Critical field selection validation
  const criticalFieldIssues = [
    { 
      pattern: /\.select\([^)]*\bcategory,/g, 
      error: 'CRITICAL: Selecting "category" instead of "category_id" - breaks UI filtering',
      fix: 'Change "category," to "category_id," in the select statement'
    },
    { 
      pattern: /delivery_date|delivery_time/g, 
      error: 'CRITICAL: Using non-existent delivery_date/delivery_time fields',
      fix: 'Use pickup_date/pickup_time for both pickup and delivery scheduling'
    },
    {
      pattern: /\.select\([^)]*\buser,/g,
      error: 'WARNING: Selecting "user" instead of "user_id" - potential ID field mismatch',
      fix: 'Verify if you need user_id (foreign key) or full user object'
    }
  ];
  
  criticalFieldIssues.forEach(({ pattern, error, fix }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        ERRORS.push({
          file,
          type: 'SERVICE_FIELD_SELECTION_ERROR',
          message: error,
          code: match,
          fix: fix
        });
      });
    }
  });
  
  console.log(`  ✅ Service completed\n`);
});

// Report results
console.log('📊 VALIDATION RESULTS\n');

if (ERRORS.length > 0) {
  console.log('🚨 ERRORS FOUND (must fix):');
  ERRORS.forEach((error, i) => {
    console.log(`\n${i + 1}. ${error.file}`);
    console.log(`   Type: ${error.type}`);
    console.log(`   Issue: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    console.log(`   Fix: ${error.fix}`);
  });
  console.log('');
}

if (WARNINGS.length > 0) {
  console.log('⚠️  WARNINGS FOUND (should review):');
  WARNINGS.forEach((warning, i) => {
    console.log(`\n${i + 1}. ${warning.file}`);
    console.log(`   Type: ${warning.type}`);
    console.log(`   Issue: ${warning.message}`);
    console.log(`   Code: ${warning.code}`);
    console.log(`   Fix: ${warning.fix}`);
  });
  console.log('');
}

// Summary
if (ERRORS.length === 0 && WARNINGS.length === 0) {
  console.log('✅ All schema patterns look good!');
  process.exit(0);
} else {
  console.log(`📋 Summary: ${ERRORS.length} errors, ${WARNINGS.length} warnings`);
  
  if (ERRORS.length > 0) {
    console.log('\n🚨 Fix errors before committing to prevent UI failures!');
    process.exit(1); // Fail CI/pre-commit hooks
  } else {
    console.log('\n⚠️  Please review warnings');
    process.exit(0);
  }
}