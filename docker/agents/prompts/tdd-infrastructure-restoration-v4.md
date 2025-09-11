# TDD Phase 4 Test Infrastructure Restoration Agent - 100% Pass Rate Target

## 🎯 PRIMARY GOAL: Achieve IDENTICAL Pass Rates

**THE VOLUMES HAVE ~100% PASS RATE. YOUR JOB IS TO MAINTAIN THAT IN /workspace**

The tests in `/reference/tdd_phase_4-*` volumes pass at nearly 100%. After migration and harmonization, the SAME tests must pass at the SAME rate in `/workspace`. This is not about creating new tests - it's about preserving what already works perfectly.

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
# Use PROJECT_NAME and AGENT_NAME variables that should be set by entrypoint
if [ -f "/shared/feedback/${PROJECT_NAME}-${AGENT_NAME}-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/${PROJECT_NAME}-${AGENT_NAME}-improvements.md"
  echo ""
  echo "=== IMPLEMENTING FEEDBACK FIRST ==="
elif [ -f "/shared/feedback/restoration-complete-improvements.md" ]; then
  # Fallback to old naming for compatibility
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/restoration-complete-improvements.md"
  echo ""
  echo "=== IMPLEMENTING FEEDBACK FIRST ==="
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

## ⚠️ Why This Matters - Learn From History

### The Core Problem We're Solving:
- **In TDD Volumes**: Tests pass at ~100% in isolation
- **In Main Repo**: Same tests fail due to infrastructure differences
- **Root Cause**: NOT the test code, but the environment setup

### Previous Attempts Failed Because:
- **Attempt 1**: Only 2 of 1,282+ files migrated (0.16%)
- **Attempt 2**: Agent saw 19 tests pass, ignored 2,107 missing tests
- **Attempt 3**: Files copied but infrastructure not harmonized
- **Attempt 4**: Partial harmonization, but critical mocks missing

### Infrastructure Mismatches That Break Tests:
1. **Mock Resolution**: Volumes use `src/__mocks__/`, main uses `src/test/mocks/`
2. **Import Paths**: Volumes use `@/` aliases, main uses relative paths
3. **Test Setup**: Different initialization files between environments
4. **Package Versions**: React Query and other deps may differ
5. **Jest Configs**: Module name mappers don't match

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY Success Criteria:

1. **BASELINE VERIFICATION FIRST**:
   ```bash
   # Verify volumes have high pass rates BEFORE migration
   echo "=== BASELINE: Testing in source volumes ==="
   for volume in /reference/tdd_phase_4-*; do
     cd "$volume" 2>/dev/null && npm test 2>&1 | grep "Test Suites:" || echo "Cannot test in $volume"
     cd /workspace
   done
   ```

2. **EXACT SAME TESTS MUST PASS**:
   - Why: We're not fixing tests, we're fixing infrastructure
   - Success: Same pass rate as source volumes (≥95%)

3. **FULL MIGRATION VERIFICATION**:
   - All 2,126 test files present
   - All Jest configs harmonized
   - All mocks accessible in both locations
   - All import paths resolved

## 📚 INFRASTRUCTURE HARMONIZATION PATTERNS

### Critical Harmonization Steps:

```bash
# 1. PACKAGE.JSON HARMONIZATION
echo "=== Harmonizing package.json ==="
# Merge test scripts from volumes
for volume in /reference/tdd_phase_4-*; do
  if [ -f "$volume/package.json" ]; then
    # Extract and merge test scripts
    node -e "
      const fs = require('fs');
      const main = JSON.parse(fs.readFileSync('/workspace/package.json', 'utf8'));
      const volume = JSON.parse(fs.readFileSync('$volume/package.json', 'utf8'));
      
      // Merge scripts
      main.scripts = { ...main.scripts, ...volume.scripts };
      
      // Ensure critical deps match
      main.devDependencies = main.devDependencies || {};
      if (volume.devDependencies) {
        Object.keys(volume.devDependencies).forEach(dep => {
          if (dep.includes('jest') || dep.includes('test') || dep.includes('babel')) {
            main.devDependencies[dep] = volume.devDependencies[dep];
          }
        });
      }
      
      fs.writeFileSync('/workspace/package.json', JSON.stringify(main, null, 2));
    "
  fi
done

# 2. BABEL CONFIG HARMONIZATION
echo "=== Ensuring Babel config ==="
if [ ! -f /workspace/babel.config.js ]; then
  # Copy from first volume that has it
  for volume in /reference/tdd_phase_4-*; do
    if [ -f "$volume/babel.config.js" ]; then
      cp "$volume/babel.config.js" /workspace/
      echo "✅ Babel config copied"
      break
    fi
  done
fi

# 3. TSCONFIG HARMONIZATION
echo "=== Harmonizing TypeScript config ==="
if [ -f /workspace/tsconfig.json ]; then
  # Add path mappings
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('/workspace/tsconfig.json', 'utf8'));
    
    config.compilerOptions = config.compilerOptions || {};
    config.compilerOptions.paths = {
      '@/*': ['./src/*'],
      '@/test/*': ['./src/test/*'],
      '@/utils/*': ['./src/utils/*'],
      '@/services/*': ['./src/services/*'],
      '@/hooks/*': ['./src/hooks/*'],
      '@/components/*': ['./src/components/*'],
      '@/screens/*': ['./src/screens/*']
    };
    
    fs.writeFileSync('/workspace/tsconfig.json', JSON.stringify(config, null, 2));
  "
fi

# 4. CRITICAL MOCK SETUP
echo "=== Setting up dual mock system ==="
# Ensure BOTH mock locations work
mkdir -p /workspace/src/test/mocks
mkdir -p /workspace/src/__mocks__

# Find and copy ALL mocks from volumes
for volume in /reference/tdd_phase_4-*; do
  # Copy from test/mocks
  if [ -d "$volume/src/test/mocks" ]; then
    cp -r "$volume/src/test/mocks/"* /workspace/src/test/mocks/ 2>/dev/null || true
  fi
  
  # Copy from __mocks__
  if [ -d "$volume/src/__mocks__" ]; then
    cp -r "$volume/src/__mocks__/"* /workspace/src/__mocks__/ 2>/dev/null || true
  fi
done

# Ensure mocks are in BOTH locations
for mock in /workspace/src/test/mocks/*.ts; do
  if [ -f "$mock" ]; then
    filename=$(basename "$mock")
    if [ ! -f "/workspace/src/__mocks__/$filename" ]; then
      cp "$mock" "/workspace/src/__mocks__/$filename"
    fi
  fi
done

for mock in /workspace/src/__mocks__/*.ts; do
  if [ -f "$mock" ]; then
    filename=$(basename "$mock")
    if [ ! -f "/workspace/src/test/mocks/$filename" ]; then
      cp "$mock" "/workspace/src/test/mocks/$filename"
    fi
  fi
done

echo "Mocks in test/mocks: $(ls /workspace/src/test/mocks/*.ts 2>/dev/null | wc -l)"
echo "Mocks in __mocks__: $(ls /workspace/src/__mocks__/*.ts 2>/dev/null | wc -l)"
```

## 🎯 Pre-Implementation Checklist

### Understanding the Goal:
- [ ] I understand tests ALREADY pass at ~100% in volumes
- [ ] I know the problem is infrastructure, NOT test code
- [ ] I will preserve the exact test functionality
- [ ] I will harmonize ALL infrastructure differences

### Technical Requirements:
- [ ] I will verify baseline pass rates in volumes first
- [ ] I will copy ALL 2,126 test files
- [ ] I will harmonize package.json, babel, tsconfig
- [ ] I will ensure mocks work in BOTH locations
- [ ] I will fix ALL import paths

## 📊 Success Metrics - MUST MATCH VOLUME PASS RATES

### CRITICAL: Baseline Measurement
```bash
# BEFORE migration - capture source metrics
echo "=== BASELINE METRICS FROM VOLUMES ==="
BASELINE_PASS_RATE=0
BASELINE_TEST_COUNT=0

# Get average pass rate from volumes (should be ~100%)
for volume in /reference/tdd_phase_4-*; do
  if [ -d "$volume" ]; then
    cd "$volume" 2>/dev/null
    RESULT=$(npm test 2>&1 | grep "Test Suites:" || echo "")
    if [ -n "$RESULT" ]; then
      echo "$volume: $RESULT"
      # Extract pass rate for comparison
    fi
    cd /workspace
  fi
done
```

### Success Criteria:
- **File Migration**: 2,126 test files (100% of available)
- **Test Discovery**: Jest finds ≥2,000 tests 
- **Pass Rate**: ≥95% (matching source volumes)
- **TypeScript**: <10 errors (minor issues acceptable)
- **No Regressions**: Every passing test in volumes must pass in workspace

## 📋 Implementation Tasks - COMPLETE SEQUENCE

### Phase 1: Baseline and Preparation
```bash
echo "=== PHASE 1: BASELINE AND PREPARATION ==="

# 1. Verify all 5 volumes are accessible
VOLUMES_FOUND=0
for volume in tdd_phase_4-decision-support tdd_phase_4-cross-role-integration tdd_phase_4-executive-components tdd_phase_4-executive-hooks tdd_phase_4-executive-screens; do
  if [ -d "/reference/$volume" ]; then
    echo "✅ Found: $volume"
    VOLUMES_FOUND=$((VOLUMES_FOUND + 1))
  else
    echo "❌ MISSING: $volume"
  fi
done

if [ $VOLUMES_FOUND -ne 5 ]; then
  echo "❌ CRITICAL: Only $VOLUMES_FOUND/5 volumes found. Cannot proceed."
  exit 1
fi

# 2. Count available test files
TOTAL_AVAILABLE=$(find /reference -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
echo "Total test files available: $TOTAL_AVAILABLE"

# 3. Clean workspace for fresh start
echo "Preparing clean workspace..."
rm -rf /workspace/src/*
mkdir -p /workspace/src
```

### Phase 2: Complete File Migration
```bash
echo "=== PHASE 2: COMPLETE FILE MIGRATION ==="

# Copy EVERYTHING from ALL volumes
for volume in /reference/tdd_phase_4-*; do
  volume_name=$(basename "$volume")
  echo "Migrating $volume_name..."
  
  # Copy entire src directory
  if [ -d "$volume/src" ]; then
    cp -r "$volume/src/"* /workspace/src/ 2>/dev/null || true
  fi
  
  # Copy all configs
  cp "$volume"/jest.config*.js /workspace/ 2>/dev/null || true
  cp "$volume"/.babelrc* /workspace/ 2>/dev/null || true
  cp "$volume"/babel.config* /workspace/ 2>/dev/null || true
  cp "$volume"/tsconfig*.json /workspace/ 2>/dev/null || true
  
  echo "  Current total: $(find /workspace -name '*.test.ts' -o -name '*.test.tsx' | wc -l) test files"
done

MIGRATED_COUNT=$(find /workspace -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
echo "Migration complete: $MIGRATED_COUNT test files"

if [ $MIGRATED_COUNT -lt 2000 ]; then
  echo "❌ CRITICAL: Only $MIGRATED_COUNT files migrated. Expected ~2,126"
  exit 1
fi
```

### Phase 3: Infrastructure Harmonization
```bash
echo "=== PHASE 3: INFRASTRUCTURE HARMONIZATION ==="

# 1. Fix all Jest configs
for config in /workspace/jest.config*.js; do
  if [ -f "$config" ]; then
    echo "Harmonizing $(basename $config)..."
    
    # Fix mock paths to support both locations
    sed -i \
      -e "s|'<rootDir>/src/__mocks__/|'<rootDir>/src/test/mocks/|g" \
      -e "s|'^@supabase/supabase-js$': '<rootDir>/src/__mocks__/supabase.ts'|'^@supabase/supabase-js$': '<rootDir>/src/test/mocks/supabase.simplified.mock.ts'|g" \
      "$config"
    
    # Ensure setupFilesAfterEnv includes all setup files
    node -e "
      const fs = require('fs');
      const content = fs.readFileSync('$config', 'utf8');
      
      // Ensure setup files are configured
      if (!content.includes('setupFilesAfterEnv')) {
        const setupFiles = [
          '<rootDir>/src/test/setup.ts',
          '<rootDir>/src/test/serviceSetup.ts'
        ];
        
        const updatedContent = content.replace(
          'module.exports = {',
          'module.exports = {\\n  setupFilesAfterEnv: [\\'' + setupFiles.join('\\', \\'') + '\\'],'
        );
        
        fs.writeFileSync('$config', updatedContent);
      }
    " 2>/dev/null || true
  fi
done

# 2. Fix import paths in all files
echo "Fixing import paths..."
find /workspace/src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  # Fix @ alias imports to relative
  sed -i \
    -e 's|from ["'"'"']@/\([^"'"'"']*\)["'"'"']|from "../\1"|g' \
    -e 's|from ["'"'"']@test/|from "../test/|g' \
    -e 's|from ["'"'"']@utils/|from "../utils/|g' \
    -e 's|from ["'"'"']@services/|from "../services/|g' \
    "$file" 2>/dev/null || true
done

# 3. Install missing dependencies
echo "Installing dependencies..."
cd /workspace
npm install --save-dev @testing-library/react @testing-library/react-native @testing-library/jest-dom jest-expo 2>/dev/null || true
```

### Phase 4: Validation and Testing
```bash
echo "=== PHASE 4: VALIDATION AND TESTING ==="

# 1. TypeScript check
echo "Checking TypeScript..."
cd /workspace
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
echo "TypeScript errors: $TS_ERRORS"

# 2. Run tests and capture metrics
echo "Running tests..."
npm test 2>&1 | tee final-test-results.log

# 3. Extract and verify metrics
SUITES_TOTAL=$(grep "Test Suites:" final-test-results.log | grep -oE "[0-9]+ total" | grep -oE "[0-9]+" || echo "0")
SUITES_PASSED=$(grep "Test Suites:" final-test-results.log | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo "0")
TESTS_TOTAL=$(grep "Tests:" final-test-results.log | grep -oE "[0-9]+ total" | grep -oE "[0-9]+" || echo "0")
TESTS_PASSED=$(grep "Tests:" final-test-results.log | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo "0")

echo ""
echo "=== FINAL RESULTS ==="
echo "Test Suites: $SUITES_PASSED/$SUITES_TOTAL"
echo "Tests: $TESTS_PASSED/$TESTS_TOTAL"

# Calculate pass rate
if [ $TESTS_TOTAL -gt 0 ]; then
  PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
  echo "Pass Rate: $PASS_RATE%"
  
  if [ $PASS_RATE -lt 95 ]; then
    echo "⚠️ WARNING: Pass rate is $PASS_RATE%, expected ≥95%"
    echo "Investigating failures..."
    grep -A 5 "FAIL" final-test-results.log | head -20
  else
    echo "✅ SUCCESS: Pass rate matches source volumes!"
  fi
else
  echo "❌ CRITICAL: No tests found by Jest!"
  echo "Infrastructure harmonization failed."
  exit 1
fi
```

## ✅ Test Requirements - SPECIFIC VALIDATION PATTERNS

### Test Coverage Requirements:
- **Minimum**: ≥95% of migrated tests must pass (not just migrate)
- **Target**: Match exact pass rate from source volumes (~100%)
- **Discovery**: Jest must find ≥2,000 test cases

### Test Validation Commands:
```bash
# Validate test discovery
echo "=== TEST DISCOVERY VALIDATION ==="
DISCOVERED_TESTS=$(npm test -- --listTests 2>/dev/null | wc -l)
echo "Jest discovered: $DISCOVERED_TESTS test files"

if [ $DISCOVERED_TESTS -lt 100 ]; then
  echo "❌ CRITICAL: Jest not discovering tests properly"
  echo "Checking Jest config moduleNameMapper..."
  grep -n "moduleNameMapper" jest.config*.js
  
  echo "Checking for missing test setup files..."
  ls -la src/test/setup*.ts src/test/serviceSetup*.ts
fi

# Validate actual test execution
echo "=== TEST EXECUTION VALIDATION ==="
npm test -- --verbose --coverage 2>&1 | tee validation-test-run.log

# Extract critical metrics
SUITES_RUN=$(grep "Test Suites:" validation-test-run.log | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
TESTS_RUN=$(grep "Tests:" validation-test-run.log | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")

echo "Suites executed: $SUITES_RUN"
echo "Tests executed: $TESTS_RUN"

if [ $TESTS_RUN -lt 2000 ]; then
  echo "❌ WARNING: Only $TESTS_RUN tests executed, expected ≥2,000"
  echo "Most likely causes:"
  echo "1. Mock resolution failures"
  echo "2. Import path issues"
  echo "3. Missing test setup files"
fi
```

### Test Pattern Recognition:
```bash
# Validate common test patterns work
echo "=== PATTERN VALIDATION ==="

# Check if hooks tests work
if npm run test:hooks 2>&1 | grep -q "PASS"; then
  echo "✅ Hook tests working"
else
  echo "❌ Hook tests failing"
fi

# Check if service tests work  
if npm run test:services 2>&1 | grep -q "PASS"; then
  echo "✅ Service tests working"
else
  echo "❌ Service tests failing"
fi

# Check for specific failure patterns
echo "Common failure patterns:"
grep -E "(Cannot find module|Mock not found|TypeError|ReferenceError)" validation-test-run.log | head -10
```

## 🎯 Milestone Validation Protocol

### Milestone 1: Volume Access & Baseline
- [ ] All 5 volumes accessible at `/reference/`
- [ ] Baseline pass rates captured from volumes
- [ ] Total file count verified (should be 2,126)
- [ ] Clean workspace prepared

**Validation**:
```bash
echo "=== MILESTONE 1 VALIDATION ==="
[ $VOLUMES_FOUND -eq 5 ] && echo "✅ All volumes found" || echo "❌ Missing volumes"
[ $TOTAL_AVAILABLE -gt 2000 ] && echo "✅ Sufficient tests available" || echo "❌ Insufficient tests"
```

### Milestone 2: Complete File Migration
- [ ] ≥2,000 test files copied to workspace
- [ ] All Jest configs migrated
- [ ] All source code copied
- [ ] All mock files copied

**Validation**:
```bash
echo "=== MILESTONE 2 VALIDATION ==="
MIGRATED=$(find /workspace -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
[ $MIGRATED -gt 2000 ] && echo "✅ Tests migrated" || echo "❌ Migration incomplete"

CONFIGS=$(ls /workspace/jest.config*.js | wc -l)
[ $CONFIGS -gt 0 ] && echo "✅ Jest configs present" || echo "❌ No Jest configs"
```

### Milestone 3: Infrastructure Harmonized
- [ ] Import paths fixed
- [ ] Mock paths working in both locations
- [ ] TypeScript compilation clean (<10 errors)
- [ ] Package.json dependencies aligned

**Validation**:
```bash
echo "=== MILESTONE 3 VALIDATION ==="
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS")
[ $TS_ERRORS -lt 10 ] && echo "✅ TypeScript clean" || echo "❌ TS errors: $TS_ERRORS"

# Check mock accessibility
[ -f /workspace/src/test/mocks/supabase.simplified.mock.ts ] && echo "✅ Mock in test/mocks" || echo "❌ Missing test/mocks"
[ -f /workspace/src/__mocks__/supabase.simplified.mock.ts ] && echo "✅ Mock in __mocks__" || echo "❌ Missing __mocks__"
```

### Final Milestone: Tests Execute at Target Pass Rate
- [ ] Jest discovers ≥2,000 test cases
- [ ] Test pass rate ≥95%
- [ ] No critical infrastructure failures
- [ ] Results match source volume performance

**Validation**:
```bash
echo "=== FINAL MILESTONE VALIDATION ==="
FINAL_PASS_RATE=$(npm test 2>&1 | grep "Tests:" | grep -oE "[0-9]+%" | tail -1 | grep -oE "[0-9]+")
[ $FINAL_PASS_RATE -ge 95 ] && echo "✅ Target pass rate achieved" || echo "❌ Pass rate: $FINAL_PASS_RATE%"
```

## 🔄 Self-Improvement Protocol

### If Pass Rate Below 95%:
```bash
echo "=== DIAGNOSING LOW PASS RATE ==="

# 1. Check most common errors
echo "Top 5 error patterns:"
npm test 2>&1 | grep -E "(FAIL|Error|Cannot)" | sort | uniq -c | sort -nr | head -5

# 2. Focus on specific failure types
if npm test 2>&1 | grep -q "Cannot find module"; then
  echo "🔧 FIXING: Module resolution issues"
  
  # Check Jest moduleNameMapper
  echo "Current moduleNameMapper:"
  grep -A 10 "moduleNameMapper" jest.config*.js
  
  # Fix common @ alias issues
  find /workspace/src -name "*.test.*" -exec grep -l "from.*@/" {} \; | head -10 | while read file; do
    echo "File with @ imports: $file"
    head -5 "$file" | grep "from.*@/"
  done
fi

if npm test 2>&1 | grep -q "Mock.*not found"; then
  echo "🔧 FIXING: Mock resolution issues"
  
  # List available mocks
  echo "Available mocks in test/mocks:"
  ls -la /workspace/src/test/mocks/
  echo "Available mocks in __mocks__:"
  ls -la /workspace/src/__mocks__/
  
  # Check mock references in failed tests
  npm test 2>&1 | grep -B 5 -A 5 "Mock.*not found"
fi
```

### Iterative Improvement:
1. **Fix top 3 error types** → Re-run tests → Measure improvement
2. **Document what worked** → Apply same fixes to similar issues
3. **Track progress** → Pass rate should improve with each cycle
4. **Stop when ≥95%** → Don't over-optimize

## 🔄 Continuous Validation

### After EVERY Major Step:
```bash
validate_progress() {
  local step_name="$1"
  local expected_files="$2"
  
  CURRENT_FILES=$(find /workspace -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
  echo "[$(date)] $step_name: $CURRENT_FILES test files (expected: $expected_files)"
  
  if [ $CURRENT_FILES -lt $expected_files ]; then
    echo "⚠️ Below expected count!"
  fi
  
  # Log to progress file
  echo "[$(date)] $step_name: $CURRENT_FILES/$expected_files files" >> /shared/progress/restoration-complete.md
}
```

## 🚫 Regression Prevention - MANDATORY SAFEGUARDS

### Before EVERY Infrastructure Change:
```bash
# 1. Capture current state
echo "=== REGRESSION PREVENTION: Baseline capture ==="
BASELINE_TESTS=$(find /workspace -name "*.test.*" | wc -l)
BASELINE_PASS_RATE=0

# If tests already exist, capture pass rate
if [ $BASELINE_TESTS -gt 0 ]; then
  BASELINE_PASS_RATE=$(npm test 2>&1 | grep "Tests:" | grep -oE "[0-9]+%" | grep -oE "[0-9]+" || echo "0")
  echo "Current baseline: $BASELINE_TESTS files, $BASELINE_PASS_RATE% pass rate"
fi

# 2. After each change, validate no regression
validate_no_regression() {
  local change_description="$1"
  
  NEW_TESTS=$(find /workspace -name "*.test.*" | wc -l)
  NEW_PASS_RATE=$(npm test 2>&1 | grep "Tests:" | grep -oE "[0-9]+%" | grep -oE "[0-9]+" || echo "0")
  
  echo "After $change_description:"
  echo "  Tests: $NEW_TESTS (was $BASELINE_TESTS)"
  echo "  Pass rate: $NEW_PASS_RATE% (was $BASELINE_PASS_RATE%)"
  
  # Detect regressions
  if [ $NEW_TESTS -lt $BASELINE_TESTS ]; then
    echo "❌ REGRESSION: Lost $(($BASELINE_TESTS - $NEW_TESTS)) test files!"
    echo "Rolling back changes..."
    return 1
  fi
  
  if [ $NEW_PASS_RATE -lt $((BASELINE_PASS_RATE - 5)) ]; then
    echo "❌ REGRESSION: Pass rate dropped by >5%!"
    echo "Rolling back changes..."
    return 1
  fi
  
  # Update baseline for next check
  BASELINE_TESTS=$NEW_TESTS
  BASELINE_PASS_RATE=$NEW_PASS_RATE
  echo "✅ No regression detected"
}
```

### Critical Regression Rules:
- **NEVER proceed if test file count decreases**
- **NEVER proceed if pass rate drops >5%**  
- **ALWAYS fix regressions before continuing**
- **DOCUMENT what caused each regression**

## 📢 Progress Reporting Templates - MANDATORY COMMUNICATION

### Console Output (REQUIRED for every action):
```bash
# Progress logging function
log_progress() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Console output
    echo "[$timestamp] $message"
    
    # Progress file
    echo "[$timestamp] $message" >> /shared/progress/restoration-complete.md
    
    # Status file
    if [ -f /shared/status/restoration-complete.json ]; then
      node -e "
        const fs = require('fs');
        try {
          const status = JSON.parse(fs.readFileSync('/shared/status/restoration-complete.json', 'utf8'));
          status.lastMessage = '$message';
          status.lastUpdate = new Date().toISOString();
          fs.writeFileSync('/shared/status/restoration-complete.json', JSON.stringify(status, null, 2));
        } catch(e) {
          const status = { lastMessage: '$message', lastUpdate: new Date().toISOString() };
          fs.writeFileSync('/shared/status/restoration-complete.json', JSON.stringify(status, null, 2));
        }
      " 2>/dev/null || true
    fi
}

# Use throughout all phases
log_progress "Starting TDD Phase 4 restoration"
log_progress "Found $VOLUMES_FOUND volumes with $TOTAL_AVAILABLE tests"
log_progress "Migration complete: $MIGRATED_COUNT files copied"
log_progress "Infrastructure harmonization: Import paths fixed"
log_progress "Final validation: $PASS_RATE% pass rate achieved"
```

### Status File Updates (JSON format):
```bash
update_status() {
    local key="$1"
    local value="$2"
    
    node -e "
      const fs = require('fs');
      let status = {};
      
      try {
        status = JSON.parse(fs.readFileSync('/shared/status/restoration-complete.json', 'utf8'));
      } catch(e) {
        status = {};
      }
      
      status['$key'] = '$value';
      status.lastUpdate = new Date().toISOString();
      
      fs.writeFileSync('/shared/status/restoration-complete.json', JSON.stringify(status, null, 2));
    " 2>/dev/null || true
}

# Usage examples:
update_status "phase" "migration"
update_status "testFiles" "$MIGRATED_COUNT"
update_status "passRate" "$PASS_RATE%"
update_status "status" "harmonizing-infrastructure"
```

### Test Results Logging:
```bash
# After every test run, save full results
save_test_results() {
    local phase="$1"
    local timestamp=$(date '+%Y%m%d-%H%M%S')
    
    # Full test output
    npm test 2>&1 > "/shared/test-results/restoration-$phase-$timestamp.log"
    
    # Summary extract
    grep -E "(Test Suites:|Tests:|Time:|Snapshots:)" \
      "/shared/test-results/restoration-$phase-$timestamp.log" \
      > "/shared/test-results/restoration-$phase-summary.txt"
    
    # Latest symlink
    ln -sf "restoration-$phase-$timestamp.log" "/shared/test-results/restoration-latest.log"
    
    log_progress "Test results saved: $phase phase complete"
}
```

## 🔄 Communication - ALL CHANNELS REQUIRED

### Required Files to Update:

1. **Progress File**: `/shared/progress/restoration-complete.md`
   ```bash
   # Initialize at start
   cat > /shared/progress/restoration-complete.md << EOF
   # TDD Phase 4 Restoration Progress
   
   Started: $(date)
   Goal: Migrate 2,126 tests with ≥95% pass rate
   
   ## Progress Log
   EOF
   
   # Update throughout (use log_progress function)
   ```

2. **Status File**: `/shared/status/restoration-complete.json`
   ```bash
   # Initialize with structure
   cat > /shared/status/restoration-complete.json << EOF
   {
     "agent": "restoration-complete",
     "startTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
     "phase": "initialization",
     "testFiles": 0,
     "passRate": "0%",
     "status": "starting"
   }
   EOF
   ```

3. **Test Results**: `/shared/test-results/restoration-complete-latest.txt`
   - Update after every test execution
   - Include full Jest output
   - Maintain history of all test runs

### Update Frequency Requirements:
- **Console**: Every significant action
- **Progress**: Every step completion  
- **Status**: Every phase transition
- **Test Results**: Every test execution
- **Handoff**: Final completion only

## 🚨 Common Failure Points and Solutions

### Issue: Tests pass in volumes but fail in workspace
**Root Causes & Solutions**:

1. **Mock not found errors**:
   ```bash
   # Solution: Ensure mock exists in BOTH locations
   cp src/test/mocks/supabase.*.mock.ts src/__mocks__/supabase.ts
   ```

2. **Cannot find module '@/...'**:
   ```bash
   # Solution: Fix module resolution in Jest config
   # Add to moduleNameMapper in jest.config.js:
   '^@/(.*)$': '<rootDir>/src/$1'
   ```

3. **React Native specific errors**:
   ```bash
   # Solution: Ensure jest-expo preset
   # In jest.config.js: preset: 'jest-expo'
   ```

4. **Async test timeouts**:
   ```bash
   # Solution: Increase timeout in jest.config.js
   testTimeout: 30000
   ```

## 🤝 Handoff Requirements

Your handoff MUST demonstrate pass rate parity:

```bash
cat > /shared/handoffs/restoration-complete.md << EOF
# TDD Phase 4 Restoration Complete

## Success Metrics Achieved

### Source Volume Baseline
- Average pass rate in volumes: ~100%
- Total tests in volumes: 2,126

### After Migration and Harmonization
- Test files migrated: $(find /workspace -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
- Tests discovered by Jest: $TESTS_TOTAL
- Tests passing: $TESTS_PASSED
- Pass rate: $PASS_RATE%
- TypeScript errors: $TS_ERRORS

### Infrastructure Harmonization Applied
- [x] Mock paths unified (both __mocks__ and test/mocks)
- [x] Import paths converted (@ aliases to relative)
- [x] Jest configs harmonized
- [x] Package.json dependencies merged
- [x] Babel/TypeScript configs aligned

### Verification
Pass rate in workspace ($PASS_RATE%) matches source volumes (≥95%) ✅

## File Structure
\`\`\`
$(tree /workspace/src -d -L 2)
\`\`\`

## Test Execution Proof
\`\`\`
$(tail -20 final-test-results.log)
\`\`\`
EOF
```

## ⚠️ Critical Technical Decisions - DO's and DON'Ts

### ✅ ALWAYS:
- **Use log_progress()**: Every significant action must be logged
- **Validate before proceeding**: Check regression after each change  
- **Copy from ALL 5 volumes**: Don't assume some volumes are empty
- **Maintain dual mock system**: Both `__mocks__` and `test/mocks`
- **Fix import paths consistently**: Convert ALL `@/` aliases to relative paths
- **Check Jest discovery**: Verify tests are found, not just copied

### ❌ NEVER:
- **Skip baseline verification**: Must prove volumes have high pass rates first
- **Declare success with <2,000 tests**: This means infrastructure failed
- **Ignore test discovery issues**: 19 tests found = broken Jest config
- **Proceed with regressions**: Fix immediately or roll back
- **Mix import path styles**: Either all relative or all @ aliases, never mixed
- **Copy files without testing**: Migration without harmonization = failure

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Jest finds 19 tests | Fix moduleNameMapper | Copy more files | Discovery issue, not missing files |
| Pass rate drops 20% | Stop and diagnose | Continue and hope | Regression prevention |
| @ imports fail | Convert all to relative | Mix with some @ imports | Consistency prevents confusion |
| Mock not found | Ensure in both locations | Pick one location | Tests expect different paths |

## 📚 Study These Examples - PATTERN REFERENCE

### Before starting, study:
1. **Successful TDD restoration patterns** - This prompt follows proven structure
2. **Infrastructure harmonization** - Focus on making SAME tests work
3. **Agent prompt guidelines** - Complete structure with all required sections

### Key Patterns to Notice:
- **Baseline before migration**: Prove source quality first
- **Regression prevention**: Continuous validation prevents drift  
- **Dual mock system**: Accommodates different test expectations
- **Complete communication**: Every action logged for debugging

### Copy These Validation Patterns:
```bash
# Pattern 1: Baseline capture
BEFORE_STATE=$(get_current_state)
make_change
AFTER_STATE=$(get_current_state)
validate_improvement "$BEFORE_STATE" "$AFTER_STATE"

# Pattern 2: Progressive validation
validate_progress "step-name" expected_count
log_progress "Step complete with metrics"
```

## 🚀 FINAL SUCCESS CRITERIA

**PRIMARY SUCCESS INDICATOR**: Pass rate ≥95% matching source volumes

You succeed when:
1. **2,126 test files** are in /workspace (not 19!)
2. **Jest discovers ≥2,000 test cases** (not just files on disk)
3. **Pass rate is ≥95%** (matching source volumes)
4. **Same tests that pass in volumes pass in workspace**
5. **Complete communication trail** (progress, status, test results)

**FAILURE INDICATORS** (immediate stop and fix):
- Jest discovers <100 tests → Infrastructure problem
- Pass rate <85% → Harmonization incomplete  
- Missing volumes → Mount or path issue
- TypeScript errors >50 → Import path problems

Remember: The tests ALREADY WORK PERFECTLY in the volumes. Your job is to make the SAME tests work at the SAME pass rate in /workspace through proper infrastructure harmonization.