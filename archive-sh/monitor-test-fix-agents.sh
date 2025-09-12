#!/bin/bash

# Monitor script for test fix agents
# Shows real-time status of all agents

PROJECT_NAME="test-fixes"
COMM_DIR="../${PROJECT_NAME}-communication"

clear

echo "📊 Test Fix Multi-Agent Monitor"
echo "================================"
echo "Time: $(date)"
echo ""

# Check if communication directory exists
if [ ! -d "$COMM_DIR" ]; then
  echo "❌ Communication directory not found: $COMM_DIR"
  echo "Run setup-test-fix-agents.sh first."
  exit 1
fi

# Function to get last line of progress file
get_last_progress() {
  local agent=$1
  local progress_file="${COMM_DIR}/progress/${agent}.md"
  if [ -f "$progress_file" ]; then
    tail -1 "$progress_file" | sed 's/^[^:]*: //'
  else
    echo "Not started"
  fi
}

# Function to check handoff status
check_handoff() {
  local agent=$1
  if [ -f "${COMM_DIR}/handoffs/${agent}-ready.md" ]; then
    echo "✅ Complete"
  else
    echo "🔄 Working"
  fi
}

# Overall Health Metrics
echo "📈 Overall Health Metrics"
echo "-------------------------"
if [ -f "${COMM_DIR}/health-metrics.json" ]; then
  current_rate=$(grep -o '"overall_pass_rate": [0-9]*' "${COMM_DIR}/health-metrics.json" | grep -o '[0-9]*')
  target_rate=$(grep -o '"target_pass_rate": [0-9]*' "${COMM_DIR}/health-metrics.json" | grep -o '[0-9]*')
  echo "Current Pass Rate: ${current_rate}%"
  echo "Target Pass Rate: ${target_rate}%"
  
  if [ "$current_rate" -ge "$target_rate" ]; then
    echo "Status: ✅ TARGET MET"
  else
    echo "Status: 🎯 Working toward target"
  fi
else
  echo "Metrics not available"
fi
echo ""

# Agent Status
echo "🤖 Agent Status"
echo "---------------"
echo ""

# Agent 1: Critical Hooks
echo "1️⃣ Critical Hooks (Executive/Inventory/Marketing)"
echo "   Status: $(check_handoff 'critical-hooks')"
echo "   Progress: $(get_last_progress 'critical-hooks')"
echo ""

# Agent 2: Service Suites
echo "2️⃣ Service Suites"
echo "   Status: $(check_handoff 'service-suites')"
echo "   Progress: $(get_last_progress 'service-suites')"
echo ""

# Agent 3: Core Hooks
echo "3️⃣ Core Hooks"
echo "   Status: $(check_handoff 'core-hooks')"
echo "   Progress: $(get_last_progress 'core-hooks')"
echo ""

# Agent 4: Schema Fixes
echo "4️⃣ Schema Fixes"
echo "   Status: $(check_handoff 'schema-fixes')"
echo "   Progress: $(get_last_progress 'schema-fixes')"
echo ""

# Agent 5: Quality Assurance
echo "5️⃣ Quality Assurance"
echo "   Status: $(check_handoff 'quality-assurance')"
echo "   Progress: $(get_last_progress 'quality-assurance')"
echo ""

# Check for blockers
echo "🚨 Active Blockers"
echo "------------------"
blocker_count=$(ls -1 ${COMM_DIR}/blockers/ 2>/dev/null | wc -l)
if [ "$blocker_count" -gt 0 ]; then
  echo "⚠️  $blocker_count active blocker(s):"
  for blocker in ${COMM_DIR}/blockers/*; do
    if [ -f "$blocker" ]; then
      echo "   - $(basename $blocker)"
      grep "Issue:" "$blocker" | head -1
    fi
  done
else
  echo "✅ No blockers"
fi
echo ""

# Recent Activity (last 5 sync log entries)
echo "📝 Recent Activity"
echo "-----------------"
if [ -f "${COMM_DIR}/sync-log.md" ]; then
  tail -5 "${COMM_DIR}/sync-log.md" | while read line; do
    echo "   $line"
  done
else
  echo "No activity logged"
fi
echo ""

# Quick Test Commands
echo "🧪 Quick Test Commands"
echo "---------------------"
echo "All tests:        npm test"
echo "Services:         npm run test:services"
echo "Hooks:           npm run test:hooks"
echo "Schemas:         npm test src/schemas/"
echo "Executive hooks: npm test src/hooks/executive/__tests__/"
echo ""

# Workspace Locations
echo "📁 Workspace Locations"
echo "---------------------"
echo "Critical Hooks:  ../test-fixes-critical-hooks"
echo "Service Suites:  ../test-fixes-service-suites"
echo "Core Hooks:      ../test-fixes-core-hooks"
echo "Schema Fixes:    ../test-fixes-schema-fixes"
echo "QA:              ../test-fixes-quality-assurance"
echo ""

echo "🔄 Auto-refresh: Run with 'watch -n 30 ./monitor-test-fix-agents.sh'"
echo "📊 Full metrics: cat ${COMM_DIR}/health-metrics.json | jq"
echo "📋 Task board:   cat ${COMM_DIR}/task-board.md"