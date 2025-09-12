#!/bin/bash
echo "=== TESTING CLAUDE OUTPUT PATTERN RECOGNITION ==="

# Sample Claude output from Phase 4 prompts
CLAUDE_OUTPUTS=(
    "✅ Completed: ExecutiveDashboard"
    "✅ KPI group complete, committing"
    "Tests: 32/40 passing (80%)"
    "File created: src/components/KPICard.tsx"
    "File modified: package.json"
    "🚀 Starting inventory-sales integration"
    "📝 Created file: ExecutiveDashboard.tsx"
    "Regular text that shouldn't trigger anything"
)

# Current patterns (from entrypoint)
test_current_patterns() {
    local line="$1"
    local result=""
    
    if [[ "$line" =~ "File created:" ]] || [[ "$line" =~ "File modified:" ]]; then
        FILE=$(echo "$line" | sed 's/.*File [^:]*: //')
        result="FILE: $FILE"
    fi
    
    echo "  Current: '$result'"
}

# Enhanced patterns  
test_enhanced_patterns() {
    local line="$1"
    local result=""
    
    # Original patterns
    if [[ "$line" =~ "File created:" ]] || [[ "$line" =~ "File modified:" ]]; then
        FILE=$(echo "$line" | sed 's/.*File [^:]*: //')
        result="FILE: $FILE"
    fi
    
    # New patterns for Phase 4
    if [[ "$line" =~ "✅ Completed:" ]] || [[ "$line" =~ "✅.*complete" ]]; then
        TASK=$(echo "$line" | sed 's/✅ Completed: //' | sed 's/✅ //' | sed 's/ complete.*//')
        result="${result} TASK: $TASK"
    fi

    if [[ "$line" =~ "Tests:.*passing" ]]; then
        result="${result} PROGRESS: $line"
    fi
    
    if [[ "$line" =~ "📝 Created file:" ]]; then
        FILE=$(echo "$line" | sed 's/.*Created file: //')
        result="${result} CREATED: $FILE"
    fi
    
    echo "  Enhanced: '$result'"
}

for output in "${CLAUDE_OUTPUTS[@]}"; do
    echo ""
    echo "--- Testing: '$output' ---"
    test_current_patterns "$output"
    test_enhanced_patterns "$output"
done
