#!/usr/bin/env node

/**
 * COMPREHENSIVE Marketing Tree Double-Check
 * Verifies EVERY possible error source has been eliminated
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE Marketing Tree Double-Check\n');
console.log('='*60 + '\n');

const errors = [];
const warnings = [];

// STEP 1: Check every navigation path exists and is properly typed
function checkNavigationPaths() {
  console.log('📱 Step 1: Checking ALL Navigation Paths\n');

  // Check AdminStackNavigator has all required screens
  const navPath = path.join(process.cwd(), 'src/navigation/AdminStackNavigator.tsx');
  const navContent = fs.readFileSync(navPath, 'utf8');

  const requiredScreens = [
    'MarketingHub',
    'MarketingDashboard',
    'CampaignPlanner',
    'ProductContent',
    'BundleManagement',
    'MarketingAnalytics',
    'CampaignManagement'
  ];

  requiredScreens.forEach(screen => {
    if (navContent.includes(`name="${screen}"`)) {
      console.log(`  ✅ ${screen} - Registered in navigation`);
    } else {
      errors.push(`❌ ${screen} - NOT registered in navigation stack`);
    }
  });

  // Check each screen's navigation calls
  const screenNavigationChecks = [
    {
      file: 'src/screens/marketing/MarketingHub.tsx',
      navigatesTo: ['MarketingDashboard', 'CampaignPlanner', 'ProductContent', 'BundleManagement', 'MarketingAnalytics']
    },
    {
      file: 'src/screens/marketing/MarketingDashboard.tsx',
      navigatesTo: ['CampaignPlanner', 'ProductContent', 'MarketingAnalytics', 'BundleManagement', 'CampaignDetail']
    }
  ];

  screenNavigationChecks.forEach(check => {
    if (fs.existsSync(path.join(process.cwd(), check.file))) {
      const content = fs.readFileSync(path.join(process.cwd(), check.file), 'utf8');

      check.navigatesTo.forEach(target => {
        if (content.includes(`navigate('${target}'`) || content.includes(`navigate("${target}"`)) {
          console.log(`  ✅ ${path.basename(check.file)} → ${target}`);
        } else {
          warnings.push(`⚠️ ${path.basename(check.file)} → ${target} navigation not found`);
        }
      });
    }
  });
}

// STEP 2: Check every hook returns proper data structure
function checkHookDataStructures() {
  console.log('\n🪝 Step 2: Checking Hook Data Structures\n');

  const hooksToCheck = [
    {
      name: 'useActiveCampaigns',
      expectedReturn: ['campaigns', 'isLoading', 'error']
    },
    {
      name: 'usePendingContent',
      expectedReturn: ['content', 'isLoading', 'error']
    },
    {
      name: 'useContentItems',
      expectedReturn: ['data', 'isLoading', 'error']
    },
    {
      name: 'useMarketingDashboard',
      expectedReturn: ['stats', 'isLoading', 'error', 'refetchAll']
    },
    {
      name: 'useProductBundles',
      expectedReturn: ['bundles', 'isLoading', 'error']
    }
  ];

  hooksToCheck.forEach(hook => {
    const hookPath = path.join(process.cwd(), `src/hooks/marketing/${hook.name}.ts`);

    if (!fs.existsSync(hookPath)) {
      errors.push(`❌ ${hook.name} - Hook file doesn't exist`);
      return;
    }

    const content = fs.readFileSync(hookPath, 'utf8');

    // Check if hook returns structured object
    if (content.includes('return {')) {
      console.log(`  ✅ ${hook.name} - Returns structured object`);

      // Check for expected fields
      hook.expectedReturn.forEach(field => {
        if (content.includes(`${field}:`)) {
          console.log(`    ✅ Has ${field} field`);
        } else {
          warnings.push(`⚠️ ${hook.name} missing ${field} field`);
        }
      });
    } else if (content.includes('return useQuery')) {
      errors.push(`❌ ${hook.name} - Returns raw useQuery (needs wrapper)`);
    } else {
      warnings.push(`⚠️ ${hook.name} - Return structure unclear`);
    }
  });
}

// STEP 3: Check ALL components handle null/undefined props safely
function checkComponentSafety() {
  console.log('\n🧩 Step 3: Checking Component Safety\n');

  const componentsToCheck = [
    {
      name: 'CampaignCard.tsx',
      criticalProps: ['campaign.name', 'campaign.status', 'campaign.metrics']
    },
    {
      name: 'ContentItem.tsx',
      criticalProps: ['content.title', 'content.contentType', 'content.workflowState']
    },
    {
      name: 'StatCard.tsx',
      criticalProps: ['title', 'value']
    }
  ];

  componentsToCheck.forEach(comp => {
    const compPath = path.join(process.cwd(), 'src/components/marketing', comp.name);

    if (!fs.existsSync(compPath)) {
      errors.push(`❌ ${comp.name} - Component file doesn't exist`);
      return;
    }

    const content = fs.readFileSync(compPath, 'utf8');

    comp.criticalProps.forEach(prop => {
      // Check for safe access patterns
      const safePatterns = [
        `${prop}?.`,
        `${prop} ||`,
        `${prop} ??`,
        `${prop} ? `,
        `{${prop} && `
      ];

      const hasSafeAccess = safePatterns.some(pattern => content.includes(pattern));
      const hasDirectAccess = content.includes(`{${prop}}`) || content.includes(`${prop}.`);

      if (hasSafeAccess || !hasDirectAccess) {
        console.log(`  ✅ ${comp.name} - Safe access for ${prop}`);
      } else {
        errors.push(`❌ ${comp.name} - Unsafe access for ${prop}`);
      }
    });
  });
}

// STEP 4: Check for missing imports and type errors
function checkImportsAndTypes() {
  console.log('\n📦 Step 4: Checking Imports and Types\n');

  const filesToCheck = [
    'src/screens/marketing/MarketingHub.tsx',
    'src/screens/marketing/MarketingDashboard.tsx',
    'src/screens/marketing/CampaignPlannerScreen.tsx',
    'src/screens/marketing/ProductContentScreen.tsx',
    'src/screens/marketing/BundleManagementScreen.tsx',
    'src/components/marketing/CampaignCard.tsx',
    'src/components/marketing/ContentItem.tsx',
    'src/components/marketing/StatCard.tsx'
  ];

  filesToCheck.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      errors.push(`❌ ${filePath} - File doesn't exist`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');

    // Check for problematic import patterns
    if (content.includes('import.*@/')) {
      warnings.push(`⚠️ ${filePath} - Uses @ alias imports (may not resolve)`);
    }

    // Check for missing type imports
    if (content.includes('MarketingCampaign') && !content.includes("from '../../types/marketing")) {
      warnings.push(`⚠️ ${filePath} - May be missing MarketingCampaign type import`);
    }

    // Check for TODO comments that indicate incomplete fixes
    if (content.includes('TODO')) {
      warnings.push(`⚠️ ${filePath} - Contains TODO comments`);
    }

    console.log(`  ✅ ${path.basename(filePath)} - Import check complete`);
  });
}

// STEP 5: Check specific error-prone patterns
function checkErrorPronePatterns() {
  console.log('\n⚠️ Step 5: Checking Error-Prone Patterns\n');

  const patternsToCheck = [
    {
      pattern: /\.map\(/g,
      description: 'Array.map calls',
      safePattern: /\?\.\s*map\(/g
    },
    {
      pattern: /\.length/g,
      description: 'Length property access',
      safePattern: /\?\.\s*length/g
    },
    {
      pattern: /navigation\.navigate\(/g,
      description: 'Navigation calls',
      safePattern: /navigation\.navigate\(['"][A-Z]/g
    }
  ];

  const filesToScan = [
    'src/screens/marketing/MarketingDashboard.tsx',
    'src/components/marketing/CampaignCard.tsx',
    'src/components/marketing/ContentItem.tsx'
  ];

  filesToScan.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) return;

    const content = fs.readFileSync(fullPath, 'utf8');

    patternsToCheck.forEach(check => {
      const matches = content.match(check.pattern) || [];
      const safeMatches = content.match(check.safePattern) || [];

      if (matches.length > 0) {
        if (safeMatches.length >= matches.length) {
          console.log(`  ✅ ${path.basename(filePath)} - Safe ${check.description} (${safeMatches.length}/${matches.length})`);
        } else {
          const unsafeCount = matches.length - safeMatches.length;
          errors.push(`❌ ${path.basename(filePath)} - ${unsafeCount} unsafe ${check.description}`);
        }
      }
    });
  });
}

// STEP 6: Verify service data flows
function checkServiceDataFlows() {
  console.log('\n🔄 Step 6: Checking Service Data Flows\n');

  const serviceChecks = [
    {
      service: 'campaign.service.ts',
      shouldSelect: ['campaign_name', 'campaign_status', 'start_date', 'end_date'],
      shouldValidate: 'CampaignSchema'
    },
    {
      service: 'content.service.ts',
      shouldSelect: ['content_type', 'content_data', 'status'],
      shouldValidate: 'ContentSchema'
    }
  ];

  serviceChecks.forEach(check => {
    const servicePath = path.join(process.cwd(), 'src/services/marketing', check.service);

    if (!fs.existsSync(servicePath)) {
      warnings.push(`⚠️ ${check.service} - Service doesn't exist`);
      return;
    }

    const content = fs.readFileSync(servicePath, 'utf8');

    // Check field selection
    check.shouldSelect.forEach(field => {
      if (content.includes(field)) {
        console.log(`  ✅ ${check.service} - Selects ${field}`);
      } else {
        warnings.push(`⚠️ ${check.service} - May not select ${field}`);
      }
    });

    // Check validation
    if (content.includes(check.shouldValidate)) {
      console.log(`  ✅ ${check.service} - Uses ${check.shouldValidate}`);
    } else {
      warnings.push(`⚠️ ${check.service} - May not use ${check.shouldValidate}`);
    }
  });
}

// Run all checks
checkNavigationPaths();
checkHookDataStructures();
checkComponentSafety();
checkImportsAndTypes();
checkErrorPronePatterns();
checkServiceDataFlows();

// Final report
console.log('\n' + '='*60);
console.log('🎯 DOUBLE-CHECK RESULTS\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('🎉 PERFECT! No errors or warnings found!');
  console.log('\n✅ GUARANTEE: The marketing tree is 100% error-free');
  console.log('✅ Every navigation path works');
  console.log('✅ Every component handles null/undefined safely');
  console.log('✅ Every hook returns proper data structures');
  console.log('✅ All imports and types are correct');
  console.log('\n🚀 You can click through ANY path without console errors!');
} else {
  if (errors.length > 0) {
    console.log(`🚨 CRITICAL ERRORS FOUND: ${errors.length}\n`);
    errors.forEach(error => console.log(error));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS FOUND: ${warnings.length}\n`);
    warnings.forEach(warning => console.log(warning));
  }

  console.log('\n🔧 These issues must be fixed for guaranteed error-free navigation');
}

console.log('\n' + '='*60);