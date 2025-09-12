#!/usr/bin/env node

/**
 * Script to check alignment between Zod schemas and generated database types
 * Identifies mismatches that could cause runtime validation errors
 */

const fs = require('fs');
const path = require('path');

// Read the generated database types
const dbTypesPath = path.join(__dirname, '../src/types/database.generated.ts');
const dbTypesContent = fs.readFileSync(dbTypesPath, 'utf8');

// Extract table definitions from generated types
function extractTableDefinitions(content) {
  const tables = {};
  const tableRegex = /(\w+):\s*{\s*Row:\s*{([^}]+)}/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const fieldsContent = match[2];
    const fields = {};
    
    // Extract field definitions
    const fieldRegex = /(\w+):\s*([^,\n]+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2].trim();
      fields[fieldName] = {
        type: fieldType,
        isNullable: fieldType.includes('| null'),
        isOptional: false // Row types don't have optional fields
      };
    }
    
    tables[tableName] = fields;
  }
  
  return tables;
}

// Find all schema files
function findSchemaFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('__')) {
      files.push(...findSchemaFiles(fullPath));
    } else if (item.endsWith('.schema.ts') || item.endsWith('.schemas.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract Zod schema definitions
function extractZodSchemas(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const schemas = [];
  
  // Look for DatabaseSchema definitions
  const schemaRegex = /export\s+const\s+(\w*(?:Database|Raw)\w*Schema)\s*=\s*z\.object\s*\(\s*{([^}]+)}/g;
  let match;
  
  while ((match = schemaRegex.exec(content)) !== null) {
    const schemaName = match[1];
    const fieldsContent = match[2];
    const fields = {};
    
    // Extract field definitions from Zod schema
    const fieldRegex = /(\w+):\s*z\.([^,()]+(?:\([^)]*\))?[^,]*)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldDef = fieldMatch[2];
      fields[fieldName] = {
        type: fieldDef,
        isNullable: fieldDef.includes('.nullable()'),
        isOptional: fieldDef.includes('.optional()')
      };
    }
    
    schemas.push({
      name: schemaName,
      file: path.relative(process.cwd(), filePath),
      fields
    });
  }
  
  return schemas;
}

// Main analysis
console.log('🔍 Checking Zod Schema vs Database Type Alignment\n');
console.log('=' .repeat(60));

const dbTables = extractTableDefinitions(dbTypesContent);
const schemasDir = path.join(__dirname, '../src/schemas');
const schemaFiles = findSchemaFiles(schemasDir);

const issues = [];
const warnings = [];

// Analyze each schema file
for (const schemaFile of schemaFiles) {
  const schemas = extractZodSchemas(schemaFile);
  
  for (const schema of schemas) {
    // Try to match schema to a table
    const possibleTableNames = [
      schema.name.toLowerCase().replace(/schema|database|raw|admin|transform/gi, ''),
      schema.name.toLowerCase().replace(/schema|database|raw/gi, '').replace(/admin/, ''),
      'products', 'categories', 'orders', 'users', 'inventory_items', 'stock_movements',
      'marketing_campaigns', 'product_bundles', 'product_content'
    ];
    
    let matchedTable = null;
    for (const tableName of possibleTableNames) {
      if (dbTables[tableName]) {
        matchedTable = tableName;
        break;
      }
    }
    
    if (matchedTable && schema.fields && Object.keys(schema.fields).length > 0) {
      const tableFields = dbTables[matchedTable];
      
      // Check for mismatches
      for (const [fieldName, schemaField] of Object.entries(schema.fields)) {
        const snakeCase = fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const tableField = tableFields[fieldName] || tableFields[snakeCase];
        
        if (tableField) {
          // Check nullability mismatch
          if (tableField.isNullable && !schemaField.isNullable && !schemaField.isOptional) {
            issues.push({
              file: schema.file,
              schema: schema.name,
              field: fieldName,
              issue: `Field is nullable in DB but required in schema`,
              dbType: tableField.type,
              schemaType: schemaField.type
            });
          }
        } else if (!fieldName.includes('_') && !['id', 'createdAt', 'updatedAt'].includes(fieldName)) {
          // Field exists in schema but not in table (might be computed/view field)
          warnings.push({
            file: schema.file,
            schema: schema.name,
            field: fieldName,
            warning: `Field not found in table '${matchedTable}' - might be from a view or computed`
          });
        }
      }
      
      // Check for required DB fields missing in schema
      for (const [dbFieldName, dbField] of Object.entries(tableFields)) {
        const camelCase = dbFieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const schemaField = schema.fields[dbFieldName] || schema.fields[camelCase];
        
        if (!schemaField && !dbField.isNullable && !dbFieldName.includes('created_at') && !dbFieldName.includes('updated_at')) {
          issues.push({
            file: schema.file,
            schema: schema.name,
            field: dbFieldName,
            issue: `Required DB field missing in schema`,
            dbType: dbField.type,
            schemaType: 'missing'
          });
        }
      }
    }
  }
}

// Report findings
if (issues.length > 0) {
  console.log('\n❌ CRITICAL ISSUES FOUND:\n');
  for (const issue of issues) {
    console.log(`📁 ${issue.file}`);
    console.log(`   Schema: ${issue.schema}`);
    console.log(`   Field: ${issue.field}`);
    console.log(`   Issue: ${issue.issue}`);
    console.log(`   DB Type: ${issue.dbType}`);
    console.log(`   Schema Type: ${issue.schemaType}`);
    console.log();
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:\n');
  const uniqueWarnings = new Map();
  for (const warning of warnings) {
    const key = `${warning.schema}-${warning.field}`;
    if (!uniqueWarnings.has(key)) {
      uniqueWarnings.set(key, warning);
    }
  }
  
  for (const warning of uniqueWarnings.values()) {
    console.log(`📁 ${warning.file}`);
    console.log(`   Schema: ${warning.schema}`);
    console.log(`   Field: ${warning.field}`);
    console.log(`   Warning: ${warning.warning}`);
    console.log();
  }
}

if (issues.length === 0 && warnings.length === 0) {
  console.log('\n✅ All schemas appear to be aligned with database types!\n');
} else {
  console.log('\nSummary:');
  console.log(`  Critical Issues: ${issues.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log('\nRecommendations:');
  console.log('  1. Make nullable DB fields optional in Zod schemas');
  console.log('  2. Verify computed/view fields are handled correctly');
  console.log('  3. Consider using generated types directly for validation');
}