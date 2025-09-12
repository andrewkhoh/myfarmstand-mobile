#!/bin/bash
# Stop Phase 1 Multi-Agent Workflow with cleanup

set -euo pipefail

echo "🛑 Stopping Phase 1 Multi-Agent Workflow..."
echo "═══════════════════════════════════════════"
echo ""

# Step 1: Stop monitoring processes
echo "📊 Stopping monitoring processes..."

# Kill monitoring scripts
pkill -f "monitor-live-dashboard.sh" 2>/dev/null || true
pkill -f "monitor-phase1-progress.sh" 2>/dev/null || true
pkill -f "monitor-alerts.sh" 2>/dev/null || true
pkill -f "aggregate-status.js" 2>/dev/null || true

echo "  ✅ Monitoring processes stopped"

# Step 2: Stop Docker containers
echo ""
echo "🐳 Stopping Docker containers..."

# Detect docker compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "⚠️  Warning: Docker Compose not found, trying docker stop for individual containers..."
    docker stop $(docker ps -q --filter "name=-agent") 2>/dev/null || true
    docker rm $(docker ps -aq --filter "name=-agent") 2>/dev/null || true
    echo "  ✅ Containers stopped using docker commands"
    DOCKER_COMPOSE=""
fi

cd docker 2>/dev/null || cd /Users/andrewkhoh/Documents/myfarmstand-mobile/docker

if [ -n "$DOCKER_COMPOSE" ]; then
    # Stop and remove containers using compose
    $DOCKER_COMPOSE -f docker-compose-phase1.yml down --timeout 30
fi

echo "  ✅ Containers stopped and removed"

# Step 3: Create backup (optional)
if [[ "${1:-}" == "--backup" ]]; then
    echo ""
    echo "📦 Creating backup..."
    
    BACKUP_DIR="../backups/phase1-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup communication directory (progress, logs, status)
    cp -r volumes/communication "$BACKUP_DIR/" 2>/dev/null || true
    
    # Create summary report
    if [ -f "volumes/communication/aggregate-status.json" ]; then
        cp volumes/communication/aggregate-status.json "$BACKUP_DIR/final-status.json"
    fi
    
    # Archive logs
    if [ -d "volumes/communication/logs" ]; then
        tar -czf "$BACKUP_DIR/logs.tar.gz" volumes/communication/logs/ 2>/dev/null || true
    fi
    
    echo "  ✅ Backup created: $BACKUP_DIR"
fi

# Step 4: Generate final report
echo ""
echo "📝 Generating final report..."

REPORT_FILE="volumes/communication/final-report-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << 'EOF'
# Phase 1 Multi-Agent Workflow - Final Report

**Date:** $(date)
**Duration:** Workflow runtime

## Agent Status Summary

EOF

# Add agent status from last known state
for agent in role-services role-hooks role-navigation role-screens permission-ui integration; do
    if [ -f "volumes/communication/status/${agent}.json" ]; then
        status=$(grep -o '"status":"[^"]*"' "volumes/communication/status/${agent}.json" | cut -d'"' -f4)
        echo "- **${agent}**: ${status}" >> "$REPORT_FILE"
    else
        echo "- **${agent}**: not started" >> "$REPORT_FILE"
    fi
done

# Add test results if available
echo "" >> "$REPORT_FILE"
echo "## Test Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

for agent in role-services role-hooks role-navigation role-screens permission-ui integration; do
    if [ -f "volumes/communication/status/${agent}.json" ]; then
        test_summary=$(grep -o '"testSummary":"[^"]*"' "volumes/communication/status/${agent}.json" | cut -d'"' -f4 || echo "No tests")
        echo "- **${agent}**: ${test_summary}" >> "$REPORT_FILE"
    fi
done

# Add pattern compliance
echo "" >> "$REPORT_FILE"
echo "## Pattern Compliance" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

violation_count=0
compliant_count=0

for log_file in volumes/communication/logs/*.log; do
    if [ -f "$log_file" ]; then
        agent=$(basename "$log_file" .log)
        if grep -q "SimplifiedSupabaseMock" "$log_file" 2>/dev/null; then
            echo "- **${agent}**: ✅ Using SimplifiedSupabaseMock" >> "$REPORT_FILE"
            compliant_count=$((compliant_count + 1))
        fi
        if grep -q "jest.mock.*@supabase" "$log_file" 2>/dev/null; then
            echo "- **${agent}**: ❌ Pattern violation detected" >> "$REPORT_FILE"
            violation_count=$((violation_count + 1))
        fi
    fi
done

echo "" >> "$REPORT_FILE"
echo "**Compliant agents:** ${compliant_count}" >> "$REPORT_FILE"
echo "**Violations found:** ${violation_count}" >> "$REPORT_FILE"

echo "  ✅ Report saved: $REPORT_FILE"

# Step 5: Clean up worktrees (optional)
if [[ "${2:-}" == "--clean-worktrees" ]]; then
    echo ""
    echo "🗑️  Cleaning up git worktrees..."
    
    cd ..
    for agent in role-services role-hooks role-navigation role-screens permission-ui integration; do
        WORKTREE="docker/volumes/phase1-role-foundation-${agent}"
        if [ -d "$WORKTREE" ]; then
            git worktree remove "$WORKTREE" --force 2>/dev/null || true
            echo "  ✅ Removed worktree: ${agent}"
        fi
    done
fi

echo ""
echo "✅ Phase 1 Workflow Successfully Stopped!"
echo ""
echo "📊 Summary:"
echo "  • All containers stopped"
echo "  • Monitoring processes terminated"

if [[ "${1:-}" == "--backup" ]]; then
    echo "  • Backup created in: $BACKUP_DIR"
fi

echo "  • Final report: $REPORT_FILE"
echo ""
echo "💡 Options:"
echo "  • To restart: ./launch-phase1-workflow.sh"
echo "  • To view logs: docker-compose -f docker/docker-compose-phase1.yml logs"
echo "  • To clean everything: ./stop-phase1-workflow.sh --backup --clean-worktrees"
echo ""