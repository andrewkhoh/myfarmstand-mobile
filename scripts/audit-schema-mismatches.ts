import * as fs from 'fs';
import * as path from 'path';
import { Database, Tables, TablesInsert, TablesUpdate } from '../src/types/database.generated';

interface AuditResult {
  file: string;
  issues: Issue[];
}

interface Issue {
  line: number;
  type: 'missing_type' | 'incorrect_type' | 'missing_import' | 'deprecated_field' | 'unknown_field' | 'type_mismatch';
  message: string;
  severity: 'error' | 'warning' | 'info';
  lineContent?: string;
}

class SchemaAuditor {
  private results: AuditResult[] = [];
  private schemaTypes: Set<string> = new Set();
  private tableNames: Set<string> = new Set();
  private viewNames: Set<string> = new Set();
  private functionNames: Set<string> = new Set();

  constructor() {
    this.extractSchemaInfo();
  }

  private extractSchemaInfo() {
    // Extract table names
    const tables = [
      'cart_items', 'categories', 'error_recovery_log', 'inventory_logs',
      'no_show_log', 'notification_log', 'notification_logs', 'order_items',
      'orders', 'pickup_reschedule_log', 'products', 'users'
    ];
    tables.forEach(t => this.tableNames.add(t));

    // Extract view names
    const views = ['order_summary', 'product_inventory'];
    views.forEach(v => this.viewNames.add(v));

    // Extract function names
    const functions = [
      'decrement_product_stock', 'increment_product_stock', 'process_no_show_atomic',
      'recover_from_error_atomic', 'reschedule_pickup_atomic', 'send_notification_atomic',
      'submit_order_atomic', 'upsert_cart_item'
    ];
    functions.forEach(f => this.functionNames.add(f));

    // Common type exports
    ['Database', 'Tables', 'TablesInsert', 'TablesUpdate', 'Json', 'Enums', 'CompositeTypes'].forEach(t => {
      this.schemaTypes.add(t);
    });
  }

  public async auditFile(filePath: string): Promise<AuditResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues: Issue[] = [];

    // Check for proper type imports
    const hasGeneratedImport = content.includes('database.generated');
    const importedTypes = this.extractImportedTypes(content);

    // Audit patterns
    const patterns = [
      // Check for direct table access without proper types
      {
        regex: /\.from\(['"](\w+)['"]\)/g,
        check: (match: RegExpExecArray) => {
          const tableName = match[1];
          if (!this.tableNames.has(tableName) && !this.viewNames.has(tableName)) {
            return {
              type: 'unknown_field' as const,
              message: `Unknown table/view: "${tableName}"`,
              severity: 'error' as const
            };
          }
          return null;
        }
      },
      // Check for RPC calls
      {
        regex: /\.rpc\(['"](\w+)['"]/g,
        check: (match: RegExpExecArray) => {
          const funcName = match[1];
          if (!this.functionNames.has(funcName)) {
            return {
              type: 'unknown_field' as const,
              message: `Unknown RPC function: "${funcName}"`,
              severity: 'error' as const
            };
          }
          return null;
        }
      },
      // Check for type assertions without proper imports
      {
        regex: /as\s+(Tables<['"](\w+)['"]\>|TablesInsert<['"](\w+)['"]\>|TablesUpdate<['"](\w+)['"]\>)/g,
        check: (match: RegExpExecArray) => {
          const typeUsed = match[1];
          if (!hasGeneratedImport) {
            return {
              type: 'missing_import' as const,
              message: `Using ${typeUsed} without importing from database.generated.ts`,
              severity: 'error' as const
            };
          }
          return null;
        }
      },
      // Check for any type usage
      {
        regex: /:\s*any(?:\s|,|\)|;|\[)/g,
        check: () => ({
          type: 'missing_type' as const,
          message: 'Using "any" type - should use proper database types',
          severity: 'warning' as const
        })
      },
      // Check for untyped Supabase responses
      {
        regex: /const\s+(\w+)\s*=\s*await\s+supabase[^;]*\.(?:select|insert|update|delete|rpc)\(/g,
        check: (match: RegExpExecArray, line: string) => {
          if (!line.includes('<') && !line.includes('Tables') && !line.includes('Database')) {
            return {
              type: 'missing_type' as const,
              message: 'Supabase query result not properly typed',
              severity: 'warning' as const
            };
          }
          return null;
        }
      }
    ];

    // Run pattern checks
    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        while ((match = regex.exec(line)) !== null) {
          const issue = pattern.check(match, line);
          if (issue) {
            issues.push({
              ...issue,
              line: index + 1,
              lineContent: line.trim()
            });
          }
        }
      });
    });

    // Check specific service patterns
    this.checkServicePatterns(content, lines, issues);

    return {
      file: filePath,
      issues
    };
  }

  private extractImportedTypes(content: string): Set<string> {
    const imported = new Set<string>();
    const importRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"][^'"]*database\.generated['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const types = match[1].split(',').map(t => t.trim());
      types.forEach(t => imported.add(t));
    }
    return imported;
  }

  private checkServicePatterns(content: string, lines: string[], issues: Issue[]) {
    // Check for order structure mismatches
    if (content.includes('orders') || content.includes('order_items')) {
      this.checkOrderTypes(lines, issues);
    }

    // Check for product structure mismatches
    if (content.includes('products') || content.includes('product_inventory')) {
      this.checkProductTypes(lines, issues);
    }

    // Check for notification structure mismatches
    if (content.includes('notification_log') || content.includes('notification_logs')) {
      this.checkNotificationTypes(lines, issues);
    }

    // Check for cart structure mismatches
    if (content.includes('cart_items')) {
      this.checkCartTypes(lines, issues);
    }
  }

  private checkOrderTypes(lines: string[], issues: Issue[]) {
    const orderFields = [
      'customer_email', 'customer_name', 'customer_phone', 'delivery_address',
      'fulfillment_type', 'notes', 'payment_method', 'payment_status',
      'pickup_date', 'pickup_time', 'qr_code_data', 'special_instructions',
      'status', 'subtotal', 'tax_amount', 'total_amount', 'user_id'
    ];

    lines.forEach((line, index) => {
      // Check for incorrect field access
      const fieldAccess = /order\.([\w_]+)/g;
      let match;
      while ((match = fieldAccess.exec(line)) !== null) {
        const field = match[1];
        if (!orderFields.includes(field) && !['id', 'created_at', 'updated_at'].includes(field)) {
          issues.push({
            line: index + 1,
            type: 'unknown_field',
            message: `Unknown order field: "${field}"`,
            severity: 'error',
            lineContent: line.trim()
          });
        }
      }
    });
  }

  private checkProductTypes(lines: string[], issues: Issue[]) {
    const productFields = [
      'category', 'category_id', 'description', 'image_url', 'is_available',
      'is_bundle', 'is_pre_order', 'is_weekly_special', 'max_pre_order_quantity',
      'min_pre_order_quantity', 'name', 'nutrition_info', 'pre_order_available_date',
      'price', 'seasonal_availability', 'sku', 'stock_quantity', 'tags', 'unit', 'weight'
    ];

    lines.forEach((line, index) => {
      const fieldAccess = /product\.([\w_]+)/g;
      let match;
      while ((match = fieldAccess.exec(line)) !== null) {
        const field = match[1];
        if (!productFields.includes(field) && !['id', 'created_at', 'updated_at'].includes(field)) {
          issues.push({
            line: index + 1,
            type: 'unknown_field',
            message: `Unknown product field: "${field}"`,
            severity: 'error',
            lineContent: line.trim()
          });
        }
      }
    });
  }

  private checkNotificationTypes(lines: string[], issues: Issue[]) {
    // Check for confusion between notification_log and notification_logs
    lines.forEach((line, index) => {
      if (line.includes('notification_log') && line.includes('channels_')) {
        issues.push({
          line: index + 1,
          type: 'type_mismatch',
          message: 'notification_log does not have channels_* fields - those belong to notification_logs',
          severity: 'error',
          lineContent: line.trim()
        });
      }
    });
  }

  private checkCartTypes(lines: string[], issues: Issue[]) {
    const cartFields = ['product_id', 'quantity', 'user_id'];
    
    lines.forEach((line, index) => {
      const fieldAccess = /cart_item\.([\w_]+)/g;
      let match;
      while ((match = fieldAccess.exec(line)) !== null) {
        const field = match[1];
        if (!cartFields.includes(field) && !['id', 'created_at', 'updated_at'].includes(field)) {
          issues.push({
            line: index + 1,
            type: 'unknown_field',
            message: `Unknown cart_item field: "${field}"`,
            severity: 'error',
            lineContent: line.trim()
          });
        }
      }
    });
  }

  public async auditDirectory(dirPath: string): Promise<void> {
    const files = this.getTypeScriptFiles(dirPath);
    
    for (const file of files) {
      const result = await this.auditFile(file);
      if (result.issues.length > 0) {
        this.results.push(result);
      }
    }
  }

  private getTypeScriptFiles(dirPath: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.getTypeScriptFiles(fullPath));
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  public generateReport(): string {
    let report = '# Schema/Service Mismatch Audit Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0);
    const errorCount = this.results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'error').length, 0);
    const warningCount = this.results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'warning').length, 0);
    
    report += `## Summary\n`;
    report += `- Files with issues: ${this.results.length}\n`;
    report += `- Total issues: ${totalIssues}\n`;
    report += `- Errors: ${errorCount}\n`;
    report += `- Warnings: ${warningCount}\n\n`;
    
    if (this.results.length === 0) {
      report += '✅ No schema/service mismatches found!\n';
      return report;
    }
    
    report += '## Issues by File\n\n';
    
    for (const result of this.results) {
      const relativePath = result.file.replace(process.cwd() + '/', '');
      report += `### ${relativePath}\n\n`;
      
      const errors = result.issues.filter(i => i.severity === 'error');
      const warnings = result.issues.filter(i => i.severity === 'warning');
      
      if (errors.length > 0) {
        report += '**Errors:**\n';
        errors.forEach(issue => {
          report += `- \`${relativePath}:${issue.line}\` - ${issue.message}\n`;
          if (issue.lineContent) {
            report += `  \`\`\`typescript\n  ${issue.lineContent}\n  \`\`\`\n`;
          }
        });
        report += '\n';
      }
      
      if (warnings.length > 0) {
        report += '**Warnings:**\n';
        warnings.forEach(issue => {
          report += `- \`${relativePath}:${issue.line}\` - ${issue.message}\n`;
          if (issue.lineContent) {
            report += `  \`\`\`typescript\n  ${issue.lineContent}\n  \`\`\`\n`;
          }
        });
        report += '\n';
      }
    }
    
    return report;
  }
}

// Run the audit
async function main() {
  console.log('Starting schema/service mismatch audit...\n');
  
  const auditor = new SchemaAuditor();
  
  // Audit services
  console.log('Auditing services...');
  await auditor.auditDirectory(path.join(process.cwd(), 'src/services'));
  
  // Audit hooks
  console.log('Auditing hooks...');
  await auditor.auditDirectory(path.join(process.cwd(), 'src/hooks'));
  
  // Audit screens that might interact with the database
  console.log('Auditing screens...');
  await auditor.auditDirectory(path.join(process.cwd(), 'src/screens'));
  
  // Generate and save report
  const report = auditor.generateReport();
  
  const reportPath = path.join(process.cwd(), 'scripts/audit-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n${report}`);
  console.log(`\nAudit report saved to: ${reportPath}`);
}

main().catch(console.error);