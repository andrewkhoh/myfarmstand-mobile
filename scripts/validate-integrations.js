#!/usr/bin/env node

/**
 * Integration Validation Script
 *
 * This script validates the codebase against the integration patterns
 * and guidelines to prevent regression to multi-agent chaos.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class IntegrationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  warn(message) {
    this.warnings.push(message);
    this.log(message, 'warn');
  }

  success(message) {
    this.log(message, 'success');
  }

  // Check for orphaned hooks (hooks not imported by any screen)
  async validateHookUsage() {
    this.log('Validating hook usage patterns...');

    const hookFiles = glob.sync('src/hooks/**/*.ts', { cwd: this.projectRoot });
    const screenFiles = glob.sync('src/screens/**/*.tsx', { cwd: this.projectRoot });

    const orphanedHooks = [];

    for (const hookFile of hookFiles) {
      const hookName = path.basename(hookFile, '.ts');
      const hookPath = hookFile.replace('src/', '');

      let isUsed = false;

      for (const screenFile of screenFiles) {
        const screenPath = path.join(this.projectRoot, screenFile);
        const screenContent = fs.readFileSync(screenPath, 'utf8');

        // Check if hook is imported or used
        if (screenContent.includes(hookName) || screenContent.includes(hookPath)) {
          isUsed = true;
          break;
        }
      }

      if (!isUsed) {
        orphanedHooks.push(hookFile);
      }
    }

    if (orphanedHooks.length > 0) {
      this.error(`Found ${orphanedHooks.length} orphaned hooks:`);
      orphanedHooks.forEach(hook => this.error(`  - ${hook}`));
    } else {
      this.success('All hooks are properly integrated with screens');
    }

    return orphanedHooks.length === 0;
  }

  // Check for proper service layer patterns
  async validateServicePatterns() {
    this.log('Validating service layer patterns...');

    const serviceDirectories = glob.sync('src/services/*/', { cwd: this.projectRoot });
    let allValid = true;

    for (const serviceDir of serviceDirectories) {
      const indexPath = path.join(this.projectRoot, serviceDir, 'index.ts');

      if (!fs.existsSync(indexPath)) {
        this.error(`Missing index.ts in ${serviceDir}`);
        allValid = false;
      } else {
        const indexContent = fs.readFileSync(indexPath, 'utf8');

        // Check for proper export patterns
        if (!indexContent.includes('export {') && !indexContent.includes('export *')) {
          this.warn(`${serviceDir}index.ts may not be properly exporting services`);
        }
      }
    }

    if (allValid) {
      this.success('Service layer patterns are properly implemented');
    }

    return allValid;
  }

  // Check for permission gate usage in screens
  async validatePermissionIntegration() {
    this.log('Validating permission integration...');

    const screenFiles = glob.sync('src/screens/**/*.tsx', { cwd: this.projectRoot });
    const screensWithoutPermissions = [];
    const screensWithPermissions = [];

    for (const screenFile of screenFiles) {
      const screenPath = path.join(this.projectRoot, screenFile);
      const screenContent = fs.readFileSync(screenPath, 'utf8');

      const hasPermissionGate = screenContent.includes('PermissionGate');
      const hasRoleBasedButton = screenContent.includes('RoleBasedButton');
      const hasRolePermissions = screenContent.includes('useRolePermissions');

      if (hasPermissionGate || hasRoleBasedButton || hasRolePermissions) {
        screensWithPermissions.push(screenFile);
      } else {
        // Check if screen has sensitive operations (mutations, deletions)
        const hasMutations = screenContent.includes('useMutation') ||
                           screenContent.includes('delete') ||
                           screenContent.includes('create') ||
                           screenContent.includes('update');

        if (hasMutations) {
          screensWithoutPermissions.push(screenFile);
        }
      }
    }

    if (screensWithoutPermissions.length > 0) {
      this.warn(`Found ${screensWithoutPermissions.length} screens with mutations but no permission checks:`);
      screensWithoutPermissions.forEach(screen => this.warn(`  - ${screen}`));
    }

    this.success(`${screensWithPermissions.length} screens have proper permission integration`);

    return screensWithoutPermissions.length === 0;
  }

  // Check for real-time integration patterns
  async validateRealtimeIntegration() {
    this.log('Validating real-time integration...');

    const screenFiles = glob.sync('src/screens/**/*.tsx', { cwd: this.projectRoot });
    const screensWithRealtime = [];
    const screensWithOldRealtime = [];

    for (const screenFile of screenFiles) {
      const screenPath = path.join(this.projectRoot, screenFile);
      const screenContent = fs.readFileSync(screenPath, 'utf8');

      if (screenContent.includes('useUnifiedRealtime') ||
          screenContent.includes('RealtimeStatusIndicator')) {
        screensWithRealtime.push(screenFile);
      }

      // Check for old real-time patterns that should be migrated
      if (screenContent.includes('useInventoryRealtime') ||
          screenContent.includes('useMarketingRealtime') ||
          (screenContent.includes('useRealtime') && !screenContent.includes('useUnifiedRealtime'))) {
        screensWithOldRealtime.push(screenFile);
      }
    }

    if (screensWithOldRealtime.length > 0) {
      this.warn(`Found ${screensWithOldRealtime.length} screens using old real-time patterns:`);
      screensWithOldRealtime.forEach(screen => this.warn(`  - ${screen}`));
    }

    this.success(`${screensWithRealtime.length} screens use unified real-time integration`);

    return screensWithOldRealtime.length === 0;
  }

  // Check for component duplication
  async validateComponentDuplication() {
    this.log('Validating component duplication...');

    const componentFiles = glob.sync('src/components/**/*.tsx', { cwd: this.projectRoot });
    const componentNames = {};
    const duplicates = [];

    for (const componentFile of componentFiles) {
      const componentName = path.basename(componentFile, '.tsx');

      if (componentNames[componentName]) {
        duplicates.push({
          name: componentName,
          files: [componentNames[componentName], componentFile]
        });
      } else {
        componentNames[componentName] = componentFile;
      }
    }

    if (duplicates.length > 0) {
      this.error(`Found ${duplicates.length} duplicate component names:`);
      duplicates.forEach(dup => {
        this.error(`  - ${dup.name}:`);
        dup.files.forEach(file => this.error(`    * ${file}`));
      });
    } else {
      this.success('No duplicate component names found');
    }

    return duplicates.length === 0;
  }

  // Check import patterns (no direct service imports in components)
  async validateImportPatterns() {
    this.log('Validating import patterns...');

    const componentFiles = glob.sync('src/components/**/*.tsx', { cwd: this.projectRoot });
    const screenFiles = glob.sync('src/screens/**/*.tsx', { cwd: this.projectRoot });
    const allFiles = [...componentFiles, ...screenFiles];

    const violatingFiles = [];

    for (const file of allFiles) {
      const filePath = path.join(this.projectRoot, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for direct service imports (should use hooks instead)
      const serviceImportPattern = /import.*from.*['"]\.\.[\/\w]*services/g;
      if (serviceImportPattern.test(content)) {
        violatingFiles.push(file);
      }
    }

    if (violatingFiles.length > 0) {
      this.error(`Found ${violatingFiles.length} files with direct service imports:`);
      violatingFiles.forEach(file => this.error(`  - ${file}`));
      this.error('Components and screens should import hooks, not services directly');
    } else {
      this.success('All components and screens follow proper import patterns');
    }

    return violatingFiles.length === 0;
  }

  // Run all validations
  async validate() {
    this.log('Starting integration validation...');
    this.log('='.repeat(50));

    const results = await Promise.all([
      this.validateHookUsage(),
      this.validateServicePatterns(),
      this.validatePermissionIntegration(),
      this.validateRealtimeIntegration(),
      this.validateComponentDuplication(),
      this.validateImportPatterns()
    ]);

    this.log('='.repeat(50));
    this.log('Validation Summary:');
    this.log(`✅ Passed: ${results.filter(r => r).length}/${results.length} checks`);
    this.log(`❌ Errors: ${this.errors.length}`);
    this.log(`⚠️  Warnings: ${this.warnings.length}`);

    if (this.errors.length === 0) {
      this.success('🎉 All integration patterns are properly implemented!');
      return true;
    } else {
      this.error('❌ Integration validation failed. Please fix the errors above.');
      return false;
    }
  }
}

// Main execution
if (require.main === module) {
  const validator = new IntegrationValidator();
  validator.validate()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed with error:', error);
      process.exit(1);
    });
}

module.exports = IntegrationValidator;