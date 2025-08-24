#!/bin/bash

# MyFarmstand Mobile TDD Multi-Agent Setup Script
# Following docs/multi-agent-architecture-guide.md patterns

# Configuration
MAIN_REPO="/Users/andrewkhoh/Documents/myfarmstand-mobile"
PROJECT_NAME="tdd-completion"
BASE_BRANCH="main"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up MyFarmstand Mobile TDD Multi-Agent Environment${NC}"
echo -e "${BLUE}================================================${NC}"

# Navigate to main repo
cd $MAIN_REPO

# Create communication hub (NON-GIT directory for real-time sync)
# This is NOT a worktree - it's a regular directory outside git control
echo -e "\n${YELLOW}📡 Creating communication hub (non-git)...${NC}"
COMM_DIR="../${PROJECT_NAME}-communication"
rm -rf ${COMM_DIR} 2>/dev/null  # Clean slate
mkdir -p ${COMM_DIR}/{blockers,progress,contracts,handoffs,test-results}

echo -e "${GREEN}✅ Created non-git communication hub at ${COMM_DIR}${NC}"
echo -e "   ${YELLOW}This directory is for real-time file-based communication${NC}"
echo -e "   ${YELLOW}It is NOT under version control (no git delays)${NC}"

# Define agents and their focus areas
declare -a AGENTS=(
  "marketing-ui"
  "campaign-bundle-ui"
  "executive-dashboard"
  "executive-analytics"
  "test-infrastructure"
  "integration"
  "production"
)

# Create git worktrees for each agent (these ARE git-controlled)
echo -e "\n${YELLOW}🌳 Creating agent git worktrees...${NC}"
for agent in "${AGENTS[@]}"; do
  WORKSPACE="../${PROJECT_NAME}-${agent}"
  BRANCH="${PROJECT_NAME}-${agent}"
  
  # Remove existing worktree if it exists
  git worktree remove $WORKSPACE --force 2>/dev/null || true
  
  # Create new worktree
  git worktree add $WORKSPACE -b $BRANCH $BASE_BRANCH
  
  echo -e "${GREEN}✅ Created git worktree for ${agent} at ${WORKSPACE}${NC}"
done

# Initialize task board with TDD phases
echo -e "\n${YELLOW}📋 Creating TDD task board...${NC}"
cat > ${COMM_DIR}/task-board.md << 'EOF'
# 📋 TDD Completion Task Board
Last Updated: $(date)

## 🎯 Overall Progress
- Phase 1 (Roles): ✅ COMPLETE (88%)
- Phase 2 (Inventory): ✅ COMPLETE (93%)
- Phase 3 (Marketing): 🔄 IN PROGRESS (73%)
- Phase 4 (Executive): 🔄 IN PROGRESS (60%)
- Phase 5 (Production): 🔄 IN PROGRESS (65%)

## 🏃 Active TDD Tasks (RED → GREEN → REFACTOR → AUDIT)

### Agent 1: Marketing UI
- [ ] RED: Write MarketingDashboard tests (25+ tests)
- [ ] RED: Write ProductContentScreen tests (30+ tests)
- [ ] RED: Write MarketingAnalyticsScreen tests (20+ tests)
- [ ] GREEN: Implement screens to pass tests
- [ ] REFACTOR: Optimize implementations
- [ ] AUDIT: Pattern compliance validation

### Agent 2: Campaign & Bundle UI
- [ ] RED: Write CampaignPlannerScreen tests (25+ tests)
- [ ] RED: Write BundleManagementScreen tests (25+ tests)
- [ ] GREEN: Implement screens to pass tests
- [ ] REFACTOR: Optimize implementations
- [ ] AUDIT: Pattern compliance validation

### Agent 3: Executive Dashboard
- [ ] RED: Write ExecutiveDashboard tests (30+ tests)
- [ ] RED: Write BusinessIntelligenceScreen tests (25+ tests)
- [ ] GREEN: Implement screens to pass tests
- [ ] REFACTOR: Optimize implementations
- [ ] AUDIT: Pattern compliance validation

### Agent 4: Executive Analytics
- [ ] RED: Write StrategicReportsScreen tests (20+ tests)
- [ ] RED: Write PredictiveAnalyticsScreen tests (25+ tests)
- [ ] RED: Write DecisionSupportScreen tests (20+ tests)
- [ ] GREEN: Implement screens to pass tests
- [ ] REFACTOR: Optimize implementations
- [ ] AUDIT: Pattern compliance validation

### Agent 5: Test Infrastructure
- [ ] Fix Supabase mock configuration
- [ ] Update performance test harnesses
- [ ] Ensure --forceExit on all test configs
- [ ] Validate mock simplification

### Agent 6: Integration
- [ ] RED: Write cross-role integration tests (80+ tests)
- [ ] RED: Write user journey tests (60+ tests)
- [ ] GREEN: Implement integration layer
- [ ] AUDIT: Pattern compliance validation

### Agent 7: Production
- [ ] RED: Write performance tests (50+ tests)
- [ ] RED: Write security tests (45+ tests)
- [ ] GREEN: Implement optimizations
- [ ] VALIDATE: Production readiness

## 🤝 Dependencies
```mermaid
graph TD
    Marketing-UI --> Integration
    Campaign-Bundle-UI --> Integration
    Executive-Dashboard --> Integration
    Executive-Analytics --> Integration
    Test-Infrastructure --> All-Agents
    Integration --> Production
```

## ⚠️ TDD Rules
1. ALWAYS write tests FIRST (RED phase)
2. Tests MUST fail initially
3. Write MINIMAL code to pass tests (GREEN phase)
4. Use --forceExit flag on all test runs
5. Auto-commit when tests pass
6. Follow docs/architectural-patterns-and-best-practices.md
EOF

# Create health metrics template
echo -e "\n${YELLOW}📊 Creating health metrics tracker...${NC}"
cat > ${COMM_DIR}/health-metrics.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "overall_completion": 76,
  "target_completion": 100,
  "phases": {
    "phase_1": {"status": "complete", "percentage": 88},
    "phase_2": {"status": "complete", "percentage": 93},
    "phase_3": {"status": "in_progress", "percentage": 73},
    "phase_4": {"status": "in_progress", "percentage": 60},
    "phase_5": {"status": "in_progress", "percentage": 65}
  },
  "agent_progress": {
    "marketing-ui": 0,
    "campaign-bundle-ui": 0,
    "executive-dashboard": 0,
    "executive-analytics": 0,
    "test-infrastructure": 0,
    "integration": 0,
    "production": 0
  },
  "test_metrics": {
    "total_tests_needed": 440,
    "tests_written": 0,
    "tests_passing": 0,
    "coverage_percentage": 0
  }
}
EOF

# Create TDD workflow reminder
echo -e "\n${YELLOW}📝 Creating TDD workflow guide...${NC}"
cat > ${COMM_DIR}/tdd-workflow.md << 'EOF'
# 🔴🟢♻️ TDD Workflow Reminder

## The Sacred TDD Cycle

### 🔴 RED Phase
```bash
# 1. Write the test FIRST
npm run test:screens:marketing  # Should FAIL
```

### 🟢 GREEN Phase
```bash
# 2. Write MINIMAL code to pass
# 3. Run test again
npm run test:screens:marketing  # Should PASS

# 4. AUTO-COMMIT on success
git add -A && git commit -m "feat(marketing): implement [Component] (TDD GREEN phase)"
```

### ♻️ REFACTOR Phase
```bash
# 5. Optimize code while keeping tests green
# 6. Run tests after each change
npm run test:screens:marketing  # Must stay GREEN
```

### ✅ AUDIT Phase
```bash
# 7. Validate pattern compliance
npm run validate:marketing-patterns

# 8. Final commit
git add -A && git commit -m "refactor(marketing): optimize [Component] with pattern compliance"
```

## Test Commands by Agent

### Marketing UI (Agent 1)
```bash
npm run test:screens:marketing -- --forceExit
npm run test:hooks:marketing -- --forceExit
```

### Campaign/Bundle UI (Agent 2)
```bash
npm run test:screens:marketing -- --forceExit
```

### Executive Dashboard (Agent 3)
```bash
npm run test:screens:executive -- --forceExit
```

### Executive Analytics (Agent 4)
```bash
npm run test:screens:predictive -- --forceExit
```

### Test Infrastructure (Agent 5)
```bash
npm run test:services -- --forceExit
npm run test:hooks -- --forceExit
```

### Integration (Agent 6)
```bash
npm run test:e2e -- --forceExit
npm run test:journeys -- --forceExit
```

### Production (Agent 7)
```bash
npm run test:performance -- --forceExit
npm run test:security -- --forceExit
```

## CRITICAL: Prevent Test Hanging
Always use `--forceExit` flag!
EOF

# Create sync log
echo -e "\n${YELLOW}📜 Initializing sync log...${NC}"
cat > ${COMM_DIR}/sync-log.md << EOF
# 🔄 Multi-Agent Sync Log

## $(date)
- System initialized
- 7 agents created
- TDD workflow established
- Communication channels open

---
EOF

# Create agent launcher script
echo -e "\n${YELLOW}🚀 Creating agent launcher...${NC}"
cat > launch-agent.sh << 'EOF'
#!/bin/bash

# Agent launcher helper
AGENT_NAME=$1
COMM_DIR="../tdd-completion-communication"

if [ -z "$AGENT_NAME" ]; then
  echo "Usage: ./launch-agent.sh [agent-name]"
  echo "Available agents:"
  echo "  - marketing-ui"
  echo "  - campaign-bundle-ui"
  echo "  - executive-dashboard"
  echo "  - executive-analytics"
  echo "  - test-infrastructure"
  echo "  - integration"
  echo "  - production"
  exit 1
fi

echo "Launching $AGENT_NAME agent..."
echo "Workspace: ../tdd-completion-$AGENT_NAME"
echo "Communication: $COMM_DIR"
echo ""
echo "Remember TDD cycle: RED → GREEN → REFACTOR → AUDIT"
echo "Check $COMM_DIR/task-board.md for your tasks"
echo "Update progress to $COMM_DIR/progress/$AGENT_NAME.md"
EOF

chmod +x launch-agent.sh

# Create monitoring script
echo -e "\n${YELLOW}📊 Creating monitoring dashboard...${NC}"
cat > monitor-agents.sh << 'EOF'
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
EOF

chmod +x monitor-agents.sh

echo -e "\n${GREEN}✅ Multi-Agent TDD Environment Setup Complete!${NC}"
echo -e "\n${BLUE}📍 Architecture Summary:${NC}"
echo "  • Main repo: $MAIN_REPO"
echo "  • Communication hub: ${COMM_DIR} ${YELLOW}(non-git, real-time sync)${NC}"
echo "  • Agent worktrees: ../${PROJECT_NAME}-[agent-name] ${YELLOW}(git-controlled)${NC}"
echo ""
echo -e "${BLUE}📁 Structure:${NC}"
echo "  myfarmstand-mobile/           (main repo)"
echo "  tdd-completion-communication/ (NON-GIT - real-time communication)"
echo "  tdd-completion-marketing-ui/  (git worktree)"
echo "  tdd-completion-campaign-bundle-ui/ (git worktree)"
echo "  tdd-completion-executive-dashboard/ (git worktree)"
echo "  tdd-completion-executive-analytics/ (git worktree)"
echo "  tdd-completion-test-infrastructure/ (git worktree)"
echo "  tdd-completion-integration/   (git worktree)"
echo "  tdd-completion-production/    (git worktree)"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "  1. Run this script: ${GREEN}bash setup-tdd-multi-agent.sh${NC}"
echo "  2. Launch each agent with their specific prompt"
echo "  3. Monitor progress: ${GREEN}./monitor-agents.sh${NC}"
echo "  4. Check task board: ${COMM_DIR}/task-board.md"
echo ""
echo -e "${GREEN}Ready for parallel TDD execution! 🚀${NC}"