# Inventory Services Agent - Phase 2 Service Layer

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback and handoffs:

```bash
echo "=== CHECKING FOR HANDOFFS AND FEEDBACK ==="
# Check if schema agent completed
if [ -f "/shared/handoffs/inventory-schema-complete.md" ]; then
  echo "✅ Schema layer ready - proceeding with services"
  cat "/shared/handoffs/inventory-schema-complete.md"
else
  echo "⚠️ WARNING: Schema layer not complete - may have issues"
fi

# Check for feedback
if [ -f "/shared/feedback/inventory-services-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/inventory-services-improvements.md"
fi
```

## 🚨🚨 CRITICAL: SimplifiedSupabaseMock Pattern ONLY 🚨🚨

**THIS IS THE #1 CAUSE OF FAILURE** - Using wrong mock patterns!

### ✅ THE ONLY ACCEPTABLE PATTERN
```typescript
// THIS IS THE ONLY WAY - PERIOD
import { SimplifiedSupabaseMock } from '../test/serviceSetup';

describe('InventoryService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: InventoryService;
  
  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
    service = new InventoryService(mockSupabase.client);
  });
});
```

### ❌ FORBIDDEN PATTERNS - AUTOMATIC FAILURE
```typescript
// ❌ NEVER DO THIS - Causes 42% failure rate
jest.mock('@supabase/supabase-js');

// ❌ NEVER DO THIS - Manual mocks fail
const mockSupabase = { from: jest.fn() };

// ❌ NEVER DO THIS - Direct jest.fn() chains
supabase.from = jest.fn().mockReturnValue({...});
```

## 📚 ARCHITECTURAL PATTERNS - MANDATORY COMPLIANCE

### Required Reading BEFORE ANY CODE:
1. **`docs/architectural-patterns-and-best-practices.md`** - Service patterns section
2. **`src/test/serviceSetup.ts`** - SimplifiedSupabaseMock implementation
3. **`src/services/__tests__/cartService.test.ts`** - Perfect example (100% success)

### Service Layer Patterns You MUST Follow:
```typescript
// ✅ CORRECT - Direct Supabase with validation
export class InventoryService {
  constructor(private supabase: SupabaseClient) {}
  
  async getInventoryItem(id: string): Promise<InventoryItem> {
    // Direct query - no abstraction
    const { data, error } = await this.supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      ValidationMonitor.recordValidationError('inventory', error);
      throw error;
    }
    
    // Validate with schema
    const validated = InventoryItemTransformSchema.parse(data);
    ValidationMonitor.recordPatternSuccess('inventory-fetch');
    return validated;
  }
  
  async batchUpdateStock(updates: StockUpdate[]): Promise<BatchResult> {
    const results = [];
    
    // Resilient processing - skip on error
    for (const update of updates) {
      try {
        const result = await this.updateSingleStock(update);
        results.push({ success: true, data: result });
      } catch (error) {
        // Skip failed items, continue processing
        results.push({ success: false, error });
        ValidationMonitor.recordValidationError('batch-update', error);
      }
    }
    
    return results;
  }
}
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Service Implementation:
1. **RUN TESTS**: `npm run test:services:inventory`
2. **CHECK PASS RATE**: Must be ≥85%
3. **FIX REGRESSIONS**: If any test fails that was passing
4. **COMMIT**: Real progress with actual numbers

### Git Commit Protocol:
```bash
# After inventory service tests pass
git add src/services/inventory/inventoryService.ts
git add src/services/inventory/__tests__/inventoryService.test.ts
git commit -m "feat(inventory): implement inventory service with validation

- Tests: 20/20 passing
- SimplifiedSupabaseMock: ✓
- ValidationMonitor: ✓
- Pattern compliance: 100%"

# After stock movement service
git commit -m "feat(inventory): implement stock movement service

- Tests: 15/15 passing  
- Audit trail: ✓
- Batch operations: ✓
- Pattern compliance: 100%"
```

## 🎯 Mission
Implement inventory and stock movement services with ≥85% test coverage using ONLY SimplifiedSupabaseMock.

## 📋 Implementation Tasks (TDD - Write Tests First!)

### 1. Inventory Service Tests (`src/services/inventory/__tests__/inventoryService.test.ts`)
Write 20+ tests FIRST:
```typescript
import { SimplifiedSupabaseMock } from '../../test/serviceSetup';
import { InventoryService } from '../inventoryService';
import { ValidationMonitor } from 'utils/validationMonitor';

describe('InventoryService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: InventoryService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = new SimplifiedSupabaseMock();
    service = new InventoryService(mockSupabase.client);
  });
  
  describe('getInventoryItem', () => {
    it('should fetch and transform inventory item', async () => {
      const mockData = {
        id: 'uuid-123',
        product_id: 'prod-456',
        current_stock: 100,
        reserved_stock: 10,
        // ... all database fields
      };
      
      mockSupabase.from('inventory_items').select().eq().single()
        .mockResolvedValue({ data: mockData, error: null });
      
      const result = await service.getInventoryItem('uuid-123');
      
      expect(result.productId).toBe('prod-456'); // Transformed
      expect(result.availableStock).toBe(90); // Computed
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', async () => {
      mockSupabase.from('inventory_items').select().eq().single()
        .mockResolvedValue({ data: null, error: new Error('Not found') });
      
      await expect(service.getInventoryItem('bad-id'))
        .rejects.toThrow('Not found');
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });
  
  describe('updateStock', () => {
    // Test atomic updates with audit trail
    // Test role permission checks
    // Test validation
  });
  
  describe('batchUpdateStock', () => {
    // Test resilient processing
    // Test partial failures
    // Test progress tracking
  });
});
```

### 2. Inventory Service Implementation (`src/services/inventory/inventoryService.ts`)
ONLY after tests are written:
```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  InventoryItemTransformSchema,
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema 
} from 'schemas/inventory';
import { ValidationMonitor } from 'utils/validationMonitor';
import { RolePermissionService } from '../rolePermissionService';

export class InventoryService {
  private roleService: RolePermissionService;
  
  constructor(private supabase: SupabaseClient) {
    this.roleService = new RolePermissionService(supabase);
  }
  
  async getInventoryItems(userId: string): Promise<InventoryItem[]> {
    // Check permissions
    const hasAccess = await this.roleService.hasPermission(
      userId, 
      'inventory:read'
    );
    
    if (!hasAccess) {
      throw new Error('Unauthorized: No inventory read access');
    }
    
    // Direct Supabase query
    const { data, error } = await this.supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      ValidationMonitor.recordValidationError('inventory-list', error);
      throw error;
    }
    
    // Individual validation with skip-on-error
    const results = [];
    for (const item of data || []) {
      try {
        const validated = InventoryItemTransformSchema.parse(item);
        results.push(validated);
      } catch (err) {
        // Skip invalid items
        ValidationMonitor.recordValidationError('inventory-item', err);
      }
    }
    
    ValidationMonitor.recordPatternSuccess('inventory-list');
    return results;
  }
  
  // Implement remaining methods following patterns...
}
```

### 3. Stock Movement Service Tests (15+ tests)
```typescript
describe('StockMovementService', () => {
  // Use SimplifiedSupabaseMock
  // Test audit trail creation
  // Test movement validation
  // Test batch movements
});
```

## ✅ Test Coverage Requirements
- `inventoryService.test.ts`: 20+ tests
- `stockMovementService.test.ts`: 15+ tests
- Overall pass rate: ≥85%
- ALL using SimplifiedSupabaseMock

## 🎯 Milestone Validation Protocol

### Your Milestones:
- [ ] Milestone 1: Inventory service tests written (20+ tests)
  - All using SimplifiedSupabaseMock → Commit
- [ ] Milestone 2: Inventory service passing (≥85%)
  - Run tests → Verify → Commit
- [ ] Milestone 3: Stock movement tests written (15+ tests)
  - All using correct patterns → Commit
- [ ] Milestone 4: Stock movement passing (≥85%)
  - Run tests → Verify → Commit
- [ ] Final: All services complete (35+ tests, ≥85%)
  - Final validation → Commit

## 📊 Success Criteria (MUST BE REAL)
- [ ] 35+ tests ALL using SimplifiedSupabaseMock
- [ ] Test pass rate ≥85% (actual, not aspirational)
- [ ] ValidationMonitor integrated throughout
- [ ] Role permissions enforced
- [ ] Resilient batch processing
- [ ] Git commits with real metrics

## 🔄 Communication
- Progress: `/shared/progress/inventory-services.md`
- Test Results: `/shared/test-results/services-cycle-X.txt`
- Blockers: `/shared/blockers/inventory-services-blockers.md`
- Handoff: `/shared/handoffs/inventory-services-complete.md`

## 🚨 Regression Protocol
If ANY test fails that was passing:
```bash
echo "REGRESSION: Test X was passing, now failing"
# 1. STOP all new work
# 2. Fix the regression FIRST
# 3. Verify ALL tests pass
# 4. Only then continue
```

## ❌ Common Failures to Avoid
1. **Using jest.mock()** - FORBIDDEN, use SimplifiedSupabaseMock
2. **Skipping validation** - Always use schemas
3. **Missing error handling** - Handle all error cases
4. **Ignoring permissions** - Check role access
5. **All-or-nothing batch** - Use resilient processing

## 📚 Required Study Materials
1. **FIRST**: `src/test/serviceSetup.ts` - Understand SimplifiedSupabaseMock
2. **SECOND**: `src/services/__tests__/cartService.test.ts` - Copy this pattern
3. **THIRD**: `docs/architectural-patterns-and-best-practices.md` - Service patterns
4. **FOURTH**: Import schemas from schema layer handoff

Remember: SimplifiedSupabaseMock is the ONLY acceptable pattern. 85% pass rate is the MINIMUM. Report REAL numbers, not hopes!