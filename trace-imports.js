// Trace import issues
const fs = require('fs');
const path = require('path');

function checkImports(filePath) {
  console.log(`\nChecking: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ FILE DOES NOT EXIST`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip package imports
    if (!importPath.startsWith('.')) {
      continue;
    }
    
    console.log(`  Import: ${importPath}`);
    
    // Resolve the import path
    const dir = path.dirname(filePath);
    const possiblePaths = [
      path.resolve(dir, importPath + '.ts'),
      path.resolve(dir, importPath + '.tsx'),
      path.resolve(dir, importPath + '/index.ts'),
      path.resolve(dir, importPath + '/index.tsx'),
    ];
    
    let found = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`    ✅ Found at: ${p}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log(`    ❌ NOT FOUND - Would resolve to: ${possiblePaths[0]}`);
    }
  }
}

// Check the chain
console.log('=== Import Chain Analysis ===');
checkImports('/Users/andrewkhoh/Documents/myfarmstand-mobile/src/hooks/executive/useBusinessMetrics.ts');
checkImports('/Users/andrewkhoh/Documents/myfarmstand-mobile/src/hooks/role-based/useUserRole.ts');
checkImports('/Users/andrewkhoh/Documents/myfarmstand-mobile/src/services/realtimeService.ts');