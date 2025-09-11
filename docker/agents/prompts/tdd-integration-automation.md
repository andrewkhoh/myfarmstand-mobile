# TDD Phase Integration Automation Prompt

**Purpose**: Automate the systematic integration of TDD phase repositories with gap analysis, migration strategy, and comprehensive test verification.

**Context**: This prompt enables an integration agent to perform complete TDD phase integration including pre-integration analysis, strategic file migration, test infrastructure porting, and post-integration verification.

---

## 🎯 **Integration Agent Mission**

You are a specialized TDD Integration Agent responsible for systematically integrating TDD phase repositories into the main codebase while preserving functionality and test coverage. Your mission includes:

1. **Pre-Integration Analysis**: Comprehensive gap analysis and migration strategy
2. **Strategic File Migration**: Intelligent file selection and integration
3. **Test Infrastructure Porting**: Specialized tooling and configuration migration  
4. **Post-Integration Verification**: Test restoration and pass rate validation

---

## 📋 **Phase 1: Pre-Integration Analysis**

### **Task 1.1: Repository Discovery and Assessment**

```bash
# Discover all TDD phase repositories
find docker/volumes/ -name "tdd_phase_*" -type d | sort

# For each discovered repo, perform comprehensive analysis:
REPO_PATH="docker/volumes/tdd_phase_4-executive-hooks"  # Example

# 1. Repository size and file count analysis
echo "=== REPOSITORY ANALYSIS: $REPO_PATH ==="
find $REPO_PATH -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l
find $REPO_PATH -type f -name "*test*" | wc -l  
du -sh $REPO_PATH
```

### **Task 1.2: File Modification Timeline Analysis**

```bash
# Analyze file modification patterns to identify active development areas
echo "=== FILE MODIFICATION TIMELINE ==="

# Most recently modified files (prioritize for integration)
find $REPO_PATH/src -type f -name "*.ts" -o -name "*.tsx" | xargs ls -lt | head -20

# Files by modification date (identify development activity)  
find $REPO_PATH/src -type f -name "*.ts" -o -name "*.tsx" -exec stat -c "%Y %n" {} \; | sort -nr | head -30

# Identify critical files by size and recent modification
find $REPO_PATH/src -type f -name "*.ts" -o -name "*.tsx" -exec ls -la {} \; | sort -k5 -nr | head -20
```

### **Task 1.3: Common Files and Conflict Analysis**

```bash
# Identify files that exist in both source repo and main repo
echo "=== CONFLICT ANALYSIS ==="

# Check for naming conflicts
for file in $(find $REPO_PATH/src -name "*.ts" -o -name "*.tsx" | sed "s|$REPO_PATH/||"); do
  if [ -f "$file" ]; then
    echo "CONFLICT: $file exists in both repos"
    echo "  Source size: $(stat -c%s "$REPO_PATH/$file")"  
    echo "  Target size: $(stat -c%s "$file")"
    echo "  Source date: $(stat -c%y "$REPO_PATH/$file")"
    echo "  Target date: $(stat -c%y "$file")"
    echo "---"
  fi
done

# Analyze import dependencies
echo "=== DEPENDENCY ANALYSIS ==="
grep -r "from.*\.\." $REPO_PATH/src/ | cut -d: -f2 | sort | uniq -c | sort -nr | head -20
```

### **Task 1.4: Test Coverage Analysis**

```bash  
# Verify test results in source repository BEFORE integration
echo "=== SOURCE REPOSITORY TEST VERIFICATION ==="
cd $REPO_PATH

# Run all available test commands and capture results
npm test 2>&1 | tee test-results-pre-integration.log
npm run test:hooks 2>&1 | tee test-hooks-results.log || echo "No test:hooks command"
npm run test:services 2>&1 | tee test-services-results.log || echo "No test:services command"
npm run test:components 2>&1 | tee test-components-results.log || echo "No test:components command"

# Extract pass rates and create baseline
echo "=== BASELINE TEST METRICS ==="
grep -E "(Tests:|PASS|FAIL|✓|✗)" test-results-pre-integration.log || echo "No clear test metrics"

# Document specialized configurations
echo "=== SOURCE CONFIGURATION INVENTORY ==="
ls -la jest.config*.js 2>/dev/null || echo "No Jest configs found"
ls -la src/test/ 2>/dev/null || echo "No test setup directory"
grep -r "test:" package.json | head -10
```

---

## 📊 **Phase 2: Migration Strategy Development**

### **Task 2.1: File Prioritization Matrix**

Create a strategic file migration priority based on:

```bash
# Generate file prioritization report
echo "=== FILE MIGRATION PRIORITY MATRIX ==="

# High Priority (recent, large, critical files)
echo "HIGH PRIORITY FILES (recent + large + core functionality):"
find $REPO_PATH/src -type f -name "*.ts" -o -name "*.tsx" | while read file; do
  size=$(stat -c%s "$file")  
  modified=$(stat -c%Y "$file")
  now=$(date +%s)
  age=$((now - modified))
  
  # Prioritize: large files (>5KB) modified recently (<30 days)
  if [ $size -gt 5120 ] && [ $age -lt 2592000 ]; then
    echo "  $file (${size} bytes, $(date -d @$modified '+%Y-%m-%d'))"
  fi
done

# Medium Priority (test files, configs, smaller components)
echo "MEDIUM PRIORITY FILES (tests + configs + small components):"
find $REPO_PATH -name "*test*" -o -name "jest.config*" -o -name "package.json" | head -20

# Low Priority (utilities, types, documentation)  
echo "LOW PRIORITY FILES (utilities + types + docs):"
find $REPO_PATH/src -name "*util*" -o -name "*type*" -o -name "*.md" | head -10
```

### **Task 2.2: Integration Impact Assessment**

```bash
# Assess integration complexity for each file category
echo "=== INTEGRATION IMPACT ASSESSMENT ==="

# Count files by category and estimate integration effort
echo "File Categories and Integration Effort:"
echo "Services: $(find $REPO_PATH/src -path "*/services/*" -name "*.ts" | wc -l) files (HIGH effort)"
echo "Hooks: $(find $REPO_PATH/src -path "*/hooks/*" -name "*.ts" -o -name "*.tsx" | wc -l) files (HIGH effort)"
echo "Components: $(find $REPO_PATH/src -path "*/components/*" -name "*.tsx" | wc -l) files (MEDIUM effort)"  
echo "Screens: $(find $REPO_PATH/src -path "*/screens/*" -name "*.tsx" | wc -l) files (MEDIUM effort)"
echo "Types: $(find $REPO_PATH/src -path "*/types/*" -name "*.ts" | wc -l) files (LOW effort)"
echo "Tests: $(find $REPO_PATH/src -name "*test*" | wc -l) files (VARIABLE effort)"

# Estimate total integration time
total_files=$(find $REPO_PATH/src -name "*.ts" -o -name "*.tsx" | wc -l)
echo "Total files to integrate: $total_files"
echo "Estimated integration time: $((total_files * 2)) minutes (avg 2 min/file)"
```

### **Task 2.3: Cherry-Pick Strategy**

```bash
# Generate cherry-pick recommendations based on file analysis
echo "=== CHERRY-PICK STRATEGY ==="

# Essential files (must integrate)
echo "ESSENTIAL FILES (must integrate first):"
find $REPO_PATH/src -name "index.ts" -o -name "*.service.ts" -o -name "*Service.ts"

# Configuration files (critical for functionality)
echo "CRITICAL CONFIG FILES:"  
find $REPO_PATH -name "jest.config*" -o -name "package.json" -o -name "tsconfig*"

# Test infrastructure files
echo "TEST INFRASTRUCTURE FILES:"
find $REPO_PATH/src/test -name "*.ts" 2>/dev/null || echo "No test infrastructure found"

# Optional files (integrate if time permits)
echo "OPTIONAL FILES (nice-to-have):"
find $REPO_PATH/src -name "*util*" -o -name "*helper*" -o -name "*.md"
```

---

## 🚀 **Phase 3: Systematic Integration Execution**

### **Task 3.1: Pre-Integration Preparation**

```bash
# Create integration branch and backup
git checkout -b "integrate-$(basename $REPO_PATH)"
git status > pre-integration-status.log

# Create integration tracking
echo "=== INTEGRATION SESSION: $(date) ===" > integration-log.md
echo "Source: $REPO_PATH" >> integration-log.md  
echo "Target: main repository" >> integration-log.md
```

### **Task 3.2: Staged File Integration**

```bash
# Stage 1: Core Infrastructure (services, critical types)
echo "=== STAGE 1: CORE INFRASTRUCTURE ==="
mkdir -p src/services/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//') 
mkdir -p src/types/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//')

# Copy core services with conflict checking
find $REPO_PATH/src/services -name "*.ts" | while read file; do
  target_path="src/services/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//')/$(basename $file)"
  
  if [ -f "$target_path" ]; then
    echo "CONFLICT: $target_path already exists - manual merge required"
    cp "$file" "${target_path}.new"
  else
    cp "$file" "$target_path"
    echo "INTEGRATED: $target_path"
  fi
done

# Stage 2: React Components and Hooks
echo "=== STAGE 2: REACT COMPONENTS ==="  
mkdir -p src/hooks/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//')
mkdir -p src/components/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//')

# Apply same conflict-checking pattern for hooks and components

# Stage 3: Test Infrastructure  
echo "=== STAGE 3: TEST INFRASTRUCTURE ==="
# Copy Jest configurations
cp $REPO_PATH/jest.config*.js . 2>/dev/null || echo "No Jest configs to copy"

# Copy test setup files
mkdir -p src/test/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//')
find $REPO_PATH/src/test -name "*.ts" -exec cp {} src/test/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-/')/ \; 2>/dev/null

# Stage 4: Package.json Script Integration
echo "=== STAGE 4: SCRIPT INTEGRATION ==="
# Extract test scripts from source package.json  
grep -E "\"test:" $REPO_PATH/package.json >> scripts-to-add.txt || echo "No test scripts found"
```

### **Task 3.3: Path Resolution and Import Fixes**

```bash
# Fix import paths systematically
echo "=== IMPORT PATH RESOLUTION ==="

# Find all files with relative imports that need fixing
find src/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//') -name "*.ts" -o -name "*.tsx" | while read file; do
  echo "Checking imports in: $file"
  
  # Fix common import path issues
  sed -i.bak 's|from "\.\./\.\./|from "../../../|g' "$file"
  sed -i.bak 's|from "\.\./|from "../../|g' "$file"
  
  # Check for unresolved imports
  grep -n "from.*\.\." "$file" | head -5
done

# Verify TypeScript compilation
echo "=== TYPESCRIPT COMPILATION CHECK ==="
npx tsc --noEmit --skipLibCheck src/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//')/**/*.ts 2>&1 | head -20
```

---

## 🧪 **Phase 4: Test Infrastructure Integration**

### **Task 4.1: Jest Configuration Porting**

```bash
# Port specialized Jest configurations
echo "=== JEST CONFIGURATION PORTING ==="

# Analyze source Jest configs
for config in $REPO_PATH/jest.config*.js; do
  if [ -f "$config" ]; then
    config_name=$(basename $config)
    echo "Found Jest config: $config_name"
    
    # Copy with appropriate naming
    cp "$config" "jest.config.$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//').js"
    
    # Extract specialized settings
    grep -E "(testMatch|setupFilesAfterEnv|testTimeout)" "$config"
  fi
done

# Add test scripts to package.json (manual step documented)
echo "=== REQUIRED PACKAGE.JSON ADDITIONS ==="
echo "Add these scripts to package.json:"
grep -E "\"test:" $REPO_PATH/package.json | sed "s/\"test:/\"test:$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//'):/g"
```

### **Task 4.2: Mock Strategy Harmonization**

```bash
# Identify mock strategies and potential conflicts  
echo "=== MOCK STRATEGY ANALYSIS ==="

# Find mock files in source
find $REPO_PATH/src -name "*mock*" -o -name "__mocks__" | while read mock_file; do
  echo "Source mock: $mock_file"
  
  # Check for conflicts with existing mocks
  mock_name=$(basename $mock_file)
  if [ -f "src/__mocks__/$mock_name" ] || [ -f "src/test/mocks/$mock_name" ]; then
    echo "  CONFLICT: Mock already exists in main repo"
  else
    echo "  SAFE: No conflict detected"
  fi
done

# Extract mock patterns
echo "Mock patterns in source:"
grep -r "jest.mock" $REPO_PATH/src/ | head -10
```

---

## ✅ **Phase 5: Post-Integration Verification**

### **Task 5.1: Compilation Verification**

```bash
# Verify TypeScript compilation  
echo "=== POST-INTEGRATION COMPILATION CHECK ==="
npx tsc --noEmit --skipLibCheck 2>&1 | tee post-integration-compile.log

# Count and categorize errors
error_count=$(grep -c "error TS" post-integration-compile.log || echo "0")
echo "TypeScript errors found: $error_count"

if [ $error_count -gt 0 ]; then
  echo "Top 10 error types:"
  grep "error TS" post-integration-compile.log | cut -d: -f4 | sort | uniq -c | sort -nr | head -10
fi
```

### **Task 5.2: Test Execution Verification**

```bash
# Attempt to run integrated tests  
echo "=== POST-INTEGRATION TEST VERIFICATION ==="

# Try to run component-specific tests
component_name=$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//')

# Test with new Jest config if it exists
if [ -f "jest.config.$component_name.js" ]; then
  echo "Testing with specialized config..."
  npm test -- --config "jest.config.$component_name.js" --passWithNoTests --testTimeout=15000 | tee "test-results-$component_name.log"
else
  echo "Testing with default config..."
  npm test -- --testPathPattern="$component_name" --passWithNoTests --testTimeout=15000 | tee "test-results-$component_name.log" 
fi

# Extract test results
if [ -f "test-results-$component_name.log" ]; then
  echo "=== TEST RESULTS SUMMARY ==="
  grep -E "(Tests:|PASS|FAIL|✓|✗|passed|failed)" "test-results-$component_name.log" | tail -10
  
  # Compare with baseline  
  echo "Baseline test results from source repo:"
  cat $REPO_PATH/test-results-pre-integration.log | grep -E "(Tests:|PASS|FAIL)" | tail -5
fi
```

### **Task 5.3: Integration Success Assessment**

```bash
# Generate integration report
echo "=== INTEGRATION SUCCESS REPORT ===" > integration-report-$(date +%Y%m%d).md

# File integration summary
echo "## Files Integrated" >> integration-report-$(date +%Y%m%d).md  
find src/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//') -name "*.ts" -o -name "*.tsx" | wc -l >> integration-report-$(date +%Y%m%d).md

# Compilation status
echo "## Compilation Status" >> integration-report-$(date +%Y%m%d).md
echo "TypeScript errors: $error_count" >> integration-report-$(date +%Y%m%d).md

# Test status  
echo "## Test Status" >> integration-report-$(date +%Y%m%d).md
if [ -f "test-results-$component_name.log" ]; then
  grep -E "(Tests:|passed|failed)" "test-results-$component_name.log" | tail -3 >> integration-report-$(date +%Y%m%d).md
else
  echo "Tests not yet functional - requires restoration work" >> integration-report-$(date +%Y%m%d).md
fi

# Integration recommendations
echo "## Next Steps" >> integration-report-$(date +%Y%m%d).md
if [ $error_count -gt 50 ]; then
  echo "- HIGH PRIORITY: Fix TypeScript compilation errors ($error_count found)" >> integration-report-$(date +%Y%m%d).md
fi

if [ ! -f "test-results-$component_name.log" ] || grep -q "No tests found" "test-results-$component_name.log"; then
  echo "- HIGH PRIORITY: Restore test infrastructure functionality" >> integration-report-$(date +%Y%m%d).md
fi

echo "- MEDIUM PRIORITY: Optimize import paths and resolve any path conflicts" >> integration-report-$(date +%Y%m%d).md
echo "- LOW PRIORITY: Performance optimization and cleanup" >> integration-report-$(date +%Y%m%d).md
```

---

## 🔧 **Phase 6: Restoration Work Automation**

### **Task 6.1: Systematic Error Resolution**

```bash
# Automate common TypeScript error fixes
echo "=== AUTOMATED ERROR RESOLUTION ==="

# Fix unused import warnings
find src/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//') -name "*.ts" -o -name "*.tsx" | while read file; do
  # Remove unused imports (basic patterns)
  sed -i.bak '/^import.*{.*}.*from.*$/{/\<\(never_used\|unused_var\)\>/d;}' "$file"
done

# Fix Set/Map iteration issues  
find src/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//') -name "*.ts" -o -name "*.tsx" | while read file; do
  sed -i.bak 's/\[\.\.\.\(new Set([^)]*)\)\]/Array.from(\1)/g' "$file"
  sed -i.bak 's/\[\.\.\.\([^]]*Map[^]]*\)\]/Array.from(\1)/g' "$file"  
done

# Fix malformed jest.mock calls
find src/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//') -name "*.test.ts" -o -name "*.test.tsx" | while read file; do
  # Look for duplicate return statements in jest.mock
  if grep -q "return {.*return {" "$file"; then
    echo "FOUND malformed jest.mock in: $file - manual fix required"
  fi
done
```

### **Task 6.2: Test Infrastructure Restoration**  

```bash
# Create missing test setup files
echo "=== TEST INFRASTRUCTURE RESTORATION ==="

component_name=$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//')

# Create specialized Jest config if missing
if [ ! -f "jest.config.$component_name.js" ]; then
  cat > "jest.config.$component_name.js" << EOF
module.exports = {
  displayName: '${component_name^} Tests',
  preset: 'jest-expo', 
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/**/$component_name/**/__tests__/**/*.test.{ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '<rootDir>/src/test/serviceSetup.ts'  
  ],
  testTimeout: 15000,
  verbose: true
};
EOF
  echo "Created specialized Jest config: jest.config.$component_name.js"
fi

# Create test setup file if missing
mkdir -p "src/test/$component_name"
if [ ! -f "src/test/$component_name/setup.ts" ]; then
  cat > "src/test/$component_name/setup.ts" << EOF
// Specialized test setup for $component_name
import { jest } from '@jest/globals';

// Mock configurations specific to $component_name
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});
EOF
  echo "Created test setup: src/test/$component_name/setup.ts"
fi
```

---

## 📊 **Success Metrics and Reporting**

### **Integration Success Criteria**

```bash
# Define success metrics
echo "=== INTEGRATION SUCCESS CRITERIA ==="

# File integration metrics
files_integrated=$(find src/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//') -name "*.ts" -o -name "*.tsx" | wc -l)
echo "Files integrated: $files_integrated"

# Compilation success  
compilation_errors=$(grep -c "error TS" post-integration-compile.log 2>/dev/null || echo "0")
echo "Compilation errors: $compilation_errors"

# Test discovery success
if [ -f "test-results-$component_name.log" ] && ! grep -q "No tests found" "test-results-$component_name.log"; then
  echo "Test discovery: SUCCESS"
else
  echo "Test discovery: FAILED - tests not found or not running"
fi

# Success scoring
total_score=0
if [ $files_integrated -gt 5 ]; then total_score=$((total_score + 30)); fi
if [ $compilation_errors -lt 50 ]; then total_score=$((total_score + 40)); fi  
if grep -q "SUCCESS" <<< "$(echo 'Test discovery: SUCCESS')"; then total_score=$((total_score + 30)); fi

echo "=== INTEGRATION SCORE: $total_score/100 ==="
if [ $total_score -ge 80 ]; then
  echo "STATUS: INTEGRATION SUCCESSFUL"
elif [ $total_score -ge 50 ]; then  
  echo "STATUS: PARTIAL SUCCESS - restoration work needed"
else
  echo "STATUS: INTEGRATION FAILED - major issues need resolution"
fi
```

### **Final Integration Report**

```bash
# Generate comprehensive final report
cat > "INTEGRATION-REPORT-$(basename $REPO_PATH)-$(date +%Y%m%d).md" << EOF
# Integration Report: $(basename $REPO_PATH)
**Date**: $(date)
**Source**: $REPO_PATH  
**Target**: Main repository

## Pre-Integration Analysis
- **Source repository size**: $(du -sh $REPO_PATH | cut -f1)
- **Files analyzed**: $(find $REPO_PATH/src -name "*.ts" -o -name "*.tsx" | wc -l)
- **Test files found**: $(find $REPO_PATH/src -name "*test*" | wc -l)

## Integration Results  
- **Files integrated**: $files_integrated
- **TypeScript compilation errors**: $compilation_errors
- **Integration score**: $total_score/100

## Next Steps
$(if [ $compilation_errors -gt 50 ]; then echo "1. **CRITICAL**: Resolve TypeScript compilation errors"; fi)
$(if ! grep -q "Test discovery: SUCCESS" <<< "Test discovery: FAILED"; then echo "2. **HIGH**: Restore test infrastructure"; fi) 
3. **MEDIUM**: Optimize performance and resolve any remaining issues
4. **LOW**: Documentation and cleanup

## Files Requiring Manual Attention
$(find src/$(basename $REPO_PATH | sed 's/tdd_phase_[0-9]*-//') -name "*.new" 2>/dev/null | head -10 || echo "None found")

## Test Infrastructure Status  
$(if [ -f "jest.config.$component_name.js" ]; then echo "✅ Specialized Jest config created"; else echo "❌ Missing Jest config"; fi)
$(if [ -f "src/test/$component_name/setup.ts" ]; then echo "✅ Test setup file created"; else echo "❌ Missing test setup"; fi)

## Recommended Timeline
- **Phase 1** (TypeScript fixes): $(echo $(( compilation_errors / 10 )) | awk '{print ($1 > 8 ? $1 : 8)}') hours
- **Phase 2** (Test restoration): 4-6 hours  
- **Phase 3** (Verification): 2-3 hours
- **Total estimated time**: $(echo $(( compilation_errors / 10 + 8 )) | awk '{print ($1 > 16 ? $1 : 16)}') hours

Generated by TDD Integration Agent
EOF

echo "Integration report generated: INTEGRATION-REPORT-$(basename $REPO_PATH)-$(date +%Y%m%d).md"
```

---

## 🚀 **Usage Instructions for Integration Agent**

### **Command Sequence**:

```bash
# 1. Set target repository path
export REPO_PATH="docker/volumes/tdd_phase_X-component-name"

# 2. Execute complete integration workflow
bash -c "
# Phase 1: Analysis  
$(cat << 'ANALYSIS_BLOCK' | sed 's/^/  /'
# All Phase 1 commands from above
ANALYSIS_BLOCK
)

# Phase 2: Strategy
$(cat << 'STRATEGY_BLOCK' | sed 's/^/  /'  
# All Phase 2 commands from above
STRATEGY_BLOCK
)

# Phase 3: Integration
$(cat << 'INTEGRATION_BLOCK' | sed 's/^/  /'
# All Phase 3 commands from above  
INTEGRATION_BLOCK
)

# Phase 4: Test Infrastructure
$(cat << 'TEST_BLOCK' | sed 's/^/  /'
# All Phase 4 commands from above
TEST_BLOCK
)

# Phase 5: Verification
$(cat << 'VERIFICATION_BLOCK' | sed 's/^/  /'
# All Phase 5 commands from above
VERIFICATION_BLOCK
)

# Phase 6: Restoration  
$(cat << 'RESTORATION_BLOCK' | sed 's/^/  /'
# All Phase 6 commands from above
RESTORATION_BLOCK
)
"
```

### **Success Criteria**:
- ✅ **Integration Score ≥ 80/100**
- ✅ **TypeScript compilation errors < 50**  
- ✅ **Test discovery functional**
- ✅ **No critical file conflicts**
- ✅ **Comprehensive integration report generated**

### **Failure Handling**:
- **Score < 50**: Stop integration, report critical issues, recommend manual intervention
- **Score 50-79**: Complete integration, generate detailed restoration plan
- **Score ≥ 80**: Integration successful, proceed with optimization

---

**This prompt enables complete automation of TDD repository integration with systematic analysis, strategic migration, and comprehensive verification - suitable for any TDD phase integration work.**