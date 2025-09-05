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
TARGET_REPO="${TARGET_REPO:-}"

PROGRESS_FILE="/shared/progress/${AGENT_NAME}.md"
LOG_FILE="/shared/logs/${AGENT_NAME}.log"
STATUS_FILE="/shared/status/${AGENT_NAME}.json"
TEST_RESULTS_FILE="/shared/test-results/${AGENT_NAME}-latest.txt"
RESTART_COUNT_FILE="/shared/restart_counters/${AGENT_NAME}_count"

# Initialize directories
mkdir -p /shared/{progress,logs,status,restart_counters,test-results,handoffs,blockers,feedback}

# Git Discipline Guard - Prevent git init in worktrees
check_git_discipline() {
    if [ -f /workspace/.git-discipline-guard ]; then
        echo "✅ Git discipline guard detected - using worktree" >> "$PROGRESS_FILE"
    fi
    
    # Check if this is a worktree (file) vs full repo (directory)
    if [ -f /workspace/.git ]; then
        echo "✅ Working in git worktree - connected to main repo" >> "$PROGRESS_FILE"
        export GIT_MODE="worktree"
    elif [ -d /workspace/.git ]; then
        echo "⚠️ Working in full git repository" >> "$PROGRESS_FILE"
        export GIT_MODE="full"
    else
        echo "❌ No git repository found at /workspace" >> "$PROGRESS_FILE"
        export GIT_MODE="none"
    fi
    
    # Prevent git init
    git() {
        if [ "$1" = "init" ]; then
            echo "❌ ERROR: 'git init' is FORBIDDEN in worktrees!" >&2
            echo "This workspace is already connected to the main repository." >&2
            echo "Use 'git status' to see current state." >&2
            return 1
        else
            command git "$@"
        fi
    }
    export -f git
}

# Run git discipline check
check_git_discipline

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
export TARGET_REPO="${TARGET_REPO:-}"

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

# Function to check if dependencies have been updated since we started
check_dependency_freshness() {
    local dependency_names="$DEPENDS_ON"
    if [ -z "$dependency_names" ]; then
        return 0  # No dependencies, always fresh
    fi
    
    # Use a fixed reference file that doesn't change during execution
    local ref_file="/shared/status/${AGENT_NAME}-start-marker"
    if [ ! -f "$ref_file" ]; then
        # Create start marker on first check
        touch "$ref_file"
        return 0  # First check, assume fresh
    fi
    
    # Convert comma-separated to array
    IFS=',' read -ra DEPS <<< "$dependency_names"
    
    for dep in "${DEPS[@]}"; do
        dep=$(echo "$dep" | tr -d ' ')
        
        # Use the SAME logic as initial dependency check for consistency
        local dep_ready=false
        local dep_updated=false
        
        if [[ "$dep" == *"-tests" ]]; then
            # For test dependencies, check if handoff file is newer than our start
            if [ -f "/shared/handoffs/${dep}-complete.md" ]; then
                if [ "/shared/handoffs/${dep}-complete.md" -nt "$ref_file" ]; then
                    dep_updated=true
                    echo "$(date '+%H:%M:%S') 🔄 Test dependency $dep has new completion" >> "$PROGRESS_FILE"
                fi
            fi
        elif [[ "$dep" == *"-impl" ]]; then
            # For implementation dependencies, check handoff file
            if [ -f "/shared/handoffs/${dep}-complete.md" ]; then
                if [ "/shared/handoffs/${dep}-complete.md" -nt "$ref_file" ]; then
                    dep_updated=true
                    echo "$(date '+%H:%M:%S') 🔄 Implementation dependency $dep has new completion" >> "$PROGRESS_FILE"
                fi
            fi
        elif [[ "$dep" == *"-refactor" || "$dep" == *"-audit" || "$dep" == *"-integration-final" ]]; then
            # For process dependencies, check handoff file  
            if [ -f "/shared/handoffs/${dep}-complete.md" ]; then
                if [ "/shared/handoffs/${dep}-complete.md" -nt "$ref_file" ]; then
                    dep_updated=true
                    echo "$(date '+%H:%M:%S') 🔄 Process dependency $dep has new completion" >> "$PROGRESS_FILE"
                fi
            fi
        fi
        
        if [ "$dep_updated" = true ]; then
            return 1  # Dependency is fresher, we should restart
        fi
    done
    
    return 0  # All dependencies are stale, we're still fresh
}

# Function to run tests and capture metrics
run_tests() {
    local test_type="$1"
    local test_command="${TEST_COMMAND}"
    
    echo "$(date '+%H:%M:%S') 🧪 Running ${test_type} tests..." >> "$PROGRESS_FILE"
    
    # Run tests and capture output
    TEST_OUTPUT=$(cd /workspace && eval "$test_command" 2>&1 || true)
    echo "$TEST_OUTPUT" > "${TEST_RESULTS_FILE}"
    
    # Extract metrics - Fix #1: Enhanced test output parsing
    TESTS_PASS=$(echo "$TEST_OUTPUT" | grep -E "Tests:.*pass(ed|ing)" | sed -E 's/.*([0-9]+) pass(ed|ing).*/\1/' | tail -1 || echo "0")
    TESTS_FAIL=$(echo "$TEST_OUTPUT" | grep -E "Tests:.*fail(ed|ing)" | sed -E 's/.*([0-9]+) fail(ed|ing).*/\1/' | tail -1 || echo "0")
    
    # Ensure variables are not empty
    TESTS_PASS=${TESTS_PASS:-0}
    TESTS_FAIL=${TESTS_FAIL:-0}
    
    TOTAL_TESTS=$((TESTS_PASS + TESTS_FAIL))
    
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        PASS_RATE=$((TESTS_PASS * 100 / TOTAL_TESTS))
    else
        PASS_RATE=0
    fi
    
    echo "$(date '+%H:%M:%S') 📊 Test Results: ${TESTS_PASS}/${TOTAL_TESTS} passing (${PASS_RATE}%)" >> "$PROGRESS_FILE"
    
    # Update status - Fix #4: Status file validation
    local temp_status="${STATUS_FILE}.tmp"
    jq --arg pass "$TESTS_PASS" --arg fail "$TESTS_FAIL" --arg rate "$PASS_RATE" \
       --arg timestamp "$(date -Iseconds)" \
       '.testsPass = ($pass | tonumber) | 
        .testsFail = ($fail | tonumber) | 
        .testPassRate = ($rate | tonumber) |
        .lastUpdate = $timestamp' \
       "$STATUS_FILE" > "$temp_status"
    
    # Validate JSON before moving
    if jq empty "$temp_status" 2>/dev/null; then
        mv "$temp_status" "$STATUS_FILE"
    else
        echo "$(date '+%H:%M:%S') ⚠️ Invalid JSON in status update - skipping" >> "$PROGRESS_FILE"
        rm -f "$temp_status"
    fi
    
    return 0
}

# Function to handle completion and enter maintenance mode
enter_maintenance_mode() {
    local reason="$1"
    local cycles="$2"
    local summary="$3"
    
    # Update final status
    jq -n --arg agent "$AGENT_NAME" --arg status "completed" --arg reason "$reason" \
       --arg cycles "$cycles" --arg maxRestarts "$MAX_RESTARTS" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       --arg summary "$summary" \
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
    
    # Enter maintenance mode
    enter_maintenance_mode "max_cycles_reached" "$MAX_RESTARTS" "$WORK_SUMMARY"
else
    # Increment counter for next cycle
    echo $((RESTART_COUNT + 1)) > "$RESTART_COUNT_FILE"
    export RESTART_COUNT=$((RESTART_COUNT + 1))
    echo "$(date '+%Y-%m-%d %H:%M:%S') 🚀 Starting self-improvement cycle $RESTART_COUNT" >> "$LOG_FILE"
    echo "🚀 Starting self-improvement cycle $RESTART_COUNT" >> "$PROGRESS_FILE"
    
    # Check if dependencies have been updated since we started
    if ! check_dependency_freshness; then
        echo "$(date '+%H:%M:%S') 🔄 Dependencies updated - restarting to get fresh changes" >> "$PROGRESS_FILE"
        
        # Don't reset restart counter - dependency updates are improvements, not failures
        # Keep current cycle count to track actual agent improvement progress
        
        # Update reference marker for next execution
        touch "/shared/status/${AGENT_NAME}-start-marker"
        
        # Create fresh status to trigger restart
        jq --arg reason "dependency_updated" --arg timestamp "$(date -Iseconds)" \
           '.reason = $reason | .lastUpdate = $timestamp' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
        
        echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 Restarting due to dependency updates" >> "$LOG_FILE"
        exit 0  # This will trigger container restart
    fi
fi

# Function to parse Claude output - Fix #2: Additional Claude output patterns
parse_claude_output() {
    while IFS= read -r line; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') $line" >> "$LOG_FILE"
        
        # Track file modifications
        if [[ "$line" =~ "File created:" ]] || [[ "$line" =~ "File modified:" ]]; then
            FILE=$(echo "$line" | sed 's/.*File [^:]*: //')
            echo "$(date '+%H:%M:%S') 📝 Modified: $FILE" >> "$PROGRESS_FILE"
            local temp_status="${STATUS_FILE}.tmp"
            jq --arg file "$FILE" '.filesModified += [$file]' \
               "$STATUS_FILE" > "$temp_status"
            if jq empty "$temp_status" 2>/dev/null; then
                mv "$temp_status" "$STATUS_FILE"
            else
                rm -f "$temp_status"
            fi
        fi
        
        # Track file creation with emoji pattern
        if [[ "$line" =~ "📝 Created file:" ]]; then
            FILE=$(echo "$line" | sed 's/.*Created file: //')
            echo "$(date '+%H:%M:%S') 📝 Created: $FILE" >> "$PROGRESS_FILE"
            local temp_status="${STATUS_FILE}.tmp"
            jq --arg file "$FILE" '.filesModified += [$file]' \
               "$STATUS_FILE" > "$temp_status"
            if jq empty "$temp_status" 2>/dev/null; then
                mv "$temp_status" "$STATUS_FILE"
            else
                rm -f "$temp_status"
            fi
        fi
        
        # Track task completion patterns
        if [[ "$line" =~ ✅.*[Cc]omplete[d]?:?\s*(.+) ]]; then
            TASK="${BASH_REMATCH[1]}"
            echo "$(date '+%H:%M:%S') ✅ Task completed: $TASK" >> "$PROGRESS_FILE"
        elif [[ "$line" =~ ✅.*([A-Za-z]+).*complete ]]; then
            TASK=$(echo "$line" | sed 's/✅ //' | sed 's/ complete.*//')
            echo "$(date '+%H:%M:%S') ✅ Task completed: $TASK" >> "$PROGRESS_FILE"
        fi
        
        # Track test results (existing + enhanced patterns)
        if [[ "$line" =~ "tests passing" ]]; then
            echo "$(date '+%H:%M:%S') ✅ $line" >> "$PROGRESS_FILE"
        elif [[ "$line" =~ Tests:.*([0-9]+.*passing|\([0-9]+%\)) ]]; then
            echo "$(date '+%H:%M:%S') 📊 Test progress: $line" >> "$PROGRESS_FILE"
        fi
        
        # Track errors
        if [[ "$line" =~ "Error:" ]] || [[ "$line" =~ "FAIL" ]]; then
            echo "$(date '+%H:%M:%S') ❌ $line" >> "$PROGRESS_FILE"
            local temp_status="${STATUS_FILE}.tmp"
            jq --arg error "$line" '.errors += [$error]' \
               "$STATUS_FILE" > "$temp_status"
            if jq empty "$temp_status" 2>/dev/null; then
                mv "$temp_status" "$STATUS_FILE"
            else
                rm -f "$temp_status"
            fi
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
        temp_status="${STATUS_FILE}.tmp"
        jq --arg heartbeat "$(date -Iseconds)" '.heartbeat = $heartbeat' \
           "$STATUS_FILE" > "$temp_status"
        if jq empty "$temp_status" 2>/dev/null; then
            mv "$temp_status" "$STATUS_FILE"
        else
            rm -f "$temp_status"
        fi
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
check_dependencies() {
    local dependency_names="$DEPENDS_ON"  # Should be comma-separated
    if [ -z "$dependency_names" ]; then
        echo "$(date '+%H:%M:%S') ⚡ No dependencies - starting immediately" >> "$PROGRESS_FILE"
        return 0
    fi

    echo "$(date '+%H:%M:%S') ⏳ Waiting for dependencies: $dependency_names" >> "$PROGRESS_FILE"
    
    # Convert comma-separated to array
    IFS=',' read -ra DEPS <<< "$dependency_names"
    
    local max_wait=3600  # 1 hour timeout
    local waited=0
    local check_interval=30
    
    while [ $waited -lt $max_wait ]; do
        local all_ready=true
        
        for dep in "${DEPS[@]}"; do
            # Remove any whitespace
            dep=$(echo "$dep" | tr -d ' ')
            
            # Check dependency based on agent type and what it should provide
            local dep_ready=false
            
            if [[ "$dep" == *"-tests" ]]; then
                # For test-writer dependencies, check if test files exist
                local test_pattern=""
                case "$dep" in
                    *"schema-tests") test_pattern="src/schemas/**/*.test.ts" ;;
                    *"service-tests") test_pattern="src/services/**/*.test.ts" ;;
                    *"hooks-tests") test_pattern="src/hooks/**/*.test.tsx" ;;
                    *"screens-tests") test_pattern="src/screens/**/*.test.tsx" ;;
                    *"components-tests") test_pattern="src/components/**/*.test.tsx" ;;
                    *"integration-tests") test_pattern="src/integration/**/*.test.ts*" ;;
                esac
                
                if [ -n "$test_pattern" ] && ls /workspace/$test_pattern 1> /dev/null 2>&1; then
                    dep_ready=true
                    echo "$(date '+%H:%M:%S') ✅ Found test files for: $dep" >> "$PROGRESS_FILE"
                fi
            elif [[ "$dep" == *"-impl" ]]; then
                # For implementation dependencies, check if implementation files exist
                local impl_pattern=""
                case "$dep" in
                    *"schema-impl") impl_pattern="src/schemas/**/!(*.test.*)" ;;
                    *"service-impl") impl_pattern="src/services/**/!(*.test.*)" ;;
                    *"hooks-impl") impl_pattern="src/hooks/**/!(*.test.*)" ;;
                    *"components-impl") impl_pattern="src/components/**/!(*.test.*)" ;;
                    *"screens-impl") impl_pattern="src/screens/**/!(*.test.*)" ;;
                    *"integration-impl") impl_pattern="src/integration/**/!(*.test.*)" ;;
                esac
                
                if [ -n "$impl_pattern" ] && ls /workspace/$impl_pattern 1> /dev/null 2>&1; then
                    dep_ready=true
                    echo "$(date '+%H:%M:%S') ✅ Found implementation files for: $dep" >> "$PROGRESS_FILE"
                fi
            elif [[ "$dep" == *"-refactor" || "$dep" == *"-audit" || "$dep" == *"-integration-final" ]]; then
                # For process-based agents (refactor, audit, final integration), 
                # check if they have completed at least one successful cycle
                if [ -f "/shared/handoffs/${dep}-complete.md" ]; then
                    dep_ready=true
                    echo "$(date '+%H:%M:%S') ✅ Found completion handoff for process agent: $dep" >> "$PROGRESS_FILE"
                elif [ -f "/shared/status/${dep}.json" ]; then
                    # Check if status shows completion or success
                    local status=$(jq -r '.status // "pending"' "/shared/status/${dep}.json" 2>/dev/null)
                    if [[ "$status" == "completed" || "$status" == "success" ]]; then
                        dep_ready=true
                        echo "$(date '+%H:%M:%S') ✅ Found successful status for process agent: $dep ($status)" >> "$PROGRESS_FILE"
                    fi
                fi
            fi
            
            # Fallback: check completion handoff if file-based check doesn't apply
            if [ "$dep_ready" = false ] && [ -f "/shared/handoffs/${dep}-complete.md" ]; then
                dep_ready=true
                echo "$(date '+%H:%M:%S') ✅ Found completion handoff for: $dep" >> "$PROGRESS_FILE"
            fi
            
            if [ "$dep_ready" = false ]; then
                all_ready=false
                echo "$(date '+%H:%M:%S') ⏳ Still waiting for: $dep (completion handoff file not found)" >> "$PROGRESS_FILE"
                break
            fi
        done
        
        if [ "$all_ready" = true ]; then
            echo "$(date '+%H:%M:%S') ✅ All dependencies ready!" >> "$PROGRESS_FILE"
            return 0
        fi
        
        sleep $check_interval
        waited=$((waited + check_interval))
    done
    
    echo "$(date '+%H:%M:%S') ⚠️ Timeout waiting for dependencies after ${max_wait}s" >> "$PROGRESS_FILE"
    return 1
}

# Wait for dependencies before proceeding
if ! check_dependencies; then
    echo "❌ Failed dependency check - exiting" >> "$PROGRESS_FILE"
    exit 1
fi

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
    echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ Early completion: tests already passing at ${PASS_RATE}%!" >> "$LOG_FILE"
    echo "✅ Tests already passing at ${PASS_RATE}%!" >> "$PROGRESS_FILE"
    
    # Generate completion summary 
    WORK_SUMMARY="Early completion: ${TESTS_PASS}/${TOTAL_TESTS} tests passing (${PASS_RATE}%)"
    
    # Enter maintenance mode using shared function
    enter_maintenance_mode "tests_passing" "$RESTART_COUNT" "$WORK_SUMMARY"
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

# Check dependencies one more time before Claude execution
if ! check_dependency_freshness; then
    echo "$(date '+%H:%M:%S') 🔄 Dependencies updated just before Claude execution - restarting" >> "$PROGRESS_FILE"
# Don't reset counter - keep tracking actual improvement cycles
    # Update reference marker for next execution
    touch "/shared/status/${AGENT_NAME}-start-marker"
    jq --arg reason "dependency_updated_pre_execution" --arg timestamp "$(date -Iseconds)" \
       '.reason = $reason | .lastUpdate = $timestamp' \
       "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 Restarting due to dependency updates (pre-execution)" >> "$LOG_FILE"
    exit 0
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

# Execute Claude with the enhanced prompt - Fix #3: Heartbeat during Claude execution
# Start heartbeat during Claude execution
(
    while kill -0 $$ 2>/dev/null; do
        jq --arg heartbeat "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.lastUpdate = $heartbeat | .status = "working"' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE" 2>/dev/null || true
        sleep 30
    done
) &
CLAUDE_HEARTBEAT_PID=$!

OUTPUT=$(echo "$CLAUDE_PROMPT" | claude --dangerously-skip-permissions 2>&1)
EXIT_CODE=$?

# Stop Claude execution heartbeat
kill $CLAUDE_HEARTBEAT_PID 2>/dev/null || true
wait $CLAUDE_HEARTBEAT_PID 2>/dev/null || true

# Check dependencies again after Claude execution in case they updated during our work
if ! check_dependency_freshness; then
    echo "$(date '+%H:%M:%S') 🔄 Dependencies updated during Claude execution - restarting to incorporate changes" >> "$PROGRESS_FILE"
# Don't reset counter - keep tracking actual improvement cycles
    # Update reference marker for next execution
    touch "/shared/status/${AGENT_NAME}-start-marker"
    jq --arg reason "dependency_updated_during_execution" --arg timestamp "$(date -Iseconds)" \
       '.reason = $reason | .lastUpdate = $timestamp' \
       "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 Restarting due to dependency updates (post-execution)" >> "$LOG_FILE"
    exit 0
fi

# Parse output
echo "$OUTPUT" | parse_claude_output

# Run tests again to check progress
echo "$(date '+%H:%M:%S') 🧪 Running tests after improvements..." >> "$PROGRESS_FILE"
run_tests "Post-improvement"

# Final dependency check before declaring cycle complete
if ! check_dependency_freshness; then
    echo "$(date '+%H:%M:%S') 🔄 Dependencies updated while running tests - restarting to incorporate changes" >> "$PROGRESS_FILE"
# Don't reset counter - keep tracking actual improvement cycles
    # Update reference marker for next execution
    touch "/shared/status/${AGENT_NAME}-start-marker"
    jq --arg reason "dependency_updated_post_tests" --arg timestamp "$(date -Iseconds)" \
       '.reason = $reason | .lastUpdate = $timestamp' \
       "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 Restarting due to dependency updates (post-tests)" >> "$LOG_FILE"
    exit 0
fi

# Update work summary
WORK_SUMMARY="Cycle ${RESTART_COUNT}: ${TESTS_PASS}/${TOTAL_TESTS} tests passing (${PASS_RATE}%)"
jq --arg summary "$WORK_SUMMARY" '.workSummary = $summary' \
   "$STATUS_FILE" > "${STATUS_FILE}.tmp" && mv "${STATUS_FILE}.tmp" "$STATUS_FILE"

echo "$(date '+%H:%M:%S') 📊 Cycle ${RESTART_COUNT} complete: ${PASS_RATE}% pass rate" >> "$PROGRESS_FILE"

# Exit to trigger restart for next cycle
exit 0