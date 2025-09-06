#!/bin/bash
# Boundary Violation Detection System
# Monitors integration agent for compliance violations

set -e

# Configuration
AGENT_NAME="repository-integration"
WORKSPACE="/workspace"
TARGET_REPO="${TARGET_REPO:-}"
MONITOR_INTERVAL=30  # seconds
VIOLATIONS_LOG="/shared/violations/boundary-violations.log"
ALLOWED_CHANGES_LOG="/shared/violations/allowed-changes.log"

# Create monitoring directories
mkdir -p "/shared/violations"
mkdir -p "/shared/snapshots"

echo "🛡️  BOUNDARY MONITOR ACTIVE"
echo "=========================="
echo "Agent: $AGENT_NAME"
echo "Target Repo: $TARGET_REPO"
echo "Monitor Interval: ${MONITOR_INTERVAL}s"
echo "Violations Log: $VIOLATIONS_LOG"
echo ""

# Initialize baseline snapshot
take_snapshot() {
    local snapshot_name="$1"
    local snapshot_dir="/shared/snapshots/$snapshot_name"
    
    echo "📸 Taking snapshot: $snapshot_name"
    mkdir -p "$snapshot_dir"
    
    # Snapshot main codebase structure (not content, just structure)
    find "$WORKSPACE/src" -name "*.ts" -o -name "*.tsx" | head -100 > "$snapshot_dir/main-files.list"
    
    # Snapshot package.json
    cp "$WORKSPACE/package.json" "$snapshot_dir/package.json" 2>/dev/null || true
    
    # Snapshot important config files  
    cp "$WORKSPACE/tsconfig.json" "$snapshot_dir/tsconfig.json" 2>/dev/null || true
    cp "$WORKSPACE/jest.config.js" "$snapshot_dir/jest.config.js" 2>/dev/null || true
    
    # Git status
    cd "$WORKSPACE"
    git status --porcelain > "$snapshot_dir/git-status.txt"
    git log --oneline -5 > "$snapshot_dir/recent-commits.txt"
    
    echo "  ✅ Snapshot saved: $snapshot_dir"
}

# Check for boundary violations
check_violations() {
    local cycle="$1"
    local violations=0
    
    echo "🔍 VIOLATION CHECK - Cycle $cycle"
    echo "================================"
    
    cd "$WORKSPACE"
    
    # Violation 1: Modified existing main codebase files
    echo "🚫 Checking: Main codebase modifications..."
    
    # Get list of files that existed before integration
    if [ -f "/shared/snapshots/baseline/main-files.list" ]; then
        while read -r main_file; do
            if git diff HEAD~1 "$main_file" 2>/dev/null | grep -q "^-"; then
                echo "  ⚠️  VIOLATION: Modified existing file: $main_file" | tee -a "$VIOLATIONS_LOG"
                violations=$((violations + 1))
            fi
        done < "/shared/snapshots/baseline/main-files.list"
    fi
    
    # Violation 2: Modified agent's core business logic
    echo "🚫 Checking: Agent logic modifications..."
    
    if [ -n "$TARGET_REPO" ] && [ -d "docker/volumes/$TARGET_REPO" ]; then
        # Check if any agent files were modified after copying
        AGENT_PREFIX=$(basename "$TARGET_REPO" | sed 's/tdd_phase_4-//')
        
        find src -path "*executive-$AGENT_PREFIX*" -name "*.ts" -o -name "*.tsx" | while read file; do
            # Look for suspicious changes that might be logic modifications
            if git show HEAD:"$file" 2>/dev/null | grep -qE "(algorithm|calculation|business.*logic|core.*function)"; then
                if git diff HEAD~1 "$file" | grep -qE "^[-+].*\b(algorithm|calculation|logic|function.*\{)" | grep -v "import\|export"; then
                    echo "  ⚠️  VIOLATION: Possible logic modification in: $file" | tee -a "$VIOLATIONS_LOG"
                    violations=$((violations + 1))
                fi
            fi
        done
    fi
    
    # Violation 3: Deleted or moved agent files
    echo "🚫 Checking: Agent file preservation..."
    
    if [ -n "$TARGET_REPO" ] && [ -d "docker/volumes/$TARGET_REPO" ]; then
        AGENT_FILES=$(find "docker/volumes/$TARGET_REPO/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
        INTEGRATED_FILES=$(find src -name "*$(basename $TARGET_REPO | sed 's/tdd_phase_4-//')*" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
        
        if [ "$INTEGRATED_FILES" -lt "$((AGENT_FILES * 8 / 10))" ]; then  # Allow 20% variance
            echo "  ⚠️  VIOLATION: Significant agent files missing ($INTEGRATED_FILES vs $AGENT_FILES expected)" | tee -a "$VIOLATIONS_LOG"
            violations=$((violations + 1))
        fi
    fi
    
    # Violation 4: Modified critical system files inappropriately
    echo "🚫 Checking: System file modifications..."
    
    CRITICAL_FILES=("package.json" "tsconfig.json" ".gitignore")
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ] && git diff HEAD~1 "$file" 2>/dev/null | grep -qE "^-.*\b(main|scripts|dependencies)" | grep -v "$TARGET_REPO"; then
            echo "  ⚠️  VIOLATION: Inappropriate modification of $file" | tee -a "$VIOLATIONS_LOG"
            violations=$((violations + 1))
        fi
    done
    
    # Violation 5: Created new business features
    echo "🚫 Checking: New feature implementation..."
    
    NEW_FILES=$(git diff HEAD~1 --name-only --diff-filter=A | grep -E "\.(ts|tsx)$" | grep -v test | grep -v "__tests__")
    if [ -n "$NEW_FILES" ]; then
        echo "$NEW_FILES" | while read new_file; do
            if git show HEAD:"$new_file" 2>/dev/null | grep -qE "(export.*function|export.*class)" | grep -v "Integration\|Adapter\|Wrapper"; then
                echo "  ⚠️  VIOLATION: New business logic implemented in: $new_file" | tee -a "$VIOLATIONS_LOG"
                violations=$((violations + 1))
            fi
        done
    fi
    
    echo ""
    if [ $violations -eq 0 ]; then
        echo "✅ No boundary violations detected"
    else
        echo "❌ $violations boundary violations detected"
        echo "🚨 ALERT: Agent may be stepping outside boundaries!"
    fi
    
    echo "Violations: $violations" > "/shared/violations/violation-count-cycle-$cycle.txt"
    return $violations
}

# Check for allowed/expected changes
check_allowed_changes() {
    local cycle="$1"
    
    echo "✅ ALLOWED CHANGES CHECK - Cycle $cycle"
    echo "======================================"
    
    cd "$WORKSPACE"
    
    # Expected: New files in agent-specific directories
    AGENT_PREFIX=$(basename "$TARGET_REPO" | sed 's/tdd_phase_4-//')
    AGENT_FILES=$(git diff HEAD~1 --name-only --diff-filter=A | grep -E "executive-$AGENT_PREFIX" | wc -l)
    echo "  ✅ Agent files added: $AGENT_FILES" | tee -a "$ALLOWED_CHANGES_LOG"
    
    # Expected: Import path updates within agent files  
    IMPORT_UPDATES=$(git diff HEAD~1 | grep -c "^[+-].*@/.*executive.*$AGENT_PREFIX" || echo "0")
    echo "  ✅ Import path updates: $IMPORT_UPDATES" | tee -a "$ALLOWED_CHANGES_LOG"
    
    # Expected: Integration layer files
    INTEGRATION_FILES=$(git diff HEAD~1 --name-only --diff-filter=A | grep -E "integration.*executive" | wc -l)
    echo "  ✅ Integration files: $INTEGRATION_FILES" | tee -a "$ALLOWED_CHANGES_LOG"
    
    # Expected: Test updates for new paths
    TEST_UPDATES=$(git diff HEAD~1 | grep -c "^[+-].*test.*executive.*$AGENT_PREFIX" || echo "0")
    echo "  ✅ Test path updates: $TEST_UPDATES" | tee -a "$ALLOWED_CHANGES_LOG"
}

# Main monitoring loop
monitor_agent() {
    echo "🔄 Starting continuous monitoring..."
    echo ""
    
    # Take baseline snapshot
    take_snapshot "baseline"
    
    local cycle=1
    
    while true; do
        sleep "$MONITOR_INTERVAL"
        
        # Check if agent is still running
        if ! docker ps | grep -q "$AGENT_NAME"; then
            echo "📊 Agent stopped. Taking final snapshot..."
            take_snapshot "final-cycle-$cycle"
            check_violations "$cycle"
            check_allowed_changes "$cycle"
            break
        fi
        
        # Check for git changes
        cd "$WORKSPACE"
        if [ -n "$(git status --porcelain)" ]; then
            echo ""
            echo "🔄 CHANGES DETECTED - Cycle $cycle"
            echo "================================="
            
            # Take snapshot before analysis
            take_snapshot "cycle-$cycle"
            
            # Check for violations
            if check_violations "$cycle"; then
                echo "✅ Cycle $cycle: No violations detected"
            else
                echo "❌ Cycle $cycle: VIOLATIONS DETECTED!"
                
                # Alert user (could integrate with notifications)
                echo "🚨 BOUNDARY VIOLATION ALERT 🚨" > "/shared/violations/ALERT-cycle-$cycle.txt"
                echo "Time: $(date)" >> "/shared/violations/ALERT-cycle-$cycle.txt"
                echo "Cycle: $cycle" >> "/shared/violations/ALERT-cycle-$cycle.txt"
                echo "See: $VIOLATIONS_LOG" >> "/shared/violations/ALERT-cycle-$cycle.txt"
                
                # Optionally pause agent for review
                if [ "${AUTO_PAUSE_ON_VIOLATION:-true}" = "true" ]; then
                    echo "⏸️  Auto-pausing agent for violation review..."
                    docker pause "$AGENT_NAME-agent" 2>/dev/null || echo "Could not pause agent"
                fi
            fi
            
            # Log allowed changes
            check_allowed_changes "$cycle"
            
            cycle=$((cycle + 1))
        fi
    done
    
    echo ""
    echo "🏁 MONITORING COMPLETE"
    echo "Total cycles monitored: $((cycle - 1))"
    echo "Final violations log: $VIOLATIONS_LOG"
    echo "Snapshots directory: /shared/snapshots"
}

# Handle signals for clean shutdown
trap 'echo "📊 Monitor shutting down..."; exit 0' SIGTERM SIGINT

# Start monitoring
monitor_agent