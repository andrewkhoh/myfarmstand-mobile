#!/bin/bash

# Phase 1-2 Implementation Multi-Agent Setup
# Following multi-agent-architecture-guide.md patterns

set -e

echo "🚀 Setting up Phase 1-2 Implementation Multi-Agent Architecture"
echo "================================================"

# Configuration
MAIN_REPO="/Users/andrewkhoh/Documents/myfarmstand-mobile"
PROJECT_NAME="phase12-implementation"
BASE_BRANCH="main"
COMM_DIR="../${PROJECT_NAME}-communication"

# Agent definitions
declare -a AGENTS=(
  "phase1-navigation-ui"      # Agent 1: Navigation & Role UI
  "phase2-inventory-ui"        # Agent 2: Inventory Dashboards
  "query-key-migration"        # Agent 3: Fix dual query key systems
  "test-infrastructure"        # Agent 4: Test infrastructure migration
  "schema-integration"         # Agent 5: Schema contracts & integration
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating communication hub${NC}"
echo "--------------------------------------"

# Create communication directory structure
mkdir -p ${COMM_DIR}/{blockers,progress,contracts,handoffs,dependencies}

echo "✅ Created communication directory at ${COMM_DIR}"

echo -e "\n${YELLOW}Step 2: Creating git worktrees for each agent${NC}"
echo "----------------------------------------------"

cd $MAIN_REPO

# Create worktrees for each agent
for i in "${!AGENTS[@]}"; do
  AGENT_NAME="${AGENTS[$i]}"
  WORKSPACE="../${PROJECT_NAME}-${AGENT_NAME}"
  BRANCH="${PROJECT_NAME}-${AGENT_NAME}"
  AGENT_NUM=$((i + 1))
  
  # Remove existing worktree if it exists
  if git worktree list | grep -q "$WORKSPACE"; then
    echo "Removing existing worktree: $WORKSPACE"
    git worktree remove "$WORKSPACE" --force 2>/dev/null || true
  fi
  
  # Create new worktree
  git worktree add "$WORKSPACE" -b "$BRANCH" "$BASE_BRANCH"
  
  echo -e "${GREEN}✅ Agent ${AGENT_NUM}: Created workspace for ${AGENT_NAME}${NC}"
  echo "   Location: $WORKSPACE"
  echo "   Branch: $BRANCH"
done

echo -e "\n${YELLOW}Step 3: Initializing task board${NC}"
echo "--------------------------------"

# Create task board with dependencies
cat > ${COMM_DIR}/task-board.md << 'EOF'
# 📋 Phase 1-2 Implementation Task Board

**Project**: Phase 1-2 TDD Implementation  
**Started**: $(date)  
**Target Completion**: 4 days  

## 🎯 Implementation Goals
- Fix dual query key systems (Products/Auth)
- Build missing Phase 1 Extension UI components
- Complete Phase 2 Inventory dashboards
- Migrate tests to new infrastructure (38% → 90%+)
- Implement missing schema contracts

## 👥 Agent Assignments

### Agent 1: Phase 1 Navigation & Role UI
**Status**: 🟢 Active  
**Branch**: phase12-implementation-phase1-navigation-ui

#### Tasks
- [ ] Navigation Infrastructure Tests (RED)
- [ ] RoleBasedStackNavigator Implementation (GREEN)
- [ ] Role Dashboard Screen Tests (RED)
- [ ] Dashboard Screen Implementation (GREEN)
- [ ] Permission Management UI
- [ ] Integration with useUserRole hook

#### Deliverables
- `src/navigation/RoleBasedStackNavigator.tsx`
- `src/screens/role-based/RoleDashboard.tsx`
- `src/screens/role-based/RoleSelectionScreen.tsx`
- `src/screens/role-based/PermissionManagementScreen.tsx`

---

### Agent 2: Phase 2 Inventory UI
**Status**: 🟢 Active  
**Branch**: phase12-implementation-phase2-inventory-ui

#### Tasks
- [ ] Inventory Dashboard Hook Tests (RED)
- [ ] useInventoryDashboard Implementation (GREEN)
- [ ] Stock Operations Hook Tests (RED)
- [ ] useStockOperations Implementation (GREEN)
- [ ] Inventory Dashboard Screen Tests (RED)
- [ ] Dashboard Screen Implementation (GREEN)

#### Deliverables
- `src/hooks/inventory/useInventoryDashboard.ts`
- `src/hooks/inventory/useStockOperations.ts`
- `src/screens/inventory/InventoryDashboard.tsx`
- `src/screens/inventory/InventoryAlertsScreen.tsx`

---

### Agent 3: Query Key Migration
**Status**: 🟢 Active  
**Branch**: phase12-implementation-query-key-migration

#### Tasks
- [ ] Products Hook Migration Tests
- [ ] Fix Products Dual System (50% → 100%)
- [ ] Auth Hook Migration Tests
- [ ] Fix Auth Bypass (10% → 100%)
- [ ] Kiosk Manual Spreading Fix
- [ ] Verify Zero Manual Key Construction

#### Deliverables
- Fixed `src/hooks/useProducts.ts`
- Fixed `src/hooks/useAuth.ts`
- Extended kioskKeys in queryKeyFactory
- 100% centralized factory usage

---

### Agent 4: Test Infrastructure Migration
**Status**: 🟢 Active  
**Branch**: phase12-implementation-test-infrastructure

#### Tasks
- [ ] Migrate 30+ service test files
- [ ] Add SimplifiedSupabaseMock pattern
- [ ] Add defensive imports to 40+ hook tests
- [ ] Remove fake timer patterns
- [ ] Update React Query usage
- [ ] Add ValidationMonitor assertions

#### Deliverables
- 90%+ SimplifiedSupabaseMock adoption
- 100% defensive import usage
- All ValidationMonitor integration
- Zero fake timer usage

---

### Agent 5: Schema Contracts & Integration
**Status**: 🟢 Active  
**Branch**: phase12-implementation-schema-integration

#### Tasks
- [ ] Navigation Schema Contract Tests (RED)
- [ ] Navigation Schema Implementation (GREEN)
- [ ] Bulk Operations Contract Tests (RED)
- [ ] Bulk Operations Schema Implementation (GREEN)
- [ ] Integration Test Suite
- [ ] Cross-layer Validation

#### Deliverables
- `src/schemas/role-based/__contracts__/navigation.contracts.test.ts`
- `src/schemas/inventory/__contracts__/bulkOperations.contracts.test.ts`
- Complete integration test suite
- Performance benchmarks

## 🔄 Dependencies

```mermaid
graph TD
    Agent5[Schema Contracts] --> Agent1[Navigation UI]
    Agent5[Schema Contracts] --> Agent2[Inventory UI]
    Agent3[Query Keys] --> Agent1[Navigation UI]
    Agent3[Query Keys] --> Agent2[Inventory UI]
    Agent4[Test Infra] --> Agent1[Navigation UI]
    Agent4[Test Infra] --> Agent2[Inventory UI]
```

## 📊 Progress Tracking

| Agent | Progress | Tests Written | Tests Passing | Blockers |
|-------|----------|---------------|---------------|----------|
| Agent 1 | 0% | 0/72 | 0/72 | None |
| Agent 2 | 0% | 0/105 | 0/105 | None |
| Agent 3 | 0% | 0/20 | 0/20 | None |
| Agent 4 | 0% | 0/70 | 0/70 | None |
| Agent 5 | 0% | 0/40 | 0/40 | None |

**Total**: 0/307 tests (0%)

## 🚦 Quality Gates
- ✅ All TDD cycles complete (RED→GREEN→REFACTOR)
- ✅ ValidationMonitor integrated everywhere
- ✅ Centralized query keys only (no dual systems)
- ✅ All architectural patterns followed
- ✅ Performance benchmarks met (<200ms queries)

Last Updated: $(date)
EOF

echo "✅ Created task board"

echo -e "\n${YELLOW}Step 4: Setting up dependency tracking${NC}"
echo "---------------------------------------"

# Create dependency manifest
cat > ${COMM_DIR}/dependencies/manifest.json << 'EOF'
{
  "project": "phase12-implementation",
  "dependencies": {
    "phase1-navigation-ui": {
      "requires": ["query-keys-ready", "test-infra-patterns", "navigation-schemas"],
      "provides": ["navigation-components", "role-screens"],
      "status": "waiting"
    },
    "phase2-inventory-ui": {
      "requires": ["query-keys-ready", "test-infra-patterns", "inventory-schemas"],
      "provides": ["inventory-dashboard", "stock-screens"],
      "status": "waiting"
    },
    "query-key-migration": {
      "requires": [],
      "provides": ["query-keys-ready", "zero-dual-systems"],
      "status": "active"
    },
    "test-infrastructure": {
      "requires": [],
      "provides": ["test-infra-patterns", "simplified-mocks"],
      "status": "active"
    },
    "schema-integration": {
      "requires": [],
      "provides": ["navigation-schemas", "inventory-schemas", "contracts"],
      "status": "active"
    }
  },
  "phases": [
    {
      "name": "Foundation",
      "agents": ["query-key-migration", "test-infrastructure", "schema-integration"],
      "duration_hours": 8,
      "parallel": true
    },
    {
      "name": "Implementation",
      "agents": ["phase1-navigation-ui", "phase2-inventory-ui"],
      "duration_hours": 16,
      "parallel": true
    }
  ]
}
EOF

echo "✅ Created dependency manifest"

echo -e "\n${YELLOW}Step 5: Creating health metrics tracker${NC}"
echo "----------------------------------------"

cat > ${COMM_DIR}/health-metrics.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "project": "phase12-implementation",
  "overall_progress": 0,
  "target_completion": "$(date -d '+4 days' -Iseconds 2>/dev/null || date -v+4d -Iseconds)",
  "metrics": {
    "query_key_compliance": {"current": 70, "target": 100},
    "test_infrastructure_adoption": {"current": 38, "target": 90},
    "components_implemented": {"current": 0, "target": 15},
    "tests_passing": {"current": 0, "target": 307}
  },
  "agent_status": {
    "phase1-navigation-ui": {"progress": 0, "status": "waiting", "blockers": []},
    "phase2-inventory-ui": {"progress": 0, "status": "waiting", "blockers": []},
    "query-key-migration": {"progress": 0, "status": "active", "blockers": []},
    "test-infrastructure": {"progress": 0, "status": "active", "blockers": []},
    "schema-integration": {"progress": 0, "status": "active", "blockers": []}
  }
}
EOF

echo "✅ Created health metrics tracker"

echo -e "\n${YELLOW}Step 6: Creating sync log${NC}"
echo "-------------------------"

cat > ${COMM_DIR}/sync-log.md << EOF
# 🔄 Phase 1-2 Implementation Sync Log

## $(date '+%Y-%m-%d %H:%M:%S')
- ✅ Multi-agent architecture initialized
- ✅ 5 agent workspaces created
- ✅ Communication hub established
- ✅ Task board initialized
- 🚀 Ready for parallel execution

---
EOF

echo "✅ Created sync log"

echo -e "\n${YELLOW}Step 7: Creating monitoring script${NC}"
echo "-----------------------------------"

cat > ${COMM_DIR}/monitor-agents.sh << 'MONITOR'
#!/bin/bash

# Agent monitoring script
COMM_DIR="$(dirname "$0")"

while true; do
  clear
  echo "📊 PHASE 1-2 IMPLEMENTATION MONITOR"
  echo "===================================="
  echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  
  # Check agent progress
  echo "👥 AGENT STATUS:"
  echo "---------------"
  for agent_file in ${COMM_DIR}/progress/*.md; do
    if [ -f "$agent_file" ]; then
      agent_name=$(basename "$agent_file" .md)
      last_update=$(tail -n 20 "$agent_file" | grep "^## " | tail -1)
      echo "  $agent_name: $last_update"
    fi
  done
  
  # Check blockers
  echo ""
  echo "🚨 ACTIVE BLOCKERS:"
  echo "-------------------"
  blocker_count=$(ls -1 ${COMM_DIR}/blockers/*.md 2>/dev/null | wc -l)
  if [ "$blocker_count" -gt 0 ]; then
    for blocker in ${COMM_DIR}/blockers/*.md; do
      echo "  - $(basename "$blocker" .md)"
    done
  else
    echo "  None"
  fi
  
  # Check handoffs
  echo ""
  echo "🤝 COMPLETED HANDOFFS:"
  echo "----------------------"
  handoff_count=$(ls -1 ${COMM_DIR}/handoffs/*.md 2>/dev/null | wc -l)
  if [ "$handoff_count" -gt 0 ]; then
    for handoff in ${COMM_DIR}/handoffs/*.md; do
      echo "  ✅ $(basename "$handoff" .md)"
    done
  else
    echo "  None yet"
  fi
  
  # Show metrics
  echo ""
  echo "📈 METRICS:"
  echo "-----------"
  if [ -f "${COMM_DIR}/health-metrics.json" ]; then
    query_compliance=$(grep -o '"query_key_compliance".*"current": [0-9]*' ${COMM_DIR}/health-metrics.json | grep -o '[0-9]*$')
    test_adoption=$(grep -o '"test_infrastructure_adoption".*"current": [0-9]*' ${COMM_DIR}/health-metrics.json | grep -o '[0-9]*$')
    components=$(grep -o '"components_implemented".*"current": [0-9]*' ${COMM_DIR}/health-metrics.json | grep -o '[0-9]*$')
    tests=$(grep -o '"tests_passing".*"current": [0-9]*' ${COMM_DIR}/health-metrics.json | grep -o '[0-9]*$')
    
    echo "  Query Key Compliance: ${query_compliance}% → 100%"
    echo "  Test Infrastructure: ${test_adoption}% → 90%"
    echo "  Components Built: ${components}/15"
    echo "  Tests Passing: ${tests}/307"
  fi
  
  echo ""
  echo "Press Ctrl+C to exit"
  sleep 30
done
MONITOR

chmod +x ${COMM_DIR}/monitor-agents.sh

echo "✅ Created monitoring script"

echo -e "\n${GREEN}✨ Setup Complete!${NC}"
echo "=================="
echo ""
echo "📁 Workspaces created:"
for agent in "${AGENTS[@]}"; do
  echo "   - ../${PROJECT_NAME}-${agent}"
done
echo ""
echo "📂 Communication hub: ${COMM_DIR}"
echo ""
echo "🚀 Next steps:"
echo "   1. Open 5 Claude Code tabs"
echo "   2. Use the prompts in: agent-prompts/"
echo "   3. Monitor progress: ${COMM_DIR}/monitor-agents.sh"
echo ""
echo "Good luck with the implementation! 🎯"