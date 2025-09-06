#!/bin/bash
# Enhanced entrypoint with progress capture and monitoring

set -euo pipefail

AGENT_NAME="${AGENT_NAME}"
PROGRESS_FILE="/shared/progress/${AGENT_NAME}.md"
LOG_FILE="/shared/logs/${AGENT_NAME}.log"
STATUS_FILE="/shared/status/${AGENT_NAME}.json"

# Initialize directories and files
mkdir -p /shared/{progress,logs,status,restart_counters}

# Restart counter logic - MUST BE SET BEFORE ANY OUTPUT
RESTART_COUNT_FILE="/shared/restart_counters/${AGENT_NAME}_count"
export RESTART_COUNT=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo 0)
export MAX_RESTARTS=${MAX_RESTARTS:-3}  # Default to 3, configurable via environment

# Now safe to write output
echo "# ${AGENT_NAME} Progress Log" > "$PROGRESS_FILE"
echo "Started: $(date)" >> "$PROGRESS_FILE"

# Initialize status file immediately with valid JSON
jq -n --arg agent "$AGENT_NAME" \
      --arg status "initializing" \
      --arg startTime "$(date -Iseconds)" \
      --arg restartCycle "$((RESTART_COUNT + 1))" \
      --arg maxRestarts "$MAX_RESTARTS" \
      '{
        agent: $agent,
        status: $status,
        startTime: $startTime,
        restartCycle: ($restartCycle | tonumber),
        maxRestarts: ($maxRestarts | tonumber),
        heartbeat: $startTime,
        lastUpdate: $startTime,
        filesModified: [],
        errors: [],
        testsPass: 0
      }' > "$STATUS_FILE"

echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 Restart cycle: $((RESTART_COUNT + 1))/$MAX_RESTARTS" >> "$LOG_FILE"
echo "🔄 Restart cycle: $((RESTART_COUNT + 1))/$MAX_RESTARTS" >> "$PROGRESS_FILE"

if [ "$RESTART_COUNT" -ge "$MAX_RESTARTS" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ Max restarts reached ($MAX_RESTARTS). Entering maintenance mode." >> "$LOG_FILE"
    echo "✅ Agent completed maximum improvement cycles ($MAX_RESTARTS)" >> "$PROGRESS_FILE"
    echo "📊 Final state: Self-improvement experiment complete" >> "$PROGRESS_FILE"
    
    # Update status to show completion
    jq -n --arg agent "$AGENT_NAME" --arg status "completed" --arg reason "max_restarts_reached" \
       --arg cycles "$MAX_RESTARTS" --arg maxRestarts "$MAX_RESTARTS" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '{
         agent: $agent,
         status: $status,
         reason: $reason,
         cycles: ($cycles | tonumber),
         maxRestarts: ($maxRestarts | tonumber),
         timestamp: $timestamp,
         lastUpdate: $timestamp,
         experimentComplete: true
       }' > "$STATUS_FILE"
    
    # Keep container alive but idle to prevent restart loop
    echo "$(date '+%Y-%m-%d %H:%M:%S') 💤 Entering idle state - container will remain healthy but inactive" >> "$LOG_FILE"
    while true; do
        sleep 60  # Sleep 1 minute for more frequent heartbeats
        echo "$(date '+%Y-%m-%d %H:%M:%S') 💓 Maintenance heartbeat - agent completed" >> "$LOG_FILE"
        # Update heartbeat in status file
        jq --arg heartbeat "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.heartbeat = $heartbeat' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    done
else
    # Increment counter for tracking this restart
    echo $((RESTART_COUNT + 1)) > "$RESTART_COUNT_FILE"
    # Update the exported variable for functions to use
    export RESTART_COUNT=$((RESTART_COUNT + 1))
    echo "$(date '+%Y-%m-%d %H:%M:%S') 🚀 Starting improvement cycle $RESTART_COUNT" >> "$LOG_FILE"
    echo "🚀 Starting improvement cycle $RESTART_COUNT" >> "$PROGRESS_FILE"
fi

# Function to parse Claude output
parse_claude_output() {
    while IFS= read -r line; do
        # Log everything
        echo "$(date '+%Y-%m-%d %H:%M:%S') $line" >> "$LOG_FILE"
        
        # Extract and log specific events
        if [[ "$line" =~ "Using tool:" ]]; then
            TOOL=$(echo "$line" | sed 's/.*Using tool: //')
            echo "$(date '+%H:%M:%S') Tool: $TOOL" >> "$PROGRESS_FILE"
            update_status "lastTool" "$TOOL"
        fi
        
        if [[ "$line" =~ "File modified:" ]] || [[ "$line" =~ "File created:" ]]; then
            FILE=$(echo "$line" | sed 's/.*File [^:]*: //')
            echo "$(date '+%H:%M:%S') Modified: $FILE" >> "$PROGRESS_FILE"
            update_status "filesModified" "$FILE"
        fi
        
        if [[ "$line" =~ "Test" ]] && [[ "$line" =~ "pass" ]]; then
            echo "$(date '+%H:%M:%S') Test: $line" >> "$PROGRESS_FILE"
            update_status "testsPass" "1"
        fi

        if [[ "$line" =~ "tests passing" ]]; then
            echo "$(date '+%H:%M:%S') ✅ $line" >> "$PROGRESS_FILE"
            update_status "testSummary" "$line"
        fi
        
        if [[ "$line" =~ "Error:" ]] || [[ "$line" =~ "Failed:" ]]; then
            echo "$(date '+%H:%M:%S') ⚠️ ERROR: $line" >> "$PROGRESS_FILE"
            update_status "errors" "$line"
        fi
        
        # Echo to stdout for docker logs
        echo "$line"
    done
}

# Function to update JSON status using jq (more reliable)
update_status() {
    local key="$1"
    local value="$2"
    
    # Check if status file exists and has content
    if [ ! -s "$STATUS_FILE" ]; then
        echo "Warning: Status file empty or missing, recreating..." >> "$LOG_FILE"
        jq -n --arg agent "$AGENT_NAME" --arg status "running" --arg startTime "$(date -Iseconds)" \
           --arg restartCycle "$((${RESTART_COUNT:-0} + 1))" --arg maxRestarts "${MAX_RESTARTS:-3}" \
           '{
             agent: $agent,
             status: $status,
             startTime: $startTime,
             restartCycle: ($restartCycle | tonumber),
             maxRestarts: ($maxRestarts | tonumber),
             lastUpdate: $startTime,
             filesModified: [],
             errors: [],
             testsPass: 0
           }' > "$STATUS_FILE"
    fi
    
    # Update status using jq
    if [ "$key" = "filesModified" ] || [ "$key" = "errors" ]; then
        # Append to array fields
        jq --arg key "$key" --arg value "$value" --arg timestamp "$(date -Iseconds)" \
           '.[$key] += [$value] | .lastUpdate = $timestamp' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    elif [ "$key" = "testsPass" ]; then
        # Increment counter
        jq --arg timestamp "$(date -Iseconds)" \
           '.testsPass += 1 | .lastUpdate = $timestamp' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    else
        # Set single value
        if jq --arg key "$key" --arg value "$value" --arg timestamp "$(date -Iseconds)" \
           '.[$key] = $value | .lastUpdate = $timestamp' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" 2>>"$LOG_FILE"; then
            mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
        else
            echo "Error: jq failed for key=$key value=$value" >> "$LOG_FILE"
            rm -f "${STATUS_FILE}.tmp"
        fi
    fi
    
    # Update restart cycle info in status
    jq --arg restartCycle "$((RESTART_COUNT + 1))" --arg maxRestarts "$MAX_RESTARTS" \
       '.restartCycle = ($restartCycle | tonumber) | .maxRestarts = ($maxRestarts | tonumber)' \
       "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE" || \
       echo "Status update failed" >> "$LOG_FILE"
}

# Start heartbeat in background
(
    while true; do
        echo "$(date '+%H:%M:%S') 💓 Heartbeat - Active" >> "$PROGRESS_FILE"
        update_status "heartbeat" "$(date -Iseconds)"
        sleep 60
    done
) &
HEARTBEAT_PID=$!

# Wait for dependencies if specified
if [ -n "${DEPENDS_ON:-}" ]; then
    echo "⏳ Waiting for dependencies: $DEPENDS_ON"
    IFS=',' read -ra DEPS <<< "$DEPENDS_ON"
    for dep in "${DEPS[@]}"; do
        while [ ! -f "/shared/handoffs/${dep}-complete.md" ]; do
            echo "   Waiting for ${dep}..."
            sleep 30
        done
        echo "   ✅ ${dep} ready"
    done
fi

# Load agent prompt if available
if [ -f "/prompts/${AGENT_NAME}-agent.md" ]; then
    echo "📋 Loading agent prompt..." >&2
    cat "/prompts/${AGENT_NAME}-agent.md" | head -20 >&2
fi

# Update initial status
update_status "status" "active"
echo "$(date): Container started, ready for work" >> "$PROGRESS_FILE"

# Cleanup on exit
cleanup() {
    kill $HEARTBEAT_PID 2>/dev/null || true
    echo "$(date): Container shutting down" >> "$PROGRESS_FILE"
    update_status "status" "stopped"
}
trap cleanup EXIT

# Check authentication status FIRST
echo "🔐 Checking Claude authentication status..."
AUTH_CHECK=$(echo "test" | claude --dangerously-skip-permissions -p "Say yes" 2>&1)

if echo "$AUTH_CHECK" | grep -q "Invalid API key"; then
    echo ""
    echo "⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️"
    echo "⚠️  CLAUDE AUTHENTICATION REQUIRED!"
    echo "⚠️  "
    echo "⚠️  Container: ${AGENT_NAME}-agent"
    echo "⚠️  "
    echo "⚠️  TO AUTHENTICATE:"
    echo "⚠️  1. Open a new terminal"
    echo "⚠️  2. Run: docker exec -it ${AGENT_NAME}-agent /bin/bash"
    echo "⚠️  3. Run: claude login"
    echo "⚠️  4. Open the URL in your browser and complete login"
    echo "⚠️  5. Exit the container shell"
    echo "⚠️  "
    echo "⚠️  This container will wait for authentication..."
    echo "⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️"
    echo ""
    
    update_status "status" "waiting_for_auth"
    echo "$(date): Waiting for authentication..." >> "$PROGRESS_FILE"
    
    # Wait for authentication - check every 30 seconds
    while true; do
        echo "⏳ Waiting for authentication... ($(date '+%H:%M:%S'))"
        
        # Keep heartbeat alive
        update_status "heartbeat" "$(date -Iseconds)"
        
        sleep 30
        
        # Test authentication again
        if echo "test" | claude --dangerously-skip-permissions -p "Say yes" 2>&1 | grep -qi "yes"; then
            echo "✅ Authentication successful!"
            echo "$(date): Authentication completed" >> "$PROGRESS_FILE"
            update_status "status" "authenticated"
            break
        fi
    done
else
    echo "✅ Claude is already authenticated"
fi

# Now we're authenticated, execute Claude with the prompt
echo "🚀 Starting Claude Code with dangerously-skip-permissions..."
if [ -f "/prompts/${AGENT_NAME}-agent.md" ]; then
    # Read prompt file and pass with -p flag for SDK query (non-interactive)
    PROMPT=$(cat "/prompts/${AGENT_NAME}-agent.md")
    
    # Run Claude with the prompt
    OUTPUT=$(claude --dangerously-skip-permissions -p "$PROMPT" 2>&1)
    EXIT_CODE=$?
    
    # Check for authentication failure and display warning
    if echo "$OUTPUT" | grep -q "Invalid API key"; then
        echo ""
        echo "⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️"
        echo "⚠️  WARNING: CLAUDE AUTHENTICATION FAILED!"
        echo "⚠️  "
        echo "⚠️  The Claude CLI cannot authenticate with Anthropic's API"
        echo "⚠️  "
        echo "⚠️  CAUSE:"
        echo "⚠️  - Claude config not properly mounted from host"
        echo "⚠️  - Or host lacks valid Claude authentication"
        echo "⚠️  "
        echo "⚠️  TO FIX:"
        echo "⚠️  1. Run 'claude login' on host machine"
        echo "⚠️  2. Verify ~/.claude has auth config"
        echo "⚠️  3. Restart containers"
        echo "⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️"
        echo ""
    fi
    
    # Still parse the output
    echo "$OUTPUT" | parse_claude_output
else
    # No prompt, start interactive REPL
    claude --dangerously-skip-permissions 2>&1 | parse_claude_output
    EXIT_CODE=${PIPESTATUS[0]}
fi

# Final status
if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date): ✅ Completed successfully" >> "$PROGRESS_FILE"
    update_status "status" "completed"
    # Create completion marker
    echo "Completed: $(date)" > "/shared/handoffs/${AGENT_NAME}-complete.md"
else
    echo "$(date): ❌ Failed with code $EXIT_CODE" >> "$PROGRESS_FILE"
    update_status "status" "failed"
fi

exit $EXIT_CODE