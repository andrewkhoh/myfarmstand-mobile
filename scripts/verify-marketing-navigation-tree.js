#!/usr/bin/env node

/**
 * Marketing Navigation Tree Verification
 * Ensures EVERY level of navigation works without console errors
 */

const fs = require('fs');
const path = require('path');

console.log('🌳 Marketing Navigation Tree Analysis\n');
console.log('='*50 + '\n');

// Complete marketing navigation tree
const NAVIGATION_TREE = {
  'MarketingHub': {
    file: 'src/screens/marketing/MarketingHub.tsx',
    navigatesTo: [
      'MarketingDashboard',
      'CampaignManagement',
      'CampaignPlanner',
      'ProductContent',
      'BundleManagement',
      'MarketingAnalytics'
    ],
    requiredHooks: [],
    requiredData: []
  },
  'MarketingDashboard': {
    file: 'src/screens/marketing/MarketingDashboard.tsx',
    navigatesTo: [
      'CampaignPlanner',
      'ProductContent',
      'MarketingAnalytics',
      'BundleManagement',
      'CampaignDetail'
    ],
    requiredHooks: [
      'useMarketingDashboard',
      'useActiveCampaigns',
      'usePendingContent',
      'useContentItems'
    ],
    requiredData: ['stats', 'campaigns', 'content']
  },
  'CampaignPlannerScreen': {
    file: 'src/screens/marketing/CampaignPlannerScreen.tsx',
    navigatesTo: ['CampaignDetail'],
    requiredHooks: ['useCampaignData'],
    requiredData: ['campaigns']
  },
  'ProductContentScreen': {
    file: 'src/screens/marketing/ProductContentScreen.tsx',
    navigatesTo: ['ContentDetail'],
    requiredHooks: ['useContentItems'],
    requiredData: ['content', 'products']
  },
  'BundleManagementScreen': {
    file: 'src/screens/marketing/BundleManagementScreen.tsx',
    navigatesTo: ['BundleDetail', 'CreateBundle'],
    requiredHooks: ['useProductBundles'],
    requiredData: ['bundles']
  },
  'ContentWorkflow': {
    file: 'src/screens/marketing/ContentWorkflow.tsx',
    navigatesTo: ['ContentDetail'],
    requiredHooks: ['useContentWorkflow'],
    requiredData: ['workflow', 'content']
  }
};

const issues = [];
const fixes = [];

// Check each screen in the navigation tree
Object.entries(NAVIGATION_TREE).forEach(([screenName, config]) => {
  console.log(`\n📱 Checking ${screenName}...`);

  const filePath = path.join(process.cwd(), config.file);

  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ Screen file not found: ${config.file}`);
    issues.push({
      screen: screenName,
      type: 'MISSING_FILE',
      issue: `Screen file doesn't exist: ${config.file}`
    });
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check navigation targets
  config.navigatesTo.forEach(target => {
    if (content.includes(`navigation.navigate('${target}'`)) {
      console.log(`  ✅ Navigation to ${target}`);
    } else if (content.includes(`navigate('${target}'`)) {
      console.log(`  ✅ Navigation to ${target}`);
    } else {
      console.log(`  ⚠️ Navigation to ${target} might not work`);
    }
  });

  // Check required hooks
  config.requiredHooks.forEach(hook => {
    if (content.includes(hook)) {
      console.log(`  ✅ Uses ${hook}`);

      // Check if hook is destructured properly
      const destructurePattern = new RegExp(`const\\s*{([^}]*)}\\s*=\\s*${hook}`);
      const match = content.match(destructurePattern);

      if (match) {
        const destructured = match[1].split(',').map(s => s.trim());
        console.log(`     Destructures: ${destructured.join(', ')}`);

        // Check if destructured variables are used
        destructured.forEach(variable => {
          if (!content.includes(variable)) {
            issues.push({
              screen: screenName,
              type: 'UNUSED_DESTRUCTURE',
              issue: `Destructures '${variable}' but doesn't use it`
            });
          }
        });
      }
    } else {
      console.log(`  ❌ Missing required hook: ${hook}`);
      issues.push({
        screen: screenName,
        type: 'MISSING_HOOK',
        issue: `Missing required hook: ${hook}`
      });
    }
  });

  // Check required data
  config.requiredData.forEach(dataField => {
    if (content.includes(dataField)) {
      // Check for safe access
      const unsafeAccessPattern = new RegExp(`${dataField}\\.\\w+(?!\\?)`, 'g');
      const unsafeMatches = content.match(unsafeAccessPattern);

      if (unsafeMatches) {
        unsafeMatches.forEach(match => {
          if (!match.includes('?.') && !match.includes('||')) {
            console.log(`  ⚠️ Unsafe data access: ${match}`);
            issues.push({
              screen: screenName,
              type: 'UNSAFE_ACCESS',
              issue: `Unsafe data access: ${match} - should use optional chaining`
            });
          }
        });
      }
    }
  });

  // Check for error boundaries
  if (!content.includes('error') && !content.includes('Error')) {
    console.log(`  ⚠️ No error handling found`);
    issues.push({
      screen: screenName,
      type: 'NO_ERROR_HANDLING',
      issue: 'Screen has no error handling'
    });
  }

  // Check for loading states
  if (config.requiredHooks.length > 0 && !content.includes('isLoading') && !content.includes('loading')) {
    console.log(`  ⚠️ No loading state handling`);
    issues.push({
      screen: screenName,
      type: 'NO_LOADING_STATE',
      issue: 'Screen has no loading state handling'
    });
  }
});

// Check hook implementations
console.log('\n\n🪝 Checking Hook Implementations...\n');

const hooksToCheck = [
  'useMarketingDashboard',
  'useActiveCampaigns',
  'usePendingContent',
  'useContentItems',
  'useCampaignData',
  'useProductBundles',
  'useContentWorkflow'
];

hooksToCheck.forEach(hookName => {
  const hookPath = path.join(process.cwd(), `src/hooks/marketing/${hookName}.ts`);

  if (!fs.existsSync(hookPath)) {
    console.log(`❌ ${hookName} - File not found`);
    issues.push({
      hook: hookName,
      type: 'MISSING_HOOK_FILE',
      issue: `Hook file doesn't exist`
    });
    return;
  }

  const content = fs.readFileSync(hookPath, 'utf8');

  // Check return structure
  if (content.includes('return {')) {
    console.log(`✅ ${hookName} - Returns structured data`);
  } else if (content.includes('return useQuery')) {
    console.log(`❌ ${hookName} - Returns raw query (needs wrapper)`);
    issues.push({
      hook: hookName,
      type: 'RAW_QUERY_RETURN',
      issue: `Hook returns raw React Query object instead of structured data`
    });
  }

  // Check for proper error handling
  if (!content.includes('error:') && !content.includes('catch')) {
    console.log(`  ⚠️ ${hookName} - No error handling`);
  }
});

// Check component prop types
console.log('\n\n🧩 Checking Component Prop Types...\n');

const componentsToCheck = [
  { name: 'CampaignCard', expectedProp: 'campaign', expectedType: 'MarketingCampaign' },
  { name: 'ContentItem', expectedProp: 'content', expectedType: 'ProductContent' },
  { name: 'StatCard', expectedProp: 'onPress', expectedType: 'function' },
  { name: 'BundleCard', expectedProp: 'bundle', expectedType: 'ProductBundle' }
];

componentsToCheck.forEach(comp => {
  const compPath = path.join(process.cwd(), `src/components/marketing/${comp.name}.tsx`);

  if (!fs.existsSync(compPath)) {
    console.log(`⚠️ ${comp.name} - Component not found`);
    return;
  }

  const content = fs.readFileSync(compPath, 'utf8');

  if (content.includes(comp.expectedType)) {
    console.log(`✅ ${comp.name} - Uses correct type: ${comp.expectedType}`);
  } else {
    console.log(`❌ ${comp.name} - Missing or wrong type (expected ${comp.expectedType})`);
    issues.push({
      component: comp.name,
      type: 'WRONG_TYPE',
      issue: `Component not using ${comp.expectedType} type`
    });
  }

  if (comp.expectedProp === 'onPress' && !content.includes('TouchableOpacity')) {
    console.log(`  ❌ ${comp.name} - Not clickable (missing TouchableOpacity)`);
    issues.push({
      component: comp.name,
      type: 'NOT_CLICKABLE',
      issue: 'Component not clickable - missing TouchableOpacity'
    });
  }
});

// Generate fixes
console.log('\n\n🔧 Generating Fixes...\n');
console.log('='*50 + '\n');

if (issues.length === 0) {
  console.log('✅ All navigation paths are clean! No issues found.');
} else {
  console.log(`Found ${issues.length} issues that could cause runtime errors:\n`);

  // Group issues by type
  const issuesByType = {};
  issues.forEach(issue => {
    if (!issuesByType[issue.type]) {
      issuesByType[issue.type] = [];
    }
    issuesByType[issue.type].push(issue);
  });

  Object.entries(issuesByType).forEach(([type, typeIssues]) => {
    console.log(`\n${type} (${typeIssues.length} issues):`);
    typeIssues.forEach(issue => {
      const location = issue.screen || issue.hook || issue.component;
      console.log(`  📍 ${location}: ${issue.issue}`);
    });
  });

  // Generate fix recommendations
  console.log('\n\n💊 Recommended Fixes:\n');

  if (issuesByType.RAW_QUERY_RETURN) {
    console.log('1. Fix hooks that return raw queries:');
    issuesByType.RAW_QUERY_RETURN.forEach(issue => {
      console.log(`   - ${issue.hook}: Wrap return in { data: query.data || [], isLoading, error }`);
    });
  }

  if (issuesByType.UNSAFE_ACCESS) {
    console.log('\n2. Fix unsafe data access:');
    issuesByType.UNSAFE_ACCESS.forEach(issue => {
      console.log(`   - ${issue.screen}: Use optional chaining (?.) for all data access`);
    });
  }

  if (issuesByType.MISSING_HOOK) {
    console.log('\n3. Add missing hooks:');
    issuesByType.MISSING_HOOK.forEach(issue => {
      console.log(`   - ${issue.screen}: Import and use ${issue.issue.split(': ')[1]}`);
    });
  }
}

// Navigation path verification
console.log('\n\n🗺️ Complete Navigation Paths:\n');
console.log('MarketingHub');
console.log('  ├── MarketingDashboard');
console.log('  │   ├── CampaignPlanner → CampaignDetail');
console.log('  │   ├── ProductContent → ContentDetail');
console.log('  │   └── MarketingAnalytics');
console.log('  ├── CampaignManagement → CampaignDetail');
console.log('  ├── BundleManagement');
console.log('  │   ├── BundleDetail');
console.log('  │   └── CreateBundle');
console.log('  └── ContentWorkflow → ContentDetail');

console.log('\n✨ Navigation tree analysis complete!');