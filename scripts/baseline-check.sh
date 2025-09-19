#!/bin/bash

# MyFarmstand Mobile - Baseline Quality Checks
# Run this script to establish baseline metrics before migration

echo "🔍 MyFarmstand Mobile - Baseline Quality Check"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in project root directory${NC}"
    exit 1
fi

# 1. TypeScript Compilation Check
echo ""
echo "1. TypeScript Compilation"
echo "------------------------"
npx tsc --noEmit --skipLibCheck > ts-errors.txt 2>&1
TS_EXIT_CODE=$?

if [ $TS_EXIT_CODE -eq 0 ]; then
    print_status 0 "TypeScript compilation successful"
    rm -f ts-errors.txt
else
    ERROR_COUNT=$(wc -l < ts-errors.txt)
    print_status 1 "TypeScript compilation failed with $ERROR_COUNT errors"
    echo ""
    print_info "First 10 errors:"
    head -10 ts-errors.txt
    echo ""
    print_warning "Full error list saved to ts-errors.txt"
fi

# 2. Lint Check
echo ""
echo "2. Code Linting"
echo "---------------"
if command -v npx eslint &> /dev/null; then
    npx eslint src --ext .ts,.tsx --max-warnings 0 > lint-warnings.txt 2>&1
    LINT_EXIT_CODE=$?

    if [ $LINT_EXIT_CODE -eq 0 ]; then
        print_status 0 "ESLint check passed"
        rm -f lint-warnings.txt
    else
        WARNING_COUNT=$(wc -l < lint-warnings.txt)
        print_status 1 "ESLint found $WARNING_COUNT issues"
        echo ""
        print_info "First 10 warnings:"
        head -10 lint-warnings.txt
        echo ""
        print_warning "Full warning list saved to lint-warnings.txt"
    fi
else
    print_warning "ESLint not found, skipping lint check"
fi

# 3. Test Status
echo ""
echo "3. Test Suite Status"
echo "-------------------"
npm run test -- --passWithNoTests --silent > test-results.txt 2>&1
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_status 0 "Test suite passed"
    # Count test files
    TEST_FILES=$(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
    print_info "Found $TEST_FILES test files"
    rm -f test-results.txt
else
    print_status 1 "Test suite failed"
    echo ""
    print_info "Test failures:"
    tail -20 test-results.txt
    echo ""
    print_warning "Full test results saved to test-results.txt"
fi

# 4. Bundle Size Analysis
echo ""
echo "4. Bundle Size Analysis"
echo "----------------------"
if [ -f "dist/main.js" ]; then
    BUNDLE_SIZE=$(stat -f%z dist/main.js 2>/dev/null || stat -c%s dist/main.js)
    BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024 / 1024))
    print_info "Current bundle size: ${BUNDLE_SIZE_MB}MB"

    if [ $BUNDLE_SIZE_MB -gt 50 ]; then
        print_warning "Bundle size exceeds 50MB - migration will provide significant reduction"
    else
        print_status 0 "Bundle size within reasonable limits"
    fi
else
    print_warning "No bundle found - run 'npm run build' to analyze bundle size"
fi

# 5. Dependency Analysis
echo ""
echo "5. Dependency Analysis"
echo "---------------------"
TOTAL_DEPS=$(npm list --depth=0 2>/dev/null | grep -c "├──\|└──" || echo "0")
DEV_DEPS=$(cat package.json | jq '.devDependencies | length' 2>/dev/null || echo "unknown")
PROD_DEPS=$(cat package.json | jq '.dependencies | length' 2>/dev/null || echo "unknown")

print_info "Total dependencies: $TOTAL_DEPS"
print_info "Production dependencies: $PROD_DEPS"
print_info "Development dependencies: $DEV_DEPS"

# Check for known problematic packages
HEAVY_PACKAGES=("react-native-vector-icons" "@react-native-community" "react-native-reanimated")
for package in "${HEAVY_PACKAGES[@]}"; do
    if npm list "$package" >/dev/null 2>&1; then
        print_warning "Heavy package detected: $package"
    fi
done

# 6. File Structure Analysis
echo ""
echo "6. File Structure Analysis"
echo "-------------------------"
SCREEN_COUNT=$(find src/screens -name "*.tsx" 2>/dev/null | wc -l)
COMPONENT_COUNT=$(find src/components -name "*.tsx" 2>/dev/null | wc -l)
HOOK_COUNT=$(find src/hooks -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
SERVICE_COUNT=$(find src/services -name "*.ts" 2>/dev/null | wc -l)

print_info "Screens: $SCREEN_COUNT"
print_info "Components: $COMPONENT_COUNT"
print_info "Hooks: $HOOK_COUNT"
print_info "Services: $SERVICE_COUNT"

# Identify customer vs business screens
CUSTOMER_SCREENS=$(find src/screens -name "*Shop*" -o -name "*Cart*" -o -name "*Checkout*" -o -name "*Order*" -o -name "*Profile*" -o -name "*Login*" -o -name "*Register*" | wc -l)
BUSINESS_SCREENS=$(find src/screens -name "*Admin*" -o -name "*Inventory*" -o -name "*Marketing*" -o -name "*Executive*" | wc -l)

print_info "Customer screens: $CUSTOMER_SCREENS"
print_info "Business screens: $BUSINESS_SCREENS"

# 7. Kiosk Integration Analysis
echo ""
echo "7. Kiosk Integration Analysis"
echo "----------------------------"
KIOSK_REFERENCES=$(grep -r "kiosk\|Kiosk" src --include="*.ts" --include="*.tsx" | wc -l)
KIOSK_FILES=$(grep -l "kiosk\|Kiosk" src/**/*.{ts,tsx} 2>/dev/null | wc -l)

print_info "Kiosk references found: $KIOSK_REFERENCES"
print_info "Files with kiosk code: $KIOSK_FILES"

if [ $KIOSK_REFERENCES -gt 0 ]; then
    print_warning "Kiosk integration detected - will need dedicated kiosk app"
    echo ""
    print_info "Files with kiosk references:"
    grep -l "kiosk\|Kiosk" src/**/*.{ts,tsx} 2>/dev/null | head -5
fi

# 8. Migration Readiness Assessment
echo ""
echo "8. Migration Readiness Assessment"
echo "================================"

MIGRATION_SCORE=0
TOTAL_CHECKS=6

# Check 1: TypeScript errors
if [ $TS_EXIT_CODE -eq 0 ]; then
    MIGRATION_SCORE=$((MIGRATION_SCORE + 1))
    print_status 0 "TypeScript compilation clean"
else
    print_status 1 "TypeScript errors need fixing before migration"
fi

# Check 2: Test coverage
if [ $TEST_EXIT_CODE -eq 0 ]; then
    MIGRATION_SCORE=$((MIGRATION_SCORE + 1))
    print_status 0 "Tests passing"
else
    print_status 1 "Test failures need addressing"
fi

# Check 3: Clear module boundaries
if [ $CUSTOMER_SCREENS -gt 0 ] && [ $BUSINESS_SCREENS -gt 0 ]; then
    MIGRATION_SCORE=$((MIGRATION_SCORE + 1))
    print_status 0 "Clear customer/business screen separation"
else
    print_status 1 "Module boundaries unclear"
fi

# Check 4: Bundle size indicates need for split
if [ $BUNDLE_SIZE_MB -gt 30 ]; then
    MIGRATION_SCORE=$((MIGRATION_SCORE + 1))
    print_status 0 "Bundle size justifies migration"
else
    print_warning "Bundle size may not justify migration complexity"
fi

# Check 5: Kiosk complexity
if [ $KIOSK_REFERENCES -gt 10 ]; then
    MIGRATION_SCORE=$((MIGRATION_SCORE + 1))
    print_status 0 "Kiosk complexity justifies separate app"
else
    print_warning "Kiosk integration is minimal"
fi

# Check 6: Dependency management
if [ "$PROD_DEPS" != "unknown" ] && [ $PROD_DEPS -gt 30 ]; then
    MIGRATION_SCORE=$((MIGRATION_SCORE + 1))
    print_status 0 "Dependency count justifies splitting"
else
    print_warning "Dependency count may not justify splitting"
fi

# Final Assessment
echo ""
echo "Migration Readiness Score: $MIGRATION_SCORE/$TOTAL_CHECKS"

if [ $MIGRATION_SCORE -ge 5 ]; then
    print_status 0 "READY: High confidence for migration success"
elif [ $MIGRATION_SCORE -ge 3 ]; then
    print_warning "CAUTION: Address issues before proceeding with migration"
else
    print_status 1 "NOT READY: Significant issues need resolution first"
fi

# Generate Summary Report
echo ""
echo "9. Summary Report"
echo "=================="
echo "Baseline check completed at: $(date)"
echo ""
echo "Issues to address before migration:"
if [ $TS_EXIT_CODE -ne 0 ]; then
    echo "- Fix TypeScript compilation errors"
fi
if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "- Resolve test failures"
fi
echo ""
echo "Recommended next steps:"
echo "1. Fix immediate TypeScript/syntax errors"
echo "2. Ensure all tests pass"
echo "3. Review kiosk integration strategy"
echo "4. Plan module boundaries"
echo "5. Set up shared core package structure"

echo ""
print_info "Baseline check complete. Review generated files:"
if [ -f "ts-errors.txt" ]; then
    echo "  - ts-errors.txt: TypeScript compilation errors"
fi
if [ -f "lint-warnings.txt" ]; then
    echo "  - lint-warnings.txt: ESLint warnings"
fi
if [ -f "test-results.txt" ]; then
    echo "  - test-results.txt: Test failures"
fi