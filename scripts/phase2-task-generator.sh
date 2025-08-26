#!/bin/bash

# Phase 2 Task Generator - Creates specific task lists for each agent
# Based on infrastructure audit results

echo "🎯 PHASE 2 TASK GENERATOR"
echo "========================="
echo ""

COMM_DIR="./test-fixes-communication"
mkdir -p "$COMM_DIR/tasks"

# Function to generate service tasks
generate_service_tasks() {
    local category=$1
    local agent_id=$2
    local output_file="$COMM_DIR/tasks/${agent_id}.json"
    
    echo "Generating tasks for $agent_id..."
    
    cat > "$output_file" << EOF
{
  "agent_id": "$agent_id",
  "category": "$category",
  "priority": "CRITICAL",
  "reference_patterns": {
    "mock_setup": "service-test-pattern (REFERENCE).md#L25-95",
    "factory_reset": "service-test-pattern (REFERENCE).md#L150-160",
    "test_structure": "service-test-pattern (REFERENCE).md#L98-120"
  },
  "tasks": [
EOF

    # Find service files needing fixes
    local first=true
    for file in src/services/$category/__tests__/*.test.ts src/services/__tests__/*.test.ts; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file" .test.ts)
            local needs_mock=false
            local needs_factory=false
            
            # Check what's missing
            grep -q "SimplifiedSupabaseMock" "$file" || needs_mock=true
            grep -q "resetAllFactories\|Factory\.reset" "$file" || needs_factory=true
            
            if [ "$needs_mock" = true ] || [ "$needs_factory" = true ]; then
                [ "$first" = true ] && first=false || echo "," >> "$output_file"
                
                cat >> "$output_file" << EOF
    {
      "file": "$file",
      "filename": "$filename",
      "fixes_needed": {
        "SimplifiedSupabaseMock": $needs_mock,
        "FactoryReset": $needs_factory
      }
    }
EOF
            fi
        fi
    done
    
    cat >> "$output_file" << EOF

  ],
  "total_files": $(find src/services/$category/__tests__ src/services/__tests__ -name "*.test.ts" 2>/dev/null | wc -l),
  "estimated_time": "2-3 hours"
}
EOF
}

# Function to generate hook tasks
generate_hook_tasks() {
    local category=$1
    local agent_id=$2
    local output_file="$COMM_DIR/tasks/${agent_id}.json"
    
    echo "Generating tasks for $agent_id..."
    
    cat > "$output_file" << EOF
{
  "agent_id": "$agent_id",
  "category": "$category",
  "priority": "CRITICAL",
  "reference_patterns": {
    "defensive_imports": "hook-test-pattern-guide (REFERENCE).md#L73-83",
    "react_query_mock": "hook-test-pattern-guide (REFERENCE).md#L51-66",
    "query_key_factory": "hook-test-pattern-guide (REFERENCE).md#L27-42",
    "broadcast_factory": "hook-test-pattern-guide (REFERENCE).md#L44-48"
  },
  "tasks": [
EOF

    # Find hook files needing fixes
    local first=true
    local search_path="src/hooks/__tests__"
    [ "$category" != "core" ] && search_path="src/hooks/$category/__tests__"
    
    for file in $search_path/*.test.tsx $search_path/*.test.ts; do
        if [ -f "$file" ] && [[ ! "$file" =~ ".race.test" ]]; then
            local filename=$(basename "$file" | sed 's/\.test\.\(tsx\|ts\)$//')
            local needs_defensive=false
            local needs_rq=false
            local needs_qk=false
            local needs_broadcast=false
            
            # Check what's missing
            grep -q "let.*:.*any" "$file" || needs_defensive=true
            grep -q "jest.mock.*@tanstack/react-query" "$file" || needs_rq=true
            grep -q "jest.mock.*queryKeyFactory" "$file" || needs_qk=true
            grep -q "jest.mock.*broadcastFactory" "$file" || needs_broadcast=true
            
            if [ "$needs_defensive" = true ] || [ "$needs_rq" = true ] || [ "$needs_qk" = true ] || [ "$needs_broadcast" = true ]; then
                [ "$first" = true ] && first=false || echo "," >> "$output_file"
                
                cat >> "$output_file" << EOF
    {
      "file": "$file",
      "filename": "$filename",
      "fixes_needed": {
        "DefensiveImports": $needs_defensive,
        "ReactQueryMock": $needs_rq,
        "QueryKeyFactory": $needs_qk,
        "BroadcastFactory": $needs_broadcast
      }
    }
EOF
            fi
        fi
    done
    
    cat >> "$output_file" << EOF

  ],
  "total_files": $(find $search_path -name "*.test.tsx" -o -name "*.test.ts" 2>/dev/null | grep -v ".race.test" | wc -l),
  "estimated_time": "2-3 hours"
}
EOF
}

# Generate tasks for each agent
generate_service_tasks "" "core-services"
generate_service_tasks "executive" "extension-services"
generate_hook_tasks "core" "core-hooks"
generate_hook_tasks "executive inventory marketing role-based" "extension-hooks"

# Special handling for schema and other tests
cat > "$COMM_DIR/tasks/schema-other.json" << EOF
{
  "agent_id": "schema-other",
  "category": "mixed",
  "priority": "MEDIUM",
  "reference_patterns": {
    "schema_transform": "schema-test-pattern (REFERENCE).md",
    "component_pattern": "TBD - needs audit",
    "screen_pattern": "TBD - needs audit"
  },
  "audit_first": true,
  "directories_to_audit": [
    "src/schemas/__tests__",
    "src/schemas/__contracts__",
    "src/components/__tests__",
    "src/screens/__tests__",
    "src/utils/__tests__"
  ],
  "estimated_time": "3-4 hours"
}
EOF

echo ""
echo "✅ Task files generated in $COMM_DIR/tasks/"
echo ""
echo "Summary:"
for task_file in "$COMM_DIR/tasks"/*.json; do
    agent=$(basename "$task_file" .json)
    task_count=$(grep -c '"file":' "$task_file" 2>/dev/null || echo "0")
    echo "  - $agent: $task_count files to fix"
done

echo ""
echo "Ready to launch agents with: docker-compose -f docker-compose.phase2.yml up"