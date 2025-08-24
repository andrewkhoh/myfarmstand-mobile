#!/usr/bin/env node

/**
 * Refactored Test Infrastructure Compliance Audit Tool
 * 
 * Audits test files against the proven refactored infrastructure pattern
 * Usage: node src/test/audit-test-compliance.js path/to/test/file.test.ts
 */

const fs = require('fs');
const path = require('path');

class TestComplianceAuditor {
  constructor(filePath) {
    this.filePath = filePath;
    this.content = '';
    this.issues = [];
    this.score = 0;
    this.maxScore = 10;
  }

  async audit() {
    try {
      this.content = fs.readFileSync(this.filePath, 'utf8');
      this.runAudit();
      this.generateReport();
    } catch (error) {
      console.error(`❌ Error reading file: ${error.message}`);
      return false;
    }
  }

  runAudit() {
    // Reset
    this.issues = [];
    this.score = 0;

    // Audit checks
    this.checkJestMockPattern();
    this.checkSimplifiedSupabaseMock();
    this.checkFactoryImports();
    this.checkResetAllFactories();
    this.checkFactoryUsage();
    this.checkNoManualMocks();
    this.checkNoDirectSupabaseImports();
    this.checkProperImportOrder();
    this.checkTestStructure();
    this.checkGracefulErrorHandling();
  }

  checkJestMockPattern() {
    const hasJestMock = /jest\.mock\(['"`]\.\.\/\.\.\/config\/supabase['"`]/.test(this.content);
    if (hasJestMock) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'CRITICAL',
        message: 'Missing jest.mock() for ../../config/supabase',
        fix: 'Add jest.mock() call with SimplifiedSupabaseMock'
      });
    }
  }

  checkSimplifiedSupabaseMock() {
    const hasSimplifiedMock = /SimplifiedSupabaseMock/.test(this.content);
    if (hasSimplifiedMock) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'CRITICAL',
        message: 'Not using SimplifiedSupabaseMock',
        fix: 'Replace manual mocks with SimplifiedSupabaseMock'
      });
    }
  }

  checkFactoryImports() {
    const hasFactoryImports = /import.*from ['"`]\.\.\/\.\.\/test\/factories['"`]/.test(this.content);
    if (hasFactoryImports) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'ERROR',
        message: 'Missing factory imports',
        fix: 'Import factories: import { createUser, createOrder, resetAllFactories } from \'../../test/factories\''
      });
    }
  }

  checkResetAllFactories() {
    const hasResetFactories = /resetAllFactories\(\)/.test(this.content);
    if (hasResetFactories) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'ERROR',
        message: 'Missing resetAllFactories() call',
        fix: 'Add resetAllFactories() in beforeEach()'
      });
    }
  }

  checkFactoryUsage() {
    const hasFactoryUsage = /create(User|Order|Product|Payment)/.test(this.content);
    if (hasFactoryUsage) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'WARNING',
        message: 'Not using factory functions for test data',
        fix: 'Replace inline test data with createUser(), createOrder(), etc.'
      });
    }
  }

  checkNoManualMocks() {
    const hasManualMocks = /mockReturnThis|jest\.fn\(\)\.mockReturnValue/.test(this.content);
    if (!hasManualMocks) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'WARNING',
        message: 'Found manual mock implementations',
        fix: 'Remove manual mocks, let SimplifiedSupabaseMock handle mocking'
      });
    }
  }

  checkNoDirectSupabaseImports() {
    const hasDirectImport = /import.*supabase.*from ['"`]\.\.\/\.\.\/config\/supabase['"`]/.test(this.content);
    if (!hasDirectImport) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'ERROR',
        message: 'Direct supabase config import found',
        fix: 'Remove direct imports, use mocked version from jest.mock()'
      });
    }
  }

  checkProperImportOrder() {
    const imports = this.content.match(/^import.*$/gm) || [];
    const serviceImportIndex = imports.findIndex(imp => imp.includes('../') && !imp.includes('test/'));
    const factoryImportIndex = imports.findIndex(imp => imp.includes('test/factories'));
    
    if (serviceImportIndex >= 0 && factoryImportIndex > serviceImportIndex) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'STYLE',
        message: 'Import order incorrect',
        fix: 'Order: 1) Service imports, 2) Factory imports, 3) No mock imports'
      });
    }
  }

  checkTestStructure() {
    const hasBeforeEach = /beforeEach\s*\(/.test(this.content);
    const hasAfterEach = /afterEach\s*\(/.test(this.content);
    const hasDescribe = /describe\s*\(/.test(this.content);
    
    if (hasBeforeEach && hasAfterEach && hasDescribe) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'STYLE',
        message: 'Test structure incomplete',
        fix: 'Ensure describe, beforeEach, and afterEach blocks are present'
      });
    }
  }

  checkGracefulErrorHandling() {
    const hasErrorHandling = /should handle.*gracefully|expect\(.*\)\.toBeDefined\(\)/.test(this.content);
    if (hasErrorHandling) {
      this.score += 1;
    } else {
      this.issues.push({
        type: 'WARNING',
        message: 'Missing graceful error handling tests',
        fix: 'Add tests for error conditions with expect(result).toBeDefined()'
      });
    }
  }

  generateReport() {
    const percentage = Math.round((this.score / this.maxScore) * 100);
    const status = percentage >= 80 ? '✅ COMPLIANT' : 
                  percentage >= 60 ? '⚠️  NEEDS WORK' : '❌ NON-COMPLIANT';
    
    console.log(`\n🔍 **Refactored Test Infrastructure Compliance Audit**`);
    console.log(`📄 File: ${this.filePath}`);
    console.log(`📊 Score: ${this.score}/${this.maxScore} (${percentage}%)`);
    console.log(`🎯 Status: ${status}\n`);

    if (this.issues.length === 0) {
      console.log('🎉 **Perfect Compliance!** This test follows the refactored infrastructure pattern correctly.\n');
      return;
    }

    // Group issues by type
    const critical = this.issues.filter(i => i.type === 'CRITICAL');
    const errors = this.issues.filter(i => i.type === 'ERROR');
    const warnings = this.issues.filter(i => i.type === 'WARNING');
    const style = this.issues.filter(i => i.type === 'STYLE');

    if (critical.length > 0) {
      console.log('🚨 **CRITICAL ISSUES** (Must Fix):');
      critical.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.message}`);
        console.log(`      Fix: ${issue.fix}\n`);
      });
    }

    if (errors.length > 0) {
      console.log('❌ **ERRORS** (Should Fix):');
      errors.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.message}`);
        console.log(`      Fix: ${issue.fix}\n`);
      });
    }

    if (warnings.length > 0) {
      console.log('⚠️  **WARNINGS** (Recommended):');
      warnings.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.message}`);
        console.log(`      Fix: ${issue.fix}\n`);
      });
    }

    if (style.length > 0) {
      console.log('💅 **STYLE** (Nice to Have):');
      style.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.message}`);
        console.log(`      Fix: ${issue.fix}\n`);
      });
    }

    console.log('📖 **Reference**: See src/test/refactored-test-pattern.md for complete pattern documentation\n');
  }

  getComplianceStatus() {
    const percentage = Math.round((this.score / this.maxScore) * 100);
    return {
      score: this.score,
      maxScore: this.maxScore,
      percentage,
      compliant: percentage >= 80,
      issues: this.issues
    };
  }
}

// CLI usage
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log('Usage: node src/test/audit-test-compliance.js path/to/test/file.test.ts');
    process.exit(1);
  }

  const auditor = new TestComplianceAuditor(filePath);
  auditor.audit();
}

module.exports = TestComplianceAuditor;