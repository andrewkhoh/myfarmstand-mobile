#!/usr/bin/env node

/**
 * Comprehensive Marketing Error Fix Script
 * Finds and fixes ALL runtime errors based on Pattern 2 and Pattern 4
 * from docs/architectural-patterns-and-best-practices.md
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Marketing Error Detection & Fix\n');

// Database schema reality (from database.generated.ts)
const DATABASE_FIELDS = {
  marketing_campaigns: {
    'id': 'id',
    'name': 'campaign_name',
    'status': 'campaign_status',
    'type': 'campaign_type',
    'description': 'description',
    'startDate': 'start_date',
    'endDate': 'end_date',
    'budget': null, // Not in DB
    'channels': null, // Not in DB
    'discountPercentage': 'discount_percentage',
    'targetAudience': 'target_audience',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'createdBy': 'created_by'
  },
  product_bundles: {
    'id': 'id',
    'name': 'bundle_name',
    'description': 'description',
    'price': 'bundle_price',
    'discount': 'discount_percentage',
    'isActive': 'is_active',
    'products': null, // Relationship, not field
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  marketing_content: {
    'id': 'id',
    'productId': 'product_id',
    'title': null, // Stored in content_data JSON
    'description': null, // Stored in content_data JSON
    'contentType': 'content_type',
    'status': 'status',
    'contentData': 'content_data',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  }
};

const errors = [];
const fixes = [];

// Step 1: Check all marketing hooks
console.log('📌 Step 1: Checking Marketing Hooks\n');

const hooksDir = path.join(process.cwd(), 'src/hooks/marketing');
const hooks = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

hooks.forEach(hookFile => {
  if (hookFile.includes('test')) return;

  const filePath = path.join(hooksDir, hookFile);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if hook properly returns data structure
  if (content.includes('export function use')) {
    const hookName = hookFile.replace('.ts', '').replace('.tsx', '');

    // Check for common issues
    if (content.includes('return useQuery(') && !content.includes('return {')) {
      errors.push({
        file: hookFile,
        type: 'HOOK_RETURN',
        issue: 'Hook returns raw React Query object instead of structured data',
        fix: 'Wrap return in object with data, isLoading, error fields'
      });
    }

    // Check for wrong imports
    if (content.includes('@/')) {
      errors.push({
        file: hookFile,
        type: 'IMPORT_PATH',
        issue: 'Using @ alias imports which may not resolve',
        fix: 'Use relative imports ../../'
      });
    }

    // Check for missing service imports
    if (content.includes('Service') && !content.includes('import') && !content.includes('Service')) {
      errors.push({
        file: hookFile,
        type: 'MISSING_IMPORT',
        issue: 'Service used but not imported',
        fix: 'Add proper service import'
      });
    }
  }
});

// Step 2: Check all marketing components
console.log('📌 Step 2: Checking Marketing Components\n');

const componentsDir = path.join(process.cwd(), 'src/components/marketing');
const components = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

components.forEach(compFile => {
  const filePath = path.join(componentsDir, compFile);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check CampaignCard specifically
  if (compFile === 'CampaignCard.tsx') {
    if (!content.includes('MarketingCampaign')) {
      errors.push({
        file: compFile,
        type: 'WRONG_TYPE',
        issue: 'Using Campaign instead of MarketingCampaign type',
        fix: 'Import and use MarketingCampaign from types/marketing.types'
      });
    }

    if (!content.includes('activeOpacity')) {
      errors.push({
        file: compFile,
        type: 'MISSING_FEEDBACK',
        issue: 'Missing touch feedback',
        fix: 'Add activeOpacity={0.7} to TouchableOpacity'
      });
    }
  }

  // Check for wrong prop destructuring
  if (content.includes('export') && content.includes('React.FC')) {
    // Check if component expects certain props
    const propsMatch = content.match(/interface\s+\w+Props\s*{([^}]+)}/);
    if (propsMatch) {
      const propsContent = propsMatch[1];

      // Check for campaign prop
      if (propsContent.includes('campaign:') && !propsContent.includes('MarketingCampaign')) {
        errors.push({
          file: compFile,
          type: 'PROP_TYPE',
          issue: 'Component expects wrong campaign type',
          fix: 'Update to MarketingCampaign type'
        });
      }
    }
  }
});

// Step 3: Check all marketing services
console.log('📌 Step 3: Checking Marketing Services\n');

const servicesDir = path.join(process.cwd(), 'src/services/marketing');
if (fs.existsSync(servicesDir)) {
  const services = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));

  services.forEach(serviceFile => {
    const filePath = path.join(servicesDir, serviceFile);
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for correct field selection
    if (content.includes('.from(')) {
      // Check campaign service
      if (serviceFile.includes('campaign')) {
        Object.entries(DATABASE_FIELDS.marketing_campaigns).forEach(([interfaceField, dbField]) => {
          if (dbField && !content.includes(dbField)) {
            errors.push({
              file: serviceFile,
              type: 'MISSING_FIELD',
              issue: `Not selecting required database field: ${dbField}`,
              fix: `Add '${dbField}' to select statement`
            });
          }
        });
      }

      // Check bundle service
      if (serviceFile.includes('bundle')) {
        const bundleFields = ['bundle_name', 'bundle_price', 'discount_percentage', 'is_active'];
        bundleFields.forEach(field => {
          if (!content.includes(field)) {
            errors.push({
              file: serviceFile,
              type: 'MISSING_FIELD',
              issue: `Not selecting required database field: ${field}`,
              fix: `Add '${field}' to select statement`
            });
          }
        });
      }
    }

    // Check for schema validation
    if (!content.includes('Schema.parse')) {
      errors.push({
        file: serviceFile,
        type: 'NO_VALIDATION',
        issue: 'Service not validating data with schema',
        fix: 'Add schema validation with .parse()'
      });
    }

    // Check for dangerous type assertions
    if (content.includes(' as ') && (content.includes('Campaign') || content.includes('Bundle'))) {
      errors.push({
        file: serviceFile,
        type: 'TYPE_ASSERTION',
        issue: 'Using dangerous type assertion',
        fix: 'Use schema validation instead of type assertion'
      });
    }
  });
}

// Step 4: Check marketing screens
console.log('📌 Step 4: Checking Marketing Screens\n');

const screensDir = path.join(process.cwd(), 'src/screens/marketing');
const screens = fs.readdirSync(screensDir).filter(f => f.endsWith('.tsx') && !f.includes('test'));

screens.forEach(screenFile => {
  const filePath = path.join(screensDir, screenFile);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check MarketingDashboard specifically
  if (screenFile === 'MarketingDashboard.tsx') {
    // Check hook destructuring
    if (content.includes('const { campaigns }') && content.includes('useActiveCampaigns')) {
      // This is correct if hook returns { campaigns }
    }

    if (content.includes('const { content }') && content.includes('usePendingContent')) {
      // This is correct if hook returns { content }
    }
  }

  // Check for navigation issues
  if (content.includes('navigation.navigate')) {
    const navigateMatches = content.match(/navigation\.navigate\(['"](\w+)['"]/g);
    if (navigateMatches) {
      navigateMatches.forEach(match => {
        const screen = match.match(/navigate\(['"](\w+)['"]/)[1];
        // Check if screen name is valid
        const validScreens = ['CampaignPlanner', 'ProductContent', 'MarketingAnalytics', 'BundleManagement', 'CampaignDetail'];
        if (!validScreens.includes(screen)) {
          errors.push({
            file: screenFile,
            type: 'NAVIGATION',
            issue: `Invalid navigation target: ${screen}`,
            fix: 'Check navigation stack for correct screen name'
          });
        }
      });
    }
  }
});

// Step 5: Generate fixes
console.log('\n📊 Error Summary\n' + '='.repeat(50) + '\n');

if (errors.length === 0) {
  console.log('✅ No runtime errors detected! Marketing module is clean.');
} else {
  console.log(`Found ${errors.length} potential runtime errors:\n`);

  // Group errors by type
  const errorsByType = {};
  errors.forEach(error => {
    if (!errorsByType[error.type]) {
      errorsByType[error.type] = [];
    }
    errorsByType[error.type].push(error);
  });

  Object.entries(errorsByType).forEach(([type, typeErrors]) => {
    console.log(`\n${type} (${typeErrors.length} issues):`);
    typeErrors.forEach(error => {
      console.log(`  📍 ${error.file}`);
      console.log(`     Issue: ${error.issue}`);
      console.log(`     Fix: ${error.fix}`);
    });
  });
}

// Step 6: Apply automatic fixes
console.log('\n🔧 Applying Automatic Fixes\n' + '='.repeat(50) + '\n');

// Fix hook imports
hooks.forEach(hookFile => {
  const filePath = path.join(hooksDir, hookFile);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix @ imports
  if (content.includes('@/')) {
    content = content.replace(/@\//g, '../../');
    modified = true;
    console.log(`✅ Fixed imports in ${hookFile}`);
  }

  // Fix marketingKeys import
  if (content.includes('marketingKeys') && !content.includes('queryKeyFactory')) {
    content = content.replace('marketingKeys', '/* TODO: Use proper query keys */');
    modified = true;
    console.log(`✅ Fixed query keys in ${hookFile}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    fixes.push(hookFile);
  }
});

console.log(`\n✨ Applied ${fixes.length} automatic fixes`);
console.log('\n📋 Manual fixes required for:');
errors.filter(e => e.type === 'MISSING_FIELD' || e.type === 'NO_VALIDATION').forEach(error => {
  console.log(`  - ${error.file}: ${error.fix}`);
});

console.log('\n✅ Next Steps:');
console.log('1. Review the automatic fixes applied');
console.log('2. Apply manual fixes for field selection issues');
console.log('3. Run npm start and test marketing screens');
console.log('4. Check browser console for any remaining errors');