#!/bin/bash
# Generic Multi-Agent Entrypoint with self-improving cycles and test-driven progress
# Following multi-agent-monitoring-pattern.md for correct initialization order
# This script runs INSIDE Docker containers and receives values via Docker ENV

set -euo pipefail

# =============================================================================
# RUNTIME CONFIGURATION (from Docker environment variables)
# =============================================================================
# Required (provided by docker-compose):
# - AGENT_NAME: The name of this agent
# - PROJECT_NAME: The project identifier  
# - PROJECT_DESCRIPTION: Human-readable project description
# - TARGET_PASS_RATE: Target test pass percentage (e.g., 85)
# - MAX_RESTARTS: Maximum number of restart cycles (e.g., 5)
# - TEST_COMMAND: Command to run tests (e.g., "npm test")
#
# Optional (for testing/debugging):
# - DEBUG: If "true", runs in debug mode (analysis only, no code changes)
# - FRESH_START: If "true", clears restart counters and starts fresh
# =============================================================================

# Validate required environment variables
if [ -z "${AGENT_NAME:-}" ]; then
    echo "ERROR: AGENT_NAME environment variable is required"
    exit 1
fi

# Set variables from Docker environment (with defaults for safety)
AGENT_NAME="${AGENT_NAME}"
PROJECT_NAME="${PROJECT_NAME:-unknown_project}"
PROJECT_DESCRIPTION="${PROJECT_DESCRIPTION:-No description}"  
TARGET_PASS_RATE="${TARGET_PASS_RATE:-85}"
MAX_RESTARTS="${MAX_RESTARTS:-5}"
TEST_COMMAND="${TEST_COMMAND:-npm test}"
DEBUG="${DEBUG:-false}"
FRESH_START="${FRESH_START:-false}"

PROGRESS_FILE="/shared/progress/${AGENT_NAME}.md"
LOG_FILE="/shared/logs/${AGENT_NAME}.log"
STATUS_FILE="/shared/status/${AGENT_NAME}.json"
TEST_RESULTS_FILE="/shared/test-results/${AGENT_NAME}-latest.txt"
RESTART_COUNT_FILE="/shared/restart_counters/${AGENT_NAME}_count"

# Initialize directories
mkdir -p /shared/{progress,logs,status,restart_counters,test-results,handoffs,blockers,feedback}

# Handle FRESH_START - clear restart counter if requested
if [ "$FRESH_START" = "true" ]; then
    echo "🔄 FRESH START requested - clearing restart counter"
    rm -f "$RESTART_COUNT_FILE"
    echo "0" > "$RESTART_COUNT_FILE"
fi

# CRITICAL: Export restart count variables IMMEDIATELY before any async operations
export RESTART_COUNT=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo 0)
export MAX_RESTARTS=${MAX_RESTARTS:-5}
export TEST_COMMAND="${TEST_COMMAND:-npm test}"

# Now safe to write output
echo "# ${AGENT_NAME} Progress Log - ${PROJECT_DESCRIPTION}" > "$PROGRESS_FILE"
echo "Started: $(date)" >> "$PROGRESS_FILE"

if [ "$DEBUG" = "true" ]; then
    echo "🔍 DEBUG MODE ENABLED - Analysis only, no code modifications" >> "$PROGRESS_FILE"
else
    echo "Target: TDD Implementation with ${MAX_RESTARTS} improvement cycles" >> "$PROGRESS_FILE"
fi

if [ "$FRESH_START" = "true" ]; then
    echo "🔄 FRESH START - Restart counter was reset" >> "$PROGRESS_FILE"
fi

# Initialize status file with generic fields
jq -n --arg agent "$AGENT_NAME" \
      --arg status "initializing" \
      --arg startTime "$(date -Iseconds)" \
      --arg restartCycle "$((RESTART_COUNT + 1))" \
      --arg maxRestarts "$MAX_RESTARTS" \
      --arg project "$PROJECT_NAME" \
      --arg description "$PROJECT_DESCRIPTION" \
      --arg targetRate "$TARGET_PASS_RATE" \
      '{
        agent: $agent,
        status: $status,
        project: $project,
        description: $description,
        startTime: $startTime,
        restartCycle: ($restartCycle | tonumber),
        maxRestarts: ($maxRestarts | tonumber),
        heartbeat: $startTime,
        lastUpdate: $startTime,
        filesModified: [],
        errors: [],
        testsPass: 0,
        testsFail: 0,
        testPassRate: 0,
        targetPassRate: ($targetRate | tonumber),
        workSummary: null
      }' > "$STATUS_FILE"

echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 Self-improvement cycle: $((RESTART_COUNT + 1))/$MAX_RESTARTS" >> "$LOG_FILE"
echo "🔄 Self-improvement cycle: $((RESTART_COUNT + 1))/$MAX_RESTARTS" >> "$PROGRESS_FILE"

# Function to run tests and capture metrics
run_tests() {
    local test_type="$1"
    local test_command="${TEST_COMMAND}"
    
    echo "$(date '+%H:%M:%S') 🧪 Running ${test_type} tests..." >> "$PROGRESS_FILE"
    
    # Run tests and capture output
    TEST_OUTPUT=$(cd /workspace && $test_command 2>&1 || true)
    echo "$TEST_OUTPUT" > "${TEST_RESULTS_FILE}"
    
    # Extract metrics
    TESTS_PASS=$(echo "$TEST_OUTPUT" | grep -E "Tests:.*passed" | sed -E 's/.*([0-9]+) passed.*/\1/' | tail -1 || echo "0")
    TESTS_FAIL=$(echo "$TEST_OUTPUT" | grep -E "Tests:.*failed" | sed -E 's/.*([0-9]+) failed.*/\1/' | tail -1 || echo "0")
    TOTAL_TESTS=$((TESTS_PASS + TESTS_FAIL))
    
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        PASS_RATE=$((TESTS_PASS * 100 / TOTAL_TESTS))
    else
        PASS_RATE=0
    fi
    
    echo "$(date '+%H:%M:%S') 📊 Test Results: ${TESTS_PASS}/${TOTAL_TESTS} passing (${PASS_RATE}%)" >> "$PROGRESS_FILE"
    
    # Update status
    jq --arg pass "$TESTS_PASS" --arg fail "$TESTS_FAIL" --arg rate "$PASS_RATE" \
       --arg timestamp "$(date -Iseconds)" \
       '.testsPass = ($pass | tonumber) | 
        .testsFail = ($fail | tonumber) | 
        .testPassRate = ($rate | tonumber) |
        .lastUpdate = $timestamp' \
       "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    
    return $PASS_RATE
}

# Check if we've reached max cycles
if [ "$RESTART_COUNT" -ge "$MAX_RESTARTS" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ Max self-improvement cycles reached ($MAX_RESTARTS)." >> "$LOG_FILE"
    echo "✅ Completed ${MAX_RESTARTS} self-improvement cycles" >> "$PROGRESS_FILE"
    
    # Run final tests to get completion metrics
    echo "$(date '+%H:%M:%S') 🔍 Final test run..." >> "$PROGRESS_FILE"
    run_tests "Final"
    
    # Generate completion summary
    WORK_SUMMARY="Completed ${MAX_RESTARTS} cycles with ${TESTS_PASS}/${TOTAL_TESTS} tests passing (${PASS_RATE}%)"
    
    # Update final status
    jq -n --arg agent "$AGENT_NAME" --arg status "completed" --arg reason "max_cycles_reached" \
       --arg cycles "$MAX_RESTARTS" --arg maxRestarts "$MAX_RESTARTS" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       --arg summary "$WORK_SUMMARY" \
       --arg pass "$TESTS_PASS" --arg fail "$TESTS_FAIL" --arg rate "$PASS_RATE" \
       '{
         agent: $agent,
         status: $status,
         reason: $reason,
         cycles: ($cycles | tonumber),
         maxRestarts: ($maxRestarts | tonumber),
         timestamp: $timestamp,
         lastUpdate: $timestamp,
         experimentComplete: true,
         testsPass: ($pass | tonumber),
         testsFail: ($fail | tonumber),
         testPassRate: ($rate | tonumber),
         workSummary: $summary
       }' > "$STATUS_FILE"
    
    # Create handoff if tests are passing
    if [ "$PASS_RATE" -ge "$TARGET_PASS_RATE" ]; then
        echo "✅ SUCCESS: ${AGENT_NAME} complete with ${PASS_RATE}% pass rate" > "/shared/handoffs/${AGENT_NAME}-complete.md"
    else
        echo "⚠️ INCOMPLETE: ${AGENT_NAME} ended with only ${PASS_RATE}% pass rate (target ${TARGET_PASS_RATE}%)" > "/shared/blockers/${AGENT_NAME}-incomplete.md"
    fi
    
    # Enter maintenance mode
    echo "$(date '+%Y-%m-%d %H:%M:%S') 💤 Entering maintenance mode" >> "$LOG_FILE"
    while true; do
        sleep 60
        echo "$(date '+%Y-%m-%d %H:%M:%S') 💓 Maintenance heartbeat" >> "$LOG_FILE"
        jq --arg heartbeat "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.heartbeat = $heartbeat' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    done
else
    # Increment counter for next cycle
    echo $((RESTART_COUNT + 1)) > "$RESTART_COUNT_FILE"
    export RESTART_COUNT=$((RESTART_COUNT + 1))
    echo "$(date '+%Y-%m-%d %H:%M:%S') 🚀 Starting self-improvement cycle $RESTART_COUNT" >> "$LOG_FILE"
    echo "🚀 Starting self-improvement cycle $RESTART_COUNT" >> "$PROGRESS_FILE"
fi

# Function to parse Claude output
parse_claude_output() {
    while IFS= read -r line; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') $line" >> "$LOG_FILE"
        
        # Track file modifications
        if [[ "$line" =~ "File created:" ]] || [[ "$line" =~ "File modified:" ]]; then
            FILE=$(echo "$line" | sed 's/.*File [^:]*: //')
            echo "$(date '+%H:%M:%S') 📝 Modified: $FILE" >> "$PROGRESS_FILE"
            jq --arg file "$FILE" '.filesModified += [$file]' \
               "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
        fi
        
        # Track test results
        if [[ "$line" =~ "tests passing" ]]; then
            echo "$(date '+%H:%M:%S') ✅ $line" >> "$PROGRESS_FILE"
        fi
        
        # Track errors
        if [[ "$line" =~ "Error:" ]] || [[ "$line" =~ "FAIL" ]]; then
            echo "$(date '+%H:%M:%S') ❌ $line" >> "$PROGRESS_FILE"
            jq --arg error "$line" '.errors += [$error]' \
               "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
        fi
        
        # Track commits
        if [[ "$line" =~ "git commit" ]]; then
            echo "$(date '+%H:%M:%S') 📦 Commit: $line" >> "$PROGRESS_FILE"
        fi
        
        echo "$line"
    done
}

# Start heartbeat
(
    while true; do
        echo "$(date '+%H:%M:%S') 💓 Heartbeat" >> "$PROGRESS_FILE"
        jq --arg heartbeat "$(date -Iseconds)" '.heartbeat = $heartbeat' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
        sleep 60
    done
) &
HEARTBEAT_PID=$!

# Cleanup on exit
cleanup() {
    kill $HEARTBEAT_PID 2>/dev/null || true
    echo "$(date): Container shutting down" >> "$PROGRESS_FILE"
    jq --arg status "stopped" '.status = $status' \
       "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
}
trap cleanup EXIT

# Check dependencies
# Note: Dependency checking could be implemented here if needed
# For now, agents start independently and check for completion files

# Check for feedback from previous cycles
if [ -f "/shared/feedback/${AGENT_NAME}-improvements.md" ]; then
    echo "📋 Found feedback from previous cycle" >> "$PROGRESS_FILE"
    cat "/shared/feedback/${AGENT_NAME}-improvements.md" >> "$PROGRESS_FILE"
fi

# First run tests to understand current state
echo "$(date '+%H:%M:%S') 🔍 Analyzing current test state..." >> "$PROGRESS_FILE"
run_tests "Initial"

# Check if already passing
if [ "$PASS_RATE" -ge "$TARGET_PASS_RATE" ]; then
    echo "✅ Tests already passing at ${PASS_RATE}%!" >> "$PROGRESS_FILE"
    echo "✅ ${AGENT_NAME} complete with ${PASS_RATE}% pass rate" > "/shared/handoffs/${AGENT_NAME}-complete.md"
    
    # Update status and enter maintenance
    jq --arg status "completed" --arg reason "tests_passing" \
       '.status = $status | .reason = $reason' \
       "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    
    while true; do
        sleep 60
        echo "$(date '+%Y-%m-%d %H:%M:%S') 💓 Maintenance heartbeat - tests passing" >> "$LOG_FILE"
    done
fi

# Check authentication
echo "🔐 Checking Claude authentication..."
AUTH_CHECK=$(echo "test" | claude --dangerously-skip-permissions -p "Say yes" 2>&1)

if echo "$AUTH_CHECK" | grep -q "Invalid API key"; then
    echo "⚠️ AUTHENTICATION REQUIRED for ${AGENT_NAME}" >> "$PROGRESS_FILE"
    echo ""
    echo "⚠️ ⚠️ ⚠️ CLAUDE AUTHENTICATION REQUIRED ⚠️ ⚠️ ⚠️"
    echo "⚠️  Container: ${AGENT_NAME}-agent"
    echo "⚠️  Run: docker exec -it ${AGENT_NAME}-agent claude login"
    echo "⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️"
    
    while true; do
        sleep 30
        if echo "test" | claude --dangerously-skip-permissions -p "Say yes" 2>&1 | grep -qi "yes"; then
            echo "✅ Authentication successful!" >> "$PROGRESS_FILE"
            break
        fi
    done
else
    echo "✅ Claude authenticated" >> "$PROGRESS_FILE"
fi

# Build the Claude prompt with test context
echo "$(date '+%H:%M:%S') 🤖 Invoking Claude for cycle $RESTART_COUNT..." >> "$PROGRESS_FILE"

# Use AGENT_PROMPT_FILE if set, otherwise fall back to default pattern
PROMPT_FILE="${AGENT_PROMPT_FILE:-/prompts/${AGENT_NAME}.md}"
if [ ! -f "$PROMPT_FILE" ]; then
    echo "❌ Prompt file not found: $PROMPT_FILE" >> "$PROGRESS_FILE"
    echo "   AGENT_PROMPT_FILE: ${AGENT_PROMPT_FILE:-not set}" >> "$PROGRESS_FILE"
    exit 1
fi

echo "📋 Using prompt file: $PROMPT_FILE" >> "$PROGRESS_FILE"

# Create context-aware prompt
if [ "$DEBUG" = "true" ]; then
    echo "🔍 DEBUG MODE ENABLED - Using safe analysis prompt" >> "$PROGRESS_FILE"
    
    # Create a safe debug prompt that only analyzes
    CLAUDE_PROMPT="# DEBUG MODE - Safe Analysis Only

You are running in DEBUG mode for ${AGENT_NAME} in ${PROJECT_DESCRIPTION}.
This is test cycle ${RESTART_COUNT} of ${MAX_RESTARTS}.

## Your DEBUG tasks:
1. **Analyze the current test state**
   - Tests passing: ${TESTS_PASS}
   - Tests failing: ${TESTS_FAIL} 
   - Pass rate: ${PASS_RATE}%
   - Target: ${TARGET_PASS_RATE}%

2. **Report findings without modifying code**
   - Analyze test failures
   - Identify what needs to be implemented
   - Write analysis to /shared/progress/${AGENT_NAME}.md
   - Update status in /shared/status/${AGENT_NAME}.json

3. **DO NOT modify any source code**
   - Only read and analyze
   - Only write to /shared/ directory
   - This is for testing the infrastructure

4. **Test output from last run:**
$(tail -50 ${TEST_RESULTS_FILE} 2>/dev/null || echo "No test output yet")

Remember: This is DEBUG mode. Do NOT modify any source code.
Your purpose is to verify the multi-agent infrastructure is working.

After analysis, write 'DEBUG ANALYSIS COMPLETE' to your progress file."
else
    # Normal mode - full implementation prompt
    CLAUDE_PROMPT="You are working on ${AGENT_NAME} for ${PROJECT_DESCRIPTION}.
This is self-improvement cycle ${RESTART_COUNT} of ${MAX_RESTARTS}.

Current test results:
- Tests passing: ${TESTS_PASS}
- Tests failing: ${TESTS_FAIL}
- Pass rate: ${PASS_RATE}%
- Target: ${TARGET_PASS_RATE}%

Test output from last run:
$(tail -100 ${TEST_RESULTS_FILE} 2>/dev/null || echo "No test output yet")

Your task: Analyze the failures and implement the required functionality to make tests pass.
Follow ALL architectural patterns from docs/architectural-patterns-and-best-practices.md
Focus on making tests pass - this is TDD cycle ${RESTART_COUNT}.

$(cat $PROMPT_FILE)"
fi

# Execute Claude with the enhanced prompt
OUTPUT=$(echo "$CLAUDE_PROMPT" | claude --dangerously-skip-permissions 2>&1)
EXIT_CODE=$?

# Parse output
echo "$OUTPUT" | parse_claude_output

# Run tests again to check progress
echo "$(date '+%H:%M:%S') 🧪 Running tests after improvements..." >> "$PROGRESS_FILE"
run_tests "Post-improvement"

# Update work summary
WORK_SUMMARY="Cycle ${RESTART_COUNT}: ${TESTS_PASS}/${TOTAL_TESTS} tests passing (${PASS_RATE}%)"
jq --arg summary "$WORK_SUMMARY" '.workSummary = $summary' \
   "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"

echo "$(date '+%H:%M:%S') 📊 Cycle ${RESTART_COUNT} complete: ${PASS_RATE}% pass rate" >> "$PROGRESS_FILE"

# Exit to trigger restart for next cycle
exit 0