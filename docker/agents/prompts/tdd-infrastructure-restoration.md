# TDD Phase 4 Test Infrastructure Restoration Prompt

## Mission: Complete Test Infrastructure Harmonization

You are tasked with restoring ALL TDD Phase 4 test suites that currently pass at ~100% in their isolated volumes but fail when migrated to the main repository due to test infrastructure mismatches. The problem is NOT with the code quality but with infrastructure differences.

## Critical Context

**The Reality:**
- 5 TDD Phase 4 volumes exist with ~100% pass rates in isolation
- Each volume contains 400-600 test files that work perfectly
- When migrated to main, tests fail due to infrastructure issues
- Previous attempt only migrated 2 of 1,282+ test files

**Root Causes of Failure:**
1. Mock path mismatches (volumes use src/test/mocks, configs expect src/__mocks__)
2. Missing specialized Jest configurations (28 configs per volume)
3. Incomplete test setup files (13-14 setup files per volume)
4. Module resolution differences
5. Dependency version mismatches

## Phase 0: Pre-Flight Infrastructure Audit

### MANDATORY FIRST STEP - Understand What You're Working With

```bash
echo "=== TDD PHASE 4 INFRASTRUCTURE AUDIT ==="
echo "This audit will identify ALL infrastructure that needs harmonization"
echo ""

# Audit each volume's infrastructure
for volume in tdd_phase_4-decision-support tdd_phase_4-cross-role-integration tdd_phase_4-executive-components tdd_phase_4-executive-hooks tdd_phase_4-executive-screens; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📁 Volume: $volume"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if [ -d "/reference/$volume" ]; then
    echo "✅ Volume exists"
    
    # Count test files
    echo -n "Test files: "
    find /reference/$volume -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l
    
    # Count Jest configs
    echo -n "Jest configs: "
    ls /reference/$volume/jest.config*.js 2>/dev/null | wc -l
    
    # List Jest configs
    echo "Jest config files:"
    ls /reference/$volume/jest.config*.js 2>/dev/null | xargs -I {} basename {}
    
    # Count test setup files
    echo -n "Test setup files: "
    ls /reference/$volume/src/test/*.ts 2>/dev/null | wc -l
    
    # Check for mocks
    echo -n "Mock directories: "
    find /reference/$volume/src -type d -name "*mock*" 2>/dev/null | wc -l
    
    # Check package.json
    if [ -f "/reference/$volume/package.json" ]; then
      echo "✅ package.json exists"
      echo -n "Test scripts: "
      grep -c '"test:' /reference/$volume/package.json
    fi
    
    # Run tests in volume to confirm they pass
    echo ""
    echo "Testing in volume (should pass ~100%):"
    cd /reference/$volume 2>/dev/null && npm test 2>&1 | grep -E "Test Suites:|Tests:" | head -2 && cd - > /dev/null
  else
    echo "❌ Volume not found - CRITICAL ERROR"
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TOTAL INFRASTRUCTURE TO MIGRATE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total test files across all volumes:"
find /reference/tdd_phase_4* -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l
echo "Total Jest configs:"
find /reference/tdd_phase_4* -name "jest.config*.js" 2>/dev/null | wc -l
echo "Total test setup files:"
find /reference/tdd_phase_4*/src/test -name "*.ts" 2>/dev/null | wc -l
```

## Phase 1: Create Complete Infrastructure Foundation

### Step 1.1: Create ALL Required Directories

```bash
echo "=== Creating Complete Directory Structure ==="

# Core test infrastructure
mkdir -p src/test/mocks
mkdir -p src/test/fixtures
mkdir -p src/test/utils
mkdir -p src/__mocks__  # For Jest compatibility

# Feature directories
mkdir -p src/hooks/executive/__tests__
mkdir -p src/screens/executive/__tests__
mkdir -p src/components/executive/__tests__
mkdir -p src/features/cross-role/__tests__
mkdir -p src/features/decision-support/__tests__
mkdir -p src/navigation/__tests__
mkdir -p src/services/executive/__tests__

echo "✅ Directory structure created"
```

### Step 1.2: Copy ALL Jest Configurations with Deduplication

```bash
echo "=== Migrating Jest Configurations ==="

# Create a map of unique Jest configs
declare -A jest_configs

# Collect all unique Jest configs
for volume in tdd_phase_4-decision-support tdd_phase_4-cross-role-integration tdd_phase_4-executive-components tdd_phase_4-executive-hooks tdd_phase_4-executive-screens; do
  if [ -d "/reference/$volume" ]; then
    for config in /reference/$volume/jest.config*.js; do
      if [ -f "$config" ]; then
        filename=$(basename "$config")
        # Use the first occurrence of each config name
        if [ -z "${jest_configs[$filename]}" ]; then
          jest_configs[$filename]="$config"
        fi
      fi
    done
  fi
done

# Copy unique configs
for filename in "${!jest_configs[@]}"; do
  echo "Copying $filename from ${jest_configs[$filename]}"
  cp "${jest_configs[$filename]}" "./$filename"
done

echo "✅ Copied ${#jest_configs[@]} unique Jest configurations"
```

### Step 1.3: Harmonize and Copy ALL Test Setup Files

```bash
echo "=== Migrating Test Setup Files ==="

# Copy all test setup files, handling duplicates
for volume in tdd_phase_4-decision-support tdd_phase_4-cross-role-integration tdd_phase_4-executive-components tdd_phase_4-executive-hooks tdd_phase_4-executive-screens; do
  if [ -d "/reference/$volume/src/test" ]; then
    echo "Processing $volume test setup files..."
    for setup in /reference/$volume/src/test/*.ts; do
      if [ -f "$setup" ]; then
        filename=$(basename "$setup")
        target="src/test/$filename"
        
        # If file exists, check if different
        if [ -f "$target" ]; then
          if ! diff -q "$setup" "$target" > /dev/null; then
            echo "  ⚠️  $filename differs - creating volume-specific version"
            volume_name=$(echo $volume | sed 's/tdd_phase_4-//')
            cp "$setup" "src/test/${volume_name}-${filename}"
          fi
        else
          echo "  ✅ Copying $filename"
          cp "$setup" "$target"
        fi
      fi
    done
  fi
done
```

### Step 1.4: Critical Mock Harmonization

```bash
echo "=== Harmonizing Mock Infrastructure ==="

# Copy all mocks from volumes
for volume in tdd_phase_4-decision-support tdd_phase_4-cross-role-integration tdd_phase_4-executive-components tdd_phase_4-executive-hooks tdd_phase_4-executive-screens; do
  # Find and copy mocks from various locations
  if [ -d "/reference/$volume/src/test/mocks" ]; then
    echo "Copying mocks from $volume/src/test/mocks..."
    cp -r /reference/$volume/src/test/mocks/* src/test/mocks/ 2>/dev/null || true
  fi
  
  if [ -d "/reference/$volume/src/__mocks__" ]; then
    echo "Copying mocks from $volume/src/__mocks__..."
    cp -r /reference/$volume/src/__mocks__/* src/__mocks__/ 2>/dev/null || true
  fi
done

# Create symbolic links for mock compatibility
echo "Creating mock compatibility links..."
# Link test/mocks to __mocks__ for Jest compatibility
if [ -d "src/test/mocks" ] && [ -d "src/__mocks__" ]; then
  for mock in src/test/mocks/*.ts; do
    if [ -f "$mock" ]; then
      filename=$(basename "$mock")
      if [ ! -f "src/__mocks__/$filename" ]; then
        ln -s "../test/mocks/$filename" "src/__mocks__/$filename"
        echo "  Linked $filename"
      fi
    fi
  done
fi
```

## Phase 2: Complete Source Code Migration

### Step 2.1: Copy ALL Source Files with Directory Structure

```bash
echo "=== Migrating ALL Source Files ==="

# Function to safely copy preserving structure
safe_copy_dir() {
  local source="$1"
  local dest="$2"
  
  if [ -d "$source" ]; then
    mkdir -p "$dest"
    # Use rsync for intelligent copying
    rsync -av --ignore-existing "$source/" "$dest/"
    echo "  ✅ Copied $(find "$source" -type f | wc -l) files to $dest"
  fi
}

# Executive Hooks
safe_copy_dir "/reference/tdd_phase_4-executive-hooks/src/hooks/executive" "src/hooks/executive"

# Executive Screens
safe_copy_dir "/reference/tdd_phase_4-executive-screens/src/screens/executive" "src/screens/executive"

# Executive Components
safe_copy_dir "/reference/tdd_phase_4-executive-components/src/components/executive" "src/components/executive"

# Cross-Role Integration
safe_copy_dir "/reference/tdd_phase_4-cross-role-integration/src/features/cross-role" "src/features/cross-role"
safe_copy_dir "/reference/tdd_phase_4-cross-role-integration/src/navigation" "src/navigation"

# Decision Support
safe_copy_dir "/reference/tdd_phase_4-decision-support/src/features/decision-support" "src/features/decision-support"

# Executive Services
for volume in tdd_phase_4-executive-hooks tdd_phase_4-executive-components tdd_phase_4-executive-screens; do
  safe_copy_dir "/reference/$volume/src/services/executive" "src/services/executive"
done

echo "✅ Source migration complete"
```

### Step 2.2: Copy Supporting Files (Types, Utils, etc.)

```bash
echo "=== Migrating Supporting Infrastructure ==="

# Types
for volume in tdd_phase_4-decision-support tdd_phase_4-cross-role-integration tdd_phase_4-executive-components tdd_phase_4-executive-hooks tdd_phase_4-executive-screens; do
  safe_copy_dir "/reference/$volume/src/types" "src/types"
done

# Utils
for volume in tdd_phase_4-decision-support tdd_phase_4-cross-role-integration tdd_phase_4-executive-components tdd_phase_4-executive-hooks tdd_phase_4-executive-screens; do
  safe_copy_dir "/reference/$volume/src/utils" "src/utils"
done

# Contexts
for volume in tdd_phase_4-decision-support tdd_phase_4-cross-role-integration tdd_phase_4-executive-components tdd_phase_4-executive-hooks tdd_phase_4-executive-screens; do
  safe_copy_dir "/reference/$volume/src/contexts" "src/contexts"
done
```

## Phase 3: Fix ALL Path and Module Resolution Issues

### Step 3.1: Update Jest Config Mock Paths

```bash
echo "=== Fixing Jest Config Mock Paths ==="

# Fix mock paths in all Jest configs
for config in jest.config*.js; do
  if [ -f "$config" ]; then
    echo "Fixing $config..."
    # Update mock paths to handle both locations
    sed -i '' \
      -e "s|'<rootDir>/src/__mocks__/supabase.ts'|'<rootDir>/src/test/mocks/supabase.simplified.mock.ts'|g" \
      -e "s|'<rootDir>/src/__mocks__/|'<rootDir>/src/test/mocks/|g" \
      "$config"
  fi
done
```

### Step 3.2: Fix Import Paths in ALL Files

```bash
echo "=== Fixing Import Paths ==="

# Fix all TypeScript/JavaScript imports
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -print0 | while IFS= read -r -d '' file; do
  # Count the directory depth to determine correct relative paths
  depth=$(echo "$file" | tr '/' '\n' | grep -c .)
  
  # Fix based on depth
  if [ $depth -eq 3 ]; then
    # src/category/file.ts
    sed -i '' \
      -e 's|from ["'\'']../test/|from "@/test/|g' \
      -e 's|from ["'\'']../utils/|from "@/utils/|g' \
      -e 's|from ["'\'']../services/|from "@/services/|g' \
      "$file"
  elif [ $depth -eq 4 ]; then
    # src/category/subcategory/file.ts
    sed -i '' \
      -e 's|from ["'\'']../../test/|from "@/test/|g' \
      -e 's|from ["'\'']../../utils/|from "@/utils/|g' \
      -e 's|from ["'\'']../../services/|from "@/services/|g' \
      "$file"
  elif [ $depth -eq 5 ]; then
    # src/category/subcategory/subsubcategory/file.ts
    sed -i '' \
      -e 's|from ["'\'']../../../test/|from "@/test/|g' \
      -e 's|from ["'\'']../../../utils/|from "@/utils/|g' \
      -e 's|from ["'\'']../../../services/|from "@/services/|g' \
      "$file"
  fi
done

echo "✅ Import paths fixed"
```

## Phase 4: Dependency and Package Configuration

### Step 4.1: Merge Package.json Test Scripts

```bash
echo "=== Updating Package.json ==="

# Backup current package.json
cp package.json package.json.backup

# Add all required test scripts
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Ensure scripts object exists
pkg.scripts = pkg.scripts || {};

// Add all test scripts from volumes
const testScripts = {
  'test:hooks:executive': 'jest --config jest.config.hooks.executive.js --verbose --forceExit',
  'test:screens:executive': 'jest --config jest.config.screens.executive.js --verbose --forceExit',
  'test:components:executive': 'jest --config jest.config.components.executive.js --verbose --forceExit',
  'test:cross-role': 'jest --config jest.config.cross-role.js --verbose --forceExit',
  'test:decision-support': 'jest --config jest.config.decision-support.js --verbose --forceExit',
  'test:integration:executive': 'jest --config jest.config.integration.executive.js --verbose --forceExit',
  'test:all:executive': 'npm run test:hooks:executive && npm run test:screens:executive && npm run test:components:executive',
  'test:all:phase4': 'npm run test:all:executive && npm run test:cross-role && npm run test:decision-support',
  'test:coverage:phase4': 'jest --coverage --coverageDirectory=coverage/phase4'
};

Object.assign(pkg.scripts, testScripts);

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Added ' + Object.keys(testScripts).length + ' test scripts');
"
```

### Step 4.2: Install Missing Dependencies

```bash
echo "=== Checking Dependencies ==="

# Check if all required dependencies are installed
required_deps=(
  "@tanstack/react-query"
  "@testing-library/react"
  "@testing-library/react-native"
  "@testing-library/jest-dom"
  "@types/jest"
  "jest-expo"
  "babel-jest"
)

for dep in "${required_deps[@]}"; do
  if ! grep -q "\"$dep\"" package.json; then
    echo "Installing missing dependency: $dep"
    npm install --save-dev "$dep"
  fi
done
```

## Phase 5: Verify Complete Migration

### Step 5.1: Count and Verify Files

```bash
echo "=== MIGRATION VERIFICATION ==="
echo ""
echo "📊 File Count Verification:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count test files
total_tests=$(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
echo "Test files migrated: $total_tests"
echo "Expected: 1,200+ test files"

if [ $total_tests -lt 1200 ]; then
  echo "❌ CRITICAL: Only $total_tests test files migrated. Migration incomplete!"
  echo "Investigating missing files..."
  
  # Show what's missing
  echo ""
  echo "Test file breakdown:"
  echo "  Executive hooks: $(find src/hooks/executive -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
  echo "  Executive screens: $(find src/screens/executive -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
  echo "  Executive components: $(find src/components/executive -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
  echo "  Cross-role: $(find src/features/cross-role src/navigation -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)"
  echo "  Decision support: $(find src/features/decision-support -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
else
  echo "✅ All test files migrated successfully"
fi

# Verify Jest configs
jest_count=$(ls jest.config*.js | wc -l)
echo ""
echo "Jest configurations: $jest_count"
echo "Expected: ~28 configs"

# Verify test setup files
setup_count=$(ls src/test/*.ts | wc -l)
echo "Test setup files: $setup_count"
echo "Expected: ~15 setup files"
```

### Step 5.2: Fix TypeScript Compilation

```bash
echo "=== TypeScript Compilation Check ==="

# Check for TypeScript errors
npx tsc --noEmit 2>&1 | tee typescript-errors.log

error_count=$(grep -c "error TS" typescript-errors.log || echo "0")
echo ""
echo "TypeScript errors: $error_count"

if [ $error_count -gt 0 ]; then
  echo "Fixing TypeScript errors..."
  
  # Common fixes
  # 1. Add missing type imports
  # 2. Fix any type mismatches
  # 3. Ensure all modules resolve correctly
  
  # Auto-fix what we can
  npx tsc --noEmit --listFiles 2>&1 | grep "error TS2307" | while read line; do
    # Fix missing module errors
    echo "Fixing: $line"
  done
fi
```

## Phase 6: Run and Fix ALL Test Suites

### Step 6.1: Progressive Test Execution

```bash
echo "=== RUNNING ALL TEST SUITES ==="
echo "This will identify which tests are failing and why"
echo ""

# Create results directory
mkdir -p test-results

# Run each test suite
test_suites=(
  "hooks:executive"
  "screens:executive"
  "components:executive"
  "cross-role"
  "decision-support"
)

total_passing=0
total_failing=0

for suite in "${test_suites[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Running test:$suite..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  npm run test:$suite 2>&1 | tee "test-results/$suite.log"
  
  # Extract results
  if grep -q "Test Suites:.*passed" "test-results/$suite.log"; then
    passing=$(grep "Test Suites:" "test-results/$suite.log" | grep -o "[0-9]* passed" | grep -o "[0-9]*")
    failing=$(grep "Test Suites:" "test-results/$suite.log" | grep -o "[0-9]* failed" | grep -o "[0-9]*" || echo "0")
    
    total_passing=$((total_passing + passing))
    total_failing=$((total_failing + failing))
    
    echo "Results: $passing passed, $failing failed"
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 OVERALL RESULTS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total test suites passing: $total_passing"
echo "Total test suites failing: $total_failing"
pass_rate=$((total_passing * 100 / (total_passing + total_failing)))
echo "Pass rate: $pass_rate%"
```

### Step 6.2: Fix Common Test Failures

```bash
echo "=== Fixing Common Test Failures ==="

# Analyze failure patterns
if [ $total_failing -gt 0 ]; then
  echo "Analyzing failure patterns..."
  
  # Common fixes based on error patterns
  grep -h "Error:" test-results/*.log | sort | uniq -c | sort -rn | head -20 > test-results/error-patterns.txt
  
  echo "Top error patterns:"
  cat test-results/error-patterns.txt
  
  # Apply fixes based on patterns
  if grep -q "Cannot find module.*supabase" test-results/error-patterns.txt; then
    echo "Fixing Supabase mock issues..."
    # Ensure supabase mock is available
    if [ -f "src/test/mocks/supabase.simplified.mock.ts" ]; then
      cp src/test/mocks/supabase.simplified.mock.ts src/__mocks__/supabase.ts
    fi
  fi
  
  if grep -q "React Query" test-results/error-patterns.txt; then
    echo "Fixing React Query setup..."
    # Ensure React Query is properly mocked
  fi
fi
```

## Phase 7: Achieve 100% Pass Rate

### Iterative Fix Loop

```bash
echo "=== ACHIEVING 100% PASS RATE ==="

max_iterations=10
iteration=0

while [ $iteration -lt $max_iterations ]; do
  iteration=$((iteration + 1))
  echo ""
  echo "Iteration $iteration of $max_iterations"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Run all tests
  npm run test:all:phase4 2>&1 | tee test-results/iteration-$iteration.log
  
  # Check if all passing
  if grep -q "failed, 0 total" test-results/iteration-$iteration.log; then
    echo "✅ ALL TESTS PASSING! 100% pass rate achieved!"
    break
  fi
  
  # Identify and fix failures
  echo "Tests still failing, applying fixes..."
  
  # Extract specific failures
  grep -A 5 "FAIL" test-results/iteration-$iteration.log > test-results/failures-$iteration.txt
  
  # Apply targeted fixes
  # ... specific fix logic based on failure types ...
  
  echo "Fixes applied, retrying..."
done

if [ $iteration -eq $max_iterations ]; then
  echo "❌ Maximum iterations reached. Manual intervention required."
  echo "See test-results/ directory for detailed failure logs."
fi
```

## Phase 8: Final Validation

```bash
echo "=== FINAL VALIDATION ==="
echo ""

# Complete system check
echo "1. TypeScript Compilation:"
npx tsc --noEmit && echo "   ✅ No errors" || echo "   ❌ Errors present"

echo ""
echo "2. Test File Count:"
test_count=$(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
echo "   Files: $test_count"
[ $test_count -ge 1200 ] && echo "   ✅ Complete" || echo "   ❌ Incomplete"

echo ""
echo "3. All Test Suites:"
npm run test:all:phase4 2>&1 | grep "Test Suites:"

echo ""
echo "4. Test Coverage:"
npm run test:coverage:phase4 2>&1 | grep -A 5 "Coverage summary"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESTORATION STATUS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final status
if [ $test_count -ge 1200 ] && npm run test:all:phase4 2>&1 | grep -q "failed, 0 total"; then
  echo "✅ RESTORATION COMPLETE!"
  echo "   - All 1,200+ test files migrated"
  echo "   - 100% test pass rate achieved"
  echo "   - TypeScript compilation clean"
  echo "   - Test infrastructure fully harmonized"
else
  echo "❌ RESTORATION INCOMPLETE"
  echo "   See test-results/ for details"
  echo "   Manual intervention may be required"
fi
```

## Critical Success Factors

1. **Complete Infrastructure Migration**: ALL 28 Jest configs, 15 setup files, and mock implementations
2. **Path Harmonization**: Fix ALL import paths and module resolutions
3. **Mock Compatibility**: Ensure mocks work in both src/test/mocks AND src/__mocks__
4. **Dependency Alignment**: All required packages installed with correct versions
5. **Iterative Fixing**: Don't stop until 100% pass rate achieved

## Common Pitfalls to Avoid

1. ❌ **Partial Migration**: Copying only a few files instead of entire directories
2. ❌ **Ignoring Infrastructure**: Focusing on source files without test setup
3. ❌ **Path Mismatches**: Not fixing import paths after migration
4. ❌ **Mock Incompatibility**: Not harmonizing mock locations
5. ❌ **Premature Success Claims**: Declaring victory with <100% pass rate

## Remember

The goal is NOT to write new tests or fix code logic. The code already works at ~100% in the volumes. The ONLY goal is to harmonize the test infrastructure so the SAME tests pass in the main repository.