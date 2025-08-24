#!/bin/bash

# Test Fix Multi-Agent Setup Script
# Purpose: Set up parallel agents to fix test infrastructure adoption issues

echo "🚀 Setting up Test Fix Multi-Agent Environment"

# Configuration
MAIN_REPO="/Users/andrewkhoh/Documents/myfarmstand-mobile"
PROJECT_NAME="test-fixes"
BASE_BRANCH="main"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Create communication hub (outside git)
COMM_DIR="../${PROJECT_NAME}-communication"
mkdir -p ${COMM_DIR}/{blockers,progress,contracts,handoffs}

echo "✅ Created communication hub at ${COMM_DIR}"

# Define agents and their branches
declare -a AGENTS=(
  "critical-hooks"      # Fix executive/inventory/marketing hooks
  "service-suites"      # Fix failing service test suites
  "core-hooks"          # Polish core hook tests
  "schema-fixes"        # Fix schema test issues
  "quality-assurance"   # Final validation
)

# Create worktrees for each agent
cd $MAIN_REPO
for agent in "${AGENTS[@]}"; do
  WORKSPACE="${PROJECT_NAME}-${agent}"
  BRANCH="${PROJECT_NAME}-${agent}"
  
  # Remove existing worktree if it exists
  if git worktree list | grep -q "$WORKSPACE"; then
    echo "Removing existing worktree for ${agent}..."
    git worktree remove ../$WORKSPACE --force 2>/dev/null || true
  fi
  
  # Create new worktree
  git worktree add ../$WORKSPACE -b $BRANCH $BASE_BRANCH
  echo "✅ Created workspace for ${agent} at ../$WORKSPACE"
done

# Initialize task board
cat > ${COMM_DIR}/task-board.md << 'EOF'
# 📋 Test Fix Task Board
Last Updated: $(date)

## 🎯 Overall Goal
Fix test infrastructure adoption issues to achieve 85%+ test pass rate

## 📊 Current Metrics
- **Service Tests**: 78% passing (119/545 failing)
- **Core Hooks**: 89% passing (17/158 failing)
- **Executive Hooks**: 1% passing (67/68 failing) ⚠️ CRITICAL
- **Inventory Hooks**: 2% passing (120/122 failing) ⚠️ CRITICAL
- **Marketing Hooks**: 1% passing (97/98 failing) ⚠️ CRITICAL
- **Schema Tests**: 94% passing (14/249 failing)

## 🏃 Active Tasks

### Agent 1: Critical Hooks (PRIORITY: CRITICAL)
- [ ] Fix executive hook tests (8 files, 67 failures)
- [ ] Fix inventory hook tests (11 files, 120 failures)
- [ ] Fix marketing hook tests (5 files, 97 failures)
- [ ] Apply infrastructure patterns from reference guide

### Agent 2: Service Suites (PRIORITY: HIGH)
- [ ] Identify why 17 suites fail despite 78% test pass rate
- [ ] Fix executive service suites (5 failing)
- [ ] Fix marketing service suites (2 failing)
- [ ] Fix core service suites (~10 failing)

### Agent 3: Core Hooks (PRIORITY: MEDIUM)
- [ ] Fix 17 failing tests in core hooks
- [ ] Ensure React Query mock configuration
- [ ] Apply defensive import patterns

### Agent 4: Schema Fixes (PRIORITY: LOW)
- [ ] Fix validation-transform-pattern.test.ts
- [ ] Fix cart-transform-pattern.test.ts
- [ ] Fix payment.schema.test.ts
- [ ] Fix kiosk.schema.test.ts

### Agent 5: Quality Assurance (PRIORITY: FINAL)
- [ ] Validate all fixes
- [ ] Run comprehensive test suites
- [ ] Document remaining issues

## 🔗 Dependencies
```mermaid
graph TD
    Reference-Patterns --> All-Agents
    Critical-Hooks --> QA
    Service-Suites --> QA
    Core-Hooks --> QA
    Schema-Fixes --> QA
```

## ⚠️ Important Notes
- DO NOT modify actual implementation code
- ONLY fix test code to properly use infrastructure
- Some tests may fail due to incomplete features - mark these as expected failures
- Follow patterns from src/test/*-pattern (REFERENCE).md files
EOF

# Create health metrics
cat > ${COMM_DIR}/health-metrics.json << EOF
{
  "timestamp": "${TIMESTAMP}",
  "overall_pass_rate": 70,
  "target_pass_rate": 85,
  "categories": {
    "service_tests": {"current": 78, "target": 85},
    "core_hooks": {"current": 89, "target": 95},
    "critical_hooks": {"current": 1, "target": 50},
    "schema_tests": {"current": 94, "target": 98}
  },
  "agent_progress": {
    "critical-hooks": 0,
    "service-suites": 0,
    "core-hooks": 0,
    "schema-fixes": 0,
    "quality-assurance": 0
  }
}
EOF

# Create reference patterns contract
cat > ${COMM_DIR}/contracts/test-patterns.md << 'EOF'
# Test Pattern Contracts

## Service Test Pattern
- Use SimplifiedSupabaseMock from test infrastructure
- Mock setup BEFORE imports
- Use factories (createUser, createOrder, etc.)
- Include resetAllFactories() in beforeEach
- Reference: src/services/__tests__/authService.test.ts

## Hook Test Pattern  
- Apply defensive imports with try/catch
- Mock React Query dynamically
- Mock all query key factory methods
- Use createWrapper() from test utils
- Include graceful degradation
- Reference: src/hooks/__tests__/prototypes/useAuth.simple.working.test.tsx

## Schema Test Pattern
- Database-first validation
- Transform in single pass
- Handle nulls with defaults
- Include debug metadata
- Reference: src/schemas/__tests__/cart-transform-pattern.test.ts

## Key Infrastructure Files
- Test Setup: src/test/test-setup.ts
- Factories: src/test/factories/index.ts
- Mocks: src/test/mocks/supabase.simplified.mock.ts
- Patterns: src/test/*-pattern (REFERENCE).md
EOF

# Create sync log
cat > ${COMM_DIR}/sync-log.md << EOF
# 🔄 Sync Log
Project: Test Infrastructure Fixes
Started: ${TIMESTAMP}

## Timeline
- ${TIMESTAMP}: Environment initialized
- Agents created: ${#AGENTS[@]}
- Worktrees established
- Communication hub ready

## Active Agents
$(for agent in "${AGENTS[@]}"; do echo "- $agent: workspace ready"; done)
EOF

echo "
✅ Test Fix Multi-Agent Environment Ready!

📁 Structure Created:
- Main Repo: ${MAIN_REPO}
- Communication Hub: ${COMM_DIR}
- Agent Workspaces: $(for agent in "${AGENTS[@]}"; do echo -n "../${PROJECT_NAME}-${agent} "; done)

🚀 Next Steps:
1. Launch agents with their specific prompts
2. Monitor progress at ${COMM_DIR}/task-board.md
3. Check blockers at ${COMM_DIR}/blockers/
4. View metrics at ${COMM_DIR}/health-metrics.json

Use: ./launch-test-fix-agent.sh <agent-number> to start each agent
"