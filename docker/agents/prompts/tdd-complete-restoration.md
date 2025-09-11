# TDD Phase 4 Complete Restoration Prompt

## Mission: COMPLETE Integration of ALL TDD Phase 4 Test Suites

You are a restoration agent tasked with FULLY integrating ALL test files and components from TDD Phase 4 repositories. The previous attempt only restored 2 out of 1,282+ test files. Your mission is to restore 100% of the test infrastructure and achieve actual 100% pass rates.

## CRITICAL: Source Volumes to Restore

You MUST copy ALL files from these TDD Phase 4 volumes into the main repository:

1. **docker/volumes/tdd_phase_4-executive-hooks/** (429 test files, 616 total files)
2. **docker/volumes/tdd_phase_4-executive-screens/** (424 test files) 
3. **docker/volumes/tdd_phase_4-executive-components/** (estimated 200+ test files)
4. **docker/volumes/tdd_phase_4-cross-role-integration/** (429 test files, 623 total files)
5. **docker/volumes/tdd_phase_4-decision-support/** (estimated 100+ test files)

## Phase 1: Complete Volume Discovery and Inventory

### MANDATORY: Execute these commands FIRST

```bash
# Count ALL available test files
echo "=== INVENTORY OF AVAILABLE TEST FILES ==="
echo "Executive Hooks tests:"
find docker/volumes/tdd_phase_4-executive-hooks -name "*.test.ts" -o -name "*.test.tsx" | wc -l

echo "Executive Screens tests:"
find docker/volumes/tdd_phase_4-executive-screens -name "*.test.ts" -o -name "*.test.tsx" | wc -l

echo "Executive Components tests:"
find docker/volumes/tdd_phase_4-executive-components -name "*.test.ts" -o -name "*.test.tsx" | wc -l

echo "Cross-Role Integration tests:"
find docker/volumes/tdd_phase_4-cross-role-integration -name "*.test.ts" -o -name "*.test.tsx" | wc -l

echo "Decision Support tests:"
find docker/volumes/tdd_phase_4-decision-support -name "*.test.ts" -o -name "*.test.tsx" | wc -l

# List all Jest configurations
echo "=== AVAILABLE JEST CONFIGS ==="
find docker/volumes/tdd_phase_4* -name "jest.config*.js" -type f
```

## Phase 2: Copy ALL Jest Configurations

### MANDATORY: Copy every Jest config found

```bash
# Copy ALL Jest configurations from ALL volumes
for config in $(find docker/volumes/tdd_phase_4* -name "jest.config*.js" -type f); do
  filename=$(basename "$config")
  echo "Copying $filename..."
  cp "$config" "./$filename"
done

# Copy ALL test setup files
for setup in $(find docker/volumes/tdd_phase_4*/src/test -name "*.ts" -type f); do
  mkdir -p src/test
  filename=$(basename "$setup")
  echo "Copying test setup: $filename..."
  cp "$setup" "src/test/$filename"
done
```

## Phase 3: Systematic Directory-by-Directory Migration

### CRITICAL: Use rsync or cp -r for COMPLETE directory copies

#### 3.1 Executive Hooks - COMPLETE Migration
```bash
# Create directory structure
mkdir -p src/hooks/executive

# Copy ALL hook files and tests
cp -r docker/volumes/tdd_phase_4-executive-hooks/src/hooks/executive/* src/hooks/executive/

# Verify ALL files copied
echo "Copied hooks:"
find src/hooks/executive -type f | wc -l
echo "Should match source:"
find docker/volumes/tdd_phase_4-executive-hooks/src/hooks/executive -type f | wc -l
```

#### 3.2 Executive Screens - COMPLETE Migration
```bash
# Create directory structure
mkdir -p src/screens/executive

# Copy ALL screen files and tests
cp -r docker/volumes/tdd_phase_4-executive-screens/src/screens/executive/* src/screens/executive/

# Verify ALL files copied
echo "Copied screens:"
find src/screens/executive -type f | wc -l
echo "Should match source:"
find docker/volumes/tdd_phase_4-executive-screens/src/screens/executive -type f | wc -l
```

#### 3.3 Executive Components - COMPLETE Migration
```bash
# Create directory structure
mkdir -p src/components/executive

# Copy ALL component files and tests
cp -r docker/volumes/tdd_phase_4-executive-components/src/components/executive/* src/components/executive/

# Verify ALL files copied
echo "Copied components:"
find src/components/executive -type f | wc -l
echo "Should match source:"
find docker/volumes/tdd_phase_4-executive-components/src/components/executive -type f | wc -l
```

#### 3.4 Cross-Role Integration - COMPLETE Migration
```bash
# Create navigation structure
mkdir -p src/navigation
mkdir -p src/features/cross-role

# Copy ALL navigation files
cp -r docker/volumes/tdd_phase_4-cross-role-integration/src/navigation/* src/navigation/

# Copy ALL cross-role features
cp -r docker/volumes/tdd_phase_4-cross-role-integration/src/features/cross-role/* src/features/cross-role/

# Verify ALL files copied
echo "Copied cross-role files:"
find src/navigation src/features/cross-role -type f | wc -l
```

#### 3.5 Decision Support - COMPLETE Migration
```bash
# Create decision support structure
mkdir -p src/features/decision-support

# Copy ALL decision support files
cp -r docker/volumes/tdd_phase_4-decision-support/src/features/decision-support/* src/features/decision-support/

# Verify ALL files copied
echo "Copied decision-support files:"
find src/features/decision-support -type f | wc -l
```

## Phase 4: Fix Import Paths Systematically

### MANDATORY: Fix ALL import paths in ALL copied files

```bash
# Fix import paths in all TypeScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from ["'\'']../../test/|from "@/test/|g' \
  -e 's|from ["'\'']../../../test/|from "@/test/|g' \
  -e 's|from ["'\'']../../../../test/|from "@/test/|g' \
  -e 's|from ["'\'']../../utils/|from "@/utils/|g' \
  -e 's|from ["'\'']../../services/|from "@/services/|g' \
  -e 's|from ["'\'']../../hooks/|from "@/hooks/|g' \
  -e 's|from ["'\'']../../components/|from "@/components/|g' \
  {} \;
```

## Phase 5: Copy Supporting Infrastructure

### MANDATORY: Copy ALL supporting files

```bash
# Copy ALL service implementations
if [ -d "docker/volumes/tdd_phase_4-executive-hooks/src/services/executive" ]; then
  mkdir -p src/services/executive
  cp -r docker/volumes/tdd_phase_4-executive-hooks/src/services/executive/* src/services/executive/
fi

# Copy ALL type definitions
for volume in docker/volumes/tdd_phase_4*; do
  if [ -d "$volume/src/types" ]; then
    mkdir -p src/types
    cp -r "$volume/src/types/"* src/types/ 2>/dev/null || true
  fi
done

# Copy ALL utilities
for volume in docker/volumes/tdd_phase_4*; do
  if [ -d "$volume/src/utils" ]; then
    mkdir -p src/utils
    cp -r "$volume/src/utils/"* src/utils/ 2>/dev/null || true
  fi
done

# Copy ALL mocks
for volume in docker/volumes/tdd_phase_4*; do
  if [ -d "$volume/src/__mocks__" ]; then
    mkdir -p src/__mocks__
    cp -r "$volume/src/__mocks__/"* src/__mocks__/ 2>/dev/null || true
  fi
done
```

## Phase 6: Update package.json Test Scripts

### MANDATORY: Add ALL test scripts

```json
{
  "scripts": {
    "test:hooks:executive": "jest --config jest.config.hooks.executive.js",
    "test:screens:executive": "jest --config jest.config.screens.executive.js",
    "test:components:executive": "jest --config jest.config.components.executive.js",
    "test:cross-role": "jest --config jest.config.cross-role.js",
    "test:decision-support": "jest --config jest.config.decision-support.js",
    "test:integration:executive": "jest --config jest.config.integration.js --testPathPattern=executive",
    "test:all:executive": "npm run test:hooks:executive && npm run test:screens:executive && npm run test:components:executive && npm run test:cross-role",
    "test:coverage:all": "jest --coverage --config jest.config.js"
  }
}
```

## Phase 7: Verify COMPLETE Migration

### CRITICAL: Verify ALL files were copied

```bash
echo "=== MIGRATION VERIFICATION ==="
echo "Test files in workspace:"
find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l
echo "Expected: 1,282+ test files"

echo "\nBreakdown by category:"
echo "Executive hooks tests: $(find src/hooks/executive -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
echo "Executive screens tests: $(find src/screens/executive -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
echo "Executive components tests: $(find src/components/executive -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
echo "Cross-role tests: $(find src/navigation src/features/cross-role -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
echo "Decision support tests: $(find src/features/decision-support -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
```

## Phase 8: Fix TypeScript Compilation Errors

### Systematic Error Resolution

```bash
# Check TypeScript errors
npx tsc --noEmit 2>&1 | tee typescript-errors.log

# Count errors
echo "Total TypeScript errors: $(grep -c 'error TS' typescript-errors.log)"

# Fix common patterns:
# 1. Missing imports - add them
# 2. Type mismatches - update types
# 3. Module resolution - fix paths
# 4. Mock issues - ensure mocks are properly typed
```

## Phase 9: Run ALL Test Suites

### MANDATORY: Run and fix each test suite

```bash
# Run each test suite and capture results
echo "=== RUNNING ALL TEST SUITES ==="

echo "\n1. Executive Hooks:"
npm run test:hooks:executive 2>&1 | tee hooks-results.log
echo "Hooks pass rate: $(grep 'Test Suites:' hooks-results.log)"

echo "\n2. Executive Screens:"
npm run test:screens:executive 2>&1 | tee screens-results.log
echo "Screens pass rate: $(grep 'Test Suites:' screens-results.log)"

echo "\n3. Executive Components:"
npm run test:components:executive 2>&1 | tee components-results.log
echo "Components pass rate: $(grep 'Test Suites:' components-results.log)"

echo "\n4. Cross-Role Integration:"
npm run test:cross-role 2>&1 | tee cross-role-results.log
echo "Cross-role pass rate: $(grep 'Test Suites:' cross-role-results.log)"

echo "\n5. Decision Support:"
npm run test:decision-support 2>&1 | tee decision-support-results.log
echo "Decision support pass rate: $(grep 'Test Suites:' decision-support-results.log)"
```

## Phase 10: Achieve 100% Pass Rate

### Fix failing tests systematically:

1. **Mock Issues**: Ensure all mocks are properly configured
2. **Import Errors**: Fix all import path issues
3. **Type Errors**: Resolve all TypeScript type mismatches
4. **Missing Dependencies**: Install any missing npm packages
5. **Configuration Issues**: Ensure Jest configs are correct

### Iterate until ALL tests pass:

```bash
while true; do
  # Run all tests
  npm test 2>&1 | tee test-results.log
  
  # Check if all passing
  if grep -q "Test Suites:.*0 failed" test-results.log; then
    echo "✅ ALL TESTS PASSING!"
    break
  fi
  
  # Fix errors and continue
  echo "❌ Tests still failing, fixing..."
  # Fix the errors found
done
```

## Success Criteria

### MANDATORY: All of these MUST be true

1. ✅ **Test File Count**: At least 1,200 test files migrated
2. ✅ **TypeScript Compilation**: 0 errors
3. ✅ **Executive Hooks Tests**: 100% passing (400+ tests)
4. ✅ **Executive Screens Tests**: 100% passing (400+ tests)
5. ✅ **Executive Components Tests**: 100% passing (200+ tests)
6. ✅ **Cross-Role Tests**: 100% passing (400+ tests)
7. ✅ **Decision Support Tests**: 100% passing (100+ tests)
8. ✅ **Integration Tests**: 100% passing
9. ✅ **Coverage**: >80% for all categories

## Final Verification

```bash
echo "=== FINAL RESTORATION REPORT ==="
echo "Total test files restored: $(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l)"
echo "TypeScript errors: $(npx tsc --noEmit 2>&1 | grep -c 'error TS' || echo 0)"
echo "Overall test results:"
npm test 2>&1 | grep "Test Suites:"
echo "\nRestoration Status: $([ $(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l) -gt 1200 ] && echo '✅ COMPLETE' || echo '❌ INCOMPLETE')"
```

## CRITICAL REMINDERS

1. **DO NOT** claim completion with only 2 test files
2. **DO NOT** skip copying entire directories
3. **DO NOT** ignore failing tests
4. **MUST** copy ALL 1,282+ test files
5. **MUST** achieve actual 100% pass rate on ALL tests
6. **MUST** verify file counts match between source and destination

Remember: The goal is COMPLETE restoration, not partial. Every single test file from the TDD volumes must be integrated and passing.