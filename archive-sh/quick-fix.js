#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Quick Fix Script - Fixing critical issues...\n');

// 1. Create symlink for supabase.ts
const supabaseSource = path.join(__dirname, 'src/config/supabase.ts');
const supabaseTarget = path.join(__dirname, 'src/services/supabase.ts');

if (!fs.existsSync(supabaseTarget) && fs.existsSync(supabaseSource)) {
  fs.symlinkSync(supabaseSource, supabaseTarget);
  console.log('✅ Created symlink: src/services/supabase.ts -> src/config/supabase.ts');
}

// 2. Fix AdminStackNavigator imports
const adminNavPath = path.join(__dirname, 'src/navigation/AdminStackNavigator.tsx');
let adminNavContent = fs.readFileSync(adminNavPath, 'utf8');

// Check if imports are missing
if (!adminNavContent.includes("from '../screens'")) {
  // Find the line with imports and fix it
  const importLine = `import { 
  AdminScreen,
  AdminOrderScreen,
  ProductManagementScreen,
  ProductCreateEditScreen,
  // Hub screens
  ExecutiveHub,
  MarketingHub,
  InventoryHub,
  // Executive screens
  ExecutiveDashboard,
  CustomerAnalytics,
  InventoryOverview,
  PerformanceAnalytics,
  RevenueInsights,
  // Marketing screens
  MarketingDashboard,
  CampaignManagementScreen,
  CampaignPlannerScreen,
  ProductContentScreen,
  BundleManagementScreen,
  MarketingAnalyticsScreen,
  // Inventory screens
  InventoryDashboardScreen,
  InventoryAlertsScreen,
  BulkOperationsScreen,
  StockMovementHistoryScreen,
} from '../screens';`;

  // Replace the existing imports or add new ones
  adminNavContent = adminNavContent.replace(
    /import React from 'react';/,
    `import React from 'react';\n${importLine}`
  );
  
  fs.writeFileSync(adminNavPath, adminNavContent);
  console.log('✅ Fixed imports in AdminStackNavigator.tsx');
}

// 3. Fix TestStackNavigator imports
const testNavPath = path.join(__dirname, 'src/navigation/TestStackNavigator.tsx');
if (fs.existsSync(testNavPath)) {
  let testNavContent = fs.readFileSync(testNavPath, 'utf8');
  
  // Check if the main import block exists
  if (!testNavContent.includes("} from '../screens';")) {
    console.log('⚠️  TestStackNavigator needs import fixes - please check manually');
  }
}

// 4. Fix @ alias imports in executive screens
const executiveScreens = [
  'src/screens/executive/ExecutiveDashboard.tsx',
  'src/screens/executive/CustomerAnalytics.tsx',
  'src/screens/executive/InventoryOverview.tsx',
  'src/screens/executive/PerformanceAnalytics.tsx',
  'src/screens/executive/RevenueInsights.tsx'
];

executiveScreens.forEach(screenPath => {
  const fullPath = path.join(__dirname, screenPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace @/hooks with relative paths
    content = content.replace(/@\/hooks\/executive\//g, '../../hooks/executive/');
    content = content.replace(/@\/hooks\//g, '../../hooks/');
    content = content.replace(/@\/components\//g, '../../components/');
    content = content.replace(/@\/utils\//g, '../../utils/');
    content = content.replace(/@\/services\//g, '../../services/');
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed @ imports in ${path.basename(screenPath)}`);
  }
});

// 5. Fix @ alias imports in marketing screens
const marketingScreens = [
  'src/screens/marketing/MarketingDashboard.tsx',
  'src/screens/marketing/CampaignPlannerScreen.tsx',
  'src/screens/marketing/ProductContentScreen.tsx',
  'src/screens/marketing/BundleManagementScreen.tsx',
  'src/screens/marketing/MarketingAnalyticsScreen.tsx'
];

marketingScreens.forEach(screenPath => {
  const fullPath = path.join(__dirname, screenPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace @/ with relative paths
    content = content.replace(/@\/hooks\/marketing\//g, '../../hooks/marketing/');
    content = content.replace(/@\/hooks\//g, '../../hooks/');
    content = content.replace(/@\/components\/marketing\//g, '../../components/marketing/');
    content = content.replace(/@\/components\//g, '../../components/');
    content = content.replace(/@\/utils\//g, '../../utils/');
    content = content.replace(/@\/services\//g, '../../services/');
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed @ imports in ${path.basename(screenPath)}`);
  }
});

// 6. Fix @ alias imports in components
const componentFiles = [
  'src/components/executive/KPICard.tsx',
  'src/components/executive/KPISummary.tsx',
  'src/components/executive/KPIComparison.tsx',
  'src/components/executive/BarChart.tsx',
  'src/components/executive/PieChart.tsx',
  'src/components/executive/TrendChart.tsx'
];

componentFiles.forEach(compPath => {
  const fullPath = path.join(__dirname, compPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace @/utils with relative paths
    content = content.replace(/@\/utils\/formatters/g, '../../utils/formatters');
    content = content.replace(/@\/utils\//g, '../../utils/');
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed @ imports in ${path.basename(compPath)}`);
  }
});

// 7. Create missing formatters.ts if it doesn't exist
const formattersPath = path.join(__dirname, 'src/utils/formatters.ts');
if (!fs.existsSync(formattersPath)) {
  const formattersContent = `// Utility functions for formatting values in charts and components

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

export const formatPercent = (value: number): string => {
  return \`\${(value * 100).toFixed(1)}%\`;
};

export const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    return \`\${(value / 1000000).toFixed(1)}M\`;
  } else if (value >= 1000) {
    return \`\${(value / 1000).toFixed(1)}K\`;
  }
  return value.toString();
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};
`;
  fs.writeFileSync(formattersPath, formattersContent);
  console.log('✅ Created src/utils/formatters.ts');
}

console.log('\n✨ Quick fixes applied! Run "npm run typecheck" to verify.');
console.log('📝 Note: Some manual fixes may still be needed for TestStackNavigator.');