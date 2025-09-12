#!/bin/bash
echo "=== TESTING IMPROVED TEST OUTPUT PARSING ==="

TEST_OUTPUTS=(
    "Tests: 13 passed, 0 failed"
    "Tests: 5 passed"
    "Tests: 15 passed, 2 failed, 17 total"
    "Tests: 8 passing, 0 failing"
    "Tests: 0 passed, 0 failed"
)

echo "Current parsing logic:"
parse_current() {
    local output="$1"
    TESTS_PASS=$(echo "$output" | grep -E "Tests:.*passed" | sed -E 's/.*([0-9]+) passed.*/\1/' | tail -1 || echo "0")
    echo "  Input: '$output'"
    echo "  Current: '$TESTS_PASS'"
}

echo "Enhanced parsing logic:"
parse_enhanced() {
    local output="$1"
    # Try multiple patterns in order of preference
    TESTS_PASS=$(echo "$output" | grep -E "Tests:.*([0-9]+) (passed|passing)" | sed -E 's/.*Tests:.*([0-9]+) (passed|passing).*/\1/' | tail -1)
    # Fallback to original if nothing found
    if [ -z "$TESTS_PASS" ]; then
        TESTS_PASS=$(echo "$output" | grep -E "Tests:.*passed" | sed -E 's/.*([0-9]+) passed.*/\1/' | tail -1 || echo "0")
    fi
    TESTS_PASS=${TESTS_PASS:-0}
    echo "  Enhanced: '$TESTS_PASS'"
}

for test_output in "${TEST_OUTPUTS[@]}"; do
    echo ""
    echo "--- Testing: '$test_output' ---"
    parse_current "$test_output"
    parse_enhanced "$test_output"
done
