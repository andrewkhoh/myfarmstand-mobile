#!/bin/bash

# Simple bash script to analyze agent logs using Claude and update status files
# This replaces the complex Node.js async pipeline with the proven working approach

SHARED_DIR="/shared"
LOGS_DIR="$SHARED_DIR/logs"
STATUS_DIR="$SHARED_DIR/status"

echo "Starting Claude log analysis..."

# Process each log file
for log_file in "$LOGS_DIR"/*.log; do
    if [ -f "$log_file" ]; then
        agent_name=$(basename "$log_file" .log)
        status_file="$STATUS_DIR/${agent_name}.json"
        
        echo "Analyzing $agent_name..."
        
        # Skip if no status file exists
        if [ ! -f "$status_file" ]; then
            echo "  No status file found for $agent_name, skipping"
            continue
        fi
        
        # Get Claude analysis
        claude_output=$(tail -200 "$log_file" | claude --dangerously-skip-permissions -p 'Analyze this agent log and return ONLY valid JSON: {"filesModified": ["filenames"], "testsPass": 0, "errors": [], "lastTool": "tool", "workSummary": "summary"}' 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$claude_output" ]; then
            # Extract JSON from Claude output (removes markdown code blocks)
            json_data=$(echo "$claude_output" | sed -n '/```json/,/```/p' | sed '/```/d' | tr -d '\n' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
            
            if [ -n "$json_data" ]; then
                # Read current status
                current_status=$(cat "$status_file")
                
                # Extract analysis fields using jq
                files_modified=$(echo "$json_data" | jq -c '.filesModified // []' 2>/dev/null)
                tests_pass=$(echo "$json_data" | jq -r '.testsPass // 0' 2>/dev/null)
                errors=$(echo "$json_data" | jq -c '.errors // []' 2>/dev/null)
                last_tool=$(echo "$json_data" | jq -r '.lastTool // "none"' 2>/dev/null)
                work_summary=$(echo "$json_data" | jq -r '.workSummary // ""' 2>/dev/null)
                
                # Update status file with analysis results
                updated_status=$(echo "$current_status" | jq \
                    --argjson filesModified "$files_modified" \
                    --argjson testsPass "$tests_pass" \
                    --argjson errors "$errors" \
                    --arg lastTool "$last_tool" \
                    --arg workSummary "$work_summary" \
                    --arg lastAnalysis "$(date -Iseconds)" \
                    --arg lastUpdate "$(date -Iseconds)" \
                    '.filesModified = $filesModified | .testsPass = $testsPass | .errors = $errors | .lastTool = $lastTool | .workSummary = $workSummary | .lastAnalysis = $lastAnalysis | .lastUpdate = $lastUpdate' 2>/dev/null)
                
                if [ $? -eq 0 ] && [ -n "$updated_status" ]; then
                    echo "$updated_status" > "$status_file"
                    echo "  ✅ Updated $agent_name: $tests_pass tests, $(echo "$files_modified" | jq length) files"
                else
                    echo "  ❌ Failed to update status for $agent_name"
                fi
            else
                echo "  ❌ No valid JSON found in Claude response for $agent_name"
            fi
        else
            echo "  ❌ Claude analysis failed for $agent_name"
        fi
    fi
done

echo "Claude log analysis complete"