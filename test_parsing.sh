#!/bin/bash
echo "=== TESTING TEST OUTPUT PARSING FIXES ==="

# Test data - various Jest output formats
TEST_OUTPUTS=(
    "Tests: 13 passed, 0 failed"
    "✓ src/components/KPICard.test.tsx (5 tests)
Tests: 5 passed"
    "Test Suites: 3 passed, 3 total
Tests: 15 passed, 2 failed, 17 total"
    "All tests passed! 
Tests: 8 passing, 0 failing"
    "jest --passWithNoTests
Tests: 0 passed, 0 failed"
)

echo "Current parsing logic:"
parse_current() {
    local output="$1"
    TESTS_PASS=$(echo "$output" | grep -E "Tests:.*passed" | sed -E 's/.*([0-9]+) passed.*/\1/' | tail -1 || echo "0")
    echo "  Input: '$output'"
    echo "  Extracted: '$TESTS_PASS' passing"
}

echo "Enhanced parsing logic:"
parse_enhanced() {
    local output="$1"
    TESTS_PASS=$(echo "$output" | grep -E "(Tests?:.*([0-9]+) passed|([0-9]+) passing)" | sed -E 's/.*([0-9]+) (passed|passing).*/\1/' | tail -1 || echo "0")
    echo "  Input: '$output'"
    echo "  Extracted: '$TESTS_PASS' passing"
}

for test_output in "${TEST_OUTPUTS[@]}"; do
    echo ""
    echo "--- Test Case ---"
    parse_current "$test_output"
    parse_enhanced "$test_output"
done
