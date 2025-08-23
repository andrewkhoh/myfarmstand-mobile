#!/usr/bin/env node

/**
 * Test Health Check Script
 * 
 * Analyzes current test architecture health and provides metrics
 * for tracking refactor progress.
 * 
 * Run: npx tsx src/test/__meta__/test-health-check.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface HealthMetrics {
  totalTestFiles: number;
  setupFileCount: number;
  mockComplexity: number;
  schemaValidationCoverage: number;
  averageLinesPerTest: number;
  duplicatePatterns: number;
  testExecutionTime?: number;
}

class TestHealthChecker {
  private rootDir: string;
  
  constructor() {
    this.rootDir = path.resolve(__dirname, '../../..');
  }

  async analyze(): Promise<HealthMetrics> {
    console.log('🔍 Analyzing test health...\n');
    
    const metrics: HealthMetrics = {
      totalTestFiles: await this.countTestFiles(),
      setupFileCount: await this.countSetupFiles(),
      mockComplexity: await this.calculateMockComplexity(),
      schemaValidationCoverage: await this.calculateSchemaValidation(),
      averageLinesPerTest: await this.calculateAverageTestSize(),
      duplicatePatterns: await this.findDuplicatePatterns()
    };
    
    this.printReport(metrics);
    this.generateHealthScore(metrics);
    
    return metrics;
  }

  private async countTestFiles(): Promise<number> {
    const pattern = path.join(this.rootDir, 'src/**/*.{test,spec}.{ts,tsx,js,jsx}');
    const files = await glob(pattern);
    return files.length;
  }

  private async countSetupFiles(): Promise<number> {
    const pattern = path.join(this.rootDir, 'src/test/*setup*.{ts,js}');
    const files = await glob(pattern);
    return files.length;
  }

  private async calculateMockComplexity(): Promise<number> {
    const testFiles = await glob(path.join(this.rootDir, 'src/**/*.test.{ts,tsx}'));
    let complexityScore = 0;
    
    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Count complex mock patterns
      const patterns = [
        /mockReturnValue\(\s*\{[\s\S]*?mockReturnValue/g, // Nested mocks
        /\.fn\(\)\.mockReturnValue.*\.fn\(\)/g, // Chain mocking
        /from\(\)\.select\(\)\.eq\(\)/g, // Supabase chains
        /jest\.mock.*\n.*jest\.mock/g // Multiple mock blocks
      ];
      
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          complexityScore += matches.length * 2;
        }
      });
      
      // Simple mocks reduce complexity
      if (content.includes('factory.create')) {
        complexityScore -= 1;
      }
    }
    
    return Math.max(0, complexityScore);
  }

  private async calculateSchemaValidation(): Promise<number> {
    const testFiles = await glob(path.join(this.rootDir, 'src/**/*.test.{ts,tsx}'));
    let validatedTests = 0;
    let totalTests = testFiles.length;
    
    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for schema validation patterns
      if (
        content.includes('.parse(') ||
        content.includes('.safeParse(') ||
        content.includes('Schema.') ||
        content.includes('validateSchema') ||
        content.includes('factory.create')
      ) {
        validatedTests++;
      }
    }
    
    return totalTests > 0 ? Math.round((validatedTests / totalTests) * 100) : 0;
  }

  private async calculateAverageTestSize(): Promise<number> {
    const testFiles = await glob(path.join(this.rootDir, 'src/**/*.test.{ts,tsx}'));
    let totalLines = 0;
    
    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      totalLines += content.split('\n').length;
    }
    
    return testFiles.length > 0 ? Math.round(totalLines / testFiles.length) : 0;
  }

  private async findDuplicatePatterns(): Promise<number> {
    const testFiles = await glob(path.join(this.rootDir, 'src/**/*.test.{ts,tsx}'));
    const patterns = new Map<string, number>();
    
    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Extract test patterns (simplified)
      const testBlocks = content.match(/it\(['"`].*?['"`]/g) || [];
      testBlocks.forEach(block => {
        const normalized = block.replace(/\d+/g, 'N').toLowerCase();
        patterns.set(normalized, (patterns.get(normalized) || 0) + 1);
      });
    }
    
    // Count patterns that appear more than once
    let duplicates = 0;
    patterns.forEach(count => {
      if (count > 1) duplicates++;
    });
    
    return duplicates;
  }

  private printReport(metrics: HealthMetrics): void {
    console.log('📊 Test Health Report\n');
    console.log('═══════════════════════════════════════');
    
    console.log(`📁 Total Test Files:        ${metrics.totalTestFiles}`);
    console.log(`🔧 Setup Files:             ${metrics.setupFileCount} ${this.getIndicator(metrics.setupFileCount, 5, 10)}`);
    console.log(`🌀 Mock Complexity:         ${metrics.mockComplexity} ${this.getIndicator(metrics.mockComplexity, 50, 100)}`);
    console.log(`✅ Schema Validation:       ${metrics.schemaValidationCoverage}% ${this.getIndicator(100 - metrics.schemaValidationCoverage, 30, 60)}`);
    console.log(`📏 Avg Lines per Test:      ${metrics.averageLinesPerTest} ${this.getIndicator(metrics.averageLinesPerTest, 200, 400)}`);
    console.log(`🔁 Duplicate Patterns:      ${metrics.duplicatePatterns} ${this.getIndicator(metrics.duplicatePatterns, 10, 30)}`);
    
    console.log('═══════════════════════════════════════\n');
  }

  private getIndicator(value: number, warning: number, critical: number): string {
    if (value <= warning) return '✅';
    if (value <= critical) return '⚠️';
    return '🔴';
  }

  private generateHealthScore(metrics: HealthMetrics): void {
    // Calculate overall health score (0-100)
    let score = 100;
    
    // Deductions
    score -= Math.min(20, metrics.setupFileCount * 2);
    score -= Math.min(30, metrics.mockComplexity / 3);
    score -= Math.min(20, (100 - metrics.schemaValidationCoverage) / 5);
    score -= Math.min(15, metrics.averageLinesPerTest / 30);
    score -= Math.min(15, metrics.duplicatePatterns);
    
    score = Math.max(0, Math.round(score));
    
    console.log('🎯 Overall Health Score: ' + this.getScoreEmoji(score) + ` ${score}/100\n`);
    
    this.printRecommendations(metrics, score);
  }

  private getScoreEmoji(score: number): string {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    if (score >= 40) return '🟠';
    return '🔴';
  }

  private printRecommendations(metrics: HealthMetrics, score: number): void {
    console.log('💡 Recommendations:\n');
    
    const recommendations: string[] = [];
    
    if (metrics.setupFileCount > 5) {
      recommendations.push('• Consolidate setup files into a unified configuration');
    }
    
    if (metrics.mockComplexity > 50) {
      recommendations.push('• Simplify mock chains using data-driven mocks');
    }
    
    if (metrics.schemaValidationCoverage < 70) {
      recommendations.push('• Add schema validation to test data factories');
    }
    
    if (metrics.averageLinesPerTest > 300) {
      recommendations.push('• Break down large test files into smaller, focused suites');
    }
    
    if (metrics.duplicatePatterns > 20) {
      recommendations.push('• Extract common test patterns into shared utilities');
    }
    
    if (score < 60) {
      recommendations.push('• ⚠️  Consider prioritizing test refactor before adding new features');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('• ✅ Test health is good! Focus on maintaining standards');
    }
    
    recommendations.forEach(rec => console.log(rec));
    console.log();
  }
}

// Run if executed directly
if (require.main === module) {
  const checker = new TestHealthChecker();
  checker.analyze().catch(console.error);
}

export { TestHealthChecker, HealthMetrics };