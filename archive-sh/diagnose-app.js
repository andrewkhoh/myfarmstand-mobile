#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const issues = {
  missingFiles: [],
  brokenImports: [],
  circularDeps: [],
  missingExports: [],
  syntaxErrors: []
};

// Track all files and their imports
const fileGraph = new Map();
const checkedFiles = new Set();

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function extractImports(content, filePath) {
  const imports = [];
  
  // Match various import patterns
  const importRegex = /(?:import|export)\s+(?:[\s\S]*?)\s+from\s+['"](.+?)['"]/g;
  const requireRegex = /require\(['"](.+?)['"]\)/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Also check for dynamic imports
  const dynamicImportRegex = /import\(['"](.+?)['"]\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function resolveImportPath(importPath, fromFile) {
  const dir = path.dirname(fromFile);
  
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const resolved = path.resolve(dir, importPath);
    
    // Try various extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }
  
  // Handle absolute imports from src
  if (!importPath.startsWith('@') && !importPath.includes('node_modules')) {
    const srcPath = path.join(__dirname, 'src', importPath);
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    for (const ext of extensions) {
      const fullPath = srcPath + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  
  // Node modules - just check if exists
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    const nodeModulePath = path.join(__dirname, 'node_modules', importPath.split('/')[0]);
    if (fs.existsSync(nodeModulePath)) {
      return 'node_module';
    }
  }
  
  return null;
}

function checkFile(filePath, visitedInChain = new Set()) {
  if (checkedFiles.has(filePath)) {
    return;
  }
  
  // Check for circular dependency
  if (visitedInChain.has(filePath)) {
    issues.circularDeps.push(Array.from(visitedInChain).join(' -> ') + ' -> ' + filePath);
    return;
  }
  
  checkedFiles.add(filePath);
  visitedInChain.add(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = extractImports(content, filePath);
    
    fileGraph.set(filePath, imports);
    
    // Check each import
    for (const importPath of imports) {
      const resolved = resolveImportPath(importPath, filePath);
      
      if (!resolved) {
        issues.brokenImports.push({
          file: filePath.replace(__dirname + '/', ''),
          import: importPath
        });
      } else if (resolved !== 'node_module') {
        // Recursively check the imported file
        checkFile(resolved, new Set(visitedInChain));
      }
    }
    
    // Check for export issues in components and screens
    if (filePath.includes('/components/') || filePath.includes('/screens/')) {
      const hasDefaultExport = /export\s+default\s+/m.test(content);
      const hasNamedExport = /export\s+(?:const|function|class)\s+(\w+)/m.test(content);
      const hasExportBrace = /export\s+\{[^}]+\}/m.test(content);
      
      if (!hasDefaultExport && !hasNamedExport && !hasExportBrace && !filePath.includes('index')) {
        issues.missingExports.push(filePath.replace(__dirname + '/', ''));
      }
    }
    
    // Basic syntax check for JSX in .ts files
    if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
      if (/<[A-Z]\w+|<\//.test(content)) {
        issues.syntaxErrors.push({
          file: filePath.replace(__dirname + '/', ''),
          error: 'JSX found in .ts file (should be .tsx)'
        });
      }
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      issues.missingFiles.push(filePath.replace(__dirname + '/', ''));
    } else {
      issues.syntaxErrors.push({
        file: filePath.replace(__dirname + '/', ''),
        error: error.message
      });
    }
  }
  
  visitedInChain.delete(filePath);
}

function checkCriticalPaths() {
  log('\n🔍 Checking Critical Application Paths...', 'blue');
  
  const criticalFiles = [
    'App.tsx',
    'src/navigation/AppNavigator.tsx',
    'src/navigation/MainTabNavigator.tsx',
    'src/navigation/AdminStackNavigator.tsx',
    'src/screens/index.ts',
    'src/components/index.ts',
    'src/hooks/useAuth.ts',
    'src/hooks/useCart.ts',
    'src/services/supabase.ts'
  ];
  
  for (const file of criticalFiles) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) {
      log(`  ❌ Missing critical file: ${file}`, 'red');
      issues.missingFiles.push(file);
    } else {
      log(`  ✅ Found: ${file}`, 'green');
      checkFile(fullPath);
    }
  }
}

function checkScreenExports() {
  log('\n📱 Validating Screen Exports...', 'blue');
  
  const screensIndexPath = path.join(__dirname, 'src/screens/index.ts');
  if (!fs.existsSync(screensIndexPath)) {
    log('  ❌ screens/index.ts not found!', 'red');
    return;
  }
  
  const content = fs.readFileSync(screensIndexPath, 'utf8');
  const exportRegex = /export\s+\{([^}]+)\}\s+from\s+['"](.+?)['"]/g;
  const defaultExportRegex = /export\s+\{\s*default\s+as\s+(\w+)\s*\}\s+from\s+['"](.+?)['"]/g;
  
  let match;
  const exports = [];
  
  while ((match = exportRegex.exec(content)) !== null) {
    const [, names, path] = match;
    exports.push({ names: names.trim(), path });
  }
  
  while ((match = defaultExportRegex.exec(content)) !== null) {
    const [, name, path] = match;
    exports.push({ names: name, path });
  }
  
  for (const exp of exports) {
    const resolved = resolveImportPath(exp.path, screensIndexPath);
    if (!resolved) {
      log(`  ❌ Screen export broken: ${exp.names} from ${exp.path}`, 'red');
      issues.brokenImports.push({
        file: 'src/screens/index.ts',
        import: exp.path
      });
    }
  }
}

function checkNavigationScreens() {
  log('\n🗺️  Checking Navigation Screen References...', 'blue');
  
  const navFiles = [
    'src/navigation/AppNavigator.tsx',
    'src/navigation/MainTabNavigator.tsx',
    'src/navigation/AdminStackNavigator.tsx',
    'src/navigation/TestStackNavigator.tsx'
  ];
  
  for (const navFile of navFiles) {
    const fullPath = path.join(__dirname, navFile);
    if (!fs.existsSync(fullPath)) continue;
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Find component props in Stack.Screen or Tab.Screen
    const screenRegex = /component=\{(\w+)\}/g;
    let match;
    const referencedScreens = new Set();
    
    while ((match = screenRegex.exec(content)) !== null) {
      referencedScreens.add(match[1]);
    }
    
    // Check if these are imported
    for (const screen of referencedScreens) {
      const importRegex = new RegExp(`import.*\\b${screen}\\b.*from`, 'g');
      if (!importRegex.test(content)) {
        log(`  ⚠️  Screen '${screen}' used but not imported in ${navFile}`, 'yellow');
        issues.brokenImports.push({
          file: navFile,
          import: screen + ' (component not imported)'
        });
      }
    }
  }
}

function generateReport() {
  log('\n' + '='.repeat(60), 'blue');
  log('📊 DIAGNOSTIC REPORT', 'blue');
  log('='.repeat(60), 'blue');
  
  let hasIssues = false;
  
  if (issues.missingFiles.length > 0) {
    hasIssues = true;
    log('\n❌ Missing Files:', 'red');
    issues.missingFiles.forEach(file => {
      log(`  • ${file}`, 'red');
    });
  }
  
  if (issues.brokenImports.length > 0) {
    hasIssues = true;
    log('\n❌ Broken Imports:', 'red');
    issues.brokenImports.forEach(item => {
      log(`  • ${item.file}`, 'yellow');
      log(`    → Cannot resolve: ${item.import}`, 'red');
    });
  }
  
  if (issues.circularDeps.length > 0) {
    hasIssues = true;
    log('\n⚠️  Circular Dependencies:', 'yellow');
    issues.circularDeps.forEach(chain => {
      log(`  • ${chain}`, 'yellow');
    });
  }
  
  if (issues.missingExports.length > 0) {
    hasIssues = true;
    log('\n⚠️  Files Missing Exports:', 'yellow');
    issues.missingExports.forEach(file => {
      log(`  • ${file}`, 'yellow');
    });
  }
  
  if (issues.syntaxErrors.length > 0) {
    hasIssues = true;
    log('\n❌ Syntax Errors:', 'red');
    issues.syntaxErrors.forEach(item => {
      log(`  • ${item.file}: ${item.error}`, 'red');
    });
  }
  
  if (!hasIssues) {
    log('\n✅ No critical issues found!', 'green');
  } else {
    log('\n' + '='.repeat(60), 'red');
    log(`Found ${Object.values(issues).flat().length} total issues`, 'red');
    log('='.repeat(60), 'red');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'diagnostic-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'blue');
}

// Main execution
function main() {
  log('🚀 Starting App Diagnostics...', 'blue');
  log('='.repeat(60), 'blue');
  
  checkCriticalPaths();
  checkScreenExports();
  checkNavigationScreens();
  generateReport();
}

main();