# TDD Phase 4 Test Infrastructure Restoration - Focused Prompt

## Mission: Migrate ALL Test Files from Reference Volumes to Workspace

You have access to 5 TDD Phase 4 volumes mounted at `/reference/` containing 2,126 test files that need to be migrated to `/workspace`. These tests currently pass at ~100% in their volumes but need infrastructure harmonization to work in the main repository.

## CRITICAL: Your Mounted Volumes

The following 5 volumes are mounted at `/reference/` and contain ALL the test files you need to migrate:

1. `/reference/tdd_phase_4-decision-support/`
2. `/reference/tdd_phase_4-cross-role-integration/`
3. `/reference/tdd_phase_4-executive-components/`
4. `/reference/tdd_phase_4-executive-hooks/`
5. `/reference/tdd_phase_4-executive-screens/`

## Phase 1: Verify Access to All Reference Volumes

### MANDATORY FIRST STEP - Verify you can access all volumes

```bash
echo "=== VERIFYING ACCESS TO TDD PHASE 4 VOLUMES ==="
echo "Expected: 5 volumes with 2,126 total test files"
echo ""

# Verify each volume exists and count test files
echo "1. Decision Support Volume:"
if [ -d "/reference/tdd_phase_4-decision-support" ]; then
  echo "   ✅ Found"
  echo -n "   Test files: "
  find /reference/tdd_phase_4-decision-support -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l
else
  echo "   ❌ NOT FOUND - CRITICAL ERROR"
fi

echo "2. Cross-Role Integration Volume:"
if [ -d "/reference/tdd_phase_4-cross-role-integration" ]; then
  echo "   ✅ Found"
  echo -n "   Test files: "
  find /reference/tdd_phase_4-cross-role-integration -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l
else
  echo "   ❌ NOT FOUND - CRITICAL ERROR"
fi

echo "3. Executive Components Volume:"
if [ -d "/reference/tdd_phase_4-executive-components" ]; then
  echo "   ✅ Found"
  echo -n "   Test files: "
  find /reference/tdd_phase_4-executive-components -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l
else
  echo "   ❌ NOT FOUND - CRITICAL ERROR"
fi

echo "4. Executive Hooks Volume:"
if [ -d "/reference/tdd_phase_4-executive-hooks" ]; then
  echo "   ✅ Found"
  echo -n "   Test files: "
  find /reference/tdd_phase_4-executive-hooks -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l
else
  echo "   ❌ NOT FOUND - CRITICAL ERROR"
fi

echo "5. Executive Screens Volume:"
if [ -d "/reference/tdd_phase_4-executive-screens" ]; then
  echo "   ✅ Found"
  echo -n "   Test files: "
  find /reference/tdd_phase_4-executive-screens -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l
else
  echo "   ❌ NOT FOUND - CRITICAL ERROR"
fi

echo ""
echo "TOTAL TEST FILES AVAILABLE:"
find /reference/tdd_phase_4-* -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l
```

## Phase 2: Copy ALL Jest Configurations

### Copy every Jest config from all 5 volumes

```bash
echo "=== COPYING ALL JEST CONFIGURATIONS ==="

# Decision Support configs
echo "Copying from decision-support..."
for config in /reference/tdd_phase_4-decision-support/jest.config*.js; do
  if [ -f "$config" ]; then
    cp "$config" /workspace/
    echo "  ✅ Copied $(basename $config)"
  fi
done

# Cross-Role Integration configs
echo "Copying from cross-role-integration..."
for config in /reference/tdd_phase_4-cross-role-integration/jest.config*.js; do
  if [ -f "$config" ]; then
    cp "$config" /workspace/
    echo "  ✅ Copied $(basename $config)"
  fi
done

# Executive Components configs
echo "Copying from executive-components..."
for config in /reference/tdd_phase_4-executive-components/jest.config*.js; do
  if [ -f "$config" ]; then
    cp "$config" /workspace/
    echo "  ✅ Copied $(basename $config)"
  fi
done

# Executive Hooks configs
echo "Copying from executive-hooks..."
for config in /reference/tdd_phase_4-executive-hooks/jest.config*.js; do
  if [ -f "$config" ]; then
    cp "$config" /workspace/
    echo "  ✅ Copied $(basename $config)"
  fi
done

# Executive Screens configs
echo "Copying from executive-screens..."
for config in /reference/tdd_phase_4-executive-screens/jest.config*.js; do
  if [ -f "$config" ]; then
    cp "$config" /workspace/
    echo "  ✅ Copied $(basename $config)"
  fi
done

echo "Total Jest configs in workspace:"
ls /workspace/jest.config*.js | wc -l
```

## Phase 3: Copy ALL Test Setup Files

### Copy test infrastructure from all volumes

```bash
echo "=== COPYING TEST SETUP INFRASTRUCTURE ==="

# Create test directory
mkdir -p /workspace/src/test
mkdir -p /workspace/src/test/mocks
mkdir -p /workspace/src/__mocks__

# Copy from each volume
for volume in /reference/tdd_phase_4-*; do
  volume_name=$(basename "$volume")
  echo "Processing $volume_name..."
  
  # Copy test setup files
  if [ -d "$volume/src/test" ]; then
    cp -r "$volume/src/test/"* /workspace/src/test/ 2>/dev/null || true
    echo "  ✅ Copied test setup files"
  fi
  
  # Copy mocks
  if [ -d "$volume/src/__mocks__" ]; then
    cp -r "$volume/src/__mocks__/"* /workspace/src/__mocks__/ 2>/dev/null || true
    echo "  ✅ Copied __mocks__"
  fi
done
```

## Phase 4: Copy ALL Source Files and Tests

### CRITICAL: Copy everything from all 5 volumes

```bash
echo "=== COPYING ALL SOURCE FILES AND TESTS ==="

# Decision Support
echo "1. Copying Decision Support..."
if [ -d "/reference/tdd_phase_4-decision-support/src" ]; then
  mkdir -p /workspace/src/features/decision-support
  cp -r /reference/tdd_phase_4-decision-support/src/features/decision-support/* /workspace/src/features/decision-support/ 2>/dev/null || true
  echo "   ✅ Decision support files copied"
fi

# Cross-Role Integration  
echo "2. Copying Cross-Role Integration..."
if [ -d "/reference/tdd_phase_4-cross-role-integration/src" ]; then
  mkdir -p /workspace/src/features/cross-role
  mkdir -p /workspace/src/navigation
  cp -r /reference/tdd_phase_4-cross-role-integration/src/features/cross-role/* /workspace/src/features/cross-role/ 2>/dev/null || true
  cp -r /reference/tdd_phase_4-cross-role-integration/src/navigation/* /workspace/src/navigation/ 2>/dev/null || true
  echo "   ✅ Cross-role files copied"
fi

# Executive Components
echo "3. Copying Executive Components..."
if [ -d "/reference/tdd_phase_4-executive-components/src" ]; then
  mkdir -p /workspace/src/components/executive
  cp -r /reference/tdd_phase_4-executive-components/src/components/executive/* /workspace/src/components/executive/ 2>/dev/null || true
  echo "   ✅ Executive components copied"
fi

# Executive Hooks
echo "4. Copying Executive Hooks..."
if [ -d "/reference/tdd_phase_4-executive-hooks/src" ]; then
  mkdir -p /workspace/src/hooks/executive
  cp -r /reference/tdd_phase_4-executive-hooks/src/hooks/executive/* /workspace/src/hooks/executive/ 2>/dev/null || true
  echo "   ✅ Executive hooks copied"
fi

# Executive Screens
echo "5. Copying Executive Screens..."
if [ -d "/reference/tdd_phase_4-executive-screens/src" ]; then
  mkdir -p /workspace/src/screens/executive
  cp -r /reference/tdd_phase_4-executive-screens/src/screens/executive/* /workspace/src/screens/executive/ 2>/dev/null || true
  echo "   ✅ Executive screens copied"
fi

# Copy ALL other necessary directories
echo "6. Copying supporting files..."
for volume in /reference/tdd_phase_4-*; do
  # Copy services
  if [ -d "$volume/src/services" ]; then
    mkdir -p /workspace/src/services
    cp -r "$volume/src/services/"* /workspace/src/services/ 2>/dev/null || true
  fi
  
  # Copy types
  if [ -d "$volume/src/types" ]; then
    mkdir -p /workspace/src/types
    cp -r "$volume/src/types/"* /workspace/src/types/ 2>/dev/null || true
  fi
  
  # Copy utils
  if [ -d "$volume/src/utils" ]; then
    mkdir -p /workspace/src/utils
    cp -r "$volume/src/utils/"* /workspace/src/utils/ 2>/dev/null || true
  fi
done

echo ""
echo "=== VERIFICATION ==="
echo "Test files in workspace:"
find /workspace -name "*.test.ts" -o -name "*.test.tsx" | wc -l
echo "Expected: 2,126 test files"
```

## Phase 5: Fix Import Paths

### Update all import paths to work in workspace

```bash
echo "=== FIXING IMPORT PATHS ==="

# Fix all TypeScript/JavaScript files
find /workspace/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e 's|from ["'"'"']../../test/|from "@/test/|g' \
  -e 's|from ["'"'"']../../../test/|from "@/test/|g' \
  -e 's|from ["'"'"']../../../../test/|from "@/test/|g' \
  -e 's|from ["'"'"']../../utils/|from "@/utils/|g' \
  -e 's|from ["'"'"']../../../utils/|from "@/utils/|g' \
  -e 's|from ["'"'"']../../services/|from "@/services/|g' \
  -e 's|from ["'"'"']../../../services/|from "@/services/|g' \
  {} \;

echo "✅ Import paths fixed"
```

## Phase 6: Update Package.json

### Add all test scripts

```bash
echo "=== UPDATING PACKAGE.JSON ==="

# Create package.json if it doesn't exist
if [ ! -f /workspace/package.json ]; then
  echo '{
  "name": "tdd-phase-4-restoration",
  "version": "1.0.0",
  "scripts": {}
}' > /workspace/package.json
fi

# Add test scripts using Node.js
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('/workspace/package.json', 'utf8'));

pkg.scripts = pkg.scripts || {};

// Add all test scripts
pkg.scripts['test'] = 'jest';
pkg.scripts['test:hooks:executive'] = 'jest --config jest.config.hooks.executive.js';
pkg.scripts['test:screens:executive'] = 'jest --config jest.config.screens.executive.js';
pkg.scripts['test:components:executive'] = 'jest --config jest.config.components.executive.js';
pkg.scripts['test:cross-role'] = 'jest --config jest.config.cross-role.js';
pkg.scripts['test:decision-support'] = 'jest --config jest.config.decision-support.js';
pkg.scripts['test:all:executive'] = 'npm run test:hooks:executive && npm run test:screens:executive && npm run test:components:executive';

fs.writeFileSync('/workspace/package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Package.json updated with test scripts');
"
```

## Phase 7: Verify Migration Success

### CRITICAL: Verify ALL files were copied

```bash
echo "=== FINAL VERIFICATION ==="
echo ""
echo "📊 Migration Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count test files
test_count=$(find /workspace -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
echo "Test files migrated: $test_count"
echo "Expected: 2,126"

if [ $test_count -lt 2000 ]; then
  echo "❌ CRITICAL: Migration incomplete! Only $test_count files migrated."
  echo ""
  echo "Breakdown by category:"
  echo "  Hooks: $(find /workspace/src/hooks -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)"
  echo "  Screens: $(find /workspace/src/screens -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)"
  echo "  Components: $(find /workspace/src/components -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)"
  echo "  Cross-role: $(find /workspace/src/features/cross-role -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)"
  echo "  Decision support: $(find /workspace/src/features/decision-support -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)"
else
  echo "✅ Migration successful!"
fi

# Count Jest configs
jest_count=$(ls /workspace/jest.config*.js 2>/dev/null | wc -l)
echo ""
echo "Jest configurations: $jest_count"

# Check TypeScript compilation
echo ""
echo "TypeScript compilation check:"
cd /workspace && npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0 errors"
```

## Phase 8: Run Tests

### Run all test suites to verify they work

```bash
echo "=== RUNNING TESTS ==="

cd /workspace

# Run all tests
npm test 2>&1 | tee test-results.log

# Show summary
echo ""
echo "Test Summary:"
grep "Test Suites:" test-results.log
grep "Tests:" test-results.log
```

## Success Criteria

You have completed the restoration when:
1. ✅ All 2,126 test files are in /workspace
2. ✅ All Jest configurations are copied
3. ✅ TypeScript compilation has 0 errors
4. ✅ All test suites run successfully

## IMPORTANT REMINDERS

1. The 5 volumes are mounted at `/reference/` NOT at `docker/volumes/`
2. You must copy ALL files, not just a few
3. The goal is 2,126 test files, not 19
4. Do NOT declare success until you have migrated everything
5. Run the verification commands to ensure complete migration