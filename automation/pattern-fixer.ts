#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import ServiceAuditor from './audit-services';
import SchemaValidator from './schema-validator';

interface FixPatch {
  file: string;
  type: 'service_pattern' | 'schema_mapping' | 'hook_pattern';
  description: string;
  originalCode: string;
  fixedCode: string;
  lineNumber?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface FixResult {
  service: string;
  patches: FixPatch[];
  applied: boolean;
  backupPath?: string;
  status: 'success' | 'partial' | 'failed';
}

export class PatternFixer {
  private projectRoot: string;
  private patchDir: string;
  private backupDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.patchDir = path.join(this.projectRoot, 'automation/patches');
    this.backupDir = path.join(this.projectRoot, 'automation/backups');
    
    // Ensure directories exist
    [this.patchDir, this.backupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateAllFixes(): Promise<FixResult[]> {
    console.log('🔧 Starting Automated Fix Generation...');

    // Run audits to get current issues
    const auditor = new ServiceAuditor();
    const validator = new SchemaValidator();

    const auditResults = await auditor.auditAllServices();
    const schemaResults = await validator.validateAllSchemas();

    const fixResults: FixResult[] = [];

    // Generate fixes for service pattern issues
    for (const auditResult of auditResults) {
      if (auditResult.gaps.length > 0) {
        const result = await this.generateServiceFixes(auditResult);
        fixResults.push(result);
      }
    }

    // Generate fixes for schema issues
    for (const schemaResult of schemaResults) {
      if (schemaResult.mismatches.length > 0) {
        const result = await this.generateSchemaFixes(schemaResult);
        fixResults.push(result);
      }
    }

    this.generateFixReport(fixResults);
    return fixResults;
  }

  private async generateServiceFixes(auditResult: any): Promise<FixResult> {
    console.log(`\n🔧 Generating fixes for ${auditResult.service}...`);

    const servicePath = this.findServicePath(auditResult.service);
    const patches: FixPatch[] = [];

    if (!servicePath || !fs.existsSync(servicePath)) {
      return {
        service: auditResult.service,
        patches: [],
        applied: false,
        status: 'failed'
      };
    }

    const content = fs.readFileSync(servicePath, 'utf8');
    const lines = content.split('\n');

    for (const gap of auditResult.gaps) {
      const patch = this.generatePatchForGap(servicePath, content, lines, gap);
      if (patch) {
        patches.push(patch);
      }
    }

    console.log(`   Generated ${patches.length} patches`);

    return {
      service: auditResult.service,
      patches,
      applied: false,
      status: patches.length > 0 ? 'success' : 'partial'
    };
  }

  private generatePatchForGap(filePath: string, content: string, lines: string[], gap: any): FixPatch | null {
    switch (gap.type) {
      case 'missing_pattern':
        return this.generateMissingPatternFix(filePath, content, lines, gap);
      case 'incorrect_implementation':
        return this.generateIncorrectImplementationFix(filePath, content, lines, gap);
      default:
        return null;
    }
  }

  private generateMissingPatternFix(filePath: string, content: string, lines: string[], gap: any): FixPatch | null {
    if (gap.description.includes('error handling')) {
      return this.generateErrorHandlingFix(filePath, content, lines);
    } else if (gap.description.includes('broadcast integration')) {
      return this.generateBroadcastFix(filePath, content, lines);
    } else if (gap.description.includes('consistent return format')) {
      return this.generateReturnFormatFix(filePath, content, lines);
    } else if (gap.description.includes('logging')) {
      return this.generateLoggingFix(filePath, content, lines);
    }
    
    return null;
  }

  private generateErrorHandlingFix(filePath: string, content: string, lines: string[]): FixPatch {
    // Find functions that need error handling
    const functionRegex = /^\s*(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/;
    let insertLine = -1;
    let functionName = '';

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(functionRegex);
      if (match && !lines[i].includes('try') && !lines[i].includes('catch')) {
        insertLine = i + 1;
        functionName = match[2];
        break;
      }
    }

    if (insertLine === -1) return null;

    const originalCode = lines.slice(insertLine, insertLine + 5).join('\n');
    const fixedCode = `    try {
      // TODO: Add your implementation here
      ${originalCode.trim()}
    } catch (error) {
      console.error('Error in ${functionName}:', error);
      return {
        success: false,
        error: \`Failed to execute ${functionName}: \${error instanceof Error ? error.message : 'Unknown error'}\`
      };
    }`;

    return {
      file: filePath,
      type: 'service_pattern',
      description: `Add robust error handling to ${functionName}`,
      originalCode,
      fixedCode,
      lineNumber: insertLine,
      severity: 'high'
    };
  }

  private generateBroadcastFix(filePath: string, content: string, lines: string[]): FixPatch {
    // Find where to add broadcast import
    let importLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import') && lines[i].includes('from')) {
        importLine = i + 1;
      }
    }

    const originalCode = lines[importLine] || '';
    const fixedCode = `import { sendOrderBroadcast } from '../utils/broadcastFactory';`;

    return {
      file: filePath,
      type: 'service_pattern',
      description: 'Add broadcast integration import',
      originalCode,
      fixedCode,
      lineNumber: importLine,
      severity: 'medium'
    };
  }

  private generateReturnFormatFix(filePath: string, content: string, lines: string[]): FixPatch {
    // Find return statements that don't follow the pattern
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('return ') && !lines[i].includes('success:')) {
        const originalCode = lines[i];
        const returnValue = originalCode.match(/return\s+(.+);?/)?.[1] || 'result';
        const fixedCode = originalCode.replace(
          /return\s+(.+);?/,
          `return { success: true, data: $1 };`
        );

        return {
          file: filePath,
          type: 'service_pattern',
          description: 'Standardize return format',
          originalCode,
          fixedCode,
          lineNumber: i + 1,
          severity: 'medium'
        };
      }
    }

    return null;
  }

  private generateLoggingFix(filePath: string, content: string, lines: string[]): FixPatch {
    // Find functions that need logging
    const functionRegex = /^\s*(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/;
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(functionRegex);
      if (match && !content.includes('console.log') && !content.includes('console.error')) {
        const functionName = match[2];
        const originalCode = lines[i];
        const fixedCode = `${originalCode}
    console.log('🔍 ${functionName} called');`;

        return {
          file: filePath,
          type: 'service_pattern',
          description: `Add logging to ${functionName}`,
          originalCode,
          fixedCode,
          lineNumber: i + 1,
          severity: 'low'
        };
      }
    }

    return null;
  }

  private generateIncorrectImplementationFix(filePath: string, content: string, lines: string[], gap: any): FixPatch | null {
    // Handle specific incorrect implementations
    return null;
  }

  private async generateSchemaFixes(schemaResult: any): Promise<FixResult> {
    console.log(`\n🗄️ Generating schema fixes for ${schemaResult.service}...`);

    const servicePath = this.findServicePath(schemaResult.service);
    const patches: FixPatch[] = [];

    if (!servicePath || !fs.existsSync(servicePath)) {
      return {
        service: schemaResult.service,
        patches: [],
        applied: false,
        status: 'failed'
      };
    }

    const content = fs.readFileSync(servicePath, 'utf8');

    for (const mismatch of schemaResult.mismatches) {
      const patch = this.generateSchemaFixPatch(servicePath, content, mismatch);
      if (patch) {
        patches.push(patch);
      }
    }

    console.log(`   Generated ${patches.length} schema patches`);

    return {
      service: schemaResult.service,
      patches,
      applied: false,
      status: patches.length > 0 ? 'success' : 'partial'
    };
  }

  private generateSchemaFixPatch(filePath: string, content: string, mismatch: any): FixPatch | null {
    if (mismatch.type === 'incorrect_mapping' && mismatch.field === 'pre_order_deadline') {
      // Fix the known pre_order_deadline -> pre_order_available_date issue
      const originalCode = content.match(/pre_order_deadline/g)?.[0] || 'pre_order_deadline';
      const fixedCode = 'pre_order_available_date';

      return {
        file: filePath,
        type: 'schema_mapping',
        description: 'Fix pre_order_deadline mapping to pre_order_available_date',
        originalCode,
        fixedCode,
        severity: 'critical'
      };
    }

    return null;
  }

  private findServicePath(serviceName: string): string {
    const possiblePaths = [
      `src/services/${serviceName}.ts`,
      `src/hooks/${serviceName}.ts`,
      `src/services/${serviceName}Service.ts`,
      `src/hooks/use${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}.ts`
    ];

    for (const relativePath of possiblePaths) {
      const fullPath = path.join(this.projectRoot, relativePath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return '';
  }

  async applyFixes(fixResults: FixResult[], autoApply: boolean = false): Promise<void> {
    console.log(`\n🔧 ${autoApply ? 'Applying' : 'Generating patch files for'} fixes...`);

    for (const result of fixResults) {
      if (result.patches.length === 0) continue;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const patchFileName = `${result.service}-fixes-${timestamp}.patch`;
      const patchPath = path.join(this.patchDir, patchFileName);

      // Generate patch file
      const patchContent = this.generatePatchFile(result);
      fs.writeFileSync(patchPath, patchContent);

      if (autoApply) {
        // Create backup
        const backupPath = this.createBackup(result.service);
        result.backupPath = backupPath;

        // Apply patches
        try {
          await this.applyPatchesToFile(result);
          result.applied = true;
          result.status = 'success';
          console.log(`   ✅ Applied ${result.patches.length} fixes to ${result.service}`);
        } catch (error) {
          result.applied = false;
          result.status = 'failed';
          console.log(`   ❌ Failed to apply fixes to ${result.service}: ${error}`);
        }
      } else {
        console.log(`   📄 Generated patch file: ${patchPath}`);
      }
    }
  }

  private generatePatchFile(result: FixResult): string {
    let patchContent = `# Fixes for ${result.service}\n`;
    patchContent += `# Generated: ${new Date().toISOString()}\n\n`;

    for (const patch of result.patches) {
      patchContent += `## ${patch.description}\n`;
      patchContent += `**Type:** ${patch.type}\n`;
      patchContent += `**Severity:** ${patch.severity}\n`;
      patchContent += `**File:** ${patch.file}\n`;
      if (patch.lineNumber) {
        patchContent += `**Line:** ${patch.lineNumber}\n`;
      }
      patchContent += `\n**Original:**\n\`\`\`typescript\n${patch.originalCode}\n\`\`\`\n`;
      patchContent += `\n**Fixed:**\n\`\`\`typescript\n${patch.fixedCode}\n\`\`\`\n\n`;
      patchContent += `---\n\n`;
    }

    return patchContent;
  }

  private createBackup(serviceName: string): string {
    const servicePath = this.findServicePath(serviceName);
    if (!servicePath) return '';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${serviceName}-backup-${timestamp}.ts`;
    const backupPath = path.join(this.backupDir, backupFileName);

    fs.copyFileSync(servicePath, backupPath);
    return backupPath;
  }

  private async applyPatchesToFile(result: FixResult): Promise<void> {
    const servicePath = this.findServicePath(result.service);
    if (!servicePath) throw new Error(`Service file not found: ${result.service}`);

    let content = fs.readFileSync(servicePath, 'utf8');

    for (const patch of result.patches) {
      if (patch.originalCode && patch.fixedCode) {
        content = content.replace(patch.originalCode, patch.fixedCode);
      }
    }

    fs.writeFileSync(servicePath, content);
  }

  private generateFixReport(results: FixResult[]): void {
    const reportDir = './automation/reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `fix-generation-${timestamp}.json`);
    const markdownPath = path.join(reportDir, `fix-generation-${timestamp}.md`);

    // JSON Report
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Markdown Report
    const markdown = this.generateMarkdownFixReport(results);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📊 Fix generation reports created:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${markdownPath}`);
  }

  private generateMarkdownFixReport(results: FixResult[]): string {
    const totalServices = results.length;
    const totalPatches = results.reduce((sum, r) => sum + r.patches.length, 0);
    const appliedCount = results.filter(r => r.applied).length;

    let markdown = `# Fix Generation Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## 📊 Summary\n\n`;
    markdown += `- **Services Processed:** ${totalServices}\n`;
    markdown += `- **Total Patches Generated:** ${totalPatches}\n`;
    markdown += `- **Fixes Applied:** ${appliedCount}\n`;
    markdown += `- **Patch Files Created:** ${totalServices}\n\n`;

    markdown += `## 🔧 Generated Fixes\n\n`;

    for (const result of results) {
      const statusIcon = result.status === 'success' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
      markdown += `### ${statusIcon} ${result.service}\n\n`;
      markdown += `- **Patches:** ${result.patches.length}\n`;
      markdown += `- **Applied:** ${result.applied ? 'Yes' : 'No'}\n`;
      markdown += `- **Status:** ${result.status}\n`;
      
      if (result.backupPath) {
        markdown += `- **Backup:** ${result.backupPath}\n`;
      }

      if (result.patches.length > 0) {
        markdown += `\n**Patches Generated:**\n`;
        for (const patch of result.patches) {
          const severityIcon = patch.severity === 'critical' ? '🚨' : 
                              patch.severity === 'high' ? '⚠️' : 
                              patch.severity === 'medium' ? '🔶' : 'ℹ️';
          markdown += `- ${severityIcon} ${patch.description}\n`;
        }
      }
      
      markdown += `\n`;
    }

    return markdown;
  }
}

// CLI execution
if (require.main === module) {
  const fixer = new PatternFixer();
  const autoApply = process.argv.includes('--apply');
  
  fixer.generateAllFixes()
    .then(async (results) => {
      await fixer.applyFixes(results, autoApply);
      
      const totalPatches = results.reduce((sum, r) => sum + r.patches.length, 0);
      const appliedCount = results.filter(r => r.applied).length;
      
      console.log(`\n🎯 Fix Generation Complete!`);
      console.log(`   ${totalPatches} patches generated`);
      console.log(`   ${appliedCount} services ${autoApply ? 'fixed' : 'have patch files'}`);
      
      if (autoApply) {
        console.log(`\n✅ Fixes have been applied automatically!`);
        console.log(`   Backups created in automation/backups/`);
      } else {
        console.log(`\n📄 Patch files created in automation/patches/`);
        console.log(`   Run with --apply to automatically apply fixes`);
      }
    })
    .catch(error => {
      console.error('❌ Fix generation failed:', error);
      process.exit(1);
    });
}

export default PatternFixer;
