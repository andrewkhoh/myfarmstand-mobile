#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface AuditConfig {
  goldenPattern: {
    service: string;
    name: string;
    description: string;
  };
  servicesToAudit: string[];
  hooksToAudit: string[];
  patterns: {
    requiredMethods: string[];
    hookPatterns: string[];
  };
}

interface AuditResult {
  service: string;
  score: number;
  gaps: Gap[];
  recommendations: string[];
  status: 'pass' | 'warning' | 'fail';
}

interface Gap {
  type: 'missing_pattern' | 'incorrect_implementation' | 'inconsistent_naming' | 'missing_error_handling';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  suggestion: string;
}

export class ServiceAuditor {
  private config: AuditConfig;
  private goldenPatternContent: string = '';
  private projectRoot: string;

  constructor(configPath: string = './automation/config.json') {
    this.projectRoot = process.cwd();
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.loadGoldenPattern();
  }

  private loadGoldenPattern(): void {
    const goldenPath = path.join(this.projectRoot, this.config.goldenPattern.service);
    if (fs.existsSync(goldenPath)) {
      this.goldenPatternContent = fs.readFileSync(goldenPath, 'utf8');
    } else {
      throw new Error(`Golden pattern service not found: ${goldenPath}`);
    }
  }

  async auditAllServices(): Promise<AuditResult[]> {
    console.log('🔍 Starting Service Pattern Audit...');
    console.log(`📋 Golden Pattern: ${this.config.goldenPattern.name}`);
    console.log(`🎯 Services to audit: ${this.config.servicesToAudit.length}`);
    console.log(`🪝 Hooks to audit: ${this.config.hooksToAudit.length}`);

    const results: AuditResult[] = [];

    // Audit services
    for (const servicePath of this.config.servicesToAudit) {
      const result = await this.auditService(servicePath, 'service');
      results.push(result);
    }

    // Audit hooks
    for (const hookPath of this.config.hooksToAudit) {
      const result = await this.auditService(hookPath, 'hook');
      results.push(result);
    }

    this.generateAuditReport(results);
    return results;
  }

  private async auditService(servicePath: string, type: 'service' | 'hook'): Promise<AuditResult> {
    const fullPath = path.join(this.projectRoot, servicePath);
    const serviceName = path.basename(servicePath, '.ts');

    console.log(`\n🔍 Auditing ${type}: ${serviceName}`);

    if (!fs.existsSync(fullPath)) {
      return {
        service: serviceName,
        score: 0,
        gaps: [{
          type: 'missing_pattern',
          severity: 'critical',
          description: `${type} file not found`,
          suggestion: `Create ${servicePath}`
        }],
        recommendations: [`Create missing ${type} file`],
        status: 'fail'
      };
    }

    const serviceContent = fs.readFileSync(fullPath, 'utf8');
    const gaps: Gap[] = [];

    // Pattern-specific audits
    if (type === 'service') {
      gaps.push(...this.auditServicePatterns(serviceContent, serviceName));
    } else {
      gaps.push(...this.auditHookPatterns(serviceContent, serviceName));
    }

    // Common audits for both
    gaps.push(...this.auditCommonPatterns(serviceContent, serviceName));

    const score = this.calculateScore(gaps);
    const status = this.determineStatus(score, gaps);
    const recommendations = this.generateRecommendations(gaps);

    console.log(`   Score: ${score}/100 (${status.toUpperCase()})`);
    console.log(`   Gaps found: ${gaps.length}`);

    return {
      service: serviceName,
      score,
      gaps,
      recommendations,
      status
    };
  }

  private auditServicePatterns(content: string, serviceName: string): Gap[] {
    const gaps: Gap[] = [];

    // Check for robust error handling
    if (!content.includes('try {') || !content.includes('catch')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'high',
        description: 'Missing robust error handling pattern',
        suggestion: 'Add try-catch blocks with proper error logging and user-friendly error messages'
      });
    }

    // Check for broadcast integration
    if (!content.includes('broadcast') && !content.includes('Broadcast')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'medium',
        description: 'Missing broadcast integration',
        suggestion: 'Add broadcast events for data synchronization across devices'
      });
    }

    // Check for consistent return format
    if (!content.includes('{ success:') && !content.includes('success: true')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'medium',
        description: 'Inconsistent return format',
        suggestion: 'Use consistent { success, data?, message?, error? } return format'
      });
    }

    // Check for proper logging
    if (!content.includes('console.log') && !content.includes('console.error')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'low',
        description: 'Missing logging statements',
        suggestion: 'Add informative logging for debugging and monitoring'
      });
    }

    // Check for Supabase integration
    if (!content.includes('supabase') && !content.includes('Supabase')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'high',
        description: 'Missing Supabase integration',
        suggestion: 'Integrate with Supabase for database operations'
      });
    }

    return gaps;
  }

  private auditHookPatterns(content: string, hookName: string): Gap[] {
    const gaps: Gap[] = [];

    // Check for consistent query keys
    if (!content.includes('queryKey:') && !content.includes('queryKey =')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'high',
        description: 'Missing or inconsistent query keys',
        suggestion: 'Use consistent query key patterns for React Query caching'
      });
    }

    // Check for optimistic updates
    if (!content.includes('onMutate') || !content.includes('onError')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'medium',
        description: 'Missing optimistic update pattern',
        suggestion: 'Implement onMutate, onSuccess, onError for better UX'
      });
    }

    // Check for cache invalidation
    if (!content.includes('invalidateQueries')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'medium',
        description: 'Missing cache invalidation',
        suggestion: 'Add proper cache invalidation after mutations'
      });
    }

    // Check for loading states
    if (!content.includes('isLoading') && !content.includes('isPending')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'low',
        description: 'Missing loading state management',
        suggestion: 'Expose loading states for better user experience'
      });
    }

    return gaps;
  }

  private auditCommonPatterns(content: string, name: string): Gap[] {
    const gaps: Gap[] = [];

    // Check for TypeScript types
    if (!content.includes('interface') && !content.includes('type ')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'medium',
        description: 'Missing TypeScript type definitions',
        suggestion: 'Add proper TypeScript interfaces and types'
      });
    }

    // Check for JSDoc comments
    if (!content.includes('/**') && !content.includes('*')) {
      gaps.push({
        type: 'missing_pattern',
        severity: 'low',
        description: 'Missing documentation comments',
        suggestion: 'Add JSDoc comments for better code documentation'
      });
    }

    // Check for proper imports
    if (content.includes('import ') && !content.includes("import { ")) {
      gaps.push({
        type: 'incorrect_implementation',
        severity: 'low',
        description: 'Non-specific imports detected',
        suggestion: 'Use specific named imports instead of default imports where possible'
      });
    }

    return gaps;
  }

  private calculateScore(gaps: Gap[]): number {
    let score = 100;
    
    for (const gap of gaps) {
      switch (gap.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  private determineStatus(score: number, gaps: Gap[]): 'pass' | 'warning' | 'fail' {
    const hasCritical = gaps.some(gap => gap.severity === 'critical');
    
    if (hasCritical || score < 50) return 'fail';
    if (score < 80) return 'warning';
    return 'pass';
  }

  private generateRecommendations(gaps: Gap[]): string[] {
    const recommendations: string[] = [];
    
    // Group by severity and type
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    const highGaps = gaps.filter(g => g.severity === 'high');
    
    if (criticalGaps.length > 0) {
      recommendations.push('🚨 CRITICAL: Address critical gaps immediately');
      criticalGaps.forEach(gap => recommendations.push(`   - ${gap.suggestion}`));
    }
    
    if (highGaps.length > 0) {
      recommendations.push('⚠️ HIGH PRIORITY: Fix high-severity issues');
      highGaps.forEach(gap => recommendations.push(`   - ${gap.suggestion}`));
    }

    return recommendations;
  }

  private generateAuditReport(results: AuditResult[]): void {
    const reportDir = './automation/reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `service-audit-${timestamp}.json`);
    const markdownPath = path.join(reportDir, `service-audit-${timestamp}.md`);

    // JSON Report
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Markdown Report
    const markdown = this.generateMarkdownReport(results);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${markdownPath}`);
  }

  private generateMarkdownReport(results: AuditResult[]): string {
    const totalServices = results.length;
    const passCount = results.filter(r => r.status === 'pass').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalServices);

    let markdown = `# Service Audit Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## 📊 Summary\n\n`;
    markdown += `- **Total Services/Hooks:** ${totalServices}\n`;
    markdown += `- **Average Score:** ${avgScore}/100\n`;
    markdown += `- **✅ Pass:** ${passCount}\n`;
    markdown += `- **⚠️ Warning:** ${warningCount}\n`;
    markdown += `- **❌ Fail:** ${failCount}\n\n`;

    markdown += `## 📋 Detailed Results\n\n`;

    for (const result of results) {
      const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      markdown += `### ${statusIcon} ${result.service} (${result.score}/100)\n\n`;
      
      if (result.gaps.length > 0) {
        markdown += `**Gaps Found:** ${result.gaps.length}\n\n`;
        for (const gap of result.gaps) {
          const severityIcon = gap.severity === 'critical' ? '🚨' : gap.severity === 'high' ? '⚠️' : gap.severity === 'medium' ? '🔶' : 'ℹ️';
          markdown += `- ${severityIcon} **${gap.severity.toUpperCase()}:** ${gap.description}\n`;
          markdown += `  - *Suggestion:* ${gap.suggestion}\n`;
        }
        markdown += `\n`;
      }

      if (result.recommendations.length > 0) {
        markdown += `**Recommendations:**\n`;
        for (const rec of result.recommendations) {
          markdown += `${rec}\n`;
        }
        markdown += `\n`;
      }
    }

    return markdown;
  }
}

// CLI execution
if (require.main === module) {
  const auditor = new ServiceAuditor();
  auditor.auditAllServices()
    .then(results => {
      const failCount = results.filter(r => r.status === 'fail').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      
      console.log(`\n🎯 Audit Complete!`);
      console.log(`   ${results.filter(r => r.status === 'pass').length} passed`);
      console.log(`   ${warningCount} warnings`);
      console.log(`   ${failCount} failures`);
      
      if (failCount > 0) {
        console.log(`\n🚨 ${failCount} services/hooks need immediate attention!`);
        process.exit(1);
      } else if (warningCount > 0) {
        console.log(`\n⚠️ ${warningCount} services/hooks have warnings.`);
        process.exit(0);
      } else {
        console.log(`\n✅ All services/hooks meet quality standards!`);
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    });
}

export default ServiceAuditor;
