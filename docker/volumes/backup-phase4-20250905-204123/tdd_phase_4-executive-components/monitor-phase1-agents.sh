#!/bin/bash

# Phase 1 Agent Monitoring Dashboard
# Real-time progress tracking for role-based foundation implementation

COMM_DIR="../phase1-implementation-communication"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

while true; do
  clear
  echo -e "${BLUE}╔═════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     PHASE 1: ROLE-BASED FOUNDATION IMPLEMENTATION MONITOR      ║${NC}" 
  echo -e "${BLUE}╚═════════════════════════════════════════════════════════════════╝${NC}"
  echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  
  # Phase 1 Progress Overview
  echo -e "${YELLOW}📊 PHASE 1 PROGRESS OVERVIEW${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  
  # Count completed agents
  COMPLETED_COUNT=0
  TOTAL_AGENTS=6
  
  # Check completion status
  for agent in role-services role-hooks role-navigation role-screens permission-ui integration; do
    if [ -f "${COMM_DIR}/handoffs/${agent}-complete.md" ]; then
      COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
    fi
  done
  
  PERCENT=$((COMPLETED_COUNT * 100 / TOTAL_AGENTS))
  
  # Progress bar
  BAR_LENGTH=40
  FILLED=$((PERCENT * BAR_LENGTH / 100))
  echo -n "Phase 1 Progress: ["
  for ((i=0; i<$FILLED; i++)); do echo -n "█"; done
  for ((i=$FILLED; i<$BAR_LENGTH; i++)); do echo -n "░"; done
  echo "] $PERCENT% ($COMPLETED_COUNT/$TOTAL_AGENTS agents)"
  echo ""
  
  # Agent 1: Role Services
  echo -e "${GREEN}⚙️ AGENT 1: ROLE SERVICES${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/role-services.md" ]; then
    LAST_UPDATE=$(tail -1 "${COMM_DIR}/progress/role-services.md" 2>/dev/null)
    echo "Status: $LAST_UPDATE"
  else
    echo "Status: Not started"
  fi
  echo "Scope: RolePermissionService, UserRoleService, schema contracts"
  echo ""
  
  # Agent 2: Role Hooks  
  echo -e "${GREEN}🎣 AGENT 2: ROLE HOOKS${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/role-hooks.md" ]; then
    LAST_UPDATE=$(tail -1 "${COMM_DIR}/progress/role-hooks.md" 2>/dev/null)
    echo "Status: $LAST_UPDATE"
  else
    echo "Status: Not started"
  fi
  echo "Scope: useUserRole, useRolePermissions, query key integration"
  echo ""
  
  # Agent 3: Role Navigation
  echo -e "${GREEN}🧭 AGENT 3: ROLE NAVIGATION${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/role-navigation.md" ]; then
    LAST_UPDATE=$(tail -1 "${COMM_DIR}/progress/role-navigation.md" 2>/dev/null)
    echo "Status: $LAST_UPDATE"
  else
    echo "Status: Not started"
  fi
  echo "Scope: Role-based navigation, route guards, menu generation"
  echo ""
  
  # Agent 4: Role Screens (Extension)
  echo -e "${GREEN}📱 AGENT 4: ROLE SCREENS (Extension)${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/role-screens.md" ]; then
    LAST_UPDATE=$(tail -1 "${COMM_DIR}/progress/role-screens.md" 2>/dev/null)
    echo "Status: $LAST_UPDATE"
  else
    echo "Status: Not started"
  fi
  echo "Scope: RoleDashboard, RoleSelection, PermissionManagement screens"
  echo ""
  
  # Agent 5: Permission UI (Extension)
  echo -e "${GREEN}🔒 AGENT 5: PERMISSION UI (Extension)${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/permission-ui.md" ]; then
    LAST_UPDATE=$(tail -1 "${COMM_DIR}/progress/permission-ui.md" 2>/dev/null)
    echo "Status: $LAST_UPDATE"
  else
    echo "Status: Not started"
  fi
  echo "Scope: Permission gates, role indicators, access control UI"
  echo ""
  
  # Agent 6: Integration (Extension)
  echo -e "${GREEN}🔗 AGENT 6: INTEGRATION (Extension)${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/progress/integration.md" ]; then
    LAST_UPDATE=$(tail -1 "${COMM_DIR}/progress/integration.md" 2>/dev/null)
    echo "Status: $LAST_UPDATE"
  else
    echo "Status: Not started"
  fi
  echo "Scope: End-to-end integration, cross-agent testing, validation"
  echo ""
  
  # Blockers Section
  echo -e "${RED}⚠️  BLOCKERS & DEPENDENCIES${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  BLOCKER_COUNT=0
  for file in ${COMM_DIR}/blockers/*-blockers.md 2>/dev/null; do
    if [ -f "$file" ]; then
      BLOCKER_COUNT=$((BLOCKER_COUNT + $(wc -l < "$file")))
    fi
  done
  
  if [ $BLOCKER_COUNT -gt 0 ]; then
    echo -e "${RED}$BLOCKER_COUNT blocker(s) found:${NC}"
    for file in ${COMM_DIR}/blockers/*-blockers.md 2>/dev/null; do
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
  echo "─────────────────────────────────────────────────────────────────"
  for file in ${COMM_DIR}/handoffs/*-complete.md 2>/dev/null; do
    if [ -f "$file" ]; then
      echo "  ✅ $(tail -1 $file)"
    fi
  done
  echo ""
  
  # Test Results Summary
  echo -e "${YELLOW}📈 LATEST TEST RESULTS${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  if [ -f "${COMM_DIR}/status/test-summary.txt" ]; then
    cat "${COMM_DIR}/status/test-summary.txt"
  else
    echo "No test results yet"
  fi
  echo ""
  
  # Phase 1 Success Criteria
  echo -e "${YELLOW}🎯 PHASE 1 SUCCESS CRITERIA${NC}"
  echo "─────────────────────────────────────────────────────────────────"
  echo "  Tests: 60+ minimum (schema, service, hook, integration)"
  echo "  Patterns: 100% architectural compliance"  
  echo "  Auth: Role-based authentication working end-to-end"
  echo "  Permissions: Permission system functional"
  echo "  Navigation: Dynamic navigation based on roles"
  echo "  Integration: Clean integration with existing systems"
  
  echo ""
  echo "─────────────────────────────────────────────────────────────────"
  echo "Refreshing in 30 seconds... (Ctrl+C to exit)"
  
  sleep 30
done