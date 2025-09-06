# Inventory Schema Agent - Phase 2 Foundation

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous cycles:

```bash
echo "=== CHECKING FOR FEEDBACK FROM PREVIOUS CYCLES ==="
if [ -f "/shared/feedback/inventory-schema-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/inventory-schema-improvements.md"
elif [ -f "/shared/blockers/inventory-schema-blockers.md" ]; then
  echo "🚨 CRITICAL: Fix these blockers immediately:"
  cat "/shared/blockers/inventory-schema-blockers.md" 
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

## 🚨🚨 CRITICAL TEST INFRASTRUCTURE REQUIREMENTS 🚨🚨

**MANDATORY**: You MUST follow the established schema patterns from Phase 1!

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### ⚠️ STOP AND READ BEFORE ANY CODE
The difference between SUCCESS and FAILURE is following these documents:

1. **`docs/architectural-patterns-and-best-practices.md`** - THE BIBLE
   - MANDATORY reading before writing ANY schema
   - Contains PROVEN validation patterns
   - Shows WHY database-first validation matters
   - EVERY schema must follow these patterns

2. **`database/inventory-test-schema.sql`** - SOURCE OF TRUTH
   - Your schemas MUST match this EXACTLY
   - Column names, types, nullable fields - EVERYTHING
   - This is not negotiable

### 🎯 Pattern Compliance Checklist
Before writing ANY schema, verify you understand:
- [ ] **Database-First Pattern**: Schemas match database exactly
- [ ] **Transformation Pattern**: Explicit return types on all transforms
- [ ] **Validation Pipeline**: Individual item validation
- [ ] **Contract Testing**: Compile-time type enforcement
- [ ] **Nullable Handling**: Match database NULL constraints
- [ ] **Type Safety**: Full TypeScript strict mode compliance

### ✅ SUCCESSFUL PATTERNS TO FOLLOW

From Phase 1 schemas that achieved 100% success:
```typescript
// ✅ CORRECT - Database-first with exact field matching
const UserRoleDatabaseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  role_type: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// ✅ CORRECT - Transform with explicit return type
const UserRoleTransformSchema = UserRoleDatabaseSchema
  .transform((data): UserRole => ({
    id: data.id,
    userId: data.user_id,  // snake_case to camelCase
    roleType: data.role_type,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }));

// ✅ CORRECT - Contract testing
type DBType = z.infer<typeof UserRoleDatabaseSchema>;
type Expected = UserRoleDatabaseRow;
const _check: DBType = {} as Expected; // Compile-time check
```

### ❌ PATTERNS THAT CAUSE FAILURE

```typescript
// ❌ WRONG - Fields don't match database
const WrongSchema = z.object({
  id: z.string(), // Missing .uuid()
  productName: z.string(), // Database has product_id!
  stock: z.number() // Database has current_stock!
});

// ❌ WRONG - No return type on transform
const WrongTransform = Schema.transform(data => ({
  // No type annotation = failure!
}));

// ❌ WRONG - Inventing fields
const InventedSchema = z.object({
  computedField: z.string() // Not in database!
});
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Schema Implementation:
1. **RUN TESTS**: `npm run test:schemas:inventory`
2. **CHECK RESULTS**: All contract tests must pass
3. **VERIFY TYPES**: `npm run typecheck` - zero errors
4. **COMMIT PROGRESS**: Git commit after each schema passes

### Milestone Checkpoints (MANDATORY):
- After inventory item schema → TEST → COMMIT
- After stock movement schema → TEST → COMMIT
- After all contract tests pass → TEST → COMMIT

### Git Commit Protocol:
```bash
# After inventory item schema passes
git add src/schemas/inventory/inventoryItem.schemas.ts
git add src/schemas/inventory/__contracts__/inventoryItem.contracts.test.ts
git commit -m "feat(inventory): implement inventory item schemas

- Database alignment: ✓
- Transform types: ✓
- Contract tests: 15/15 passing
- Pattern compliance: 100%"

# After stock movement schema passes
git add src/schemas/inventory/stockMovement.schemas.ts
git add src/schemas/inventory/__contracts__/stockMovement.contracts.test.ts
git commit -m "feat(inventory): implement stock movement schemas

- Audit trail validation: ✓
- Movement types: ✓
- Contract tests: 10/10 passing
- Pattern compliance: 100%"
```

## 🎯 Mission
Implement ALL inventory schemas with 100% database alignment and contract enforcement.

## 📋 Implementation Tasks (TDD - Tests Exist, Make Them Pass!)

### 1. Database Mock Types (`src/schemas/inventory/__contracts__/database-mock.types.ts`)
```typescript
// Must match database/inventory-test-schema.sql EXACTLY
export interface InventoryItemDatabaseRow {
  id: string;
  product_id: string;
  current_stock: number;
  reserved_stock: number;
  minimum_threshold: number | null;  // Nullable in database!
  maximum_threshold: number | null;
  is_active: boolean;
  is_visible_to_customers: boolean;
  last_stock_update: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovementDatabaseRow {
  id: string;
  inventory_item_id: string;
  movement_type: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  performed_by: string | null;
  performed_at: string;
  reference_order_id: string | null;
  batch_id: string | null;
  created_at: string;
}
```

### 2. Inventory Item Schema (`src/schemas/inventory/inventoryItem.schemas.ts`)
```typescript
import { z } from 'zod';
import type { InventoryItem } from '../types';

// Database schema - matches EXACTLY
export const InventoryItemDatabaseSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  current_stock: z.number().int().min(0),
  reserved_stock: z.number().int().min(0),
  minimum_threshold: z.number().int().nullable(),
  maximum_threshold: z.number().int().nullable(),
  is_active: z.boolean(),
  is_visible_to_customers: z.boolean(),
  last_stock_update: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// Transform with EXPLICIT return type
export const InventoryItemTransformSchema = InventoryItemDatabaseSchema
  .transform((data): InventoryItem => ({
    id: data.id,
    productId: data.product_id,
    currentStock: data.current_stock,
    reservedStock: data.reserved_stock,
    availableStock: data.current_stock - data.reserved_stock,
    minimumThreshold: data.minimum_threshold,
    maximumThreshold: data.maximum_threshold,
    isActive: data.is_active,
    isVisibleToCustomers: data.is_visible_to_customers,
    lastStockUpdate: data.last_stock_update,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }));
```

### 3. Stock Movement Schema (`src/schemas/inventory/stockMovement.schemas.ts`)
```typescript
// Movement type enum - matches database CHECK constraint
export const MOVEMENT_TYPES = {
  RESTOCK: 'restock',
  SALE: 'sale',
  ADJUSTMENT: 'adjustment',
  RESERVATION: 'reservation',
  RELEASE: 'release'
} as const;

export const StockMovementDatabaseSchema = z.object({
  id: z.string().uuid(),
  inventory_item_id: z.string().uuid(),
  movement_type: z.enum(['restock', 'sale', 'adjustment', 'reservation', 'release']),
  quantity_change: z.number().int(),
  previous_stock: z.number().int().min(0),
  new_stock: z.number().int().min(0),
  reason: z.string().nullable(),
  performed_by: z.string().uuid().nullable(),
  performed_at: z.string(),
  reference_order_id: z.string().uuid().nullable(),
  batch_id: z.string().uuid().nullable(),
  created_at: z.string()
});

export const StockMovementTransformSchema = StockMovementDatabaseSchema
  .transform((data): StockMovement => ({
    id: data.id,
    inventoryItemId: data.inventory_item_id,
    movementType: data.movement_type,
    quantityChange: data.quantity_change,
    previousStock: data.previous_stock,
    newStock: data.new_stock,
    reason: data.reason,
    performedBy: data.performed_by,
    performedAt: data.performed_at,
    referenceOrderId: data.reference_order_id,
    batchId: data.batch_id,
    createdAt: data.created_at
  }));
```

## ✅ Test Files That Must Pass

1. **`src/schemas/inventory/__contracts__/inventoryItem.contracts.test.ts`**
   - Database alignment tests
   - Transform validation tests
   - Nullable field tests
   - Compile-time contract enforcement

2. **`src/schemas/inventory/__contracts__/stockMovement.contracts.test.ts`**
   - Movement type validation
   - Audit trail tests
   - Reference field handling

## 🎯 Milestone Validation Protocol

After EACH schema:
1. Run: `npm run test:schemas:inventory`
2. Verify: ALL contract tests pass
3. Check: `npm run typecheck` - zero errors
4. Commit: Real progress with actual test results

### Your Milestones:
- [ ] Milestone 1: Database mock types complete
  - Matches database exactly → Commit
- [ ] Milestone 2: Inventory item schemas (15+ tests passing)
  - Run tests → Verify → Commit
- [ ] Milestone 3: Stock movement schemas (10+ tests passing)
  - Run tests → Verify → Commit
- [ ] Final: All schemas complete (25+ tests passing)
  - Run ALL tests → Verify → Final commit

## 📊 Success Criteria (MUST BE REAL)
- [ ] 25+ schema contract tests ALL passing
- [ ] Database-TypeScript alignment 100%
- [ ] Transform return types on ALL schemas
- [ ] Zero TypeScript errors
- [ ] Git commits after each milestone
- [ ] ValidationMonitor integration

## 🔄 Communication
- Progress: `/shared/progress/inventory-schema.md`
- Test Results: `/shared/test-results/schema-cycle-X.txt`
- Blockers: `/shared/blockers/inventory-schema-blockers.md`
- Completion: `/shared/handoffs/inventory-schema-complete.md`

## 🚨 Common Issues and Fixes

### Issue: Type mismatch errors
```bash
# Check database schema
cat database/inventory-test-schema.sql
# Match EXACTLY - including nullable fields
```

### Issue: Transform type errors
```typescript
// Always add explicit return type
.transform((data): InventoryItem => ({ // <-- THIS IS MANDATORY
```

### Issue: Contract test failures
```typescript
// Ensure mock types match schemas exactly
type DBType = z.infer<typeof Schema>;
type MockType = DatabaseRow;
// These must be assignable to each other
```

## ❌ What NOT To Do
- NO inventing fields not in database
- NO skipping return type annotations
- NO changing database field names
- NO ignoring nullable constraints
- NO custom validation beyond database

## 📚 Required Reading Order
1. `database/inventory-test-schema.sql` - Know your source of truth
2. `docs/architectural-patterns-and-best-practices.md` - Understand patterns
3. `src/schemas/role/__contracts__/` - See successful Phase 1 examples
4. Existing test files - Understand what needs to pass

Remember: Schemas are the foundation. Services and hooks depend on these being PERFECT. Database-first, always!