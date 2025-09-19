#!/usr/bin/env node

/**
 * Marketing Schema Validation Script
 * Validates all marketing schemas against architectural patterns from docs/architectural-patterns-and-best-practices.md
 *
 * Pattern 2: Database-Interface Alignment
 * Pattern 4: Transformation Completeness
 */

const fs = require('fs');
const path = require('path');

const issues = [];

// Database schema from database.generated.ts
const databaseSchemas = {
  marketing_campaigns: {
    fields: [
      'id', 'campaign_name', 'campaign_status', 'campaign_type',
      'created_at', 'created_by', 'description', 'discount_percentage',
      'end_date', 'start_date', 'target_audience', 'updated_at'
    ]
  },
  product_bundles: {
    fields: [
      'id', 'bundle_name', 'description', 'discount_percentage',
      'is_active', 'min_quantity', 'max_quantity', 'created_at',
      'updated_at', 'valid_from', 'valid_until', 'bundle_type',
      'bundle_price', 'created_by', 'tags'
    ]
  },
  marketing_content: {
    fields: [
      'id', 'product_id', 'content_type', 'content_data',
      'status', 'created_at', 'updated_at', 'created_by',
      'approved_by', 'approved_at', 'published_at', 'tags',
      'metadata'
    ]
  }
};

// Expected interface fields from types/marketing.ts
const interfaceSchemas = {
  Campaign: {
    fields: ['id', 'name', 'status', 'startDate', 'endDate', 'budget', 'channels'],
    dbTable: 'marketing_campaigns'
  },
  Bundle: {
    fields: ['id', 'name', 'products', 'price', 'discount'],
    dbTable: 'product_bundles'
  },
  ProductContent: {
    fields: ['title', 'description', 'keywords', 'images'],
    dbTable: 'marketing_content'
  }
};

// Check Pattern 2: Database-Interface Alignment
console.log('🔍 Checking Pattern 2: Database-Interface Alignment\n');

Object.entries(interfaceSchemas).forEach(([interfaceName, interfaceInfo]) => {
  const dbTable = databaseSchemas[interfaceInfo.dbTable];

  if (!dbTable) {
    issues.push({
      type: 'CRITICAL',
      pattern: 'Pattern 2',
      message: `Interface ${interfaceName} references non-existent table ${interfaceInfo.dbTable}`
    });
    return;
  }

  console.log(`Checking ${interfaceName} against ${interfaceInfo.dbTable}:`);

  // Check field mappings
  interfaceInfo.fields.forEach(field => {
    // Map interface field names to database field names
    const fieldMappings = {
      'name': 'campaign_name',
      'status': 'campaign_status',
      'startDate': 'start_date',
      'endDate': 'end_date',
      'name': 'bundle_name',
      'price': 'bundle_price',
      'discount': 'discount_percentage'
    };

    const dbField = fieldMappings[field] || field;

    if (!dbTable.fields.includes(dbField)) {
      issues.push({
        type: 'ERROR',
        pattern: 'Pattern 2',
        location: `${interfaceName}.${field}`,
        message: `Interface field '${field}' has no corresponding database field (looked for '${dbField}' in ${interfaceInfo.dbTable})`
      });
      console.log(`  ❌ ${field} -> Missing database field ${dbField}`);
    } else {
      console.log(`  ✅ ${field} -> ${dbField}`);
    }
  });
  console.log('');
});

// Check Pattern 4: Transformation Completeness
console.log('🔍 Checking Pattern 4: Transformation Completeness\n');

const transformationFiles = [
  'src/services/marketing/campaign.service.ts',
  'src/services/marketing/bundle.service.ts',
  'src/services/marketing/content.service.ts'
];

transformationFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for transform schemas without return type annotations
    const transformRegex = /\.transform\s*\(\s*\([^)]*\)\s*(?::|=>)/g;
    const matches = content.match(transformRegex) || [];

    matches.forEach(match => {
      if (!match.includes(':')) {
        issues.push({
          type: 'WARNING',
          pattern: 'Pattern 4',
          location: file,
          message: 'Transform function missing return type annotation (should specify interface type)'
        });
      }
    });

    // Check for dangerous type assertions
    const assertionRegex = /as\s+(Campaign|Bundle|ProductContent|Product)\b/g;
    const assertionMatches = content.match(assertionRegex) || [];

    assertionMatches.forEach(match => {
      issues.push({
        type: 'ERROR',
        pattern: 'Pattern 4',
        location: file,
        message: `Dangerous type assertion found: '${match}' - bypasses TypeScript safety`
      });
    });
  }
});

// Check for service field selection issues
console.log('🔍 Checking Service Field Selection\n');

const serviceFiles = [
  'src/hooks/marketing/useMarketingCampaigns.ts',
  'src/hooks/marketing/useProductBundles.ts',
  'src/hooks/marketing/useContentItems.ts'
];

serviceFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for select statements
    const selectRegex = /\.select\s*\(['"](.*?)['"]\)/g;
    let match;

    while ((match = selectRegex.exec(content)) !== null) {
      const selectedFields = match[1].split(',').map(f => f.trim());

      // Check if using wrong field names
      if (match[1].includes('name') && !match[1].includes('campaign_name') && !match[1].includes('bundle_name')) {
        issues.push({
          type: 'ERROR',
          pattern: 'Pattern 2',
          location: file,
          message: `Service selecting 'name' instead of 'campaign_name' or 'bundle_name'`
        });
      }

      if (match[1].includes('status') && !match[1].includes('campaign_status')) {
        issues.push({
          type: 'ERROR',
          pattern: 'Pattern 2',
          location: file,
          message: `Service selecting 'status' instead of 'campaign_status'`
        });
      }
    }
  }
});

// Summary
console.log('\n📊 Validation Summary\n');
console.log('='*50);

if (issues.length === 0) {
  console.log('✅ All patterns validated successfully!');
} else {
  const critical = issues.filter(i => i.type === 'CRITICAL');
  const errors = issues.filter(i => i.type === 'ERROR');
  const warnings = issues.filter(i => i.type === 'WARNING');

  console.log(`Found ${issues.length} issues:`);
  console.log(`  🔴 Critical: ${critical.length}`);
  console.log(`  🟡 Errors: ${errors.length}`);
  console.log(`  🟠 Warnings: ${warnings.length}`);

  console.log('\nDetailed Issues:\n');

  issues.forEach((issue, i) => {
    const icon = issue.type === 'CRITICAL' ? '🔴' : issue.type === 'ERROR' ? '🟡' : '🟠';
    console.log(`${i + 1}. ${icon} [${issue.pattern}] ${issue.location || ''}`);
    console.log(`   ${issue.message}\n`);
  });

  // Generate fix recommendations
  console.log('\n🔧 Recommended Fixes:\n');
  console.log('1. Create transformation schemas that map database fields to interface fields');
  console.log('2. Add return type annotations to all transform functions');
  console.log('3. Update service select statements to use exact database field names');
  console.log('4. Remove dangerous type assertions and use proper validation');

  process.exit(1);
}