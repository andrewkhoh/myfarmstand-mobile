# useOrders Race Condition Testing - Detailed Implementation Plan

## 🎯 **Step-by-Step Implementation Plan**

### **Step 1: Analysis of useOrders Hook** ✅

**Key Mutations Identified:**
1. **`useUpdateOrderStatusMutation`** - Single order status updates
2. **`useBulkUpdateOrderStatusMutation`** - Bulk order status updates

**Complex Optimistic Updates:**
- Updates 4 different query caches simultaneously (orders, user-orders, detail, stats)
- Complex statistics recalculation with daily/weekly/active metrics
- Multi-entity state management (orders + statistics)

**Race Condition Hotspots:**
- **Statistics calculations** - Most complex business logic
- **Multiple cache updates** - 4 different query keys being updated
- **Bulk vs individual operations** - Potential for overlapping mutations
- **Real-time invalidations** - Broadcast events during mutations

---

### **Step 2: Race Condition Scenario Design**

**Priority 1: Core Business Logic Races**
```typescript
// 1. Concurrent status updates on same order
describe('🏁 Concurrent Status Updates', () => {
  it('should handle concurrent status updates on same order')
  it('should handle rapid status transitions') 
  it('should maintain order state consistency during conflicts')
});

// 2. Bulk vs Individual operation conflicts  
describe('⚡ Bulk vs Individual Operations', () => {
  it('should handle bulk update during individual updates')
  it('should handle individual updates during bulk operations')
  it('should handle overlapping bulk operations')
});
```

**Priority 2: Statistics Calculation Races**
```typescript
// 3. Statistics calculation integrity
describe('📊 Statistics Calculation Races', () => {
  it('should maintain statistics consistency during concurrent updates')
  it('should handle statistics recalculation conflicts')
  it('should handle daily/weekly metric calculation races')
});
```

**Priority 3: State Management Races**
```typescript
// 4. Multi-cache invalidation
describe('🔄 Cache Management Races', () => {
  it('should handle concurrent query invalidations')
  it('should handle optimistic update rollback conflicts')
  it('should maintain state consistency across multiple caches')
});

// 5. Admin vs User operation conflicts
describe('👥 Admin vs User Operations', () => {
  it('should handle admin bulk operations during user queries')
  it('should handle user order views during admin updates')
});
```

---

### **Step 3: Test Infrastructure Setup**

**File Structure:**
```
src/hooks/__tests__/useOrders.race.test.tsx
```

**Test Setup Pattern (following useCart success):**
```typescript
describe('useOrders Race Condition Tests (Real React Query)', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    // Use real timers (proven Option A methodology)
    jest.useRealTimers();
    
    // Fresh QueryClient for isolation
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0, gcTime: 0 },
        mutations: { retry: false }
      }
    });
    
    jest.clearAllMocks();
    
    // Mock service responses with proper return types
    mockOrderService.updateOrderStatus.mockResolvedValue({
      success: true,
      order: mockOrder
    });
  });
  
  afterEach(async () => {
    // Proper cleanup
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.unmount();
    } catch {
      // Ignore cleanup errors
    }
  });
});
```

---

### **Step 4: Mock Data and Service Setup**

**Mock Order Data:**
```typescript
const mockOrder1: Order = {
  id: 'order-1',
  customerEmail: 'test@example.com',
  status: 'pending',
  total: 29.99,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: []
};

const mockOrder2: Order = {
  id: 'order-2', 
  customerEmail: 'test@example.com',
  status: 'confirmed',
  total: 45.50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: []
};
```

**Service Mock Patterns:**
```typescript
// Order-specific mocking for reliable concurrent behavior
mockOrderService.updateOrderStatus.mockImplementation(async (orderId, status) => {
  // Real short delay for race condition timing
  await new Promise(resolve => setTimeout(resolve, 50));
  
  if (orderId === 'order-1') return { success: true, order: {...mockOrder1, status} };
  if (orderId === 'order-2') return { success: true, order: {...mockOrder2, status} };
  throw new Error('Order not found');
});

// Bulk update mocking
mockOrderService.bulkUpdateOrderStatus.mockImplementation(async (orderIds, status) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const updatedOrders = orderIds.map(id => ({
    ...mockOrders.find(o => o.id === id),
    status,
    updatedAt: new Date().toISOString()
  }));
  
  return { success: true, updatedOrders };
});
```

---

### **Step 5: Test Implementation Sequence**

**Test 1: Concurrent Status Updates** (Highest Risk)
```typescript
it('should handle concurrent status updates on same order', async () => {
  // Setup: Order in pending state
  // Action: Two admins update same order simultaneously  
  // Expected: Second update wins, no data corruption
  // Focus: Optimistic update rollback behavior
});
```

**Test 2: Bulk vs Individual Conflicts** (High Business Impact)
```typescript
it('should handle bulk update during individual updates', async () => {
  // Setup: Multiple orders in various states
  // Action: Start bulk update, then individual update on same order
  // Expected: Proper ordering, no lost updates
  // Focus: Mutation queuing and cache consistency
});
```

**Test 3: Statistics Calculation Integrity** (Complex Logic)
```typescript
it('should maintain statistics consistency during concurrent updates', async () => {
  // Setup: Orders that affect daily/weekly stats
  // Action: Multiple status updates that change statistics
  // Expected: Statistics remain mathematically correct
  // Focus: Complex calculation logic in onMutate
});
```

**Test 4: Multi-Cache Invalidation** (Infrastructure)
```typescript
it('should handle concurrent query invalidations', async () => {
  // Setup: Multiple hook instances (simulate multiple admin users)
  // Action: Concurrent updates triggering invalidations
  // Expected: All caches eventually consistent
  // Focus: Invalidation strategy and cache management
});
```

---

### **Step 6: Success Criteria**

**Target Success Rate:** 85%+ (8/10 tests passing)
- **Core business logic tests** must pass (status updates, bulk operations)
- **Statistics calculation tests** should pass (revenue calculations critical)
- **Infrastructure tests** may have timing issues (acceptable)

**Performance Targets:**
- **Individual test time:** <3 seconds each
- **Total suite time:** <25 seconds
- **No hanging tests:** 100% completion rate

**Quality Indicators:**
- **Real error logs** showing actual business logic paths
- **Statistics calculation accuracy** during race conditions
- **Cache consistency** across multiple hook instances
- **Proper rollback behavior** on failures

---

### **Step 7: Implementation Timeline**

**Day 1: Infrastructure Setup** (3-4 hours)
- Create test file with basic setup
- Implement mock data and service patterns
- Create first smoke test (setup verification)
- Validate test environment is working

**Day 2: Core Race Condition Tests** (4-5 hours)  
- Implement concurrent status update tests
- Implement bulk vs individual operation tests
- Debug and fix initial issues
- Achieve 50%+ success rate

**Day 3: Advanced Scenarios** (3-4 hours)
- Implement statistics calculation tests
- Implement multi-cache invalidation tests
- Achieve target 85%+ success rate
- Document any remaining issues

**Total Estimated Time: 10-13 hours over 3 days**

---

### **Step 8: Risk Mitigation**

**Known Risk Areas:**
1. **Statistics calculation complexity** - Most likely to have timing issues
2. **Multiple cache updates** - Potential for React Query batching conflicts  
3. **Bulk operation timing** - Large operations may have different timing characteristics

**Mitigation Strategies:**
1. **Start with simple scenarios** - Build complexity gradually
2. **Use proven Option A methodology** - Real timers with short delays
3. **Order-specific mocking** - Avoid sequential mocking issues from useCart experience
4. **Focus on end-state testing** - Less focus on intermediate optimistic states

**Fallback Plan:**
If statistics calculation tests prove too complex:
- Focus on core status update races (highest business value)
- Simplify statistics testing to basic consistency checks
- Ensure 85% success rate on the most critical scenarios

---

## 🚀 **Ready to Execute**

The plan leverages all lessons learned from the useCart success:
- ✅ **Proven Option A methodology** (real timers + short delays)
- ✅ **Order-specific mocking** for reliable concurrent behavior  
- ✅ **End-state focused testing** for better reliability
- ✅ **Proper cleanup patterns** to prevent hanging tests

**Next Action: Begin Step 1 - Infrastructure Setup**