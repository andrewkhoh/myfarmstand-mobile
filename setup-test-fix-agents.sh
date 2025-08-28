#!/bin/bash

# Test Fix & Inventory Completion - Parallel Agent Setup
# Step 1: Fix remaining test failures (Agent 1 & 2)
# Step 2: Complete inventory screens (Agent 3)

set -e

echo "🚀 Setting up Test Fix & Inventory Completion Agents"
echo "===================================================="

# Configuration
MAIN_REPO="/Users/andrewkhoh/Documents/myfarmstand-mobile"
PROJECT_NAME="test-fixes"
BASE_BRANCH="main"
COMM_DIR="../${PROJECT_NAME}-communication"

# Agent definitions
declare -a AGENTS=(
  "fix-hook-tests"        # Agent 1: Fix 27 failing hook tests
  "fix-service-tests"     # Agent 2: Fix 187 failing service tests
  "complete-inventory-ui" # Agent 3: Complete remaining inventory screens
)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Creating communication hub${NC}"
mkdir -p ${COMM_DIR}/{progress,tasks,handoffs,status}

echo "✅ Created communication directory at ${COMM_DIR}"

echo -e "\n${YELLOW}Step 2: Creating git worktrees${NC}"
cd $MAIN_REPO

for agent in "${AGENTS[@]}"; do
  WORKSPACE="../${PROJECT_NAME}-${agent}"
  BRANCH="${PROJECT_NAME}-${agent}"
  
  # Remove existing worktree if exists
  if git worktree list | grep -q "$WORKSPACE"; then
    git worktree remove "$WORKSPACE" --force 2>/dev/null || true
  fi
  
  # Create new worktree from current main (with Phase 1-2 changes)
  git worktree add "$WORKSPACE" -b "$BRANCH"
  
  echo -e "${GREEN}✅ Created workspace for ${agent}${NC}"
  echo "   Location: $WORKSPACE"
done

echo -e "\n${YELLOW}Step 3: Creating task assignments${NC}"

# Task list for test fixes
cat > ${COMM_DIR}/tasks/test-fix-tasks.md << 'EOF'
# Test Fix Task Assignments

## Agent 1: Fix Hook Tests (27 failures)
**Branch**: test-fixes-fix-hook-tests

### Failed Tests to Fix:
- useProducts.test.tsx - Mock issues with new query keys
- useAuth.test.tsx - Missing mock implementations
- useNotifications.test.tsx - Async cleanup issues
- useKiosk.test.tsx - New query key structure
- Marketing hooks - Mock patterns need update
- Role-based hooks - Permission mock issues

### Strategy:
1. Update mocks to use centralized query keys
2. Fix async test cleanup issues
3. Add proper defensive imports
4. Remove fake timers where causing issues

---

## Agent 2: Fix Service Tests (187 failures)
**Branch**: test-fixes-fix-service-tests

### Failed Tests to Fix:
- Product service tests - Schema validation issues
- Order service tests - Mock response format
- Payment service tests - Stripe mock updates
- Inventory service tests - New patterns
- Marketing service tests - Missing mocks
- Role service tests - Permission logic

### Strategy:
1. Update SimplifiedSupabaseMock responses
2. Fix ValidationMonitor assertions
3. Update schema transformations
4. Add missing service mocks

---

## Agent 3: Complete Inventory UI
**Branch**: test-fixes-complete-inventory-ui

### Remaining Screens to Build:
- InventoryDashboard.tsx (enhance from basic)
- StockManagementScreen.tsx (complete implementation)
- InventoryAlertsScreen.tsx (finish features)
- BulkOperationsModal.tsx (new component)
- StockHistoryView.tsx (new component)

### Remaining Tests (55/105):
- InventoryDashboard tests (25 more)
- StockManagementScreen tests (20 more)
- InventoryAlertsScreen tests (10 more)

### Strategy:
1. Follow TDD - write tests first
2. Use completed hooks (already working)
3. Add real-time updates
4. Implement pull-to-refresh
EOF

echo "✅ Created task assignments"

echo -e "\n${YELLOW}Step 4: Creating test failure analysis${NC}"

# Analyze current test failures
cat > ${COMM_DIR}/tasks/failure-analysis.md << 'EOF'
# Test Failure Analysis

## Hook Test Failures (27 total)

### Common Issues:
1. **Query Key Mismatches**
   - Tests expect old local query keys
   - Need to import from centralized factory

2. **Async Cleanup**
   - Tests not properly awaiting
   - Missing act() wrappers
   - Timers not cleaned up

3. **Mock Misalignment**
   - Mocks return old response format
   - Missing ValidationMonitor mocks

### Quick Fixes:
```typescript
// Import centralized keys
import { productKeys, authKeys } from 'utils/queryKeyFactory';

// Proper async cleanup
afterEach(async () => {
  await waitFor(() => {
    jest.clearAllMocks();
  });
});

// Fix timer issues
beforeEach(() => {
  jest.useRealTimers(); // Not fake timers
});
```

## Service Test Failures (187 total)

### Common Issues:
1. **Schema Validation**
   - Response doesn't match new schemas
   - Missing required fields in mocks

2. **Mock Setup Order**
   - Mocks must be before imports
   - SimplifiedSupabaseMock pattern not followed

3. **Transform Errors**
   - Snake_case to camelCase issues
   - Null handling problems

### Quick Fixes:
```typescript
// Proper mock setup
jest.mock('config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }
}));

// Add ValidationMonitor
jest.mock('utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));
```
EOF

echo "✅ Created failure analysis"

echo -e "\n${YELLOW}Step 5: Creating monitoring script${NC}"

cat > ${COMM_DIR}/monitor-progress.sh << 'MONITOR'
#!/bin/bash

COMM_DIR="$(dirname "$0")"

while true; do
  clear
  echo "📊 TEST FIX & INVENTORY COMPLETION MONITOR"
  echo "=========================================="
  echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  
  echo "🧪 TEST FIX PROGRESS:"
  echo "-------------------"
  echo "Target: Fix 214 failing tests"
  echo ""
  
  if [ -f "${COMM_DIR}/status/test-status.txt" ]; then
    cat "${COMM_DIR}/status/test-status.txt"
  else
    echo "Hooks: 27 failing → 0 (pending)"
    echo "Services: 187 failing → 0 (pending)"
  fi
  
  echo ""
  echo "🎨 INVENTORY UI PROGRESS:"
  echo "------------------------"
  if [ -f "${COMM_DIR}/progress/complete-inventory-ui.md" ]; then
    tail -10 "${COMM_DIR}/progress/complete-inventory-ui.md"
  else
    echo "Screens: 0/5 complete"
    echo "Tests: 50/105 written"
  fi
  
  echo ""
  echo "📝 RECENT UPDATES:"
  echo "-----------------"
  for file in ${COMM_DIR}/progress/*.md; do
    if [ -f "$file" ]; then
      agent=$(basename "$file" .md)
      last_line=$(tail -1 "$file")
      echo "$agent: $last_line"
    fi
  done
  
  echo ""
  echo "Press Ctrl+C to exit"
  sleep 15
done
MONITOR

chmod +x ${COMM_DIR}/monitor-progress.sh

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
echo "   1. Open 3 Claude Code tabs"
echo "   2. Use the agent prompts below"
echo "   3. Monitor: ${COMM_DIR}/monitor-progress.sh"