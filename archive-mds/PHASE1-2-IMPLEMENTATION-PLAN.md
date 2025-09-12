# Phase 1-2 Implementation Plan with TDD
**Execute Missing Implementations Following TDD Task Lists**

**Date**: 2025-08-26  
**Objective**: IMPLEMENT missing components following TDD RED→GREEN→REFACTOR  
**Strategy**: 5 parallel agents implementing, not just auditing

---

## 🎯 **Implementation Focus**

### **What We're Building (Not Just Auditing)**
1. **Fix dual query key systems** - Migrate Products/Auth to centralized factory
2. **Implement missing screens** - Build Phase 1 Extension UI components
3. **Complete inventory dashboards** - Build Phase 2 Extension screens
4. **Migrate tests to new infrastructure** - Update from 38% to 90%+ adoption
5. **Implement missing hooks/services** - Complete gaps in Phase 1-2 claims

---

## 👥 **Agent Implementation Assignments**

### **Agent 1: Phase 1 Navigation & Role UI Implementation**
**Mission**: Build missing Phase 1 Extension components following TDD

#### **TDD Implementation Tasks (from PHASE_1_TASK_LIST_EXTENSION.md)**

**Day 1: Navigation Infrastructure (RED → GREEN → REFACTOR)**

```bash
# Task 1.E1.2: Write Navigation Tests FIRST (RED Phase)
- [ ] Create src/navigation/__tests__/RoleBasedStackNavigator.test.tsx (15+ tests)
- [ ] Test dynamic menu generation based on user role
- [ ] Test navigation permission enforcement
- [ ] Test role switching navigation updates
- [ ] Test deep-linking with role permissions

# Task 1.E1.4: Implement Navigation (GREEN Phase)
- [ ] Create src/navigation/RoleBasedStackNavigator.tsx
- [ ] Implement dynamic screen registration based on permissions
- [ ] Add role context provider for navigation
- [ ] Implement permission-aware screen components
- [ ] Add navigation guards for protected routes

# Task 1.E1.5: Implement Role Navigation Service
- [ ] Create src/services/role-based/roleNavigationService.ts
- [ ] Implement menu generation logic with permissions
- [ ] Add navigation permission validation
- [ ] Integrate ValidationMonitor for tracking
```

**Day 2: Role Dashboard Screens (RED → GREEN → REFACTOR)**

```bash
# Task 1.E2.2: Write Screen Tests FIRST (RED Phase)
- [ ] Create src/screens/role-based/__tests__/RoleDashboard.test.tsx (20+ tests)
- [ ] Create src/screens/role-based/__tests__/RoleSelectionScreen.test.tsx (12+ tests)
- [ ] Create src/screens/role-based/__tests__/PermissionManagementScreen.test.tsx (15+ tests)

# Task 1.E2.5-7: Implement Screens (GREEN Phase)
- [ ] Create src/screens/role-based/RoleDashboard.tsx
- [ ] Create src/screens/role-based/RoleSelectionScreen.tsx
- [ ] Create src/screens/role-based/PermissionManagementScreen.tsx
- [ ] Integrate with useUserRole() hook
- [ ] Add real-time updates via useRealtime()
- [ ] Implement error boundaries and loading states
```

**Success Criteria**: 
- All navigation tests pass (25+ tests)
- All screen tests pass (47+ tests)
- Centralized query key usage throughout
- ValidationMonitor integrated

---

### **Agent 2: Phase 2 Inventory UI Implementation**
**Mission**: Build missing Phase 2 Extension screens following TDD

#### **TDD Implementation Tasks (from PHASE_2_TASK_LIST_EXTENSION.md)**

**Day 1: Inventory Hooks Completion (RED → GREEN → REFACTOR)**

```bash
# Task 2.E1.2-3: Write Hook Tests FIRST (RED Phase)
- [ ] Create src/hooks/inventory/__tests__/useInventoryDashboard.test.tsx (25+ tests)
- [ ] Create src/hooks/inventory/__tests__/useStockOperations.test.tsx (20+ tests)

# Task 2.E1.4-5: Implement Hooks (GREEN Phase)
- [ ] Create src/hooks/inventory/useInventoryDashboard.ts
- [ ] Create src/hooks/inventory/useStockOperations.ts
- [ ] Implement dashboard metrics aggregation
- [ ] Add low stock calculations
- [ ] Use centralized inventoryKeys (NO dual systems!)
- [ ] Add ValidationMonitor tracking
```

**Day 2: Inventory Screens Implementation (RED → GREEN → REFACTOR)**

```bash
# Task 2.E2.2-4: Write Screen Tests FIRST (RED Phase)
- [ ] Create src/screens/inventory/__tests__/InventoryDashboard.test.tsx (25+ tests)
- [ ] Create src/screens/inventory/__tests__/StockManagementScreen.test.tsx (20+ tests)
- [ ] Create src/screens/inventory/__tests__/InventoryAlertsScreen.test.tsx (15+ tests)

# Task 2.E2.5-7: Implement Screens (GREEN Phase)
- [ ] Create src/screens/inventory/InventoryDashboard.tsx
- [ ] Enhance src/screens/inventory/StockManagementScreen.tsx
- [ ] Create src/screens/inventory/InventoryAlertsScreen.tsx
- [ ] Integrate useInventoryDashboard hook
- [ ] Add real-time stock updates
- [ ] Implement pull-to-refresh
```

**Success Criteria**:
- All hook tests pass (45+ tests)
- All screen tests pass (60+ tests)
- Real-time integration working
- Performance targets met (<200ms queries)

---

### **Agent 3: Query Key Factory Migration**
**Mission**: Fix dual query key systems and migrate violators

#### **Implementation Tasks**

**Day 1: Fix Products Hook Dual System**

```bash
# Step 1: Write migration tests FIRST
- [ ] Create migration tests for productKeys compliance
- [ ] Test cache invalidation after migration
- [ ] Test user isolation patterns

# Step 2: Migrate Products Hook
- [ ] Update src/hooks/useProducts.ts:
  - REMOVE local productQueryKeys
  - IMPORT { productKeys } from utils/queryKeyFactory
  - UPDATE all queryKey references
- [ ] Update src/services/productService.ts:
  - Use productKeys for invalidation
  - Remove manual key construction

# Step 3: Verify Migration
- [ ] Run all product tests with new keys
- [ ] Test cache invalidation works
- [ ] Verify no dual systems remain
```

**Day 2: Fix Auth Hook Bypass**

```bash
# Step 1: Write migration tests FIRST
- [ ] Create migration tests for authKeys compliance
- [ ] Test user-specific key isolation

# Step 2: Migrate Auth Hook
- [ ] Update src/hooks/useAuth.ts:
  - IMPORT { authKeys } from utils/queryKeyFactory
  - REPLACE manual keys with authKeys.user()
  - UPDATE invalidation to use authKeys
- [ ] Fix service layer auth key usage

# Step 3: Fix Kiosk Manual Spreading
- [ ] Extend kioskKeys with entity-specific methods
- [ ] Replace manual spreading with factory methods
- [ ] Test all kiosk cache operations
```

**Success Criteria**:
- Products: 50% → 100% factory usage
- Auth: 10% → 100% factory usage
- Kiosk: 70% → 100% factory usage
- Zero manual key construction

---

### **Agent 4: Test Infrastructure Migration**
**Mission**: Migrate tests from 38% to 90%+ adoption of refactored patterns

#### **Implementation Tasks**

**Day 1: Service Test Migration**

```bash
# Migrate 30+ service test files
- [ ] Update marketing service tests:
  - ADD SimplifiedSupabaseMock
  - ADD ValidationMonitor assertions
  - REMOVE complex mock setups
  
- [ ] Update executive service tests:
  - ADD SimplifiedSupabaseMock pattern
  - ADD resilient processing tests
  
- [ ] Update extension service tests:
  - Follow scratchpad-service-test-setup patterns
  - Add proper TypeScript typing
```

**Day 2: Hook Test Migration**

```bash
# Migrate 40+ hook test files
- [ ] Add defensive imports pattern to ALL hooks:
  - TRY/CATCH imports
  - Graceful degradation
  - Factory reset patterns
  
- [ ] Update React Query usage:
  - Use REAL React Query where needed
  - Remove fake timer patterns
  - Add proper race condition tests
  
- [ ] Fix extension hook tests:
  - Marketing hooks
  - Executive analytics hooks
  - Navigation hooks
```

**Success Criteria**:
- 38% → 90%+ SimplifiedSupabaseMock adoption
- 100% defensive import usage
- All ValidationMonitor integration
- Zero fake timer usage in React Query tests

---

### **Agent 5: Schema Contract & Integration Implementation**
**Mission**: Complete missing schema contracts and integration layers

#### **TDD Implementation Tasks (from PHASE_1_DETAILED_TASK_LIST.md)**

**Day 1: Missing Schema Contracts**

```bash
# Contract Tests FIRST (Pattern 1: Compile-Time Enforcement)
- [ ] Create missing navigation schema contracts:
  src/schemas/role-based/__contracts__/navigation.contracts.test.ts
  
- [ ] Create missing inventory contracts:
  src/schemas/inventory/__contracts__/bulkOperations.contracts.test.ts
  
- [ ] Implement schemas to pass contracts:
  - NavigationSchema with transformation
  - BulkOperationSchema with validation
  - Follow Pattern 4: Transformation completeness
```

**Day 2: Integration Layer Implementation**

```bash
# Task 1.E3.2: Write Integration Tests FIRST
- [ ] Create src/__tests__/integration/role-based/roleIntegration.test.tsx (25+ tests)
- [ ] Test complete login → role selection → dashboard flow
- [ ] Test permission enforcement across navigation
- [ ] Test real-time permission updates

# Task 1.E3.4-5: Implement Integration
- [ ] Connect RoleDashboard to useUserRole()
- [ ] Connect navigation to role context
- [ ] Implement navigation guards
- [ ] Add ValidationMonitor tracking
```

**Success Criteria**:
- All schema contracts compile and pass
- Integration tests achieve >85% pass rate
- Real-time updates working across layers
- Performance targets met

---

## 📊 **Execution Strategy**

### **Phase 1: Setup & RED (Day 1)**
All agents simultaneously:
1. Write failing tests for their components
2. Set up test infrastructure
3. Create file structure
4. Report RED phase completion

### **Phase 2: GREEN Implementation (Days 2-3)**
Parallel implementation:
1. Implement minimum code to pass tests
2. Focus on making tests GREEN
3. Use existing patterns from working code
4. Report blockers immediately

### **Phase 3: REFACTOR & Integration (Day 4)**
1. Optimize implementations
2. Add ValidationMonitor throughout
3. Ensure pattern compliance
4. Run integration tests

---

## 🎯 **Concrete Deliverables Per Agent**

### **Agent 1 Deliverables**
```
✅ src/navigation/RoleBasedStackNavigator.tsx
✅ src/screens/role-based/RoleDashboard.tsx
✅ src/screens/role-based/RoleSelectionScreen.tsx
✅ src/screens/role-based/PermissionManagementScreen.tsx
✅ 72+ passing tests
```

### **Agent 2 Deliverables**
```
✅ src/hooks/inventory/useInventoryDashboard.ts
✅ src/hooks/inventory/useStockOperations.ts
✅ src/screens/inventory/InventoryDashboard.tsx
✅ src/screens/inventory/InventoryAlertsScreen.tsx
✅ 105+ passing tests
```

### **Agent 3 Deliverables**
```
✅ Fixed src/hooks/useProducts.ts (no dual system)
✅ Fixed src/hooks/useAuth.ts (uses authKeys)
✅ Extended kioskKeys with proper methods
✅ 100% query key factory compliance
```

### **Agent 4 Deliverables**
```
✅ 30+ migrated service tests
✅ 40+ migrated hook tests
✅ 90%+ infrastructure adoption
✅ All tests using refactored patterns
```

### **Agent 5 Deliverables**
```
✅ Complete schema contracts
✅ Integration test suite
✅ Cross-layer validation
✅ Performance benchmarks
```

---

## 🚀 **Implementation Commands**

### **Each Agent Starts With**
```bash
# Create working branch
git checkout -b agent-X-phase-Y-implementation

# Run initial test to verify RED phase
npm run test:[component]

# Begin TDD cycle
# 1. Write test (RED)
# 2. Implement (GREEN)  
# 3. Refactor (REFACTOR)
# 4. Commit on GREEN
```

### **Commit Strategy**
```bash
# After each GREEN test suite
git add -A && git commit -m "feat(phase-X): [component] tests passing - TDD GREEN"

# After refactor
git add -A && git commit -m "refactor(phase-X): [component] optimized with patterns"
```

---

## ✅ **Success Metrics**

### **Quantifiable Goals**
- **New Components**: 15+ new files created
- **Test Coverage**: 300+ new passing tests
- **Infrastructure Adoption**: 38% → 90%+
- **Query Key Compliance**: 100% (zero dual systems)
- **Performance**: All queries <200ms
- **Real-time**: <100ms update propagation

### **Quality Gates**
- ✅ All TDD cycles complete (RED→GREEN→REFACTOR)
- ✅ ValidationMonitor integrated everywhere
- ✅ Centralized query keys only
- ✅ All architectural patterns followed
- ✅ Performance benchmarks met

---

**This is an IMPLEMENTATION plan where each agent BUILDS the missing pieces following the TDD task lists, not just auditing what's wrong.**