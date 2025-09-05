#!/bin/bash
# Real-Time Agent Compliance Monitor
# Continuously monitors agent behavior for policy violations and compliance

set -e

# Configuration
AGENT_NAME="${1:-repository-integration}"
WORKSPACE="/workspace"
SHARED_PATH="/shared"
MONITOR_INTERVAL=15  # seconds
COMPLIANCE_LOG="$SHARED_PATH/compliance/compliance-monitor.log"
ALERTS_DIR="$SHARED_PATH/compliance/alerts"
METRICS_DIR="$SHARED_PATH/compliance/metrics"

# Create monitoring directories
mkdir -p "$SHARED_PATH/compliance" "$ALERTS_DIR" "$METRICS_DIR"

echo "📊 REAL-TIME COMPLIANCE MONITOR"
echo "=============================="
echo "Agent: $AGENT_NAME"
echo "Workspace: $WORKSPACE"
echo "Monitor Interval: ${MONITOR_INTERVAL}s"
echo "Compliance Log: $COMPLIANCE_LOG"
echo ""

# Initialize compliance tracking
init_compliance_tracking() {
    echo "🔧 Initializing compliance tracking..."
    
    # Create baseline metrics
    cat > "$METRICS_DIR/baseline-metrics.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "agent": "$AGENT_NAME",
  "workspace_files": $(find "$WORKSPACE/src" -name "*.ts" -o -name "*.tsx" | wc -l),
  "git_commits": $(cd "$WORKSPACE" && git rev-list --count HEAD),
  "test_files": $(find "$WORKSPACE" -name "*.test.ts" -o -name "*.test.tsx" | wc -l),
  "package_dependencies": $(cd "$WORKSPACE" && jq '.dependencies | keys | length' package.json 2>/dev/null || echo "0")
}
EOF
    
    # Initialize compliance state
    cat > "$SHARED_PATH/compliance/state.json" << EOF
{
  "monitoring_started": "$(date -Iseconds)",
  "agent": "$AGENT_NAME",
  "total_cycles": 0,
  "violations": 0,
  "warnings": 0,
  "compliance_score": 100.0,
  "status": "monitoring"
}
EOF
    
    echo "✅ Compliance tracking initialized"
}

# Check agent behavior patterns
check_behavior_patterns() {
    local cycle="$1"
    local violations=0
    local warnings=0
    
    echo "🔍 BEHAVIOR ANALYSIS - Cycle $cycle"
    echo "================================="
    
    cd "$WORKSPACE"
    
    # Pattern 1: Excessive file modification rate
    echo "📊 Checking: File modification rate..."
    
    RECENT_CHANGES=$(git diff HEAD~1 --name-only 2>/dev/null | wc -l)
    if [ "$RECENT_CHANGES" -gt 50 ]; then
        echo "  ⚠️  WARNING: High modification rate ($RECENT_CHANGES files)" | tee -a "$COMPLIANCE_LOG"
        warnings=$((warnings + 1))
        
        # Create alert
        cat > "$ALERTS_DIR/high-modification-rate-cycle-$cycle.json" << EOF
{
  "type": "warning",
  "severity": "medium",
  "cycle": $cycle,
  "issue": "high_modification_rate",
  "details": {
    "files_modified": $RECENT_CHANGES,
    "threshold": 50,
    "recommendation": "Agent may be making overly broad changes"
  },
  "timestamp": "$(date -Iseconds)"
}
EOF
    fi
    
    # Pattern 2: Suspicious commit message patterns
    echo "📊 Checking: Commit message patterns..."
    
    LAST_COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
    if echo "$LAST_COMMIT_MSG" | grep -iE "(fix|refactor|improve|enhance|optimize)" | grep -vE "(integrate|integration|path|import)" >/dev/null; then
        echo "  ⚠️  WARNING: Suspicious commit message: $LAST_COMMIT_MSG" | tee -a "$COMPLIANCE_LOG"
        warnings=$((warnings + 1))
        
        cat > "$ALERTS_DIR/suspicious-commit-cycle-$cycle.json" << EOF
{
  "type": "warning",
  "severity": "medium",
  "cycle": $cycle,
  "issue": "suspicious_commit_message",
  "details": {
    "commit_message": "$LAST_COMMIT_MSG",
    "concern": "Message suggests non-integration work",
    "recommendation": "Verify agent is only doing integration, not feature development"
  },
  "timestamp": "$(date -Iseconds)"
}
EOF
    fi
    
    # Pattern 3: Test file creation outside integration scope
    echo "📊 Checking: Test file creation patterns..."
    
    NEW_TEST_FILES=$(git diff HEAD~1 --name-only --diff-filter=A | grep -E "\.test\.(ts|tsx)$" | grep -v "integration" | wc -l)
    if [ "$NEW_TEST_FILES" -gt 0 ]; then
        echo "  ⚠️  VIOLATION: New non-integration test files created" | tee -a "$COMPLIANCE_LOG"
        violations=$((violations + 1))
        
        cat > "$ALERTS_DIR/unauthorized-test-creation-cycle-$cycle.json" << EOF
{
  "type": "violation",
  "severity": "high",
  "cycle": $cycle,
  "issue": "unauthorized_test_creation",
  "details": {
    "new_test_files": $NEW_TEST_FILES,
    "files": [$(git diff HEAD~1 --name-only --diff-filter=A | grep -E "\.test\.(ts|tsx)$" | grep -v "integration" | sed 's/^/"/' | sed 's/$/"/' | tr '\n' ',' | sed 's/,$//')],
    "policy": "Agent should only create integration verification tests"
  },
  "timestamp": "$(date -Iseconds)"
}
EOF
    fi
    
    # Pattern 4: Business logic indicators in new code
    echo "📊 Checking: Business logic implementation..."
    
    NEW_FILES=$(git diff HEAD~1 --name-only --diff-filter=A | grep -E "\.(ts|tsx)$" | grep -v test)
    BUSINESS_LOGIC_LINES=0
    
    if [ -n "$NEW_FILES" ]; then
        while read -r file; do
            if [ -f "$file" ]; then
                BUSINESS_LINES=$(grep -cE "(calculate|process|validate|transform|business|logic)" "$file" 2>/dev/null || echo "0")
                BUSINESS_LOGIC_LINES=$((BUSINESS_LOGIC_LINES + BUSINESS_LINES))
            fi
        done <<< "$NEW_FILES"
    fi
    
    if [ "$BUSINESS_LOGIC_LINES" -gt 5 ]; then
        echo "  ❌ VIOLATION: Business logic implementation detected ($BUSINESS_LOGIC_LINES instances)" | tee -a "$COMPLIANCE_LOG"
        violations=$((violations + 1))
        
        cat > "$ALERTS_DIR/business-logic-violation-cycle-$cycle.json" << EOF
{
  "type": "violation",
  "severity": "critical",
  "cycle": $cycle,
  "issue": "business_logic_implementation",
  "details": {
    "business_logic_lines": $BUSINESS_LOGIC_LINES,
    "threshold": 5,
    "policy": "Agent should only create integration infrastructure, not business logic"
  },
  "timestamp": "$(date -Iseconds)"
}
EOF
    fi
    
    # Pattern 5: Package.json modification analysis
    echo "📊 Checking: Package.json modifications..."
    
    if git diff HEAD~1 package.json 2>/dev/null | grep -E "^[+-].*\"(dependencies|scripts)\"" | grep -v "integration\|test" >/dev/null; then
        echo "  ⚠️  WARNING: Significant package.json modifications" | tee -a "$COMPLIANCE_LOG"
        warnings=$((warnings + 1))
        
        PACKAGE_CHANGES=$(git diff HEAD~1 package.json | grep -E "^[+-]" | head -5 | tr '\n' '; ')
        
        cat > "$ALERTS_DIR/package-modification-cycle-$cycle.json" << EOF
{
  "type": "warning",
  "severity": "medium",
  "cycle": $cycle,
  "issue": "package_json_modification",
  "details": {
    "changes": "$PACKAGE_CHANGES",
    "recommendation": "Verify changes are integration-related only"
  },
  "timestamp": "$(date -Iseconds)"
}
EOF
    fi
    
    echo ""
    echo "📊 Behavior Analysis Summary:"
    echo "  Violations: $violations"
    echo "  Warnings: $warnings"
    echo "  Compliance Score: $(echo "scale=1; 100 - ($violations * 10) - ($warnings * 2)" | bc -l)%"
    
    # Update metrics
    cat > "$METRICS_DIR/cycle-$cycle-metrics.json" << EOF
{
  "cycle": $cycle,
  "timestamp": "$(date -Iseconds)",
  "violations": $violations,
  "warnings": $warnings,
  "files_modified": $RECENT_CHANGES,
  "business_logic_lines": $BUSINESS_LOGIC_LINES,
  "new_test_files": $NEW_TEST_FILES,
  "compliance_score": $(echo "scale=1; 100 - ($violations * 10) - ($warnings * 2)" | bc -l)
}
EOF
    
    return $((violations + warnings))
}

# Check Docker resource usage patterns
check_resource_patterns() {
    local cycle="$1"
    
    echo "🐳 RESOURCE USAGE ANALYSIS - Cycle $cycle"
    echo "======================================="
    
    # CPU usage analysis
    if docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemPerc}}" 2>/dev/null | grep "$AGENT_NAME" >/dev/null; then
        CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" "$AGENT_NAME-agent" 2>/dev/null | sed 's/%//')
        MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" "$AGENT_NAME-agent" 2>/dev/null | sed 's/%//')
        
        echo "  📊 CPU Usage: ${CPU_USAGE}%"
        echo "  📊 Memory Usage: ${MEM_USAGE}%"
        
        # Alert on high resource usage
        if [ "${CPU_USAGE%.*}" -gt 80 ] 2>/dev/null; then
            echo "  ⚠️  WARNING: High CPU usage detected" | tee -a "$COMPLIANCE_LOG"
            
            cat > "$ALERTS_DIR/high-cpu-cycle-$cycle.json" << EOF
{
  "type": "warning",
  "severity": "high",
  "cycle": $cycle,
  "issue": "high_cpu_usage",
  "details": {
    "cpu_usage": "${CPU_USAGE}%",
    "threshold": "80%",
    "recommendation": "Agent may be in infinite loop or inefficient operation"
  },
  "timestamp": "$(date -Iseconds)"
}
EOF
        fi
        
        # Log resource metrics
        cat > "$METRICS_DIR/resources-cycle-$cycle.json" << EOF
{
  "cycle": $cycle,
  "timestamp": "$(date -Iseconds)",
  "cpu_usage": "${CPU_USAGE}%",
  "memory_usage": "${MEM_USAGE}%"
}
EOF
    else
        echo "  📊 Agent container not found or not running"
    fi
}

# Generate compliance report
generate_compliance_report() {
    local cycle="$1"
    
    echo "📋 COMPLIANCE REPORT - Cycle $cycle"
    echo "=================================="
    
    # Calculate overall metrics
    TOTAL_VIOLATIONS=0
    TOTAL_WARNINGS=0
    
    for metrics_file in "$METRICS_DIR"/cycle-*-metrics.json; do
        if [ -f "$metrics_file" ]; then
            VIOLATIONS=$(jq -r '.violations' "$metrics_file" 2>/dev/null || echo "0")
            WARNINGS=$(jq -r '.warnings' "$metrics_file" 2>/dev/null || echo "0")
            TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + VIOLATIONS))
            TOTAL_WARNINGS=$((TOTAL_WARNINGS + WARNINGS))
        fi
    done
    
    COMPLIANCE_SCORE=$(echo "scale=1; 100 - ($TOTAL_VIOLATIONS * 10) - ($TOTAL_WARNINGS * 2)" | bc -l)
    
    # Update state
    cat > "$SHARED_PATH/compliance/state.json" << EOF
{
  "last_updated": "$(date -Iseconds)",
  "agent": "$AGENT_NAME",
  "total_cycles": $cycle,
  "violations": $TOTAL_VIOLATIONS,
  "warnings": $TOTAL_WARNINGS,
  "compliance_score": $COMPLIANCE_SCORE,
  "status": "monitoring"
}
EOF
    
    echo "  📊 Total Violations: $TOTAL_VIOLATIONS"
    echo "  📊 Total Warnings: $TOTAL_WARNINGS"
    echo "  📊 Compliance Score: ${COMPLIANCE_SCORE}%"
    echo ""
    
    # Compliance assessment
    if (( $(echo "$COMPLIANCE_SCORE >= 90" | bc -l) )); then
        echo "  ✅ EXCELLENT COMPLIANCE - Agent following policies well"
    elif (( $(echo "$COMPLIANCE_SCORE >= 70" | bc -l) )); then
        echo "  ⚠️  MODERATE COMPLIANCE - Some policy deviations detected"
    else
        echo "  ❌ POOR COMPLIANCE - Significant policy violations detected"
        echo "  🚨 RECOMMEND IMMEDIATE REVIEW OR AGENT PAUSE"
    fi
}

# Main monitoring loop
monitor_compliance() {
    echo "🔄 Starting real-time compliance monitoring..."
    echo ""
    
    init_compliance_tracking
    
    local cycle=1
    
    while true; do
        sleep "$MONITOR_INTERVAL"
        
        # Check if agent is still running
        if ! docker ps | grep -q "$AGENT_NAME"; then
            echo "📊 Agent stopped. Generating final compliance report..."
            generate_compliance_report "$cycle"
            break
        fi
        
        # Check for changes in workspace
        cd "$WORKSPACE"
        if [ -n "$(git status --porcelain)" ] || [ $((cycle % 4)) -eq 0 ]; then  # Also check every 4 cycles regardless
            echo ""
            echo "🔍 COMPLIANCE CHECK - Cycle $cycle"
            echo "================================="
            
            # Run behavior analysis
            if check_behavior_patterns "$cycle"; then
                echo "✅ Cycle $cycle: Acceptable behavior patterns"
            else
                echo "⚠️  Cycle $cycle: Policy deviations detected"
            fi
            
            # Check resource usage
            check_resource_patterns "$cycle"
            
            # Generate periodic report
            generate_compliance_report "$cycle"
            
            cycle=$((cycle + 1))
        fi
    done
    
    echo ""
    echo "🏁 COMPLIANCE MONITORING COMPLETE"
    echo "Final Report: $SHARED_PATH/compliance/state.json"
    echo "All Alerts: $ALERTS_DIR/"
    echo "All Metrics: $METRICS_DIR/"
}

# Handle signals for clean shutdown
trap 'echo "📊 Compliance monitor shutting down..."; generate_compliance_report ${cycle:-0}; exit 0' SIGTERM SIGINT

# Start compliance monitoring
monitor_compliance