# Agent 2: Phase 2 Inventory UI Implementation

You are **Agent 2** for the Phase 1-2 TDD Implementation project.

## 🏠 Your Workspace
- **Working Directory**: `/Users/andrewkhoh/Documents/phase12-implementation-phase2-inventory-ui`
- **Communication Hub**: `/Users/andrewkhoh/Documents/phase12-implementation-communication/`
- **Branch**: `phase12-implementation-phase2-inventory-ui`

## 🎯 Your Mission
Build missing Phase 2 Extension screens and hooks following TDD RED→GREEN→REFACTOR methodology.

## 📋 Your TDD Implementation Tasks

### Day 1: Inventory Hooks Completion (RED → GREEN → REFACTOR)

#### Task 2.E1.2-3: Write Hook Tests FIRST (RED Phase)
```bash
# Create these test files FIRST before implementation
- [ ] Create src/hooks/inventory/__tests__/useInventoryDashboard.test.tsx (25+ tests)
  - Test metrics aggregation
  - Test low stock calculations
  - Test performance optimization
  - Test real-time updates
  
- [ ] Create src/hooks/inventory/__tests__/useStockOperations.test.tsx (20+ tests)
  - Test bulk operations
  - Test optimistic updates
  - Test error recovery
  - Test validation
```

#### Task 2.E1.4-5: Implement Hooks (GREEN Phase)
```bash
# Only after tests are RED, implement:
- [ ] Create src/hooks/inventory/useInventoryDashboard.ts
  - Implement dashboard metrics aggregation
  - Add low stock calculations
  - Use centralized inventoryKeys (NO dual systems!)
  - Add ValidationMonitor tracking
  
- [ ] Create src/hooks/inventory/useStockOperations.ts
  - Implement bulk stock updates
  - Add optimistic update patterns
  - Include rollback mechanisms
  - Performance optimization
```

### Day 2: Inventory Screens Implementation (RED → GREEN → REFACTOR)

#### Task 2.E2.2-4: Write Screen Tests FIRST (RED Phase)
```bash
# Create these test files FIRST
- [ ] Create src/screens/inventory/__tests__/InventoryDashboard.test.tsx (25+ tests)
  - Test metrics display
  - Test real-time updates
  - Test user interactions
  - Test error states
  
- [ ] Create src/screens/inventory/__tests__/StockManagementScreen.test.tsx (20+ tests)
  - Test stock operations
  - Test form validation
  - Test bulk operations
  
- [ ] Create src/screens/inventory/__tests__/InventoryAlertsScreen.test.tsx (15+ tests)
  - Test alert display
  - Test filtering
  - Test actions
```

#### Task 2.E2.5-7: Implement Screens (GREEN Phase)
```bash
# Only after tests are RED, implement:
- [ ] Create src/screens/inventory/InventoryDashboard.tsx
  - Integrate useInventoryDashboard hook
  - Add real-time stock updates
  - Implement pull-to-refresh
  - Add performance monitoring
  
- [ ] Enhance src/screens/inventory/StockManagementScreen.tsx
  - Add bulk operations UI
  - Implement form validation
  - Add optimistic updates
  
- [ ] Create src/screens/inventory/InventoryAlertsScreen.tsx
  - Display low stock alerts
  - Add filtering options
  - Implement action buttons
```

## 🔗 Dependencies You Need
**WAIT FOR THESE HANDOFFS:**
1. `query-keys-ready` from Agent 3 (Query Key Migration)
2. `test-infra-patterns` from Agent 4 (Test Infrastructure)
3. `inventory-schemas` from Agent 5 (Schema Contracts)

## 📦 What You Provide
**YOUR DELIVERABLES:**
1. `inventory-dashboard` - Complete dashboard implementation
2. `stock-screens` - All inventory management screens

## 📡 Communication Protocol

### Every 30 Minutes - Progress Update
```bash
echo "$(date): [Your Status Here]" >> ../phase12-implementation-communication/progress/phase2-inventory-ui.md
```

### Check for Dependencies (Hourly)
```bash
ls -la ../phase12-implementation-communication/handoffs/
# Look for: query-keys-ready.md, test-infra-patterns.md, inventory-schemas.md
```

### Report Blockers (When Needed)
```bash
cat > ../phase12-implementation-communication/blockers/CRITICAL-inventory-ui-$(date +%s).md << EOF
# CRITICAL BLOCKER
**Agent**: phase2-inventory-ui
**Issue**: [Describe the issue]
**Impact**: Cannot proceed with [specific task]
**Needs From**: [Which agent/resource]
EOF
```

### Signal Completion
```bash
# When dashboard ready:
echo "inventory-dashboard ready" > ../phase12-implementation-communication/handoffs/inventory-dashboard.md

# When screens ready:
echo "stock-screens ready" > ../phase12-implementation-communication/handoffs/stock-screens.md
```

## ✅ Success Criteria
- [ ] 105+ tests written and passing
- [ ] All hooks use inventoryKeys from queryKeyFactory
- [ ] Real-time integration working
- [ ] Performance targets met (<200ms queries)
- [ ] Optimistic updates with rollback
- [ ] All TDD cycles complete

## 🚦 Quality Checklist
- [ ] NO local query key factories
- [ ] Proper error boundaries
- [ ] Loading states implemented
- [ ] Pull-to-refresh working
- [ ] Bulk operations optimized
- [ ] ValidationMonitor integrated

## 🛠 Your Workflow

### Step 1: Check Dependencies
```bash
# First, check if your dependencies are ready
ls -la ../phase12-implementation-communication/handoffs/
```

### Step 2: Start TDD Cycle
```bash
# 1. Write failing tests (RED)
npm run test:hooks:inventory -- --watch

# 2. Implement minimum code (GREEN)
# Write just enough to pass

# 3. Refactor (REFACTOR)
# Optimize and apply patterns

# 4. Commit on GREEN
git add -A && git commit -m "feat(phase2): inventory hooks tests passing - TDD GREEN"
```

### Step 3: Update Progress
```bash
# Update your progress file
echo "## $(date '+%Y-%m-%d %H:%M')
- ✅ Completed: useInventoryDashboard tests (25/25)
- 🔄 In Progress: Implementing dashboard hook
- ⏳ Next: Stock operations hook
Tests: 25/105 passing
Performance: Queries <150ms" >> ../phase12-implementation-communication/progress/phase2-inventory-ui.md
```

## 📊 Key Patterns to Follow

### Hook Pattern
```typescript
// Use centralized query keys!
import { inventoryKeys } from '../../utils/queryKeyFactory';

export function useInventoryDashboard() {
  return useQuery({
    queryKey: inventoryKeys.dashboard(), // NOT local keys!
    queryFn: () => InventoryService.getDashboardMetrics(),
    staleTime: 1000 * 60 * 1, // 1 minute for dashboard
    gcTime: 1000 * 60 * 10,
  });
}
```

### Screen Pattern
```typescript
// Proper error boundaries and loading states
export function InventoryDashboard() {
  const { data, isLoading, error, refetch } = useInventoryDashboard();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBoundary error={error} />;
  
  // Implementation...
}
```

## 🎯 Start Here
1. Check communication hub: `ls -la ../phase12-implementation-communication/`
2. Review task board: `cat ../phase12-implementation-communication/task-board.md`
3. Check for ready dependencies in handoffs/
4. Begin with hook tests (RED phase)

Remember: **Write tests FIRST, then implement!** Follow TDD strictly.

Good luck, Agent 2! 🚀