#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import ServiceAuditor from './audit-services';
import SchemaValidator from './schema-validator';
import PatternFixer from './pattern-fixer';
import TestGenerator from './test-generator';

interface WorkflowConfig {
  steps: {
    audit: boolean;
    validate: boolean;
    fix: boolean;
    test: boolean;
    verify: boolean;
  };
  options: {
    autoApplyFixes: boolean;
    generateReports: boolean;
    runTests: boolean;
    failOnErrors: boolean;
  };
}

interface WorkflowResult {
  step: string;
  status: 'success' | 'warning' | 'failed' | 'skipped';
  duration: number;
  summary: string;
  details?: any;
}

export class WorkflowRunner {
  private config: WorkflowConfig;
  private results: WorkflowResult[] = [];
  private startTime: number = 0;

  constructor(configOverrides?: Partial<WorkflowConfig>) {
    this.config = {
      steps: {
        audit: true,
        validate: true,
        fix: true,
        test: true,
        verify: true
      },
      options: {
        autoApplyFixes: false,
        generateReports: true,
        runTests: false,
        failOnErrors: true
      },
      ...configOverrides
    };
  }

  async runComplete(): Promise<WorkflowResult[]> {
    console.log('🚀 Starting Complete Audit & Fix Workflow...');
    console.log('=' .repeat(60));
    
    this.startTime = Date.now();
    this.results = [];

    try {
      // Step 1: Service Pattern Audit
      if (this.config.steps.audit) {
        await this.runStep('audit', 'Service Pattern Audit', async () => {
          const auditor = new ServiceAuditor();
          const results = await auditor.auditAllServices();
          
          const failCount = results.filter(r => r.status === 'fail').length;
          const warningCount = results.filter(r => r.status === 'warning').length;
          
          return {
            status: failCount > 0 ? 'failed' : warningCount > 0 ? 'warning' : 'success',
            summary: `${results.length} services audited, ${failCount} failures, ${warningCount} warnings`,
            details: results
          };
        });
      }

      // Step 2: Schema Validation
      if (this.config.steps.validate) {
        await this.runStep('validate', 'Schema Validation', async () => {
          const validator = new SchemaValidator();
          const results = await validator.validateAllSchemas();
          
          const failCount = results.filter(r => r.status === 'fail').length;
          const criticalCount = results.reduce((sum, r) => 
            sum + r.mismatches.filter(m => m.severity === 'critical').length, 0
          );
          
          return {
            status: criticalCount > 0 ? 'failed' : failCount > 0 ? 'warning' : 'success',
            summary: `${results.length} services validated, ${criticalCount} critical issues, ${failCount} failures`,
            details: results
          };
        });
      }

      // Step 3: Generate Fixes
      if (this.config.steps.fix) {
        await this.runStep('fix', 'Fix Generation', async () => {
          const fixer = new PatternFixer();
          const results = await fixer.generateAllFixes();
          
          if (this.config.options.autoApplyFixes) {
            await fixer.applyFixes(results, true);
          }
          
          const totalPatches = results.reduce((sum, r) => sum + r.patches.length, 0);
          const appliedCount = results.filter(r => r.applied).length;
          
          return {
            status: totalPatches > 0 ? 'success' : 'warning',
            summary: `${totalPatches} patches generated, ${appliedCount} services ${this.config.options.autoApplyFixes ? 'fixed' : 'have patches'}`,
            details: results
          };
        });
      }

      // Step 4: Generate Tests
      if (this.config.steps.test) {
        await this.runStep('test', 'Test Generation', async () => {
          const generator = new TestGenerator();
          const results = await generator.generateAllTests();
          
          const totalTests = results.reduce((sum, r) => sum + r.testsGenerated.length, 0);
          const successCount = results.filter(r => r.status === 'success').length;
          
          return {
            status: successCount === results.length ? 'success' : 'warning',
            summary: `${totalTests} test files generated for ${successCount}/${results.length} services`,
            details: results
          };
        });
      }

      // Step 5: Verification
      if (this.config.steps.verify) {
        await this.runStep('verify', 'Verification', async () => {
          // Re-run audits to verify improvements
          const auditor = new ServiceAuditor();
          const validator = new SchemaValidator();
          
          const auditResults = await auditor.auditAllServices();
          const schemaResults = await validator.validateAllSchemas();
          
          const auditScore = Math.round(auditResults.reduce((sum, r) => sum + r.score, 0) / auditResults.length);
          const schemaScore = Math.round(schemaResults.reduce((sum, r) => sum + r.score, 0) / schemaResults.length);
          
          return {
            status: auditScore >= 80 && schemaScore >= 80 ? 'success' : 'warning',
            summary: `Verification complete - Audit: ${auditScore}/100, Schema: ${schemaScore}/100`,
            details: { auditResults, schemaResults, auditScore, schemaScore }
          };
        });
      }

      // Generate final report
      this.generateFinalReport();
      
      return this.results;

    } catch (error) {
      console.error('❌ Workflow failed:', error);
      throw error;
    }
  }

  private async runStep(
    stepId: string, 
    stepName: string, 
    stepFunction: () => Promise<{ status: string; summary: string; details?: any }>
  ): Promise<void> {
    const stepStart = Date.now();
    console.log(`\n🔄 Step: ${stepName}`);
    console.log('-'.repeat(40));

    try {
      const result = await stepFunction();
      const duration = Date.now() - stepStart;
      
      this.results.push({
        step: stepName,
        status: result.status as any,
        duration,
        summary: result.summary,
        details: result.details
      });

      const statusIcon = result.status === 'success' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : '❌';
      
      console.log(`${statusIcon} ${stepName}: ${result.summary}`);
      console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

      if (result.status === 'failed' && this.config.options.failOnErrors) {
        throw new Error(`Step ${stepName} failed: ${result.summary}`);
      }

    } catch (error) {
      const duration = Date.now() - stepStart;
      
      this.results.push({
        step: stepName,
        status: 'failed',
        duration,
        summary: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });

      console.log(`❌ ${stepName}: Failed`);
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

      if (this.config.options.failOnErrors) {
        throw error;
      }
    }
  }

  private generateFinalReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const failedCount = this.results.filter(r => r.status === 'failed').length;

    console.log('\n' + '='.repeat(60));
    console.log('🎯 WORKFLOW COMPLETE');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`⚠️  Warning: ${warningCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log();

    // Step-by-step summary
    console.log('📋 Step Summary:');
    for (const result of this.results) {
      const statusIcon = result.status === 'success' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : 
                        result.status === 'skipped' ? '⏭️' : '❌';
      console.log(`   ${statusIcon} ${result.step}: ${result.summary}`);
    }

    // Generate detailed report file
    if (this.config.options.generateReports) {
      this.saveDetailedReport();
    }

    console.log();
    if (failedCount > 0) {
      console.log('🚨 Some steps failed. Check the reports for details.');
    } else if (warningCount > 0) {
      console.log('⚠️  Workflow completed with warnings. Review the reports.');
    } else {
      console.log('🎉 All steps completed successfully!');
    }
  }

  private saveDetailedReport(): void {
    const reportDir = './automation/reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `workflow-${timestamp}.json`);
    const markdownPath = path.join(reportDir, `workflow-${timestamp}.md`);

    // JSON Report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
      summary: {
        totalDuration: Date.now() - this.startTime,
        totalSteps: this.results.length,
        successCount: this.results.filter(r => r.status === 'success').length,
        warningCount: this.results.filter(r => r.status === 'warning').length,
        failedCount: this.results.filter(r => r.status === 'failed').length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));

    // Markdown Report
    const markdown = this.generateMarkdownReport(jsonReport);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`📊 Detailed reports saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${markdownPath}`);
  }

  private generateMarkdownReport(report: any): string {
    let markdown = `# Workflow Execution Report\n\n`;
    markdown += `**Executed:** ${report.timestamp}\n`;
    markdown += `**Duration:** ${(report.summary.totalDuration / 1000).toFixed(2)}s\n\n`;

    markdown += `## 📊 Summary\n\n`;
    markdown += `- **Total Steps:** ${report.summary.totalSteps}\n`;
    markdown += `- **✅ Success:** ${report.summary.successCount}\n`;
    markdown += `- **⚠️ Warning:** ${report.summary.warningCount}\n`;
    markdown += `- **❌ Failed:** ${report.summary.failedCount}\n\n`;

    markdown += `## 🔧 Configuration\n\n`;
    markdown += `**Steps Enabled:**\n`;
    Object.entries(report.config.steps).forEach(([step, enabled]) => {
      markdown += `- ${enabled ? '✅' : '❌'} ${step}\n`;
    });

    markdown += `\n**Options:**\n`;
    Object.entries(report.config.options).forEach(([option, value]) => {
      markdown += `- **${option}:** ${value}\n`;
    });

    markdown += `\n## 📋 Step Results\n\n`;
    for (const result of report.results) {
      const statusIcon = result.status === 'success' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : 
                        result.status === 'skipped' ? '⏭️' : '❌';
      
      markdown += `### ${statusIcon} ${result.step}\n\n`;
      markdown += `- **Status:** ${result.status}\n`;
      markdown += `- **Duration:** ${(result.duration / 1000).toFixed(2)}s\n`;
      markdown += `- **Summary:** ${result.summary}\n\n`;
    }

    markdown += `## 🚀 Next Steps\n\n`;
    if (report.summary.failedCount > 0) {
      markdown += `1. **Address Failures:** Review failed steps and resolve issues\n`;
      markdown += `2. **Re-run Workflow:** Execute workflow again after fixes\n`;
    } else if (report.summary.warningCount > 0) {
      markdown += `1. **Review Warnings:** Check warning details and consider improvements\n`;
      markdown += `2. **Optional Fixes:** Apply suggested improvements for better code quality\n`;
    } else {
      markdown += `1. **Code Review:** Review generated fixes and tests\n`;
      markdown += `2. **Run Tests:** Execute the generated test suite\n`;
      markdown += `3. **Deploy:** Your code quality improvements are ready!\n`;
    }

    return markdown;
  }

  // Preset workflow configurations
  static quickAudit(): WorkflowRunner {
    return new WorkflowRunner({
      steps: { audit: true, validate: true, fix: false, test: false, verify: false },
      options: { autoApplyFixes: false, generateReports: true, runTests: false, failOnErrors: false }
    });
  }

  static fullAutomation(): WorkflowRunner {
    return new WorkflowRunner({
      steps: { audit: true, validate: true, fix: true, test: true, verify: true },
      options: { autoApplyFixes: true, generateReports: true, runTests: false, failOnErrors: false }
    });
  }

  static auditOnly(): WorkflowRunner {
    return new WorkflowRunner({
      steps: { audit: true, validate: false, fix: false, test: false, verify: false },
      options: { autoApplyFixes: false, generateReports: true, runTests: false, failOnErrors: false }
    });
  }

  static fixOnly(): WorkflowRunner {
    return new WorkflowRunner({
      steps: { audit: true, validate: true, fix: true, test: false, verify: true },
      options: { autoApplyFixes: true, generateReports: true, runTests: false, failOnErrors: false }
    });
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let runner: WorkflowRunner;

  // Parse command line arguments
  switch (args[0]) {
    case 'quick':
      runner = WorkflowRunner.quickAudit();
      break;
    case 'full':
      runner = WorkflowRunner.fullAutomation();
      break;
    case 'audit':
      runner = WorkflowRunner.auditOnly();
      break;
    case 'fix':
      runner = WorkflowRunner.fixOnly();
      break;
    default:
      runner = new WorkflowRunner();
  }

  runner.runComplete()
    .then(results => {
      const failedCount = results.filter(r => r.status === 'failed').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      
      if (failedCount > 0) {
        process.exit(1);
      } else if (warningCount > 0) {
        process.exit(0);
      } else {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Workflow execution failed:', error);
      process.exit(1);
    });
}

export default WorkflowRunner;
