# Inventory Feature Gap Remediation Task List

## Overview
This document provides a comprehensive, prioritized task list to address all gaps identified in the inventory feature analysis while ensuring full compliance with architectural patterns and best practices.

---

## 🚨 Priority 0: Critical Security & Architecture Violations (Week 1)

### 1. Fix User Data Isolation
**Violation:** No user authentication validation in service layer (Pattern violation: Security Pattern 1)
**Files:** `src/services/inventory/inventoryService.ts`

#### Tasks:
- [ ] Add user authentication validation to `getInventoryItems()` method
- [ ] Implement ownership checks before any data access
- [ ] Add RLS policies to database tables
- [ ] Validate userId parameter matches authenticated user

```typescript
// Required implementation pattern:
async getInventoryItems(userId: string, filters?: any): Promise<InventoryItem[]> {
  // Validate authentication
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error('Unauthorized access');
  }

  // Add user_id filter to query
  let query = this.supabase
    .from('inventory_items')
    .select('*')
    .eq('user_id', user.id); // User isolation
}
```

### 2. Add Schema Contract Tests
**Violation:** Missing compile-time type safety (Pattern violation: Schema Contract Management)
**Files to Create:** `src/schemas/__contracts__/inventory.contracts.ts`

#### Tasks:
- [ ] Create contract test file for inventory schemas
- [ ] Add return type annotations to all transformations
- [ ] Implement AssertExact type checking
- [ ] Add pre-commit validation hooks

```typescript
// Required contract test:
type InventoryItemContract = AssertExact<
  z.infer<typeof InventoryItemSchema>,
  InventoryItem
>;
```

### 3. Fix Query Key User Isolation
**Violation:** Missing userId in cache keys (Pattern violation: React Query Pattern 2)
**Files:** `src/hooks/inventory/useInventoryItems.ts`, `src/hooks/inventory/useInventoryDashboard.ts`

#### Tasks:
- [ ] Update all query keys to include userId
- [ ] Modify query key factory to enforce user isolation
- [ ] Update cache invalidation to respect user boundaries

```typescript
// Fix query keys:
queryKey: ['inventory', 'list', userId, JSON.stringify(filters)]
// Not: ['inventory', 'list', JSON.stringify(filters)]
```

---

## 🔴 Priority 1: Missing Core Implementations (Week 1-2)

### 4. Implement Missing Service Methods
**Gap:** Core service methods not implemented
**File:** `src/services/inventory/inventoryService.ts`

#### Tasks:
- [ ] Implement `getLowStockItems()` method (lines 250-280 placeholder)
- [ ] Implement `getRecentMovements()` method (lines 350-380 placeholder)
- [ ] Implement `getAlerts()` method (lines 400-430 placeholder)
- [ ] Add proper Zod validation to each method
- [ ] Integrate ValidationMonitor for all operations

```typescript
async getLowStockItems(userId: string): Promise<InventoryItem[]> {
  // Validate user
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await this.supabase
    .from('inventory_items')
    .select('*')
    .eq('user_id', user.id)
    .lt('current_stock', 'minimum_stock');

  if (error) {
    ValidationMonitor.recordValidationError('low-stock-fetch', error);
    throw error;
  }

  // Validate each item
  const results = [];
  for (const item of data || []) {
    try {
      const validated = InventoryItemTransformSchema.parse(item);
      results.push(validated);
    } catch (err) {
      ValidationMonitor.recordValidationError('low-stock-item', err);
    }
  }

  ValidationMonitor.recordPatternSuccess('low-stock-fetch');
  return results;
}
```

### 5. Implement Stubbed Hooks
**Gap:** Critical hooks return mock data
**Files:** Multiple hook files

#### Tasks:
- [ ] Implement `useStockAlerts` hook (currently stubbed in InventoryAlertsScreen.tsx:126-131)
- [ ] Implement `useAcknowledgeAlert` hook (currently stubbed)
- [ ] Implement `useBulkUpdateStock` hook (currently stubbed in BulkOperationsScreen.tsx:173)
- [ ] Create proper service integration for each hook
- [ ] Add React Query with proper cache management

```typescript
// useStockAlerts implementation:
export function useStockAlerts() {
  const { data: { user } } = useAuth();

  return useQuery({
    queryKey: inventoryKeys.alerts(user?.id),
    queryFn: async () => {
      const service = new InventoryService(supabase);
      const alerts = await service.getAlerts(user?.id);

      // Group by severity
      return {
        critical: alerts.filter(a => a.severity === 'critical'),
        warning: alerts.filter(a => a.severity === 'warning'),
        low: alerts.filter(a => a.severity === 'low')
      };
    },
    staleTime: 30 * 1000, // 30 seconds for alerts
    enabled: !!user?.id
  });
}
```

### 6. Implement Atomic Stock Operations
**Violation:** Non-atomic operations risk race conditions
**File:** `src/services/inventory/inventoryService.ts`

#### Tasks:
- [ ] Create database function for atomic stock updates
- [ ] Replace current updateStock implementation
- [ ] Add proper transaction handling
- [ ] Implement optimistic locking

```sql
-- Required database function:
CREATE OR REPLACE FUNCTION update_stock_atomic(
  p_inventory_id UUID,
  p_quantity_change INTEGER,
  p_movement_type TEXT,
  p_reason TEXT,
  p_user_id UUID
) RETURNS inventory_items AS $$
DECLARE
  v_item inventory_items;
BEGIN
  -- Lock row for update
  SELECT * INTO v_item
  FROM inventory_items
  WHERE id = p_inventory_id
  FOR UPDATE;

  -- Update stock atomically
  UPDATE inventory_items
  SET current_stock = current_stock + p_quantity_change,
      updated_at = NOW()
  WHERE id = p_inventory_id
  RETURNING * INTO v_item;

  -- Create movement record
  INSERT INTO stock_movements (/*...*/)
  VALUES (/*...*/);

  RETURN v_item;
END;
$$ LANGUAGE plpgsql;
```

---

## 🟠 Priority 2: Schema & Validation Fixes (Week 2)

### 7. Add Return Type Annotations
**Violation:** Pattern 4 Enhancement violation
**Files:** All schema files

#### Tasks:
- [ ] Add return type annotations to all transform functions
- [ ] Ensure transformations match interface types exactly
- [ ] Add completeness validation tests
- [ ] Document any intentionally undefined fields

```typescript
// Fix transformation:
export const InventoryItemTransformSchema = RawSchema.transform(
  (data): InventoryItem => ({ // Add return type!
    id: data.id,
    productId: data.product_id,
    // ... complete mapping
  })
);
```

### 8. Fix Field Selection in Services
**Violation:** Generic select('*') instead of specific fields
**File:** `src/services/inventory/inventoryService.ts`

#### Tasks:
- [ ] Replace all select('*') with specific field lists
- [ ] Ensure selected fields match schema expectations
- [ ] Add field selection validation
- [ ] Document database field mappings

```typescript
// Replace:
.select('*')
// With:
.select('id, product_id, warehouse_id, current_stock, reserved_stock, minimum_stock, maximum_stock, reorder_point, reorder_quantity, unit_cost, is_active, created_at, updated_at')
```

### 9. Implement ValidationMonitor Comprehensively
**Gap:** Incomplete monitoring integration

#### Tasks:
- [ ] Add ValidationMonitor to all service methods
- [ ] Implement recordCalculationMismatch for stock calculations
- [ ] Add recordPatternSuccess for successful operations
- [ ] Create monitoring dashboard hooks

---

## 🟡 Priority 3: Missing Features (Week 2-3)

### 10. Create Missing Screens
**Gap:** Referenced screens don't exist

#### Tasks:
- [ ] Create `StockManagementScreen.tsx` component
- [ ] Implement stock adjustment UI
- [ ] Add barcode scanning capability
- [ ] Create warehouse selection interface

### 11. Implement Alert Management System
**Gap:** Alert system partially implemented

#### Tasks:
- [ ] Create alert generation service
- [ ] Implement alert acknowledgment flow
- [ ] Add alert notification system
- [ ] Create alert configuration UI

### 12. Implement Stock Movement Service
**Gap:** Movement tracking incomplete

#### Tasks:
- [ ] Create `StockMovementService` class
- [ ] Implement movement history methods
- [ ] Add movement filtering and search
- [ ] Create export functionality

---

## 🟢 Priority 4: Real-time & Advanced Features (Week 3-4)

### 13. Implement Real-time Subscriptions
**Gap:** No WebSocket implementation

#### Tasks:
- [ ] Set up Supabase real-time channels
- [ ] Implement inventory update subscriptions
- [ ] Add alert notification channels
- [ ] Create movement tracking subscriptions

```typescript
// Required implementation:
const inventoryChannel = supabase
  .channel('inventory-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'inventory_items',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    queryClient.invalidateQueries({
      queryKey: inventoryKeys.item(payload.new.id)
    });
  })
  .subscribe();
```

### 14. Add Warehouse Management
**Gap:** No multi-location support

#### Tasks:
- [ ] Create warehouse selection hooks
- [ ] Implement location-based filtering
- [ ] Add transfer between warehouses
- [ ] Create warehouse dashboard

### 15. Implement Reorder Automation
**Gap:** Manual reorder only

#### Tasks:
- [ ] Create automatic reorder detection
- [ ] Implement reorder suggestion system
- [ ] Add purchase order generation
- [ ] Create supplier integration hooks

---

## 📋 Implementation Checklist

### Database Migrations Required
```sql
-- 1. Add user_id column
ALTER TABLE inventory_items
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
CREATE POLICY "user_isolation" ON inventory_items
FOR ALL USING (auth.uid() = user_id);

-- 4. Add indexes
CREATE INDEX idx_inventory_user ON inventory_items(user_id);
CREATE INDEX idx_inventory_low_stock ON inventory_items(current_stock, minimum_stock);

-- 5. Create atomic functions
-- (See function definitions above)
```

### File Creation Required
```
src/
├── schemas/
│   └── __contracts__/
│       └── inventory.contracts.ts (NEW)
├── services/
│   └── inventory/
│       └── stockMovementService.ts (NEW)
├── screens/
│   └── inventory/
│       └── StockManagementScreen.tsx (NEW)
└── hooks/
    └── inventory/
        ├── useStockAlerts.ts (NEW)
        ├── useAcknowledgeAlert.ts (NEW)
        └── useBulkUpdateStock.ts (NEW)
```

### Testing Requirements
- [ ] Unit tests for all new service methods
- [ ] Integration tests for atomic operations
- [ ] Contract validation tests for schemas
- [ ] Real-time subscription tests
- [ ] User isolation security tests

---

## 🎯 Success Metrics

### Week 1 Completion
- ✅ Zero security violations
- ✅ All critical services implemented
- ✅ User data properly isolated
- ✅ Atomic operations in place

### Week 2 Completion
- ✅ All schemas have contract tests
- ✅ ValidationMonitor fully integrated
- ✅ All stubbed hooks functional
- ✅ Field selection optimized

### Week 3 Completion
- ✅ Alert system operational
- ✅ Movement tracking complete
- ✅ Missing screens created
- ✅ Export functionality working

### Week 4 Completion
- ✅ Real-time updates working
- ✅ Warehouse management ready
- ✅ Reorder automation functional
- ✅ 100% architectural compliance

---

## 🚀 Rollout Strategy

### Phase 1: Security First (Immediate)
1. Deploy user isolation fixes
2. Enable RLS policies
3. Implement atomic operations
4. Add authentication checks

### Phase 2: Core Functionality (Week 1-2)
1. Implement missing services
2. Fix stubbed hooks
3. Add contract tests
4. Complete ValidationMonitor

### Phase 3: Feature Completion (Week 2-3)
1. Create missing screens
2. Implement alert system
3. Add movement tracking
4. Build export features

### Phase 4: Advanced Features (Week 3-4)
1. Deploy real-time subscriptions
2. Add warehouse management
3. Implement automation
4. Performance optimization

---

## ⚠️ Risk Mitigation

### Rollback Plan
- Feature flags for each phase
- Database migration rollback scripts
- Git tags at stable points
- Monitoring alerts for regressions

### Testing Strategy
- Unit tests before deployment
- Integration tests for critical paths
- Security penetration testing
- Load testing for real-time features

---

## 📊 Tracking Progress

Use this checklist to track implementation:

### Critical Violations Fixed
- [ ] User data isolation implemented
- [ ] Schema contracts added
- [ ] Query keys include userId
- [ ] Atomic operations deployed

### Core Services Implemented
- [ ] getLowStockItems()
- [ ] getRecentMovements()
- [ ] getAlerts()
- [ ] Stock movement service

### Hooks Implemented
- [ ] useStockAlerts
- [ ] useAcknowledgeAlert
- [ ] useBulkUpdateStock
- [ ] Movement history hooks

### Features Completed
- [ ] Stock management screen
- [ ] Alert management system
- [ ] Real-time subscriptions
- [ ] Warehouse management

---

## Conclusion

This remediation plan addresses all identified gaps in the inventory feature while ensuring full compliance with architectural patterns. The prioritized approach focuses on security and data integrity first, followed by core functionality and advanced features.

**Estimated Timeline:** 4 weeks for full implementation
**Critical Path:** Week 1 security fixes are blocking - must be completed first
**Dependencies:** Database migrations must be deployed before service changes