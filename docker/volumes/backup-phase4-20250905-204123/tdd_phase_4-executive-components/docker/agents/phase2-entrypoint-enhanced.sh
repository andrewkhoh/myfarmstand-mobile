#!/bin/bash
# Phase 2 Enhanced entrypoint with self-improving cycles and test-driven progress
# Following multi-agent-monitoring-pattern.md for correct initialization order

set -euo pipefail

# CRITICAL: Set variables FIRST before ANY file operations
AGENT_NAME="${AGENT_NAME}"
PROGRESS_FILE="/shared/progress/${AGENT_NAME}.md"
LOG_FILE="/shared/logs/${AGENT_NAME}.log"
STATUS_FILE="/shared/status/${AGENT_NAME}.json"
TEST_RESULTS_FILE="/shared/test-results/${AGENT_NAME}-latest.txt"
RESTART_COUNT_FILE="/shared/restart_counters/${AGENT_NAME}_count"

# Initialize directories
mkdir -p /shared/{progress,logs,status,restart_counters,test-results,handoffs,blockers,feedback}

# CRITICAL: Export restart count variables IMMEDIATELY before any async operations
export RESTART_COUNT=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo 0)
export MAX_RESTARTS=${MAX_RESTARTS:-5}  # 5 self-improving rounds for Phase 2

# Now safe to write output
echo "# ${AGENT_NAME} Progress Log - Phase 2 Inventory" > "$PROGRESS_FILE"
echo "Started: $(date)" >> "$PROGRESS_FILE"
echo "Target: TDD Implementation with ${MAX_RESTARTS} improvement cycles" >> "$PROGRESS_FILE"

# Initialize status file with Phase 2 specific fields
jq -n --arg agent "$AGENT_NAME" \
      --arg status "initializing" \
      --arg startTime "$(date -Iseconds)" \
      --arg restartCycle "$((RESTART_COUNT + 1))" \
      --arg maxRestarts "$MAX_RESTARTS" \
      '{
        agent: $agent,
        status: $status,
        phase: "Phase 2 - Inventory Operations",
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
        targetPassRate: 85,
        workSummary: null
      }' > "$STATUS_FILE"

echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 Self-improvement cycle: $((RESTART_COUNT + 1))/$MAX_RESTARTS" >> "$LOG_FILE"
echo "🔄 Self-improvement cycle: $((RESTART_COUNT + 1))/$MAX_RESTARTS" >> "$PROGRESS_FILE"

# Function to run tests and capture metrics
run_tests() {
    local test_type="$1"
    local test_command="$2"
    
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
    case "$AGENT_NAME" in
        "inventory-schema")
            run_tests "Schema" "npm run test:schemas:inventory"
            ;;
        "inventory-services")
            run_tests "Service" "npm run test:services:inventory"
            ;;
        "inventory-hooks")
            run_tests "Hook" "npm run test:hooks:inventory"
            ;;
        "inventory-screens")
            run_tests "Screen" "npm run test:screens:inventory"
            ;;
        "inventory-integration")
            run_tests "Integration" "npm run test:integration:inventory"
            ;;
    esac
    
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
    if [ "$PASS_RATE" -ge 85 ]; then
        echo "✅ SUCCESS: ${AGENT_NAME} complete with ${PASS_RATE}% pass rate" > "/shared/handoffs/${AGENT_NAME}-complete.md"
    else
        echo "⚠️ INCOMPLETE: ${AGENT_NAME} ended with only ${PASS_RATE}% pass rate (target 85%)" > "/shared/blockers/${AGENT_NAME}-incomplete.md"
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

# Check dependencies for this agent
case "$AGENT_NAME" in
    "inventory-services")
        echo "⏳ Waiting for schema layer..." >> "$PROGRESS_FILE"
        while [ ! -f "/shared/handoffs/inventory-schema-complete.md" ]; do
            sleep 30
        done
        echo "✅ Schema layer ready" >> "$PROGRESS_FILE"
        ;;
    "inventory-hooks")
        echo "⏳ Waiting for services layer..." >> "$PROGRESS_FILE"
        while [ ! -f "/shared/handoffs/inventory-services-complete.md" ]; do
            sleep 30
        done
        echo "✅ Services layer ready" >> "$PROGRESS_FILE"
        ;;
    "inventory-screens")
        echo "⏳ Waiting for hooks layer..." >> "$PROGRESS_FILE"
        while [ ! -f "/shared/handoffs/inventory-hooks-complete.md" ]; do
            sleep 30
        done
        echo "✅ Hooks layer ready" >> "$PROGRESS_FILE"
        ;;
    "inventory-integration")
        echo "⏳ Waiting for all layers..." >> "$PROGRESS_FILE"
        for dep in schema services hooks screens; do
            while [ ! -f "/shared/handoffs/inventory-${dep}-complete.md" ]; do
                echo "   Waiting for ${dep}..." >> "$PROGRESS_FILE"
                sleep 30
            done
            echo "   ✅ ${dep} ready" >> "$PROGRESS_FILE"
        done
        ;;
esac

# Check for feedback from previous cycles
if [ -f "/shared/feedback/${AGENT_NAME}-improvements.md" ]; then
    echo "📋 Found feedback from previous cycle" >> "$PROGRESS_FILE"
    cat "/shared/feedback/${AGENT_NAME}-improvements.md" >> "$PROGRESS_FILE"
fi

# First run tests to understand current state
echo "$(date '+%H:%M:%S') 🔍 Analyzing current test state..." >> "$PROGRESS_FILE"
case "$AGENT_NAME" in
    "inventory-schema")
        run_tests "Schema" "npm run test:schemas:inventory"
        ;;
    "inventory-services")
        run_tests "Service" "npm run test:services:inventory"
        ;;
    "inventory-hooks")
        run_tests "Hook" "npm run test:hooks:inventory"
        ;;
    "inventory-screens")
        run_tests "Screen" "npm run test:screens:inventory"
        ;;
    "inventory-integration")
        run_tests "Integration" "npm run test:integration:inventory"
        ;;
esac

# Check if already passing
if [ "$PASS_RATE" -ge 85 ]; then
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
    echo "⚠️  Container: phase2-${AGENT_NAME}"
    echo "⚠️  Run: docker exec -it phase2-${AGENT_NAME} claude login"
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

PROMPT_FILE="/workspace/docker/agents/prompts/phase2-${AGENT_NAME}.md"
if [ ! -f "$PROMPT_FILE" ]; then
    echo "❌ Prompt file not found: $PROMPT_FILE" >> "$PROGRESS_FILE"
    exit 1
fi

# Create context-aware prompt
CLAUDE_PROMPT="You are working on ${AGENT_NAME} for Phase 2 inventory operations.
This is self-improvement cycle ${RESTART_COUNT} of ${MAX_RESTARTS}.

Current test results:
- Tests passing: ${TESTS_PASS}
- Tests failing: ${TESTS_FAIL}
- Pass rate: ${PASS_RATE}%
- Target: 85%

Test output from last run:
$(tail -100 ${TEST_RESULTS_FILE} 2>/dev/null || echo "No test output yet")

Your task: Analyze the failures and implement the required functionality to make tests pass.
Follow ALL architectural patterns from docs/architectural-patterns-and-best-practices.md
Focus on making tests pass - this is TDD cycle ${RESTART_COUNT}.

$(cat $PROMPT_FILE)"

# Execute Claude with the enhanced prompt
OUTPUT=$(echo "$CLAUDE_PROMPT" | claude --dangerously-skip-permissions 2>&1)
EXIT_CODE=$?

# Parse output
echo "$OUTPUT" | parse_claude_output

# Run tests again to check progress
echo "$(date '+%H:%M:%S') 🧪 Running tests after improvements..." >> "$PROGRESS_FILE"
case "$AGENT_NAME" in
    "inventory-schema")
        run_tests "Schema" "npm run test:schemas:inventory"
        ;;
    "inventory-services")
        run_tests "Service" "npm run test:services:inventory"
        ;;
    "inventory-hooks")
        run_tests "Hook" "npm run test:hooks:inventory"
        ;;
    "inventory-screens")
        run_tests "Screen" "npm run test:screens:inventory"
        ;;
    "inventory-integration")
        run_tests "Integration" "npm run test:integration:inventory"
        ;;
esac

# Update work summary
WORK_SUMMARY="Cycle ${RESTART_COUNT}: ${TESTS_PASS}/${TOTAL_TESTS} tests passing (${PASS_RATE}%)"
jq --arg summary "$WORK_SUMMARY" '.workSummary = $summary' \
   "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"

echo "$(date '+%H:%M:%S') 📊 Cycle ${RESTART_COUNT} complete: ${PASS_RATE}% pass rate" >> "$PROGRESS_FILE"

# Exit to trigger restart for next cycle
exit 0