# Inventory Hooks Agent - Phase 2 Hook Layer

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting**, check for dependencies and feedback:

```bash
echo "=== CHECKING DEPENDENCIES AND FEEDBACK ==="
# Services must be complete
if [ -f "/shared/handoffs/inventory-services-complete.md" ]; then
  echo "✅ Services ready - can use in hooks"
  cat "/shared/handoffs/inventory-services-complete.md"
else
  echo "⚠️ WARNING: Services not complete - may have integration issues"
fi

# Check for feedback
if [ -f "/shared/feedback/inventory-hooks-improvements.md" ]; then
  echo "📋 Address this feedback:"
  cat "/shared/feedback/inventory-hooks-improvements.md"
fi
```

## 🚨🚨 CRITICAL: Real React Query for Hooks 🚨🚨

**HOOKS USE REAL REACT QUERY** - Not mocked like services!

### ✅ THE CORRECT HOOK TEST PATTERN
```typescript
// Hooks use REAL React Query with test utilities
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInventoryItems } from '../useInventoryItems';

describe('useInventoryItems', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });
  
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('should fetch inventory items', async () => {
    const { result } = renderHook(() => useInventoryItems(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

### ❌ WRONG PATTERNS FOR HOOKS
```typescript
// ❌ DON'T mock React Query for hooks
jest.mock('@tanstack/react-query');

// ❌ DON'T skip the wrapper
renderHook(() => useInventoryItems()); // Missing wrapper!

// ❌ DON'T use fake timers with React Query
jest.useFakeTimers(); // Causes hanging tests!
```

## 📚 ARCHITECTURAL PATTERNS - Hook Layer Requirements

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - Hook patterns section
2. **`src/hooks/__tests__/useCart.test.tsx`** - Perfect example (100% pass rate)
3. **`src/utils/queryKeyFactory.ts`** - MUST use centralized keys

### Hook Implementation Patterns:
```typescript
// ✅ CORRECT - Using centralized query keys
import { inventoryKeys } from 'utils/queryKeyFactory';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from 'services/inventory/inventoryService';

export function useInventoryItems() {
  const queryClient = useQueryClient();
  const service = new InventoryService(supabase);
  
  return useQuery({
    queryKey: inventoryKeys.list(), // Centralized key!
    queryFn: () => service.getInventoryItems(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const service = new InventoryService(supabase);
  
  return useMutation({
    mutationFn: (update: StockUpdate) => service.updateStock(update),
    onMutate: async (update) => {
      // Optimistic update
      await queryClient.cancelQueries({ 
        queryKey: inventoryKeys.detail(update.id) 
      });
      
      const previous = queryClient.getQueryData(
        inventoryKeys.detail(update.id)
      );
      
      queryClient.setQueryData(
        inventoryKeys.detail(update.id),
        (old) => ({
          ...old,
          currentStock: update.newStock
        })
      );
      
      return { previous };
    },
    onError: (err, update, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          inventoryKeys.detail(update.id),
          context.previous
        );
      }
    },
    onSettled: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: inventoryKeys.all 
      });
    }
  });
}
```

### ❌ FORBIDDEN - Query Key Anti-patterns
```typescript
// ❌ NEVER create local query keys
const localKeys = {
  inventory: ['inventory'] // NO! Use queryKeyFactory!
};

// ❌ NEVER use manual keys
queryKey: ['inventory', 'items'] // NO! Use inventoryKeys.list()

// ❌ NEVER duplicate the factory
const myInventoryKeys = { // NO! Extend existing factory!
  all: ['inventory']
};
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Hook Implementation:
1. **RUN TESTS**: `npm run test:hooks:inventory`
2. **CHECK**: All hooks tests passing
3. **VERIFY**: Using centralized query keys
4. **COMMIT**: With real test results

### Git Commit Protocol:
```bash
# After dashboard hook
git commit -m "feat(inventory): implement inventory dashboard hook

- Tests: 10/10 passing
- Query keys: centralized ✓
- Optimistic updates: ✓
- Real React Query: ✓"

# After operations hooks
git commit -m "feat(inventory): implement stock operation hooks

- Tests: 15/15 passing
- Mutations with rollback: ✓
- Cache invalidation: ✓
- Pattern compliance: 100%"
```

## 🎯 Mission
Implement all inventory hooks with React Query, optimistic updates, and centralized query keys.

## 📋 Implementation Tasks

### 1. Extend Query Key Factory FIRST
```typescript
// src/utils/queryKeyFactory.ts - ADD to existing factory
export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (filters: string) => [...inventoryKeys.lists(), { filters }] as const,
  details: () => [...inventoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  movements: () => [...inventoryKeys.all, 'movements'] as const,
  movement: (id: string) => [...inventoryKeys.movements(), id] as const,
  alerts: () => [...inventoryKeys.all, 'alerts'] as const,
  dashboard: () => [...inventoryKeys.all, 'dashboard'] as const,
};
```

### 2. Inventory Dashboard Hook (`src/hooks/inventory/useInventoryDashboard.ts`)
```typescript
export function useInventoryDashboard() {
  return useQuery({
    queryKey: inventoryKeys.dashboard(),
    queryFn: async () => {
      const service = new InventoryService(supabase);
      
      // Aggregate metrics
      const [items, lowStock, movements] = await Promise.all([
        service.getInventoryItems(userId),
        service.getLowStockItems(userId),
        service.getRecentMovements(userId)
      ]);
      
      return {
        totalItems: items.length,
        lowStockCount: lowStock.length,
        totalValue: items.reduce((sum, i) => sum + (i.currentStock * i.unitPrice), 0),
        recentMovements: movements
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### 3. Stock Operations Hooks Tests (Write FIRST!)
```typescript
describe('useUpdateStock', () => {
  it('should optimistically update stock', async () => {
    const { result } = renderHook(() => useUpdateStock(), { wrapper });
    
    act(() => {
      result.current.mutate({
        id: 'item-1',
        newStock: 150
      });
    });
    
    // Check optimistic update applied
    await waitFor(() => {
      const cached = queryClient.getQueryData(
        inventoryKeys.detail('item-1')
      );
      expect(cached.currentStock).toBe(150);
    });
  });
  
  it('should rollback on error', async () => {
    // Test rollback logic
  });
  
  it('should invalidate related queries', async () => {
    // Test cache invalidation
  });
});
```

### 4. Bulk Operations Hook (`src/hooks/inventory/useBulkOperations.ts`)
```typescript
export function useBulkUpdateStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: StockUpdate[]) => {
      const service = new InventoryService(supabase);
      return service.batchUpdateStock(updates);
    },
    onSuccess: (results) => {
      // Track successful updates
      const successIds = results
        .filter(r => r.success)
        .map(r => r.data.id);
      
      // Invalidate affected items
      successIds.forEach(id => {
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(id)
        });
      });
      
      // Invalidate list views
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.lists()
      });
    }
  });
}
```

## ✅ Test Requirements
- `useInventoryDashboard.test.tsx`: 10+ tests
- `useInventoryItems.test.tsx`: 10+ tests
- `useStockOperations.test.tsx`: 15+ tests
- `useBulkOperations.test.tsx`: 10+ tests
- ALL using real React Query with proper wrapper

## 🎯 Milestone Validation Protocol

### Your Milestones:
- [ ] Milestone 1: Query key factory extended
  - No dual systems → Commit
- [ ] Milestone 2: Dashboard hook (10+ tests passing)
  - Real React Query → Commit
- [ ] Milestone 3: Item hooks (10+ tests passing)
  - Centralized keys → Commit
- [ ] Milestone 4: Operation hooks (15+ tests passing)
  - Optimistic updates → Commit
- [ ] Milestone 5: Bulk hooks (10+ tests passing)
  - Progress tracking → Commit
- [ ] Final: All hooks complete (45+ tests)
  - Full integration → Commit

## 📊 Success Criteria
- [ ] 45+ hook tests ALL passing
- [ ] Centralized query keys (NO dual systems)
- [ ] Optimistic updates with rollback
- [ ] Real React Query (not mocked)
- [ ] Cache invalidation working
- [ ] Real-time subscriptions ready

## 🔄 Communication
- Progress: `/shared/progress/inventory-hooks.md`
- Test Results: `/shared/test-results/hooks-cycle-X.txt`
- Blockers: `/shared/blockers/inventory-hooks-blockers.md`
- Handoff: `/shared/handoffs/inventory-hooks-complete.md`

## 🚨 Common Hook Issues

### Issue: Tests hanging
```typescript
// Solution: Use real timers
beforeEach(() => {
  jest.useRealTimers(); // NOT fake timers!
});
```

### Issue: Query key conflicts
```typescript
// Solution: ALWAYS use factory
import { inventoryKeys } from 'utils/queryKeyFactory';
// NEVER create local keys
```

### Issue: Missing wrapper
```typescript
// Solution: Always provide wrapper
renderHook(() => useHook(), { wrapper }); // Required!
```

## ❌ What NOT To Do
- NO mocking React Query
- NO fake timers
- NO local query keys
- NO skipping wrapper
- NO manual cache updates without keys

## 📚 Study These Examples
1. **`src/hooks/__tests__/useCart.test.tsx`** - Gold standard hook tests
2. **`src/hooks/__tests__/useCart.race.test.tsx`** - Race condition handling
3. **`src/utils/queryKeyFactory.ts`** - Centralized key patterns
4. **`src/hooks/useProducts.tsx`** - Real implementation reference

Remember: Hooks are the bridge between services and UI. They MUST use centralized query keys and real React Query!