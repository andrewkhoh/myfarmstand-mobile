#!/usr/bin/env node

/**
 * Pre-Build Validation Script
 * Runs before EAS builds to ensure production safety
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

/**
 * Validation checks that must pass before build
 */
const validationChecks = [
  {
    name: 'Environment Configuration',
    check: () => {
      const environment = process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development';
      log(`📍 Target environment: ${environment}`, colors.blue);
      
      if (!environment) {
        throw new Error('Environment not specified');
      }
      
      return { environment };
    }
  },
  
  {
    name: 'Database Safety',
    check: () => {
      log('🔍 Running database safety check...', colors.blue);
      
      try {
        execSync('node scripts/database-safety.js check', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        return { safe: true };
      } catch (error) {
        throw new Error('Database safety check failed - contains unsafe scripts');
      }
    }
  },
  
  {
    name: 'EAS Secrets Configuration',
    check: () => {
      const environment = process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development';
      
      // For production builds, require EAS secrets (not EXPO_PUBLIC_*)
      if (environment === 'production') {
        const requiredSecrets = [
          'SUPABASE_URL',        // EAS secret (not EXPO_PUBLIC_*)
          'SUPABASE_ANON_KEY'    // EAS secret (not EXPO_PUBLIC_*)
        ];
        
        const missing = [];
        const present = [];
        
        requiredSecrets.forEach(secret => {
          // Check for EAS-injected secrets (not EXPO_PUBLIC_*)
          if (process.env[secret]) {
            present.push(secret);
          } else {
            missing.push(secret);
          }
        });
        
        if (missing.length > 0) {
          throw new Error(
            `Missing EAS secrets for production: ${missing.join(', ')}\n\n` +
            'Set them using:\n' +
            missing.map(secret => `eas secret:create --scope project --name ${secret} --value "your-value"`).join('\n')
          );
        }
        
        log(`✅ EAS secrets configured: ${present.length}`, colors.green);
        return { easSecrets: present.length, environment: 'production' };
      } else {
        // For development, allow EXPO_PUBLIC_* fallbacks
        const required = [
          'EXPO_PUBLIC_SUPABASE_URL',
          'EXPO_PUBLIC_SUPABASE_ANON_KEY'
        ];
        
        const missing = [];
        const present = [];
        
        required.forEach(envVar => {
          const value = process.env[envVar] || 
                       (global.expo?.extra?.[envVar.replace('EXPO_PUBLIC_', '').toLowerCase()]);
          
          if (!value) {
            missing.push(envVar);
          } else {
            present.push(envVar);
          }
        });
        
        if (missing.length > 0) {
          throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        log(`✅ Development environment variables present: ${present.length}`, colors.green);
        return { required: present.length, missing: 0, environment };
      }
    }
  },

  {
    name: 'Secrets Bundle Security',
    check: () => {
      const environment = process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development';
      
      if (environment === 'production') {
        // Check that no secrets are exposed via EXPO_PUBLIC_*
        const exposedSecrets = [];
        const dangerousEnvVars = [
          'EXPO_PUBLIC_SUPABASE_URL',
          'EXPO_PUBLIC_SUPABASE_ANON_KEY', 
          'EXPO_PUBLIC_CHANNEL_SECRET',
          'EXPO_PUBLIC_DATABASE_URL'
        ];
        
        dangerousEnvVars.forEach(envVar => {
          if (process.env[envVar]) {
            exposedSecrets.push(envVar);
          }
        });
        
        if (exposedSecrets.length > 0) {
          throw new Error(
            `SECURITY VIOLATION: Secrets exposed via EXPO_PUBLIC_* in production: ${exposedSecrets.join(', ')}\n\n` +
            'Production builds must use EAS secrets only. Remove these environment variables:\n' +
            exposedSecrets.map(secret => `unset ${secret}`).join('\n') + '\n\n' +
            'Use EAS secrets instead:\n' +
            exposedSecrets.map(secret => 
              `eas secret:create --scope project --name ${secret.replace('EXPO_PUBLIC_', '')} --value "your-value"`
            ).join('\n')
          );
        }
        
        log('✅ No secrets exposed in app bundle', colors.green);
        return { bundleSecure: true, environment: 'production' };
      }
      
      return { environment, skipped: true };
    }
  },
  
  {
    name: 'Production Security Check',
    check: () => {
      const environment = process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV;
      
      if (environment === 'production') {
        // Check for test/debug flags
        const debugFlags = [
          'EXPO_PUBLIC_SHOW_TESTS',
          'EXPO_PUBLIC_ALLOW_DEV_SCRIPTS',
          'EXPO_PUBLIC_DEBUG_MODE'
        ];
        
        const activeDebugFlags = debugFlags.filter(flag => 
          process.env[flag] === 'true'
        );
        
        if (activeDebugFlags.length > 0) {
          throw new Error(`Production build has debug flags enabled: ${activeDebugFlags.join(', ')}`);
        }
        
        // Check for development dependencies in production
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const hasDevDeps = Object.keys(packageJson.devDependencies || {}).length > 0;
        
        log('🔒 Production security checks passed', colors.green);
        return { 
          environment: 'production',
          debugFlags: 0,
          hasDevDeps
        };
      }
      
      return { environment, skipped: true };
    }
  },
  
  {
    name: 'Kiosk PIN Security',
    check: () => {
      log('🔐 Validating kiosk PIN security...', colors.blue);
      
      // Check for test PINs in active code
      const kioskFiles = [
        'src/services/kioskService.ts',
        'src/schemas/kiosk.schema.ts',
        'src/hooks/useKiosk.ts'
      ];
      
      const testPinPatterns = [
        /pin.*['"`]1234['"`]/i,
        /pin.*['"`]5678['"`]/i,
        /pin.*['"`]9999['"`]/i,
        /hardcoded.*pin/i,
        /fallback.*pin/i
      ];
      
      const violations = [];
      
      kioskFiles.forEach(file => {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          testPinPatterns.forEach(pattern => {
            if (pattern.test(content)) {
              violations.push({ file, pattern: pattern.toString() });
            }
          });
        }
      });
      
      if (violations.length > 0) {
        throw new Error(`Test PINs found in production code: ${violations.map(v => v.file).join(', ')}`);
      }
      
      log('✅ No hardcoded test PINs found in production code', colors.green);
      return { violations: 0, filesChecked: kioskFiles.length };
    }
  },
  
  {
    name: 'Build Dependencies',
    check: () => {
      log('📦 Checking build dependencies...', colors.blue);
      
      try {
        // Check if EAS CLI is available
        execSync('npx eas --version', { stdio: 'pipe' });
        
        // Check if all packages are installed
        execSync('npm ls --depth=0', { stdio: 'pipe' });
        
        return { dependencies: 'ok' };
      } catch (error) {
        throw new Error('Build dependencies check failed - run npm install');
      }
    }
  }
];

/**
 * Run all validation checks
 */
const runValidation = async () => {
  log('🚀 Starting pre-build validation...', colors.blue);
  log('', colors.reset);
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const validation of validationChecks) {
    try {
      log(`⏳ ${validation.name}...`, colors.yellow);
      const result = await validation.check();
      
      log(`✅ ${validation.name} - PASSED`, colors.green);
      results.push({ name: validation.name, status: 'PASSED', result });
      passed++;
      
    } catch (error) {
      log(`❌ ${validation.name} - FAILED`, colors.red);
      log(`   Error: ${error.message}`, colors.red);
      results.push({ name: validation.name, status: 'FAILED', error: error.message });
      failed++;
    }
    
    log('', colors.reset);
  }
  
  // Summary
  log('📊 Validation Summary:', colors.blue);
  log(`   ✅ Passed: ${passed}`, colors.green);
  log(`   ❌ Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log('', colors.reset);
  
  if (failed > 0) {
    log('🛑 Build validation FAILED - fix issues before deployment', colors.red);
    log('', colors.reset);
    
    // Show failed checks
    const failedChecks = results.filter(r => r.status === 'FAILED');
    failedChecks.forEach(check => {
      log(`❌ ${check.name}: ${check.error}`, colors.red);
    });
    
    return false;
  }
  
  log('🎉 All validation checks PASSED - ready for build!', colors.green);
  return true;
};

/**
 * Archive development scripts if needed
 */
const archiveDevScripts = () => {
  const environment = process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV;
  
  if (environment === 'production' || environment === 'staging') {
    log('📦 Archiving development scripts for non-dev build...', colors.yellow);
    
    try {
      execSync('node scripts/database-safety.js archive', { stdio: 'inherit' });
      log('✅ Development scripts archived', colors.green);
    } catch (error) {
      log('⚠️ Could not archive dev scripts - continuing anyway', colors.yellow);
    }
  }
};

// Main execution
const main = async () => {
  const shouldArchive = process.argv.includes('--archive');
  
  if (shouldArchive) {
    archiveDevScripts();
  }
  
  const isValid = await runValidation();
  
  if (!isValid) {
    process.exit(1);
  }
  
  log('🚀 Pre-build validation completed successfully!', colors.green);
  process.exit(0);
};

// Handle CLI arguments
if (process.argv.includes('--help')) {
  console.log('Pre-Build Validation Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/pre-build-validation.js          # Run validation');
  console.log('  node scripts/pre-build-validation.js --archive # Archive dev scripts first');
  console.log('');
  process.exit(0);
}

main().catch(error => {
  log(`💥 Validation script error: ${error.message}`, colors.red);
  process.exit(1);
});