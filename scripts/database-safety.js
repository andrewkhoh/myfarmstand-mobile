#!/usr/bin/env node

/**
 * Database Safety Guard
 * Prevents dangerous database operations in production
 */

const fs = require('fs');
const path = require('path');

// Get environment from process.env or command line
const getEnvironment = () => {
  return process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development';
};

// Dangerous script patterns that should NEVER run in production
const DANGEROUS_PATTERNS = [
  // Development setup scripts
  /kiosk-dev-setup\.sql$/,
  /.*-dev-setup.*\.sql$/,
  /test-data.*\.sql$/,
  /demo-data.*\.sql$/,
  
  // Debug scripts
  /debug-.*\.sql$/,
  /.*-debug\.sql$/,
  
  // Scripts with test PINs
  /1234|5678|9999/,
  
  // Scripts that disable security
  /DISABLE.*ROW.*LEVEL.*SECURITY/i,
  /DROP.*POLICY/i,
  
  // Scripts with hardcoded test data
  /dev-staff@|test@|demo@/i,
];

// Safe patterns for production
const PRODUCTION_SAFE_PATTERNS = [
  /^migration-.*\.sql$/,
  /^schema-.*\.sql$/,
  /^rls-policies\.sql$/,
  /^functions\.sql$/,
];

/**
 * Check if a SQL file is safe to run in the current environment
 */
const isFileSafe = (filePath, environment) => {
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(fileName) || pattern.test(fileContent)) {
      return {
        safe: false,
        reason: `Contains dangerous pattern: ${pattern}`,
        severity: 'CRITICAL'
      };
    }
  }
  
  // In production, only allow explicitly safe patterns
  if (environment === 'production') {
    const isSafe = PRODUCTION_SAFE_PATTERNS.some(pattern => pattern.test(fileName));
    if (!isSafe) {
      return {
        safe: false,
        reason: 'Not in production whitelist',
        severity: 'HIGH'
      };
    }
  }
  
  return { safe: true };
};

/**
 * Scan database directory for potentially dangerous scripts
 */
const scanDatabaseDirectory = (environment) => {
  const dbDir = path.join(__dirname, '..', 'database');
  
  if (!fs.existsSync(dbDir)) {
    console.log('📁 No database directory found');
    return { safe: true, issues: [] };
  }
  
  const sqlFiles = fs.readdirSync(dbDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(dbDir, file));
  
  const issues = [];
  
  for (const file of sqlFiles) {
    const result = isFileSafe(file, environment);
    if (!result.safe) {
      issues.push({
        file: path.relative(process.cwd(), file),
        reason: result.reason,
        severity: result.severity
      });
    }
  }
  
  return {
    safe: issues.length === 0,
    issues,
    scannedFiles: sqlFiles.length
  };
};

/**
 * Validate database environment safety
 */
const validateDatabaseSafety = () => {
  const environment = getEnvironment();
  console.log(`🔍 Scanning database safety for environment: ${environment}`);
  
  const result = scanDatabaseDirectory(environment);
  
  console.log(`📊 Scanned ${result.scannedFiles} SQL files`);
  
  if (result.safe) {
    console.log('✅ Database safety check PASSED');
    return true;
  }
  
  console.log('❌ Database safety check FAILED');
  console.log(`🚨 Found ${result.issues.length} issues:`);
  
  result.issues.forEach((issue, index) => {
    const icon = issue.severity === 'CRITICAL' ? '🔥' : '⚠️';
    console.log(`${icon} ${index + 1}. ${issue.file}`);
    console.log(`   Reason: ${issue.reason}`);
    console.log(`   Severity: ${issue.severity}`);
    console.log('');
  });
  
  if (environment === 'production') {
    console.log('🛑 DEPLOYMENT BLOCKED: Cannot deploy with unsafe database scripts');
    console.log('');
    console.log('🔧 To fix:');
    console.log('1. Move development scripts to archives/ directory');
    console.log('2. Remove test data from SQL files');
    console.log('3. Ensure only production-safe migrations remain');
    console.log('');
  }
  
  return false;
};

/**
 * Get list of development scripts that should be archived
 */
const getDevelopmentScripts = () => {
  const dbDir = path.join(__dirname, '..', 'database');
  
  if (!fs.existsSync(dbDir)) {
    return [];
  }
  
  const sqlFiles = fs.readdirSync(dbDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(dbDir, file));
  
  return sqlFiles.filter(file => {
    const fileName = path.basename(file);
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(fileName));
  });
};

/**
 * Archive development scripts
 */
const archiveDevelopmentScripts = () => {
  const devScripts = getDevelopmentScripts();
  
  if (devScripts.length === 0) {
    console.log('✅ No development scripts to archive');
    return;
  }
  
  const archiveDir = path.join(__dirname, '..', 'archives', 'database-dev-scripts');
  fs.mkdirSync(archiveDir, { recursive: true });
  
  console.log(`📦 Archiving ${devScripts.length} development scripts...`);
  
  devScripts.forEach(scriptPath => {
    const fileName = path.basename(scriptPath);
    const archivePath = path.join(archiveDir, fileName);
    
    fs.renameSync(scriptPath, archivePath);
    console.log(`   Moved: ${fileName} → archives/database-dev-scripts/`);
  });
  
  console.log('✅ Development scripts archived successfully');
};

// CLI Interface
const command = process.argv[2];

switch (command) {
  case 'check':
    const isValid = validateDatabaseSafety();
    process.exit(isValid ? 0 : 1);
    break;
    
  case 'archive':
    archiveDevelopmentScripts();
    break;
    
  case 'scan':
    const env = process.argv[3] || getEnvironment();
    const scanResult = scanDatabaseDirectory(env);
    console.log(JSON.stringify(scanResult, null, 2));
    break;
    
  default:
    console.log('Database Safety Guard');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/database-safety.js check      # Validate current environment');
    console.log('  node scripts/database-safety.js archive    # Archive development scripts');
    console.log('  node scripts/database-safety.js scan [env] # Scan for issues');
    console.log('');
    process.exit(1);
}