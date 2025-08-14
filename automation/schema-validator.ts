#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  table: string;
}

interface ServiceField {
  name: string;
  mappedTo?: string;
  service: string;
  location: string;
}

interface SchemaMismatch {
  type: 'missing_field' | 'incorrect_mapping' | 'type_mismatch' | 'naming_inconsistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  table: string;
  field: string;
  service: string;
  description: string;
  suggestion: string;
  dbField?: SchemaField;
  serviceField?: ServiceField;
}

interface ValidationResult {
  service: string;
  mismatches: SchemaMismatch[];
  score: number;
  status: 'pass' | 'warning' | 'fail';
}

export class SchemaValidator {
  private projectRoot: string;
  private dbSchema: Map<string, SchemaField[]> = new Map();
  private serviceFields: Map<string, ServiceField[]> = new Map();

  constructor() {
    this.projectRoot = process.cwd();
  }

  async validateAllSchemas(): Promise<ValidationResult[]> {
    console.log('🔍 Starting Schema Validation...');
    
    // Load database schema
    await this.loadDatabaseSchema();
    
    // Load service field mappings
    await this.loadServiceMappings();
    
    // Validate each service
    const results: ValidationResult[] = [];
    for (const [serviceName, fields] of this.serviceFields) {
      const result = this.validateService(serviceName, fields);
      results.push(result);
    }

    this.generateValidationReport(results);
    return results;
  }

  private async loadDatabaseSchema(): Promise<void> {
    console.log('📋 Loading database schema...');
    
    const schemaPath = path.join(this.projectRoot, 'database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Database schema file not found: database/schema.sql');
    }

    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    this.parseDatabaseSchema(schemaContent);
    
    console.log(`   Found ${this.dbSchema.size} tables`);
  }

  private parseDatabaseSchema(content: string): void {
    // Parse CREATE TABLE statements
    const tableRegex = /CREATE TABLE (\w+)\s*\(([\s\S]*?)\);/gi;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const tableContent = match[2];
      
      const fields = this.parseTableFields(tableName, tableContent);
      this.dbSchema.set(tableName, fields);
    }
  }

  private parseTableFields(tableName: string, content: string): SchemaField[] {
    const fields: SchemaField[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('--') || trimmed === '' || trimmed.startsWith('CONSTRAINT')) {
        continue;
      }

      // Parse field definition: field_name TYPE [NOT NULL]
      const fieldMatch = trimmed.match(/^(\w+)\s+([A-Z]+(?:\(\d+(?:,\d+)?\))?)\s*(NOT NULL)?/i);
      if (fieldMatch) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2],
          nullable: !fieldMatch[3],
          table: tableName
        });
      }
    }

    return fields;
  }

  private async loadServiceMappings(): Promise<void> {
    console.log('🔧 Analyzing service field mappings...');
    
    const servicesDir = path.join(this.projectRoot, 'src/services');
    const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));

    for (const file of serviceFiles) {
      const serviceName = path.basename(file, '.ts');
      const servicePath = path.join(servicesDir, file);
      const content = fs.readFileSync(servicePath, 'utf8');
      
      const fields = this.extractServiceFields(serviceName, content);
      if (fields.length > 0) {
        this.serviceFields.set(serviceName, fields);
      }
    }

    console.log(`   Analyzed ${this.serviceFields.size} services`);
  }

  private extractServiceFields(serviceName: string, content: string): ServiceField[] {
    const fields: ServiceField[] = [];

    // Look for database field mappings
    // Pattern 1: orderData.field_name -> appData.fieldName
    const mappingRegex = /(\w+)\.(\w+)/g;
    let match;

    while ((match = mappingRegex.exec(content)) !== null) {
      const objectName = match[1];
      const fieldName = match[2];

      // Skip common non-database objects
      if (['console', 'JSON', 'Date', 'Math', 'Object', 'Array'].includes(objectName)) {
        continue;
      }

      // Look for database-style field names (snake_case)
      if (fieldName.includes('_')) {
        fields.push({
          name: fieldName,
          service: serviceName,
          location: `${objectName}.${fieldName}`
        });
      }
    }

    // Pattern 2: Direct field assignments in interfaces/types
    const interfaceRegex = /(\w+):\s*(\w+\.)?(\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const fieldName = match[1];
      const sourceField = match[3];

      if (sourceField && sourceField.includes('_')) {
        fields.push({
          name: sourceField,
          mappedTo: fieldName,
          service: serviceName,
          location: `interface mapping: ${fieldName} -> ${sourceField}`
        });
      }
    }

    return fields;
  }

  private validateService(serviceName: string, serviceFields: ServiceField[]): ValidationResult {
    console.log(`\n🔍 Validating ${serviceName}...`);
    
    const mismatches: SchemaMismatch[] = [];

    for (const serviceField of serviceFields) {
      // Find which table this field might belong to
      const possibleTables = this.findPossibleTables(serviceField.name);
      
      if (possibleTables.length === 0) {
        // Field not found in any table
        mismatches.push({
          type: 'missing_field',
          severity: 'high',
          table: 'unknown',
          field: serviceField.name,
          service: serviceName,
          description: `Service references field '${serviceField.name}' but it doesn't exist in database schema`,
          suggestion: `Check if field name is correct or if it exists in database`,
          serviceField
        });
      } else {
        // Check for naming inconsistencies
        for (const table of possibleTables) {
          const dbField = this.dbSchema.get(table)?.find(f => f.name === serviceField.name);
          if (dbField) {
            // Check for common mapping issues
            if (this.isCommonMismatch(serviceField.name, serviceField.mappedTo)) {
              mismatches.push({
                type: 'incorrect_mapping',
                severity: 'critical',
                table,
                field: serviceField.name,
                service: serviceName,
                description: `Known mapping issue: ${serviceField.name} -> ${serviceField.mappedTo}`,
                suggestion: this.getSuggestionForField(serviceField.name),
                dbField,
                serviceField
              });
            }
          }
        }
      }
    }

    const score = this.calculateValidationScore(mismatches);
    const status = this.determineValidationStatus(score, mismatches);

    console.log(`   Score: ${score}/100 (${status.toUpperCase()})`);
    console.log(`   Mismatches: ${mismatches.length}`);

    return {
      service: serviceName,
      mismatches,
      score,
      status
    };
  }

  private findPossibleTables(fieldName: string): string[] {
    const tables: string[] = [];
    
    for (const [tableName, fields] of this.dbSchema) {
      if (fields.some(f => f.name === fieldName)) {
        tables.push(tableName);
      }
    }

    return tables;
  }

  private isCommonMismatch(dbField: string, mappedField?: string): boolean {
    // Known problematic mappings
    const knownMismatches = [
      { db: 'pre_order_deadline', mapped: 'preOrderDeadline' }, // Should be pre_order_available_date
      { db: 'user_id', mapped: 'userId' },
      { db: 'created_at', mapped: 'createdAt' },
      { db: 'updated_at', mapped: 'updatedAt' }
    ];

    return knownMismatches.some(mismatch => 
      mismatch.db === dbField && (!mappedField || mismatch.mapped === mappedField)
    );
  }

  private getSuggestionForField(fieldName: string): string {
    const suggestions: Record<string, string> = {
      'pre_order_deadline': 'Use pre_order_available_date instead - pre_order_deadline does not exist in database',
      'user_id': 'Ensure proper mapping to customerId in Order interface',
      'created_at': 'Map to createdAt in camelCase format',
      'updated_at': 'Map to updatedAt in camelCase format'
    };

    return suggestions[fieldName] || `Verify field mapping for ${fieldName}`;
  }

  private calculateValidationScore(mismatches: SchemaMismatch[]): number {
    let score = 100;

    for (const mismatch of mismatches) {
      switch (mismatch.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
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

  private determineValidationStatus(score: number, mismatches: SchemaMismatch[]): 'pass' | 'warning' | 'fail' {
    const hasCritical = mismatches.some(m => m.severity === 'critical');
    
    if (hasCritical || score < 60) return 'fail';
    if (score < 85) return 'warning';
    return 'pass';
  }

  private generateValidationReport(results: ValidationResult[]): void {
    const reportDir = './automation/reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `schema-validation-${timestamp}.json`);
    const markdownPath = path.join(reportDir, `schema-validation-${timestamp}.md`);

    // JSON Report
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Markdown Report
    const markdown = this.generateMarkdownReport(results);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📊 Schema validation reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${markdownPath}`);
  }

  private generateMarkdownReport(results: ValidationResult[]): string {
    const totalServices = results.length;
    const passCount = results.filter(r => r.status === 'pass').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalServices);
    const totalMismatches = results.reduce((sum, r) => sum + r.mismatches.length, 0);

    let markdown = `# Schema Validation Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## 📊 Summary\n\n`;
    markdown += `- **Total Services:** ${totalServices}\n`;
    markdown += `- **Average Score:** ${avgScore}/100\n`;
    markdown += `- **Total Mismatches:** ${totalMismatches}\n`;
    markdown += `- **✅ Pass:** ${passCount}\n`;
    markdown += `- **⚠️ Warning:** ${warningCount}\n`;
    markdown += `- **❌ Fail:** ${failCount}\n\n`;

    // Critical issues first
    const criticalIssues = results.flatMap(r => 
      r.mismatches.filter(m => m.severity === 'critical')
        .map(m => ({ ...m, service: r.service }))
    );

    if (criticalIssues.length > 0) {
      markdown += `## 🚨 Critical Issues (${criticalIssues.length})\n\n`;
      for (const issue of criticalIssues) {
        markdown += `### ${issue.service}: ${issue.field}\n`;
        markdown += `- **Table:** ${issue.table}\n`;
        markdown += `- **Issue:** ${issue.description}\n`;
        markdown += `- **Fix:** ${issue.suggestion}\n\n`;
      }
    }

    markdown += `## 📋 Detailed Results\n\n`;

    for (const result of results) {
      const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      markdown += `### ${statusIcon} ${result.service} (${result.score}/100)\n\n`;
      
      if (result.mismatches.length > 0) {
        markdown += `**Schema Mismatches:** ${result.mismatches.length}\n\n`;
        
        for (const mismatch of result.mismatches) {
          const severityIcon = mismatch.severity === 'critical' ? '🚨' : 
                              mismatch.severity === 'high' ? '⚠️' : 
                              mismatch.severity === 'medium' ? '🔶' : 'ℹ️';
          
          markdown += `- ${severityIcon} **${mismatch.type.replace('_', ' ').toUpperCase()}:** ${mismatch.description}\n`;
          markdown += `  - *Table:* ${mismatch.table}\n`;
          markdown += `  - *Field:* ${mismatch.field}\n`;
          markdown += `  - *Fix:* ${mismatch.suggestion}\n`;
        }
        markdown += `\n`;
      } else {
        markdown += `✅ No schema mismatches found!\n\n`;
      }
    }

    return markdown;
  }
}

// CLI execution
if (require.main === module) {
  const validator = new SchemaValidator();
  validator.validateAllSchemas()
    .then(results => {
      const failCount = results.filter(r => r.status === 'fail').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      const criticalCount = results.reduce((sum, r) => 
        sum + r.mismatches.filter(m => m.severity === 'critical').length, 0
      );
      
      console.log(`\n🎯 Schema Validation Complete!`);
      console.log(`   ${results.filter(r => r.status === 'pass').length} services passed`);
      console.log(`   ${warningCount} services have warnings`);
      console.log(`   ${failCount} services failed`);
      console.log(`   ${criticalCount} critical issues found`);
      
      if (criticalCount > 0) {
        console.log(`\n🚨 ${criticalCount} critical schema mismatches need immediate attention!`);
        process.exit(1);
      } else if (failCount > 0) {
        console.log(`\n❌ ${failCount} services have schema validation failures.`);
        process.exit(1);
      } else if (warningCount > 0) {
        console.log(`\n⚠️ ${warningCount} services have schema warnings.`);
        process.exit(0);
      } else {
        console.log(`\n✅ All services have valid schema mappings!`);
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Schema validation failed:', error);
      process.exit(1);
    });
}

export default SchemaValidator;
