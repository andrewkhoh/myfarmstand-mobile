# Architecture Compliance Implementation Roadmap

## Overview
This roadmap provides a detailed, actionable plan to address the critical violations identified in the architecture compliance audit. The implementation is structured in phases to minimize risk while delivering incremental improvements.

## Priority Classification

### 🔴 P0: Critical Security & Data Integrity (Week 1)
Must be fixed immediately to prevent data corruption and security breaches.

### 🟠 P1: Type Safety & Contracts (Week 2)
Essential for maintaining code quality and preventing runtime errors.

### 🟡 P2: Production Readiness (Week 3)
Required before any production deployment.

### 🟢 P3: Observability & Performance (Week 4)
Important for long-term maintainability and monitoring.

---

# Phase 1: Critical Security Fixes (Week 1)

## 1.1 Fix User Data Isolation in Inventory

### Files to Modify
- `src/services/inventory/inventoryService.ts`
- `src/hooks/inventory/useInventoryItems.ts`
- `src/hooks/inventory/useInventoryDashboard.ts`

### Implementation Steps

```typescript
// src/services/inventory/inventoryService.ts
// Line 70: Add ownership validation
async getInventoryItems(userId: string, filters?: any): Promise<InventoryItem[]> {
  if (!userId) {
    throw new Error('User authentication required');
  }

  let query = this.supabase
    .from('inventory_items')
    .select(`
      *,
      product:product_id(*),
      warehouse:warehouse_id(*)
    `)
    .eq('user_id', userId); // ADD: User isolation

  // Add RLS policy check
  const { data: userRole } = await this.supabase
    .rpc('get_user_role', { user_id: userId });

  if (!userRole || !['admin', 'inventory_manager', 'owner'].includes(userRole)) {
    throw new Error('Insufficient permissions for inventory access');
  }

  // Apply filters...
}
```

### Database Migration Required
```sql
-- Add user_id column to inventory_items if missing
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create policy for user isolation
CREATE POLICY "Users can only see their own inventory"
ON inventory_items
FOR ALL
USING (auth.uid() = user_id OR
       EXISTS (
         SELECT 1 FROM user_roles
         WHERE user_id = auth.uid()
         AND role IN ('admin', 'super_admin')
       ));
```

## 1.2 Implement Atomic Stock Operations

### Files to Modify
- `src/services/inventory/inventoryService.ts`

### Implementation Steps

```typescript
// src/services/inventory/inventoryService.ts
// Lines 210-245: Replace with atomic operation
async updateStock(
  inventoryId: string,
  stockUpdate: StockUpdate
): Promise<InventoryItem> {
  // Use database function for atomic update
  const { data, error } = await this.supabase
    .rpc('update_stock_atomic', {
      p_inventory_id: inventoryId,
      p_quantity_change: stockUpdate.quantityChange,
      p_movement_type: stockUpdate.movementType,
      p_reason: stockUpdate.reason,
      p_user_id: stockUpdate.userId
    });

  if (error) {
    ValidationMonitor.recordValidationError('stock-update', error);
    throw error;
  }

  // Validate and return
  const validated = InventoryItemTransformSchema.parse(data);
  ValidationMonitor.recordPatternSuccess('stock-update');
  return validated;
}
```

### Database Function
```sql
CREATE OR REPLACE FUNCTION update_stock_atomic(
  p_inventory_id UUID,
  p_quantity_change INTEGER,
  p_movement_type TEXT,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS inventory_items AS $$
DECLARE
  v_item inventory_items;
BEGIN
  -- Lock the row for update
  SELECT * INTO v_item
  FROM inventory_items
  WHERE id = p_inventory_id
  FOR UPDATE;

  -- Update stock
  UPDATE inventory_items
  SET
    current_stock = current_stock + p_quantity_change,
    updated_at = NOW()
  WHERE id = p_inventory_id
  RETURNING * INTO v_item;

  -- Create movement record
  INSERT INTO stock_movements (
    inventory_item_id,
    movement_type,
    quantity_change,
    new_stock,
    reason,
    performed_by
  ) VALUES (
    p_inventory_id,
    p_movement_type,
    p_quantity_change,
    v_item.current_stock,
    p_reason,
    p_user_id
  );

  -- Check for alerts
  IF v_item.current_stock <= v_item.minimum_stock THEN
    INSERT INTO inventory_alerts (
      inventory_item_id,
      alert_type,
      severity,
      message
    ) VALUES (
      p_inventory_id,
      'LOW_STOCK',
      CASE
        WHEN v_item.current_stock = 0 THEN 'CRITICAL'
        WHEN v_item.current_stock < v_item.minimum_stock / 2 THEN 'HIGH'
        ELSE 'MEDIUM'
      END,
      'Stock level below minimum threshold'
    );
  END IF;

  RETURN v_item;
END;
$$ LANGUAGE plpgsql;
```

## 1.3 Fix Executive Service Permissions

### Files to Modify
- `src/services/executive/businessIntelligenceService.ts`
- `src/services/executive/simpleBusinessMetricsService.ts`

### Implementation Steps

```typescript
// Standardize permission checking across all executive services
// src/services/executive/baseExecutiveService.ts (NEW FILE)
export abstract class BaseExecutiveService {
  protected async checkPermissions(
    userId: string,
    requiredPermission: string
  ): Promise<void> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const hasPermission = await RolePermissionService.hasPermission(
      userId,
      requiredPermission
    );

    if (!hasPermission) {
      ValidationMonitor.recordValidationError(
        'permission-check',
        new Error(`Missing permission: ${requiredPermission}`)
      );
      throw new Error('Insufficient permissions');
    }

    ValidationMonitor.recordPatternSuccess('permission-check');
  }
}
```

---

# Phase 2: Type Safety Implementation (Week 2)

## 2.1 Add Schema Contract Tests

### Files to Create
- `src/schemas/__contracts__/inventory.contracts.ts`
- `src/schemas/__contracts__/marketing.contracts.ts`
- `src/schemas/__contracts__/executive.contracts.ts`

### Implementation Example

```typescript
// src/schemas/__contracts__/inventory.contracts.ts
import { z } from 'zod';
import type { InventoryItem, StockMovement } from '@/types/inventory';
import {
  InventoryItemSchema,
  StockMovementSchema
} from '../inventory';

// Type-level contract enforcement
type AssertExact<T, U> = T extends U ? (U extends T ? true : false) : false;

// Contract tests that run at compile time
type InventoryItemContract = AssertExact<
  z.infer<typeof InventoryItemSchema>,
  InventoryItem
>;

type StockMovementContract = AssertExact<
  z.infer<typeof StockMovementSchema>,
  StockMovement
>;

// Compile-time assertions
const _inventoryItemContract: InventoryItemContract = true;
const _stockMovementContract: StockMovementContract = true;

// Runtime validation tests
export const contractTests = {
  inventoryItem: () => {
    const sample: InventoryItem = {
      id: 'test-id',
      productId: 'product-id',
      warehouseId: 'warehouse-id',
      currentStock: 100,
      reservedStock: 10,
      minimumStock: 20,
      maximumStock: 500,
      unitPrice: 29.99,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // This will fail at compile time if types don't match
    const validated = InventoryItemSchema.parse(sample);
    return validated;
  }
};
```

## 2.2 Add Return Type Annotations

### Files to Modify
- All schema files with `.transform()` methods

### Implementation Pattern

```typescript
// Before (violation)
export const InventoryItemTransformSchema = RawSchema.transform((data) => ({
  id: data.id,
  // ...
}));

// After (compliant)
export const InventoryItemTransformSchema = RawSchema.transform(
  (data): InventoryItem => ({
    id: data.id,
    productId: data.product_id,
    warehouseId: data.warehouse_id,
    currentStock: data.current_stock,
    reservedStock: data.reserved_stock,
    minimumStock: data.minimum_stock,
    maximumStock: data.maximum_stock,
    unitPrice: parseFloat(data.unit_price),
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  })
);
```

## 2.3 Setup Pre-commit Hooks

### Files to Create/Modify
- `.husky/pre-commit`
- `package.json`

### Implementation

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Type checking
npm run typecheck

# Schema contract validation
npm run validate:contracts

# Lint
npm run lint

# Run tests for changed files
npm run test:changed
```

```json
// package.json additions
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "validate:contracts": "tsx scripts/validate-contracts.ts",
    "test:changed": "jest -o --passWithNoTests",
    "prepare": "husky install"
  }
}
```

---

# Phase 3: Production Readiness (Week 3)

## 3.1 Replace Mock Services

### Priority Order
1. **Marketing Services** (Most critical - 100% mock)
2. **Executive Mock Services** (Mixed implementation)
3. **Inventory Stubbed Hooks** (Partially implemented)

### Marketing Service Implementation

```typescript
// src/services/marketing/marketingCampaignService.ts
// Replace entire mock implementation
export class MarketingCampaignService {
  constructor(private supabase: SupabaseClient) {}

  async getCampaigns(
    userId: string,
    filters?: CampaignFilters
  ): Promise<MarketingCampaign[]> {
    // Check permissions
    await this.checkPermissions(userId, 'marketing_read');

    // Build query
    let query = this.supabase
      .from('marketing_campaigns')
      .select(`
        *,
        analytics:campaign_analytics(*),
        segments:campaign_segments(*)
      `)
      .eq('user_id', userId);

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    // Execute and validate
    const { data, error } = await query;

    if (error) {
      ValidationMonitor.recordValidationError('campaign-fetch', error);
      throw error;
    }

    // Transform and validate each item
    const campaigns = await Promise.all(
      (data || []).map(item =>
        MarketingCampaignTransformSchema.parseAsync(item)
      )
    );

    ValidationMonitor.recordPatternSuccess('campaign-fetch');
    return campaigns;
  }
}
```

## 3.2 Unify Query Key Systems

### Files to Modify
- `src/hooks/queryKeys.ts` (Create centralized file)
- All hook files using local query keys

### Implementation

```typescript
// src/hooks/queryKeys.ts
export const queryKeys = {
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (userId: string, filters?: any) =>
      [...queryKeys.inventory.lists(), userId, filters] as const,
    item: (id: string) =>
      [...queryKeys.inventory.all, 'item', id] as const,
    dashboard: (userId: string) =>
      [...queryKeys.inventory.all, 'dashboard', userId] as const,
  },

  marketing: {
    all: ['marketing'] as const,
    campaigns: {
      all: ['marketing', 'campaigns'] as const,
      list: (userId: string, filters?: any) =>
        [...queryKeys.marketing.campaigns.all, userId, filters] as const,
      item: (id: string) =>
        [...queryKeys.marketing.campaigns.all, id] as const,
      active: (userId: string) =>
        [...queryKeys.marketing.campaigns.all, 'active', userId] as const,
    },
    analytics: {
      all: ['marketing', 'analytics'] as const,
      dashboard: (userId: string) =>
        [...queryKeys.marketing.analytics.all, 'dashboard', userId] as const,
    }
  },

  executive: {
    all: ['executive'] as const,
    metrics: (userId: string) =>
      [...queryKeys.executive.all, 'metrics', userId] as const,
    intelligence: (userId: string, options?: any) =>
      [...queryKeys.executive.all, 'intelligence', userId, options] as const,
  }
} as const;
```

## 3.3 Database Migration Scripts

### Create migration files
- `supabase/migrations/001_add_user_isolation.sql`
- `supabase/migrations/002_add_atomic_functions.sql`
- `supabase/migrations/003_add_marketing_tables.sql`

---

# Phase 4: Monitoring & Observability (Week 4)

## 4.1 Complete ValidationMonitor Integration

### Implementation Pattern

```typescript
// Standardized monitoring wrapper
export function withMonitoring<T extends (...args: any[]) => any>(
  operationName: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);

      ValidationMonitor.recordPatternSuccess(operationName);
      ValidationMonitor.recordPerformance(operationName, {
        duration: Date.now() - startTime,
        success: true
      });

      return result;
    } catch (error) {
      ValidationMonitor.recordValidationError(operationName, error);
      ValidationMonitor.recordPerformance(operationName, {
        duration: Date.now() - startTime,
        success: false
      });

      throw error;
    }
  }) as T;
}
```

## 4.2 Add Calculation Validation

### Implementation for Financial Calculations

```typescript
// src/services/executive/calculationValidator.ts
export class CalculationValidator {
  static validateRevenue(
    items: Array<{ quantity: number; price: number }>,
    expectedTotal: number
  ): void {
    const calculated = items.reduce(
      (sum, item) => sum + (item.quantity * item.price),
      0
    );

    const difference = Math.abs(calculated - expectedTotal);

    if (difference > 0.01) { // Floating point tolerance
      ValidationMonitor.recordCalculationMismatch('revenue', {
        expected: expectedTotal,
        calculated,
        difference,
        items
      });

      throw new Error(
        `Revenue calculation mismatch: expected ${expectedTotal}, got ${calculated}`
      );
    }
  }
}
```

## 4.3 Implement Graceful Degradation

### Pattern for All Features

```typescript
// src/hooks/useGracefulQuery.ts
export function useGracefulQuery<T>(
  key: readonly unknown[],
  fn: () => Promise<T>,
  fallback: T,
  options?: UseQueryOptions<T>
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await fn();
      } catch (error) {
        // Log error but don't throw
        console.error(`Query failed for ${key[0]}:`, error);
        ValidationMonitor.recordValidationError(String(key[0]), error);

        // Return fallback data
        return fallback;
      }
    },
    ...options,
    // Always show something to the user
    placeholderData: fallback,
  });
}
```

---

# Testing Strategy

## Unit Tests for Contract Compliance

```typescript
// src/schemas/__tests__/contracts.test.ts
describe('Schema Contract Compliance', () => {
  test('Inventory schemas match TypeScript interfaces', () => {
    const sample = createMockInventoryItem();
    const validated = InventoryItemSchema.parse(sample);

    // Type assertion will fail if contract broken
    const typed: InventoryItem = validated;
    expect(typed).toEqual(sample);
  });

  test('Transform functions have return types', () => {
    // This test ensures transforms are typed
    const transform = InventoryItemTransformSchema;
    const output = transform.parse(mockRawData);

    // TypeScript will enforce return type
    const typed: InventoryItem = output;
    expect(typed.id).toBeDefined();
  });
});
```

## Integration Tests for Atomic Operations

```typescript
// src/services/__tests__/atomicOperations.test.ts
describe('Atomic Stock Operations', () => {
  test('concurrent updates maintain consistency', async () => {
    const itemId = 'test-item';
    const initialStock = 100;

    // Setup
    await createTestItem(itemId, { current_stock: initialStock });

    // Concurrent updates
    const updates = Array.from({ length: 10 }, (_, i) =>
      inventoryService.updateStock(itemId, {
        quantityChange: -1,
        movementType: 'sale',
        reason: `Order ${i}`,
        userId: 'test-user'
      })
    );

    await Promise.all(updates);

    // Verify
    const final = await inventoryService.getInventoryItem(itemId);
    expect(final.currentStock).toBe(90); // Should be exactly 90

    // Check movement history
    const movements = await getMovements(itemId);
    expect(movements).toHaveLength(10);
  });
});
```

---

# Rollout Plan

## Week 1: Security Sprint
- Monday: User isolation implementation
- Tuesday: Database migrations and RLS policies
- Wednesday: Atomic operations implementation
- Thursday: Permission standardization
- Friday: Security testing and validation

## Week 2: Type Safety Sprint
- Monday: Schema contract setup
- Tuesday: Transform return types
- Wednesday: Contract test implementation
- Thursday: Pre-commit hook setup
- Friday: Type safety validation

## Week 3: Production Sprint
- Monday-Tuesday: Replace marketing mock services
- Wednesday: Fix executive service gaps
- Thursday: Unify query key systems
- Friday: Integration testing

## Week 4: Polish Sprint
- Monday: ValidationMonitor completion
- Tuesday: Calculation validation
- Wednesday: Graceful degradation
- Thursday: Performance optimization
- Friday: Final testing and documentation

---

# Success Metrics

## Technical Metrics
- 0 critical security violations
- 100% schema contract coverage
- 0 mock services in production code
- <100ms p95 query response time
- 100% atomic operation compliance

## Quality Metrics
- 0 TypeScript errors
- 90%+ test coverage
- 0 unhandled promise rejections
- <1% error rate in production
- 100% ValidationMonitor integration

## Business Metrics
- 0 data inconsistencies
- 0 unauthorized data access
- 50% reduction in bug reports
- 90% uptime for all features
- <2s page load time

---

# Risk Mitigation

## Rollback Strategy
1. Feature flags for each phase
2. Database migration rollback scripts
3. Git tags for each stable version
4. Monitoring alerts for regressions

## Testing Requirements
1. Unit tests for all new code
2. Integration tests for critical paths
3. Load testing for atomic operations
4. Security penetration testing
5. User acceptance testing

## Communication Plan
1. Daily standup updates
2. Phase completion announcements
3. Breaking change notifications
4. Documentation updates
5. Stakeholder demos

---

# Appendix: Quick Reference

## Critical Files to Review
```
src/services/inventory/inventoryService.ts
src/hooks/inventory/useInventoryItems.ts
src/schemas/inventory.ts
src/services/marketing/*.ts (all need replacement)
src/services/executive/simpleBusinessMetricsService.ts
src/hooks/queryKeys.ts (to be created)
```

## Database Changes Required
```sql
-- User isolation
ALTER TABLE inventory_items ADD COLUMN user_id UUID;
ALTER TABLE marketing_campaigns ADD COLUMN user_id UUID;
ALTER TABLE business_insights ADD COLUMN user_id UUID;

-- Enable RLS on all tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_insights ENABLE ROW LEVEL SECURITY;
```

## Monitoring Events to Track
```typescript
ValidationMonitor.recordValidationError(operation, error);
ValidationMonitor.recordPatternSuccess(operation);
ValidationMonitor.recordCalculationMismatch(operation, details);
ValidationMonitor.recordPerformance(operation, metrics);
```

This roadmap provides a systematic approach to achieving full architectural compliance while minimizing risk and ensuring continuous delivery of value.