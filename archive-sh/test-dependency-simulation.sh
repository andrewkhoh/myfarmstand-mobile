#!/bin/bash

# Dependency Logic Simulation Test
# Simulates the TDD workflow to test dependency gates before real Docker run

set -e

echo "🧪 Testing TDD Dependency Logic Simulation"
echo "=========================================="

# Create test environment
TEST_DIR="/tmp/tdd-dependency-test"
rm -rf "$TEST_DIR" 2>/dev/null || true
mkdir -p "$TEST_DIR/shared/"{logs,status,handoffs,restart_counters}

# Simulate the dependency checking functions
export SHARED_DIR="$TEST_DIR/shared"

# Helper function to create agent status
create_agent_status() {
    local agent="$1"
    local status="${2:-pending}"
    cat > "$SHARED_DIR/status/${agent}.json" << EOF
{
  "agent": "$agent",
  "status": "$status",
  "startTime": "$(date -Iseconds)",
  "lastUpdate": "$(date -Iseconds)",
  "cycles": 0
}
EOF
}

# Helper function to create completion handoff
create_completion() {
    local agent="$1"
    echo "✅ $agent completed at $(date)" > "$SHARED_DIR/handoffs/${agent}-complete.md"
}

# Simulate the dependency checking logic
check_dependencies() {
    local agent="$1"
    local depends_on="$2"
    
    echo "🔍 Checking dependencies for $agent: [$depends_on]"
    
    if [ -z "$depends_on" ]; then
        echo "  ⚡ No dependencies - can start immediately"
        return 0
    fi
    
    # Convert comma-separated to array
    IFS=',' read -ra DEPS <<< "$depends_on"
    
    for dep in "${DEPS[@]}"; do
        dep=$(echo "$dep" | tr -d ' ')
        
        if [[ "$dep" == *"-tests" ]]; then
            echo "    📝 Checking test dependency: $dep"
            # In real system, would check for test files
            # For simulation, check handoff
            if [ -f "$SHARED_DIR/handoffs/${dep}-complete.md" ]; then
                echo "    ✅ Test dependency $dep satisfied"
            else
                echo "    ⏳ Waiting for test dependency: $dep"
                return 1
            fi
        elif [[ "$dep" == *"-impl" ]]; then
            echo "    🔧 Checking implementation dependency: $dep"
            if [ -f "$SHARED_DIR/handoffs/${dep}-complete.md" ]; then
                echo "    ✅ Implementation dependency $dep satisfied"
            else
                echo "    ⏳ Waiting for implementation dependency: $dep"
                return 1
            fi
        elif [[ "$dep" == *"-refactor" || "$dep" == *"-audit" || "$dep" == *"-integration-final" ]]; then
            echo "    🔄 Checking process dependency: $dep"
            if [ -f "$SHARED_DIR/handoffs/${dep}-complete.md" ]; then
                echo "    ✅ Process dependency $dep satisfied"
            else
                echo "    ⏳ Waiting for process dependency: $dep"
                return 1
            fi
        fi
    done
    
    echo "  ✅ All dependencies satisfied for $agent"
    return 0
}

# Simulate freshness checking
check_dependency_freshness() {
    local agent="$1"
    local depends_on="$2"
    local start_marker="$SHARED_DIR/status/${agent}-start-marker"
    
    echo "🔍 Checking dependency freshness for $agent"
    
    if [ -z "$depends_on" ]; then
        return 0
    fi
    
    if [ ! -f "$start_marker" ]; then
        touch "$start_marker"
        echo "  📅 Created start marker for $agent"
        return 0
    fi
    
    IFS=',' read -ra DEPS <<< "$depends_on"
    
    for dep in "${DEPS[@]}"; do
        dep=$(echo "$dep" | tr -d ' ')
        
        if [ -f "$SHARED_DIR/handoffs/${dep}-complete.md" ]; then
            if [ "$SHARED_DIR/handoffs/${dep}-complete.md" -nt "$start_marker" ]; then
                echo "  🔄 Dependency $dep updated since start - needs restart"
                return 1
            fi
        fi
    done
    
    echo "  ✅ All dependencies are stale - continue"
    return 0
}

# Test scenario function
run_scenario() {
    local scenario="$1"
    echo ""
    echo "🎬 SCENARIO: $scenario"
    echo "----------------------------------------"
}

# Clean state for each test
reset_test() {
    rm -rf "$SHARED_DIR/handoffs"/* 2>/dev/null || true
    rm -rf "$SHARED_DIR/status"/* 2>/dev/null || true
    mkdir -p "$SHARED_DIR/"{handoffs,status}
}

# ============================================================================
# TEST SCENARIOS
# ============================================================================

run_scenario "1. RED Phase - No Dependencies (Parallel Start)"
reset_test

# All RED phase agents should start immediately
for agent in "marketing-schema-tests" "marketing-service-tests" "marketing-hooks-tests"; do
    if check_dependencies "$agent" ""; then
        echo "  ✅ $agent can start (no dependencies)"
        create_completion "$agent"
    else
        echo "  ❌ $agent blocked unexpectedly"
    fi
done

run_scenario "2. GREEN Phase - Waiting for RED Phase"
reset_test

# Create RED completions first
create_completion "marketing-schema-tests"
create_completion "marketing-service-tests" 
create_completion "marketing-hooks-tests"

# Test GREEN phase dependencies
if check_dependencies "marketing-schema-impl" "marketing-schema-tests"; then
    echo "  ✅ marketing-schema-impl can start (schema tests ready)"
    create_completion "marketing-schema-impl"
else
    echo "  ❌ marketing-schema-impl blocked unexpectedly"
fi

if check_dependencies "marketing-service-impl" "marketing-service-tests,marketing-schema-impl"; then
    echo "  ✅ marketing-service-impl can start (service tests + schema impl ready)"
    create_completion "marketing-service-impl"
else
    echo "  ❌ marketing-service-impl blocked unexpectedly"
fi

run_scenario "3. GREEN Phase - Missing Dependencies"
reset_test

# Only create some completions
create_completion "marketing-schema-tests"
# DON'T create marketing-service-tests completion

if check_dependencies "marketing-service-impl" "marketing-service-tests,marketing-schema-impl"; then
    echo "  ❌ marketing-service-impl should be blocked but isn't!"
else
    echo "  ✅ marketing-service-impl correctly blocked (missing service tests)"
fi

run_scenario "4. Dependency Freshness - No Updates"
reset_test

create_completion "marketing-schema-tests"
create_agent_status "marketing-schema-impl" "running"

# First check should create marker and pass
if check_dependency_freshness "marketing-schema-impl" "marketing-schema-tests"; then
    echo "  ✅ First freshness check passed (created marker)"
else
    echo "  ❌ First freshness check failed unexpectedly"
fi

# Second check should pass (no updates)
sleep 1
if check_dependency_freshness "marketing-schema-impl" "marketing-schema-tests"; then
    echo "  ✅ Second freshness check passed (no updates)"
else
    echo "  ❌ Second freshness check failed unexpectedly"
fi

run_scenario "5. Dependency Freshness - Detect Updates"
reset_test

create_completion "marketing-schema-tests"
create_agent_status "marketing-schema-impl" "running"

# First check creates marker
check_dependency_freshness "marketing-schema-impl" "marketing-schema-tests"

# Simulate dependency update
sleep 1
create_completion "marketing-schema-tests"  # This updates the timestamp

# Should detect update
if check_dependency_freshness "marketing-schema-impl" "marketing-schema-tests"; then
    echo "  ❌ Should have detected update but didn't!"
else
    echo "  ✅ Correctly detected dependency update"
fi

run_scenario "6. Complex Chain - REFACTOR → AUDIT → FINAL"
reset_test

# Set up full chain
create_completion "marketing-integration-impl"

if check_dependencies "marketing-refactor" "marketing-integration-impl"; then
    echo "  ✅ marketing-refactor can start (integration-impl ready)"
    create_completion "marketing-refactor"
    
    if check_dependencies "marketing-audit" "marketing-refactor"; then
        echo "  ✅ marketing-audit can start (refactor ready)"
        create_completion "marketing-audit"
        
        if check_dependencies "marketing-integration-final" "marketing-audit"; then
            echo "  ✅ marketing-integration-final can start (audit ready)"
        else
            echo "  ❌ final integration blocked unexpectedly"
        fi
    else
        echo "  ❌ audit blocked unexpectedly"
    fi
else
    echo "  ❌ refactor blocked unexpectedly"
fi

run_scenario "7. Cascade Update Detection"
reset_test

# Start audit agent 
create_completion "marketing-refactor"
create_agent_status "marketing-audit" "running"

# Audit checks freshness - should pass initially
check_dependency_freshness "marketing-audit" "marketing-refactor"

# Refactor completes cycle 2
sleep 1
create_completion "marketing-refactor"

# Audit should detect the update
if check_dependency_freshness "marketing-audit" "marketing-refactor"; then
    echo "  ❌ Audit should have detected refactor cycle 2 completion!"
else
    echo "  ✅ Audit correctly detected refactor update - will restart"
fi

run_scenario "8. Multiple Dependency Updates"
reset_test

create_completion "marketing-hooks-tests"
create_completion "marketing-service-impl"
create_agent_status "marketing-hooks-impl" "running"

# First check
check_dependency_freshness "marketing-hooks-impl" "marketing-hooks-tests,marketing-service-impl"

# Update one dependency
sleep 1
create_completion "marketing-service-impl"

# Should detect update
if check_dependency_freshness "marketing-hooks-impl" "marketing-hooks-tests,marketing-service-impl"; then
    echo "  ❌ Should have detected service-impl update!"
else
    echo "  ✅ Correctly detected one of multiple dependency updates"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "🏁 SIMULATION COMPLETE"
echo "======================"
echo ""
echo "Key Tests Performed:"
echo "✅ RED phase parallel start (no dependencies)"
echo "✅ GREEN phase dependency waiting"
echo "✅ Missing dependency blocking"
echo "✅ Initial freshness check setup"
echo "✅ No-update freshness passes"
echo "✅ Update detection triggers restart"
echo "✅ Complex dependency chains (REFACTOR→AUDIT→FINAL)"
echo "✅ Cascade update detection (refactor cycle 2 → audit restart)"
echo "✅ Multiple dependency monitoring"
echo ""
echo "If all tests show ✅, the dependency logic is working correctly!"
echo "Safe to proceed with real Docker containers."
echo ""

# Cleanup
rm -rf "$TEST_DIR"