#!/bin/bash
echo "=== TESTING REFINED CLAUDE PATTERNS ==="

CLAUDE_OUTPUTS=(
    "✅ Completed: ExecutiveDashboard" 
    "✅ KPI group complete, committing"
    "Tests: 32/40 passing (80%)"
    "Tests: 8 passing, 0 failing"
)

test_enhanced_patterns() {
    local line="$1"
    echo "  Input: '$line'"
    
    # Task completion patterns
    if [[ "$line" =~ ✅.*[Cc]omplete[d]?:?\s*(.+) ]]; then
        TASK="${BASH_REMATCH[1]}"
        echo "    -> TASK COMPLETED: $TASK"
    elif [[ "$line" =~ ✅.*([A-Za-z]+).*complete ]]; then
        TASK=$(echo "$line" | sed 's/✅ //' | sed 's/ complete.*//')
        echo "    -> TASK COMPLETED: $TASK"
    fi

    # Test progress patterns
    if [[ "$line" =~ Tests:.*([0-9]+.*passing|\([0-9]+%\)) ]]; then
        echo "    -> TEST PROGRESS: $line"
    fi
}

for output in "${CLAUDE_OUTPUTS[@]}"; do
    echo ""
    test_enhanced_patterns "$output"
done
