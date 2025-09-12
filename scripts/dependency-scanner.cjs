#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Dependency Tree Scanner\n');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Track all imports and exports
const imports = new Map(); // file -> [imported files]
const exportMap = new Map(); // file -> [exported items]
const fileExists = new Map(); // cache file existence
const errors = [];
const orphans = [];

// Helper to check if file exists with various extensions
function findFile(filePath) {
  if (fileExists.has(filePath)) {
    return fileExists.get(filePath);
  }
  
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  
  for (const ext of extensions) {
    const fullPath = filePath + ext;
    if (fs.existsSync(fullPath)) {
      fileExists.set(filePath, fullPath);
      return fullPath;
    }
  }
  
  fileExists.set(filePath, null);
  return null;
}

// Parse imports from a file
function parseImports(filePath) {
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /(?:import|export)\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  const foundImports = [];
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip node_modules and external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('@/') && !importPath.startsWith('src/')) {
      continue;
    }
    
    // Resolve relative imports
    let resolvedPath;
    if (importPath.startsWith('@/')) {
      resolvedPath = path.join(__dirname, '..', 'src', importPath.slice(2));
    } else if (importPath.startsWith('src/')) {
      resolvedPath = path.join(__dirname, '..', importPath);
    } else {
      resolvedPath = path.resolve(path.dirname(filePath), importPath);
    }
    
    foundImports.push({
      raw: importPath,
      resolved: resolvedPath,
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return foundImports;
}

// Scan directory recursively
function scanDirectory(dir, baseDir = dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip certain directories
    if (stat.isDirectory()) {
      if (['node_modules', '.git', 'coverage', '__tests__', '.expo'].includes(file)) {
        continue;
      }
      scanDirectory(filePath, baseDir);
      continue;
    }
    
    // Only process TS/JS files
    if (!/\.(ts|tsx|js|jsx)$/.test(file) || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      continue;
    }
    
    const relativePath = path.relative(baseDir, filePath);
    const fileImports = parseImports(filePath);
    imports.set(relativePath, fileImports);
    
    // Check each import
    for (const imp of fileImports) {
      const exists = findFile(imp.resolved);
      if (!exists) {
        errors.push({
          file: relativePath,
          import: imp.raw,
          line: imp.line,
          resolved: imp.resolved
        });
      }
    }
  }
}

// Find orphaned files (not imported anywhere)
function findOrphans() {
  const importedFiles = new Set();
  
  // Collect all imported files
  for (const [file, fileImports] of imports) {
    for (const imp of fileImports) {
      const resolved = findFile(imp.resolved);
      if (resolved) {
        const relative = path.relative(path.join(__dirname, '..'), resolved);
        importedFiles.add(relative);
      }
    }
  }
  
  // Entry points (not orphans)
  const entryPoints = new Set([
    'App.tsx',
    'index.ts',
    'App.original.tsx',
    'App.minimal.tsx',
    'App.progressive.tsx',
    'App.test.tsx'
  ]);
  
  // Find files that are never imported
  for (const file of imports.keys()) {
    if (!importedFiles.has(file) && !entryPoints.has(file) && !file.includes('.test.')) {
      orphans.push(file);
    }
  }
}

// Main scan
console.log('📂 Scanning src directory...\n');
const srcDir = path.join(__dirname, '..', 'src');
scanDirectory(srcDir, path.join(__dirname, '..'));

// Scan App files
console.log('📂 Scanning App files...\n');
const appFiles = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.startsWith('App.') && f.endsWith('.tsx'));
for (const appFile of appFiles) {
  const filePath = path.join(__dirname, '..', appFile);
  const fileImports = parseImports(filePath);
  imports.set(appFile, fileImports);
  
  for (const imp of fileImports) {
    const exists = findFile(imp.resolved);
    if (!exists) {
      errors.push({
        file: appFile,
        import: imp.raw,
        line: imp.line,
        resolved: imp.resolved
      });
    }
  }
}

// Find orphans
findOrphans();

// Report results
console.log('\n' + '='.repeat(60));
console.log('📊 SCAN RESULTS');
console.log('='.repeat(60) + '\n');

// Broken imports
if (errors.length > 0) {
  console.log(`${colors.red}❌ BROKEN IMPORTS (${errors.length} total):${colors.reset}\n`);
  
  // Group by file
  const byFile = {};
  for (const error of errors) {
    if (!byFile[error.file]) {
      byFile[error.file] = [];
    }
    byFile[error.file].push(error);
  }
  
  for (const [file, fileErrors] of Object.entries(byFile)) {
    console.log(`  ${colors.yellow}${file}:${colors.reset}`);
    for (const err of fileErrors) {
      console.log(`    Line ${err.line}: ${colors.red}${err.import}${colors.reset}`);
      console.log(`      Expected: ${err.resolved.replace(__dirname + '/..', '.')}`);
    }
    console.log();
  }
} else {
  console.log(`${colors.green}✅ No broken imports found${colors.reset}\n`);
}

// Orphaned files
if (orphans.length > 0) {
  console.log(`${colors.yellow}⚠️  ORPHANED FILES (${orphans.length} total):${colors.reset}`);
  console.log('  These files are not imported anywhere:\n');
  
  // Group by directory
  const byDir = {};
  for (const file of orphans) {
    const dir = path.dirname(file);
    if (!byDir[dir]) {
      byDir[dir] = [];
    }
    byDir[dir].push(path.basename(file));
  }
  
  for (const [dir, files] of Object.entries(byDir)) {
    console.log(`  ${colors.blue}${dir}/${colors.reset}`);
    for (const file of files) {
      console.log(`    - ${file}`);
    }
  }
  console.log();
} else {
  console.log(`${colors.green}✅ No orphaned files found${colors.reset}\n`);
}

// Summary
console.log('='.repeat(60));
console.log('📈 SUMMARY:');
console.log(`  Total files scanned: ${imports.size}`);
console.log(`  Broken imports: ${colors.red}${errors.length}${colors.reset}`);
console.log(`  Orphaned files: ${colors.yellow}${orphans.length}${colors.reset}`);
console.log('='.repeat(60));

// Export results for further processing
const results = {
  errors,
  orphans,
  stats: {
    totalFiles: imports.size,
    brokenImports: errors.length,
    orphanedFiles: orphans.length
  }
};

fs.writeFileSync(
  path.join(__dirname, '..', 'dependency-scan-results.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n💾 Results saved to dependency-scan-results.json');

// Exit with error if there are broken imports
if (errors.length > 0) {
  process.exit(1);
}