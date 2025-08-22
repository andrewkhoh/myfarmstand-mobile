# Phase 2: Inventory Operations - Detailed Task List

## 📋 **Overview**

**Phase 2 Scope**: Inventory Operations with Role-Based Permissions  
**Foundation**: Builds on Phase 1's role-based permission system  
**Target**: Complete inventory management with role-aware access control  
**Compliance**: 100% adherence to `docs/architectural-patterns-and-best-practices.md`

---

## 🎯 **Core Requirements Analysis**

### **Business Operations Needed**
1. **Stock Level Management** - View/update current stock quantities
2. **Product Visibility Control** - Show/hide products from customers  
3. **Inventory Alerts** - Low stock notifications and threshold management
4. **Stock Movement Tracking** - Complete audit trail of all inventory changes
5. **Batch Operations** - Bulk stock updates with resilient processing

### **Role-Based Access Control Integration**
- **`inventory_staff`** - Full inventory CRUD operations
- **`marketing_staff`** - View inventory, update product visibility only
- **`executive`** - View all inventory analytics and reports (read-only)
- **`admin`** - All inventory operations + system configuration

---

## 🗃️ **Database Schema Design**

### **Primary Tables**
```sql
-- Core inventory tracking
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  current_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  available_stock GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
  minimum_threshold INTEGER DEFAULT 10,
  maximum_threshold INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  is_visible_to_customers BOOLEAN DEFAULT true,
  last_stock_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comprehensive audit trail
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('restock', 'sale', 'adjustment', 'reservation', 'release')),
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  reference_order_id UUID REFERENCES orders(id),
  batch_id UUID, -- For bulk operations
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Role-Based Security (RLS)**
- **inventory_staff**: Full access to inventory_items and stock_movements
- **marketing_staff**: Read + visibility updates only
- **executive**: Read-only access for analytics
- **admin**: Full access to everything + system config

---

## 🏗️ **Implementation Architecture**

Following the exact same 4-layer architecture as Phase 1:

### **Layer 1: Schema Contracts**
- Database-first validation with exact field alignment
- Transformation schemas (snake_case → camelCase)
- Compile-time contract enforcement

### **Layer 2: Service Layer**  
- Direct Supabase queries with ValidationMonitor
- Role permission integration using Phase 1 system
- Resilient batch processing with skip-on-error

### **Layer 3: Hook Layer**
- React Query integration with centralized query keys
- User-isolated caching strategies  
- Comprehensive error handling and recovery

### **Layer 4: Integration Layer**
- End-to-end workflow validation
- Role permission integration across all layers
- Cache invalidation strategy testing

---

## 📝 **Detailed TDD Task Breakdown**

## **Phase 2.1: Schema Layer (RED → GREEN → REFACTOR)**

### **Day 1 Tasks - Schema Contract Tests (RED Phase)**

**Task 2.1.1: Create Database Schema**
- [ ] Create `database/inventory-test-schema.sql` with complete table definitions
- [ ] Include RLS policies for all 4 role types
- [ ] Add performance indexes for common query patterns
- [ ] Include sample test data for contract validation

**Task 2.1.2: Create Database Mock Types**
- [ ] Create `src/schemas/inventory/__contracts__/database-mock.types.ts`
- [ ] Define exact TypeScript interfaces matching database structure
- [ ] Include Row, Insert, Update types for both tables
- [ ] Ensure nullable field handling matches database reality

**Task 2.1.3: Write Inventory Item Contract Tests (15+ tests)**
- [ ] Database interface alignment validation (compile-time enforcement)
- [ ] Complete transformation testing (all fields snake→camel)
- [ ] Null handling with database-first validation
- [ ] Stock calculation and constraint validation
- [ ] Input/update schema validation
- [ ] Role-based permission integration tests
- [ ] Query key factory integration validation (prevent dual systems)
- [ ] Edge cases: zero stock, boundary values, threshold validation
- [ ] Type safety enforcement across all fields
- [ ] Complete interface coverage validation

**Task 2.1.4: Write Stock Movement Contract Tests (10+ tests)**
- [ ] Database interface alignment for audit trail
- [ ] Movement type enum constraint validation
- [ ] Quantity change validation (non-zero, stock calculations)
- [ ] Batch operation support validation
- [ ] User reference and order reference handling
- [ ] Timestamp consistency across different formats
- [ ] Type safety for all audit fields
- [ ] Performance validation for large audit datasets

**Expected Result**: All contract tests FAIL (RED phase) - schemas don't exist yet

### **Day 1 Tasks - Schema Implementation (GREEN Phase)**

**Task 2.1.5: Implement Inventory Item Schemas**
- [ ] Create `src/schemas/inventory/inventoryItem.schemas.ts`
- [ ] Implement `InventoryItemDatabaseSchema` (raw database validation)
- [ ] Implement `InventoryItemTransformSchema` with TypeScript return annotation
- [ ] Implement `CreateInventoryItemSchema` and `UpdateInventoryItemSchema`
- [ ] Export all required types and contracts
- [ ] Ensure compile-time contract enforcement passes

**Task 2.1.6: Implement Stock Movement Schemas**
- [ ] Create `src/schemas/inventory/stockMovement.schemas.ts`
- [ ] Implement audit trail validation with movement type enums
- [ ] Handle batch operation and reference field validation
- [ ] Export movement type constants and validation helpers

**Task 2.1.7: Create Schema Index**
- [ ] Create `src/schemas/inventory/index.ts` with clean exports
- [ ] Ensure no circular dependencies
- [ ] Export all schemas, types, and constants

**Expected Result**: All 25+ schema contract tests PASS (GREEN phase)

### **Day 1 Tasks - Schema Optimization (REFACTOR Phase)**
- [ ] Performance optimization for large datasets
- [ ] Schema validation error message improvements
- [ ] Type safety enhancements and edge case handling

---

## **Phase 2.2: Service Layer (RED → GREEN → REFACTOR)**

### **Day 2 Tasks - Service Tests (RED Phase)**

**Task 2.2.1: Write Inventory Service Tests (20+ tests)**
- [ ] `getInventoryItem()` with role permission filtering
- [ ] `updateStock()` with atomic operation and audit trail creation
- [ ] `batchUpdateStock()` with resilient processing (skip-on-error)
- [ ] `toggleProductVisibility()` with role-based access control
- [ ] `getInventoryByProduct()` with user isolation
- [ ] `getLowStockItems()` with threshold-based filtering
- [ ] Error handling with ValidationMonitor integration
- [ ] Role permission integration using Phase 1 `RolePermissionService`
- [ ] Database transaction handling for atomic operations
- [ ] Performance testing for bulk operations

**Task 2.2.2: Write Stock Movement Service Tests (15+ tests)**
- [ ] `recordMovement()` with complete audit trail
- [ ] `getMovementHistory()` with pagination and filtering
- [ ] `getBatchMovements()` for bulk operation tracking
- [ ] `getMovementsByUser()` with user isolation
- [ ] `getMovementsByType()` with filtering and analytics
- [ ] Validation of movement calculations and stock consistency
- [ ] Error handling and resilient processing patterns
- [ ] Integration with inventory item updates

**Expected Result**: All service tests FAIL (RED phase) - services don't exist yet

### **Day 2 Tasks - Service Implementation (GREEN Phase)**

**Task 2.2.3: Implement Inventory Service**
- [ ] Create `src/services/inventory/inventoryService.ts`
- [ ] Implement all CRUD operations with role permission checks
- [ ] Direct Supabase queries with exact field selection
- [ ] ValidationMonitor integration throughout
- [ ] Resilient batch processing using architectural patterns
- [ ] User data isolation and security validation
- [ ] Error handling with graceful degradation

**Task 2.2.4: Implement Stock Movement Service**
- [ ] Create `src/services/inventory/stockMovementService.ts`
- [ ] Implement complete audit trail functionality
- [ ] Batch operation support with movement tracking
- [ ] Performance optimization for large audit datasets
- [ ] Integration with inventory service for atomic operations

**Task 2.2.5: Service Integration Testing**
- [ ] Cross-service integration (inventory + stock movement)
- [ ] Transaction handling across both services
- [ ] Role permission enforcement across all operations
- [ ] Performance validation for complex operations

**Expected Result**: All 35+ service tests PASS (GREEN phase)

### **Day 2 Tasks - Service Optimization (REFACTOR Phase)**
- [ ] Query performance optimizations
- [ ] Role permission checking efficiency
- [ ] Batch operation performance tuning
- [ ] Error handling and monitoring improvements

---

## **Phase 2.3: Hook Layer (RED → GREEN → REFACTOR)**

### **Day 3 Tasks - Hook Tests (RED Phase)**

**Task 2.3.1: Write Inventory Hooks Tests (20+ tests)**
- [ ] `useInventoryItems()` with role-based data filtering
- [ ] `useInventoryItem()` with caching and real-time updates
- [ ] `useUpdateStock()` mutation with optimistic updates
- [ ] `useBatchUpdateStock()` with progress tracking
- [ ] `useProductVisibility()` with role-based access control
- [ ] Query key validation (centralized factory integration)
- [ ] Cache invalidation strategies
- [ ] Real-time update integration
- [ ] Error handling and retry logic
- [ ] User isolation and permission-based data filtering

**Task 2.3.2: Write Stock Movement Hooks Tests (15+ tests)**
- [ ] `useStockMovements()` with pagination and filtering
- [ ] `useMovementHistory()` for audit trail display
- [ ] `useRecordMovement()` mutation with audit integration
- [ ] Real-time movement tracking
- [ ] Performance testing for large audit datasets

**Task 2.3.3: Write Bulk Operation Hooks Tests (10+ tests)**
- [ ] `useBulkInventoryOperations()` with progress tracking
- [ ] Error handling for partial failures in bulk operations
- [ ] Cache invalidation for affected inventory items
- [ ] User feedback and progress indication

**Expected Result**: All hook tests FAIL (RED phase) - hooks don't exist yet

### **Day 3 Tasks - Hook Implementation (GREEN Phase)**

**Task 2.3.4: Implement Inventory Hooks** ✅ COMPLETED
- [x] Create `src/hooks/inventory/useInventoryItems.ts`
- [x] Create `src/hooks/inventory/useInventoryItem.ts`
- [x] Create `src/hooks/inventory/useInventoryOperations.ts`
- [x] React Query integration with proper cache configuration
- [x] Query key factory extensions for inventory operations
- [x] Optimistic updates with automatic rollback
- [x] Comprehensive error handling patterns
**📝 Commit Strategy**: `feat(inventory): implement Phase 2.3 inventory hooks with TDD GREEN phase` ✅ COMMITTED

**Task 2.3.5: Implement Stock Movement Hooks** ✅ COMPLETED
- [x] Create `src/hooks/inventory/useStockMovements.ts`
- [x] Create `src/hooks/inventory/useMovementHistory.ts` (included in useStockMovements.ts)
- [x] Audit trail integration with pagination
- [x] Real-time update handling for movement tracking
**📝 Commit Strategy**: `feat(inventory): implement stock movement hooks with audit trail integration` ✅ COMMITTED

**Task 2.3.6: Query Key Factory Extensions** ✅ COMPLETED
- [x] Extend `src/utils/queryKeyFactory.ts` with inventory keys
- [x] Add inventory-specific query key methods
- [x] Ensure no dual systems are created (audit compliance)
- [x] Stock movement query key integration
**📝 Commit Strategy**: `feat(inventory): extend query key factory with inventory operations` ✅ COMMITTED

**Expected Result**: All 45+ hook tests PASS (GREEN phase)

### **Day 3 Tasks - Hook Optimization (REFACTOR Phase)**
**Task 2.3.7: Hook Performance and Cache Optimization**
- [ ] Cache strategy optimization
- [ ] Real-time update efficiency improvements
- [ ] Error handling refinement
- [ ] Performance tuning for large datasets
**📝 Commit Strategy**: `refactor(inventory): optimize hooks performance and cache strategies`

---

## **Phase 2.4: Integration Layer (RED → GREEN → REFACTOR)**

### **Day 4 Tasks - Integration Tests (RED Phase)**

**Task 2.4.1: Write End-to-End Workflow Tests (15+ tests)**
- [ ] Complete inventory management workflow
- [ ] Role permission enforcement across all layers
- [ ] Stock update → audit trail → cache invalidation flow
- [ ] Bulk operations with partial failure handling
- [ ] Real-time update propagation testing
- [ ] Error recovery workflow validation
**📝 Commit Strategy**: `test(inventory): add end-to-end workflow integration tests (RED phase)`

**Task 2.4.2: Write Performance Integration Tests (10+ tests)**
- [ ] Large dataset handling across all layers
- [ ] Bulk operation performance validation
- [ ] Cache efficiency with complex invalidation patterns
- [ ] Memory usage validation for long-running operations
**📝 Commit Strategy**: `test(inventory): add performance integration tests for scalability (RED phase)`

**Task 2.4.3: Write Security Integration Tests (10+ tests)**
- [ ] Role-based access control across all operations
- [ ] User data isolation validation
- [ ] Permission escalation prevention
- [ ] Audit trail security and integrity
**📝 Commit Strategy**: `test(inventory): add security integration tests for access control (RED phase)`

**Expected Result**: All integration tests FAIL initially (RED phase)

### **Day 4 Tasks - Integration Implementation (GREEN Phase)**

**Task 2.4.4: End-to-End Integration**
- [ ] Complete workflow validation
- [ ] Cross-layer error handling
- [ ] Performance optimization
- [ ] Security validation
**📝 Commit Strategy**: `feat(inventory): implement end-to-end integration layer (GREEN phase)`

**Task 2.4.5: Cache Strategy Integration**
- [ ] Smart invalidation across inventory and stock movements
- [ ] Real-time update coordination
- [ ] Performance optimization for complex cache patterns
**📝 Commit Strategy**: `feat(inventory): implement advanced cache integration strategies`

**Expected Result**: All 35+ integration tests PASS (GREEN phase)

### **Day 4 Tasks - Integration Optimization (REFACTOR Phase)**
**Task 2.4.6: Cross-Layer Performance Optimization**
- [ ] Performance tuning across all layers
- [ ] Error handling consistency
- [ ] Cache strategy optimization
- [ ] Security hardening
**📝 Commit Strategy**: `refactor(inventory): optimize cross-layer performance and consistency`

---

## 🎯 **Commit Gates (Identical to Phase 1)**

### **Gate 1: Schema Layer Complete**
- ✅ All 25+ schema contract tests passing
- ✅ Database-TypeScript alignment verified  
- ✅ Transformation patterns working correctly
- ✅ Compile-time contract enforcement successful
- 🎯 **Commit**: `feat(inventory-schema): Phase 2 inventory schema contracts with role integration`

### **Gate 2: Service Layer Complete**
- ✅ All 35+ service tests passing
- ✅ Role permission integration working across all operations
- ✅ ValidationMonitor tracking all operations (successes + failures)
- ✅ Resilient processing handling errors gracefully
- ✅ Direct Supabase patterns with exact field selection
- 🎯 **Commit**: `feat(inventory-service): Phase 2 inventory service with role-based access`

### **Gate 3: Hook Layer Complete**
- ✅ All 45+ hook tests passing
- ✅ React Query integration with proper caching
- ✅ Query key factory extensions working (no dual systems)
- ✅ Cache invalidation strategies effective
- ✅ Optimistic updates with rollback working
- 🎯 **Commit**: `feat(inventory-hooks): Phase 2 inventory hooks with optimistic updates`

### **Gate 4: Integration Complete**
- ✅ All 35+ integration tests passing
- ✅ End-to-end workflows functioning correctly
- ✅ Role permissions enforced across all layers
- ✅ Performance benchmarks meeting targets
- ✅ Security validation complete
- 🎯 **Final Commit**: `feat(inventory): Complete Phase 2 inventory operations with role-based permissions`

---

## 🔗 **Phase 1 Integration Points**

### **Required Integrations**
1. **Role Permission Checks** - Use `RolePermissionService.hasPermission()` throughout
2. **User Context** - Leverage `useUserRole()` for permission-aware UI
3. **Query Key Factory** - Extend existing centralized factory (no dual systems)
4. **ValidationMonitor** - Consistent monitoring patterns across all operations
5. **Schema Transformation** - Same snake_case → camelCase patterns

### **Reusable Patterns**
- All Zod validation patterns from Phase 1
- ValidationMonitor integration approaches
- React Query configuration strategies
- Error handling and graceful degradation
- Resilient item processing with skip-on-error

---

## 📊 **Success Metrics**

### **Test Coverage Targets**
- **Schema Layer**: 25+ contract tests (database alignment + transformations)
- **Service Layer**: 35+ service tests (CRUD + role permissions + batch operations)
- **Hook Layer**: 45+ hook tests (React Query + caching + optimistic updates)
- **Integration Layer**: 35+ integration tests (end-to-end + performance + security)
- **Total**: 140+ tests covering all architectural patterns

### **Performance Targets**
- Individual inventory queries: <200ms
- Bulk operations (100+ items): <2s with progress feedback
- Cache invalidation: <50ms for affected queries
- Real-time updates: <100ms propagation

### **Architectural Compliance**
- ✅ 100% ValidationMonitor integration (all patterns valid)
- ✅ 100% centralized query key factory usage (no dual systems)
- ✅ 100% role permission enforcement
- ✅ 100% schema contract enforcement
- ✅ 100% graceful degradation patterns

---

## 🎯 **Expected Deliverables**

### **Files to Create (Complete List)**
```
database/inventory-test-schema.sql
src/schemas/inventory/inventoryItem.schemas.ts
src/schemas/inventory/stockMovement.schemas.ts
src/schemas/inventory/index.ts
src/schemas/inventory/__contracts__/database-mock.types.ts
src/schemas/inventory/__contracts__/inventoryItem.contracts.test.ts
src/schemas/inventory/__contracts__/stockMovement.contracts.test.ts
src/services/inventory/inventoryService.ts
src/services/inventory/stockMovementService.ts
src/services/inventory/__tests__/inventoryService.test.ts
src/services/inventory/__tests__/stockMovementService.test.ts
src/hooks/inventory/useInventoryItems.ts
src/hooks/inventory/useInventoryItem.ts
src/hooks/inventory/useInventoryOperations.ts
src/hooks/inventory/useStockMovements.ts
src/hooks/inventory/useMovementHistory.ts
src/hooks/inventory/__tests__/useInventoryItems.test.tsx
src/hooks/inventory/__tests__/useInventoryOperations.test.tsx
src/hooks/inventory/__tests__/useStockMovements.test.tsx
src/hooks/inventory/__tests__/inventory.integration.test.tsx
```

### **Files to Modify**
```
src/utils/queryKeyFactory.ts (add inventory key extensions)
```

---

## ✅ **Phase 2 Readiness Checklist**

- [x] **Phase 1 Complete**: All role-based permission infrastructure implemented
- [x] **Phase 1 Compliant**: 100% adherence to architectural patterns
- [x] **Phase 1 Tested**: All 53 tests passing (16 schema + 16 service + 12 hook + 10 integration)
- [x] **Documentation Current**: Task list aligns with architectural patterns
- [ ] **Team Approval**: Ready to proceed with Phase 2 implementation

---

**This detailed task list ensures 100% compliance with architectural patterns while building robust inventory operations on top of the Phase 1 role-based foundation.**

**Next Step**: Begin Phase 2.1.1 - Create Database Schema (RED Phase) 🚀