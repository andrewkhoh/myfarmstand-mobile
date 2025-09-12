#!/bin/bash

# Real-time monitoring of agent progress
COMM_DIR="../tdd-completion-communication"

while true; do
  clear
  echo "🎮 MyFarmstand TDD Multi-Agent Monitor"
  echo "======================================"
  echo ""
  
  # Check agent progress
  echo "📊 Agent Progress:"
  for agent in marketing-ui campaign-bundle-ui executive-dashboard executive-analytics test-infrastructure integration production; do
    if [ -f "$COMM_DIR/progress/$agent.md" ]; then
      LAST_UPDATE=$(tail -n 1 "$COMM_DIR/progress/$agent.md" 2>/dev/null || echo "No updates")
      echo "  $agent: $LAST_UPDATE"
    else
      echo "  $agent: Not started"
    fi
  done
  
  echo ""
  echo "🚨 Active Blockers:"
  BLOCKER_COUNT=$(ls -1 $COMM_DIR/blockers/*.md 2>/dev/null | wc -l)
  echo "  Count: $BLOCKER_COUNT"
  
  echo ""
  echo "✅ Completed Handoffs:"
  HANDOFF_COUNT=$(ls -1 $COMM_DIR/handoffs/*.md 2>/dev/null | wc -l)
  echo "  Count: $HANDOFF_COUNT"
  
  echo ""
  echo "🧪 Test Results:"
  if [ -f "$COMM_DIR/test-results/summary.json" ]; then
    cat "$COMM_DIR/test-results/summary.json" | grep -E '"tests_passing"|"coverage_percentage"'
  else
    echo "  No test results yet"
  fi
  
  echo ""
  echo "Last refresh: $(date)"
  echo "Press Ctrl+C to exit"
  
  sleep 30
done
