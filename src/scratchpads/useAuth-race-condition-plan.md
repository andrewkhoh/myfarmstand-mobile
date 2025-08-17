# useAuth Race Condition Testing - Implementation Plan

## 🎯 **Step-by-Step Implementation Plan for Phase 1.4**

### **Step 1: Analysis of useAuth Hook** ✅

**Key Mutations Identified:**
1. **`useLoginMutation`** - User login with email/password, optimistic auth state updates
2. **`useRegisterMutation`** - User registration with profile data, cache invalidation
3. **`useLogoutMutation`** - Logout with complete cache clearing and security cleanup
4. **`useUpdateProfileMutation`** - Profile updates with optimistic updates
5. **`useChangePasswordMutation`** - Password change with session refresh
6. **`useRefreshTokenMutation`** - Token refresh with complete query invalidation

**Key Queries Identified:**
7. **`useCurrentUser`** - Current user data with authentication validation
8. **`useAuthStatus`** - Authentication status checking

**Complex Authentication Behavior:**
- **Optimistic auth state updates** - Login/register updating user cache immediately
- **Complete cache clearing** - Logout removing all cached data for security
- **Token-based authentication** - Refresh token handling and expiration
- **Session management** - Authentication status and user state coordination
- **Profile update races** - Optimistic updates with rollback on failure
- **Broadcast coordination** - Auth events triggering across the application

**Race Condition Hotspots:**
- **Login/logout races** - Concurrent authentication state changes
- **Registration conflicts** - Multiple registration attempts with same email
- **Token refresh timing** - Refresh during other auth operations
- **Profile update races** - Concurrent profile modifications
- **Session validation** - Current user queries during auth state changes
- **Cache invalidation conflicts** - Multiple operations clearing/updating cache

---

### **Step 2: Race Condition Scenario Design**

**Priority 1: Authentication State Races**
```typescript
// 1. Core authentication flow conflicts
describe('🔐 Authentication State Races', () => {
  it('should handle concurrent login attempts with same credentials')
  it('should handle login during logout operation')
  it('should handle logout during login operation')
  it('should handle registration during existing login session')
})
```

**Priority 2: Token Management Races**
```typescript
// 2. Token refresh and validation timing
describe('🎫 Token Management Races', () => {
  it('should handle token refresh during login')
  it('should handle multiple concurrent token refresh attempts')
  it('should handle token expiration during profile operations')
  it('should handle token refresh vs logout timing')
})
```

**Priority 3: Profile Operations Races**
```typescript
// 3. User profile and data conflicts
describe('👤 Profile Operations Races', () => {
  it('should handle concurrent profile updates')
  it('should handle profile update during logout')
  it('should handle password change during profile update')
  it('should handle profile optimistic updates with failures')
})
```

**Priority 4: Session Validation Races**
```typescript
// 4. Authentication status and user data races
describe('🕵️ Session Validation Races', () => {
  it('should handle current user queries during login')
  it('should handle auth status checks during token refresh')
  it('should handle concurrent authentication validation')
  it('should handle session expiration during operations')
})
```

**Priority 5: Cache Management Races**
```typescript
// 5. Query cache coordination during auth operations
describe('🗄️ Cache Management Races', () => {
  it('should handle cache clearing during active queries')
  it('should handle concurrent cache invalidations')
  it('should handle optimistic updates vs server data conflicts')
  it('should handle broadcast events vs direct cache updates')
})
```

---

### **Step 3: Test Infrastructure Setup**

**File Structure:**
```
src/hooks/__tests__/useAuth.race.test.tsx
```

**Test Setup Pattern (following proven methodology):**
```typescript
describe('useAuth Race Condition Tests (Real React Query)', () => {
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
    
    // Mock AuthService for reliable concurrent behavior
    mockAuthService.login.mockImplementation(async (email, password) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (email === 'test@example.com') return { user: mockUser, token: 'valid-token' };
      throw new Error('Invalid credentials');
    });
  });
  
  afterEach(async () => {
    // Proper cleanup (following proven pattern)
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

### **Step 4: Mock Strategy for Authentication Testing**

**AuthService Mocking:**
```typescript
// Mock authentication service with real timing
const mockAuthService = {
  login: jest.fn().mockImplementation(async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Real short delay
    if (email === 'test@example.com' && password === 'password') {
      return { user: mockUser, token: 'auth-token-123' };
    }
    throw new Error('Invalid credentials');
  }),
  
  register: jest.fn().mockImplementation(async (email, password, name, phone, address) => {
    await new Promise(resolve => setTimeout(resolve, 75));
    if (email === 'existing@example.com') {
      throw new Error('User already exists');
    }
    return { user: { ...mockUser, email, name, phone, address } };
  }),
  
  logout: jest.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 25));
    return { success: true };
  }),
  
  getCurrentUser: jest.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 30));
    return mockUser;
  }),
  
  refreshToken: jest.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 40));
    return { accessToken: 'refreshed-token-456' };
  })
};
```

**User Data Mocking:**
```typescript
// Mock user for consistent test behavior
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  phone: '+1234567890',
  address: '123 Test St',
  role: 'customer'
};

const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  name: 'Admin User',
  phone: '+1234567890',
  address: '456 Admin Ave',
  role: 'admin'
};
```

**Broadcast Factory Mocking:**
```typescript
// Mock auth broadcast events
const mockAuthBroadcast = {
  send: jest.fn().mockImplementation(async (event, data) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log(`📡 Auth broadcast: ${event}`, data);
    return { success: true };
  })
};
```

---

### **Step 5: Test Implementation Sequence**

**Test 1: Concurrent Login Attempts** (High Risk)
```typescript
it('should handle concurrent login attempts with same credentials', async () => {
  // Setup: Mock login delays for race condition timing
  // Action: Two components attempt login simultaneously with same credentials
  // Expected: Both succeed, shared auth state, no duplicate tokens
  // Focus: Auth state optimistic updates and coordination
});
```

**Test 2: Login During Logout** (Critical Scenario)
```typescript
it('should handle login during logout operation', async () => {
  // Setup: User logged in, logout in progress
  // Action: Login called before logout completes
  // Expected: Proper state management, no auth conflicts
  // Focus: Authentication state transition coordination
});
```

**Test 3: Token Refresh Conflicts** (Complex Coordination)
```typescript
it('should handle multiple concurrent token refresh attempts', async () => {
  // Setup: Multiple components detecting token expiration
  // Action: All components trigger refresh simultaneously
  // Expected: Single refresh operation, all components get new token
  // Focus: Token refresh deduplication and coordination
});
```

**Test 4: Profile Update Races** (Business Logic Critical)
```typescript
it('should handle concurrent profile updates', async () => {
  // Setup: User logged in with profile data
  // Action: Multiple profile updates with different fields
  // Expected: Proper optimistic updates, conflict resolution
  // Focus: Profile data consistency and rollback handling
});
```

**Test 5: Cache Clearing Conflicts** (Infrastructure Critical)
```typescript
it('should handle cache clearing during active queries', async () => {
  // Setup: Active user queries in progress
  // Action: Logout triggered during query execution
  // Expected: Proper cache cleanup, no stale data, security maintained
  // Focus: Query invalidation and cache management coordination
});
```

---

### **Step 6: Success Criteria**

**Target Success Rate:** 85%+ (13/15 tests passing)
- **Authentication state tests** must pass (critical security)
- **Token management tests** should pass (session integrity)
- **Profile operation tests** may have timing complexity (acceptable)

**Performance Targets:**
- **Individual test time:** <1.5 seconds each (faster than real-time infrastructure)
- **Total suite time:** <20 seconds
- **No hanging tests:** 100% completion rate

**Quality Indicators:**
- **Real auth state transitions** showing actual login/logout behavior
- **Token refresh coordination** across multiple hook instances
- **Proper cache invalidation** maintaining security boundaries
- **Profile optimistic updates** with rollback on conflicts
- **Broadcast event coordination** for auth state changes

---

### **Step 7: Implementation Timeline**

**Day 1: Infrastructure Setup** (2-3 hours)
- Create test file with proven Option A methodology
- Implement AuthService and broadcast mocking patterns
- Create first smoke test (auth hook initialization)
- Validate authentication test environment

**Day 2: Core Authentication Tests** (3-4 hours)  
- Implement authentication state race tests
- Implement token management conflict tests
- Debug and fix initial issues
- Achieve 70%+ success rate

**Day 3: Advanced Scenarios** (2-3 hours)
- Implement profile operation race tests
- Implement cache management conflict tests
- Achieve target 85%+ success rate
- Document findings and patterns

**Total Estimated Time: 7-10 hours over 3 days**

---

### **Step 8: Risk Mitigation**

**Known Risk Areas:**
1. **Authentication state complexity** - Login/logout timing coordination
2. **Token refresh coordination** - Multiple refresh attempts during expiration
3. **Cache clearing security** - Logout must clear all data reliably
4. **Profile optimistic updates** - Rollback complexity with concurrent updates

**Mitigation Strategies:**
1. **Start with basic auth flows** - Build complexity gradually from proven patterns
2. **Use proven Option A methodology** - Real timers, short delays, proper cleanup
3. **Auth-specific mocking** - Predictable authentication behavior patterns
4. **Focus on security-critical scenarios** - Prioritize login/logout over profile updates

**Fallback Plan:**
If complex profile update tests prove challenging:
- Focus on core authentication races (highest security impact)
- Simplify profile testing to basic consistency checks
- Ensure 85% success rate on the most critical auth scenarios

---

## 🎯 **Complexity Assessment vs Previous Hooks**

### **Compared to useCart (100% success):**
- **Similar complexity:** Login/logout like add/remove operations
- **Additional layer:** Authentication state vs simple cart state
- **More security critical:** Auth failures have wider impact

### **Compared to useOrders (100% success):**
- **Different complexity:** Authentication flows vs business logic workflows
- **Similar coordination:** Cache management and optimistic updates
- **Higher stakes:** Security and session integrity requirements

### **Compared to useCentralizedRealtime (100% success):**
- **Different domain:** Authentication vs real-time infrastructure
- **Similar patterns:** State coordination and cache management
- **Less infrastructure:** No subscription management complexity

### **Expected Difficulty: Medium**
- **Authentication focus** should be simpler than real-time coordination
- **Security requirements** add importance but not complexity
- **Proven methodology** gives high confidence in success

---

## 🚀 **Ready to Execute**

The plan leverages all lessons learned from three successful implementations:
- ✅ **Proven Option A methodology** (real timers + short delays)
- ✅ **Resource-specific mocking** for reliable concurrent behavior  
- ✅ **End-state focused testing** for better reliability
- ✅ **Proper cleanup patterns** to prevent hanging tests
- ✅ **Security-focused scenarios** for authentication-specific concerns

**Key Differentiator:** This will test **authentication and session management** race conditions, completing our coverage of:
- ✅ Service layer operations (useCart, useOrders)
- ✅ Infrastructure layer operations (useCentralizedRealtime)
- 🎯 Authentication layer operations (useAuth) ← NEXT

**Next Action: Begin Day 1 - Authentication Infrastructure Setup**