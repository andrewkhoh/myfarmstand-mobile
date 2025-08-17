# useCentralizedRealtime Race Condition Testing - Implementation Plan

## 🎯 **Step-by-Step Implementation Plan for Phase 1.3**

### **Step 1: Analysis of useCentralizedRealtime Hook** ✅

**Key Mutations Identified:**
1. **`connectMutation`** - Establish real-time connections with subscription setup
2. **`disconnectMutation`** - Cleanup all subscriptions and disconnect
3. **`refreshConnectionMutation`** - Refresh connection status and re-establish

**Secondary Hook:**
4. **`useForceRefreshUserData`** - Force invalidation of all user-specific queries

**Complex Real-time Behavior:**
- **Multiple subscription types** (cart, orders, products) with different authorization levels
- **Cross-entity invalidation** - Real-time events affecting multiple query caches
- **Connection state management** - Optimistic updates for connection status
- **Channel authorization** - Security-hardened with user-specific and admin channels
- **Broadcast coordination** - Events triggering across different subscription types

**Race Condition Hotspots:**
- **Connection/disconnection races** - Multiple connection attempts simultaneously
- **Subscription setup conflicts** - Cart, order, and product subscriptions overlapping
- **Cross-entity invalidation** - Real-time event during manual query invalidations
- **Channel authorization timing** - Authorization checks vs subscription setup
- **Force refresh conflicts** - Manual refresh during real-time invalidations

---

### **Step 2: Race Condition Scenario Design**

**Priority 1: Connection Management Races**
```typescript
// 1. Connection state conflicts
describe('🔌 Connection Management Races', () => {
  it('should handle concurrent connection attempts')
  it('should handle disconnect during connection setup')
  it('should handle connection refresh during active subscriptions')
});
```

**Priority 2: Subscription Setup Conflicts**
```typescript
// 2. Multiple subscription type races
describe('📡 Subscription Setup Races', () => {
  it('should handle concurrent subscription setup for different types')
  it('should handle subscription conflicts during authorization changes')
  it('should handle subscription cleanup vs new setup conflicts')
});
```

**Priority 3: Cross-Entity Invalidation Races**
```typescript
// 3. Real-time event coordination
describe('🔄 Cross-Entity Invalidation Races', () => {
  it('should handle real-time events during manual invalidations')
  it('should handle concurrent invalidations from different sources')
  it('should handle invalidation batching vs real-time events')
});
```

**Priority 4: Force Refresh Conflicts**
```typescript
// 4. Manual vs automatic refresh races
describe('🔄 Force Refresh Conflicts', () => {
  it('should handle force refresh during real-time updates')
  it('should handle concurrent force refresh operations')
  it('should handle force refresh vs connection state changes')
});
```

---

### **Step 3: Test Infrastructure Setup**

**File Structure:**
```
src/hooks/__tests__/useCentralizedRealtime.race.test.tsx
```

**Test Setup Pattern (following proven methodology):**
```typescript
describe('useCentralizedRealtime Race Condition Tests (Real React Query)', () => {
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
    
    // Mock Supabase channels for real-time testing
    mockSupabase.channel.mockReturnValue(mockChannel);
  });
  
  afterEach(async () => {
    // Proper cleanup (following cart/orders pattern)
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

### **Step 4: Mock Strategy for Real-time Testing**

**Supabase Channel Mocking:**
```typescript
// Mock Supabase real-time functionality
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockImplementation((callback) => {
    // Simulate subscription success with real timing
    setTimeout(() => callback('SUBSCRIBED'), 50);
    return mockChannel;
  }),
  unsubscribe: jest.fn().mockResolvedValue(undefined)
};

const mockSupabase = {
  channel: jest.fn().mockReturnValue(mockChannel)
};
```

**Broadcast Factory Mocking:**
```typescript
// Mock broadcast services with channel authorization
const mockCartBroadcast = {
  getAuthorizedChannelNames: jest.fn().mockReturnValue(['user-cart-123']),
  send: jest.fn().mockResolvedValue(undefined)
};

const mockOrderBroadcast = {
  user: {
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['user-orders-123'])
  },
  admin: {
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['admin-orders'])
  }
};
```

**Connection State Mocking:**
```typescript
// Real-time connection behavior simulation
const mockConnectionResponse = {
  isConnected: true,
  activeSubscriptions: ['cart', 'userOrders', 'products'],
  connectionCount: 3,
  lastConnected: new Date().toISOString(),
  errors: []
};
```

---

### **Step 5: Test Implementation Sequence**

**Test 1: Concurrent Connection Attempts** (High Risk)
```typescript
it('should handle concurrent connection attempts', async () => {
  // Setup: Mock connection delays for race condition timing
  // Action: Two components attempt connection simultaneously  
  // Expected: Both succeed, shared connection state
  // Focus: Connection state optimistic updates and coordination
});
```

**Test 2: Disconnect During Connection** (Critical Scenario)
```typescript
it('should handle disconnect during connection setup', async () => {
  // Setup: Connection in progress
  // Action: Disconnect called before connection completes
  // Expected: Proper cleanup, no hanging subscriptions
  // Focus: Subscription lifecycle management
});
```

**Test 3: Subscription Setup Conflicts** (Complex Coordination)
```typescript
it('should handle concurrent subscription setup for different types', async () => {
  // Setup: Multiple subscription types (cart, orders, products)
  // Action: All subscriptions setup simultaneously
  // Expected: All subscriptions active, no conflicts
  // Focus: Channel authorization and subscription coordination
});
```

**Test 4: Cross-Entity Invalidation** (Business Logic Critical)
```typescript
it('should handle real-time events during manual invalidations', async () => {
  // Setup: Real-time subscription active
  // Action: Manual query invalidation concurrent with real-time event
  // Expected: No duplicate invalidations, consistent final state
  // Focus: Query invalidation coordination
});
```

---

### **Step 6: Success Criteria**

**Target Success Rate:** 90%+ (8/9 tests passing)
- **Connection management tests** must pass (critical infrastructure)
- **Subscription coordination tests** should pass (user experience)
- **Cross-entity invalidation** may have timing complexity (acceptable)

**Performance Targets:**
- **Individual test time:** <2 seconds each (simpler than orders)
- **Total suite time:** <15 seconds
- **No hanging tests:** 100% completion rate

**Quality Indicators:**
- **Real subscription logs** showing actual channel behavior
- **Connection state consistency** across multiple hook instances
- **Proper authorization validation** in subscription setup
- **Clean disconnection** without subscription leaks

---

### **Step 7: Implementation Timeline**

**Day 1: Infrastructure Setup** (2-3 hours)
- Create test file with proven Option A methodology
- Implement Supabase and broadcast mocking patterns
- Create first smoke test (connection verification)
- Validate real-time test environment

**Day 2: Core Race Condition Tests** (3-4 hours)  
- Implement connection management race tests
- Implement subscription setup conflict tests
- Debug and fix initial issues
- Achieve 70%+ success rate

**Day 3: Advanced Scenarios** (2-3 hours)
- Implement cross-entity invalidation tests
- Implement force refresh conflict tests
- Achieve target 90%+ success rate
- Document findings and patterns

**Total Estimated Time: 7-10 hours over 3 days**

---

### **Step 8: Risk Mitigation**

**Known Risk Areas:**
1. **Real-time mocking complexity** - Supabase channels need proper simulation
2. **Channel authorization timing** - Multiple authorization levels to coordinate
3. **Cross-entity invalidation** - Complex query cache coordination
4. **Connection state races** - Multiple components managing shared connection

**Mitigation Strategies:**
1. **Start with connection basics** - Build complexity gradually from proven patterns
2. **Use proven Option A methodology** - Real timers, short delays, proper cleanup
3. **Channel-specific mocking** - Predictable subscription behavior patterns
4. **Focus on end-state testing** - Less focus on intermediate connection states

**Fallback Plan:**
If cross-entity invalidation tests prove too complex:
- Focus on connection management races (highest user impact)
- Simplify invalidation testing to basic consistency checks
- Ensure 90% success rate on the most critical scenarios

---

## 🎯 **Complexity Assessment vs Previous Hooks**

### **Compared to useCart (100% success):**
- **Similar complexity:** Connection/disconnection like add/remove operations
- **Additional layer:** Real-time subscriptions vs direct service calls
- **More coordination:** Multiple subscription types vs single cart operations

### **Compared to useOrders (100% success):**
- **Similar complexity:** Cross-entity invalidation like statistics coordination
- **Simpler business logic:** Connection state vs complex order workflows
- **Different domain:** Real-time infrastructure vs business operations

### **Expected Difficulty: Medium-High**
- **Infrastructure focus** should be simpler than business logic
- **Real-time mocking** adds complexity but follows established patterns
- **Proven methodology** gives high confidence in success

---

## 🚀 **Ready to Execute**

The plan leverages all lessons learned from useCart and useOrders success:
- ✅ **Proven Option A methodology** (real timers + short delays)
- ✅ **Resource-specific mocking** for reliable concurrent behavior  
- ✅ **End-state focused testing** for better reliability
- ✅ **Proper cleanup patterns** to prevent hanging tests

**Key Differentiator:** This will be the first **real-time/subscription focused** race condition testing, expanding our methodology into infrastructure coordination scenarios.

**Next Action: Begin Day 1 - Infrastructure Setup**