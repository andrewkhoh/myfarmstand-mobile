#!/bin/bash
# Validation script for agents to check their real progress

set -euo pipefail

AGENT_NAME="${1:-unknown}"
TARGET_PASS_RATE=85

echo "🔍 Validating Progress for: $AGENT_NAME"
echo "═══════════════════════════════════════"
echo ""

# Function to extract pass rate from test output
extract_pass_rate() {
    local TEST_OUTPUT="$1"
    # Extract pass rate from Jest output (e.g., "Tests: 15 passed, 3 failed, 18 total")
    local PASSED=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo 0)
    local TOTAL=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ total' | grep -oE '[0-9]+' || echo 1)
    
    if [ "$TOTAL" -eq 0 ]; then
        echo 0
    else
        echo $((PASSED * 100 / TOTAL))
    fi
}

# Function to check for pattern violations
check_pattern_compliance() {
    local FILES="$1"
    local VIOLATIONS=0
    
    echo "📋 Checking pattern compliance..."
    
    # Check for forbidden jest.mock patterns
    if grep -r "jest.mock.*@supabase/supabase-js" $FILES 2>/dev/null; then
        echo "  ❌ VIOLATION: Found jest.mock() for Supabase!"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
    
    # Check for manual mock creation
    if grep -r "const mock.*=.*{.*from:.*jest.fn()" $FILES 2>/dev/null; then
        echo "  ❌ VIOLATION: Found manual mock creation!"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
    
    # Check for SimplifiedSupabaseMock usage
    if ! grep -r "SimplifiedSupabaseMock" $FILES 2>/dev/null; then
        echo "  ❌ VIOLATION: SimplifiedSupabaseMock not used!"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
    
    if [ $VIOLATIONS -eq 0 ]; then
        echo "  ✅ Pattern compliance: 100%"
        return 0
    else
        echo "  ❌ Pattern violations found: $VIOLATIONS"
        return 1
    fi
}

# Determine test type based on agent
case "$AGENT_NAME" in
    "role-services")
        TEST_COMMAND="npm run test:services"
        TEST_FILES="src/services/__tests__/role*.test.ts"
        ;;
    "role-hooks")
        TEST_COMMAND="npm run test:hooks"
        TEST_FILES="src/hooks/__tests__/use*Role*.test.tsx"
        ;;
    "role-navigation")
        TEST_COMMAND="npm run test:services test:hooks"
        TEST_FILES="src/services/__tests__/navigation*.test.ts src/hooks/__tests__/useNavigation*.test.tsx"
        ;;
    "role-screens")
        TEST_COMMAND="npm run test:screens"
        TEST_FILES="src/screens/__tests__/*Role*.test.tsx"
        ;;
    "permission-ui")
        TEST_COMMAND="npm run test:components"
        TEST_FILES="src/components/__tests__/*Permission*.test.tsx"
        ;;
    *)
        echo "⚠️  Unknown agent type: $AGENT_NAME"
        TEST_COMMAND="npm test"
        TEST_FILES="src/**/__tests__/*.test.*"
        ;;
esac

# Run tests and capture output
echo "🧪 Running tests: $TEST_COMMAND"
echo "────────────────────────────────────"
TEST_OUTPUT=$($TEST_COMMAND 2>&1 || true)
echo "$TEST_OUTPUT"

# Extract metrics
PASS_RATE=$(extract_pass_rate "$TEST_OUTPUT")
echo ""
echo "📊 Test Results:"
echo "────────────────"
echo "  Pass Rate: ${PASS_RATE}%"
echo "  Target: ${TARGET_PASS_RATE}%"

# Check pattern compliance
echo ""
check_pattern_compliance "$TEST_FILES"

# Determine status
echo ""
echo "📋 Validation Summary:"
echo "─────────────────────"

SUCCESS=true

if [ $PASS_RATE -lt $TARGET_PASS_RATE ]; then
    echo "  ❌ Pass rate below target ($PASS_RATE% < $TARGET_PASS_RATE%)"
    SUCCESS=false
else
    echo "  ✅ Pass rate meets target ($PASS_RATE% ≥ $TARGET_PASS_RATE%)"
fi

if ! check_pattern_compliance "$TEST_FILES" 2>/dev/null; then
    echo "  ❌ Pattern compliance violations detected"
    SUCCESS=false
else
    echo "  ✅ Pattern compliance verified"
fi

# Regression check (if previous results exist)
PROGRESS_FILE="/shared/progress/${AGENT_NAME}.md"
if [ -f "$PROGRESS_FILE" ]; then
    PREVIOUS_RATE=$(grep "Pass rate:" "$PROGRESS_FILE" | tail -1 | grep -oE '[0-9]+' || echo 0)
    if [ $PASS_RATE -lt $PREVIOUS_RATE ]; then
        echo "  ⚠️  REGRESSION: Pass rate dropped from $PREVIOUS_RATE% to $PASS_RATE%"
        SUCCESS=false
    fi
fi

# Final verdict
echo ""
if [ "$SUCCESS" = true ]; then
    echo "✅ VALIDATION PASSED - Ready to commit!"
    echo ""
    echo "Suggested commit message:"
    echo "git add -A && git commit -m \"feat: $AGENT_NAME - $PASS_RATE% pass rate achieved"
    echo ""
    echo "Test Summary:"
    echo "- Pass rate: $PASS_RATE%"
    echo "- Pattern compliance: 100%"
    echo "- SimplifiedSupabaseMock: ✓\""
else
    echo "❌ VALIDATION FAILED - Must fix before proceeding!"
    echo ""
    echo "Required actions:"
    echo "1. Fix failing tests until $TARGET_PASS_RATE%+ pass rate"
    echo "2. Fix any pattern compliance violations"
    echo "3. Re-run this validation script"
    echo ""
    echo "DO NOT:"
    echo "- Claim success with failing tests"
    echo "- Proceed to next task"
    echo "- Make up success metrics"
    
    # Log failure for monitoring
    echo "$(date): Validation failed - Pass rate: $PASS_RATE%" >> "$PROGRESS_FILE"
    
    exit 1
fi

# Log success
echo "$(date): Validation passed - Pass rate: $PASS_RATE%" >> "$PROGRESS_FILE"