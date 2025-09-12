#!/bin/bash

# Enhanced monitoring dashboard for test fix agents
# Shows real-time progress of all 3 agents

COMM_DIR="../test-fixes-communication"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

while true; do
  clear
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║        TEST FIX & INVENTORY COMPLETION MONITOR               ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  
  # Overall Progress
  echo -e "${YELLOW}📊 OVERALL PROGRESS${NC}"
  echo "─────────────────────────────────────────────────────────────"
  
  # Calculate totals
  HOOK_TARGET=27
  SERVICE_TARGET=187
  UI_SCREENS_TARGET=5
  UI_TESTS_TARGET=55
  
  # Try to get current counts from status files
  if [ -f "${COMM_DIR}/status/hook-test-current.txt" ]; then
    HOOK_FIXED=$(grep -oE "([0-9]+) passing" "${COMM_DIR}/status/hook-test-current.txt" | head -1 | grep -oE "[0-9]+")
  else
    HOOK_FIXED=0
  fi
  
  if [ -f "${COMM_DIR}/status/service-test-current.txt" ]; then
    SERVICE_FIXED=$(grep -oE "([0-9]+) passing" "${COMM_DIR}/status/service-test-current.txt" | head -1 | grep -oE "[0-9]+")
  else
    SERVICE_FIXED=0
  fi
  
  TOTAL_TESTS=$((HOOK_TARGET + SERVICE_TARGET))
  TOTAL_FIXED=$((HOOK_FIXED + SERVICE_FIXED))
  PERCENT=$((TOTAL_FIXED * 100 / TOTAL_TESTS))
  
  # Progress bar
  BAR_LENGTH=40
  FILLED=$((PERCENT * BAR_LENGTH / 100))
  echo -n "Tests Fixed: ["
  for ((i=0; i<$FILLED; i++)); do echo -n "█"; done
  for ((i=$FILLED; i<$BAR_LENGTH; i++)); do echo -n "░"; done
  echo "] $PERCENT% ($TOTAL_FIXED/$TOTAL_TESTS)"
  echo ""
  
  # Agent 1: Hook Tests
  echo -e "${GREEN}🔧 AGENT 1: FIX HOOK TESTS${NC}"
  echo "─────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/fix-hook-tests.md" ]; then
    LAST_UPDATE=$(tail -1 "${COMM_DIR}/progress/fix-hook-tests.md" 2>/dev/null)
    echo "Status: $LAST_UPDATE"
  else
    echo "Status: Not started"
  fi
  echo "Target: Fix $HOOK_TARGET failing hook tests"
  echo "Progress: $HOOK_FIXED/$HOOK_TARGET fixed"
  echo ""
  
  # Agent 2: Service Tests
  echo -e "${GREEN}🔧 AGENT 2: FIX SERVICE TESTS${NC}"
  echo "─────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/fix-service-tests.md" ]; then
    LAST_UPDATE=$(tail -1 "${COMM_DIR}/progress/fix-service-tests.md" 2>/dev/null)
    echo "Status: $LAST_UPDATE"
  else
    echo "Status: Not started"
  fi
  echo "Target: Fix $SERVICE_TARGET failing service tests"
  echo "Progress: $SERVICE_FIXED/$SERVICE_TARGET fixed"
  echo ""
  
  # Agent 3: Inventory UI
  echo -e "${GREEN}🎨 AGENT 3: COMPLETE INVENTORY UI${NC}"
  echo "─────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/complete-inventory-ui.md" ]; then
    LAST_UPDATE=$(tail -3 "${COMM_DIR}/progress/complete-inventory-ui.md" 2>/dev/null | grep -E "Screens:|Tests:" | head -2)
    echo "$LAST_UPDATE"
  else
    echo "Screens: 0/$UI_SCREENS_TARGET complete"
    echo "Tests: 50/105 written (need $UI_TESTS_TARGET more)"
  fi
  echo ""
  
  # Blockers Section
  echo -e "${RED}⚠️  BLOCKERS & HANDOFFS${NC}"
  echo "─────────────────────────────────────────────────────────────"
  BLOCKER_COUNT=0
  for file in ${COMM_DIR}/handoffs/*-blockers.md 2>/dev/null; do
    if [ -f "$file" ]; then
      BLOCKER_COUNT=$((BLOCKER_COUNT + $(wc -l < "$file")))
    fi
  done
  
  if [ $BLOCKER_COUNT -gt 0 ]; then
    echo -e "${RED}$BLOCKER_COUNT blocker(s) found:${NC}"
    for file in ${COMM_DIR}/handoffs/*-blockers.md 2>/dev/null; do
      if [ -f "$file" ]; then
        echo "  - $(basename $file .md): $(tail -1 $file)"
      fi
    done
  else
    echo -e "${GREEN}No blockers reported${NC}"
  fi
  echo ""
  
  # Ready for Integration
  echo -e "${BLUE}✅ READY FOR INTEGRATION${NC}"
  echo "─────────────────────────────────────────────────────────────"
  for file in ${COMM_DIR}/handoffs/*-ready.md 2>/dev/null; do
    if [ -f "$file" ]; then
      echo "  - $(tail -1 $file)"
    fi
  done
  echo ""
  
  # Test Results Summary
  echo -e "${YELLOW}📈 LATEST TEST RESULTS${NC}"
  echo "─────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/status/service-progress.txt" ]; then
    tail -2 "${COMM_DIR}/status/service-progress.txt"
  else
    echo "No test results yet"
  fi
  echo ""
  
  echo "─────────────────────────────────────────────────────────────"
  echo "Refreshing in 30 seconds... (Ctrl+C to exit)"
  
  sleep 30
done