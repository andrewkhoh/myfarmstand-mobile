#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 MyFarmstand App Diagnostic Tool\n');

// Test configurations for each feature
const features = {
  'Core': {
    imports: [
      './src/config/queryClient',
      './src/navigation/AppNavigator',
    ]
  },
  'Auth': {
    imports: [
      './src/hooks/useAuth',
      './src/services/authService',
    ]
  },
  'Products': {
    imports: [
      './src/hooks/useProducts',
      './src/services/productService',
    ]
  },
  'Cart': {
    imports: [
      './src/hooks/useCart',
      './src/services/cartService',
    ]
  },
  'Inventory': {
    imports: [
      './src/screens/inventory/InventoryDashboardScreen',
      './src/hooks/inventory/useInventory',
      './src/services/inventory/inventoryService',
    ]
  },
  'Marketing': {
    imports: [
      './src/screens/marketing/MarketingDashboard',
      './src/hooks/marketing/useMarketing',
      './src/services/marketing/marketingService',
    ]
  },
  'Executive': {
    imports: [
      './src/screens/executive/ExecutiveDashboard',
      './src/services/executive/executiveService',
    ]
  },
  'Realtime': {
    imports: [
      './src/hooks/useRealtime',
      './src/services/realtimeService',
      './src/utils/channelManager',
    ]
  },
  'Kiosk': {
    imports: [
      './src/contexts/KioskContext',
      './src/screens/kiosk/KioskModeScreen',
    ]
  }
};

// Check if file exists
function checkFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
  
  for (const ext of extensions) {
    if (fs.existsSync(fullPath + ext)) {
      return { exists: true, path: fullPath + ext };
    }
  }
  return { exists: false, path: fullPath };
}

// Run TypeScript check on a file
function checkTypeScript(filePath) {
  try {
    execSync(`npx tsc --noEmit --skipLibCheck "${filePath}"`, { 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.stderr || error.stdout || error.message 
    };
  }
}

// Test each feature
console.log('📦 Checking Feature Modules:\n');

const results = {};

for (const [feature, config] of Object.entries(features)) {
  console.log(`\n🔧 ${feature}:`);
  results[feature] = { imports: {} };
  
  for (const importPath of config.imports) {
    const fileCheck = checkFile(importPath);
    
    if (fileCheck.exists) {
      const tsCheck = checkTypeScript(fileCheck.path);
      if (tsCheck.success) {
        console.log(`  ✅ ${importPath}`);
        results[feature].imports[importPath] = 'success';
      } else {
        console.log(`  ⚠️  ${importPath} - TypeScript errors`);
        results[feature].imports[importPath] = 'ts-error';
      }
    } else {
      console.log(`  ❌ ${importPath} - File not found`);
      results[feature].imports[importPath] = 'missing';
    }
  }
}

// Summary
console.log('\n\n📊 Summary:\n');

const summary = {
  working: [],
  partial: [],
  broken: []
};

for (const [feature, result] of Object.entries(results)) {
  const statuses = Object.values(result.imports);
  if (statuses.every(s => s === 'success')) {
    summary.working.push(feature);
  } else if (statuses.some(s => s === 'success')) {
    summary.partial.push(feature);
  } else {
    summary.broken.push(feature);
  }
}

console.log('✅ Working:', summary.working.join(', ') || 'None');
console.log('⚠️  Partial:', summary.partial.join(', ') || 'None');
console.log('❌ Broken:', summary.broken.join(', ') || 'None');

// Generate test App files
console.log('\n\n🧪 Generating Test Apps:\n');

// Create test directory
const testDir = path.join(__dirname, 'App.test');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Generate minimal app for each working feature
for (const feature of summary.working) {
  const testFile = `App.test.${feature.toLowerCase()}.tsx`;
  const content = `// Test app with only ${feature} feature
import React from 'react';
import { View, Text } from 'react-native';
${results[feature].imports ? Object.keys(results[feature].imports)
  .filter(imp => results[feature].imports[imp] === 'success')
  .map(imp => `// import from '${imp}';`)
  .join('\n') : ''}

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>${feature} Test App</Text>
    </View>
  );
}`;
  
  fs.writeFileSync(path.join(testDir, testFile), content);
  console.log(`  Created: ${testFile}`);
}

console.log('\n✨ Diagnostic complete!');
console.log('\nTo test a specific feature, copy the test app:');
console.log('  cp App.test/<feature>.tsx App.tsx');
console.log('  npm start');