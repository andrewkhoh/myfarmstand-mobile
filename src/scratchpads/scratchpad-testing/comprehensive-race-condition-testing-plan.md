# Comprehensive Race Condition Testing Plan for All Hooks

## 🎯 **Executive Summary**

Based on analysis of all 13 hooks in `src/hooks/`, here's a comprehensive plan for implementing race condition testing across the entire application.

**Current Status**: ✅ **useCart (Phase 1)** - 11/11 tests passing (100% success rate)

## 📊 **Priority Matrix**

| Priority | Hook | Mutations | Race Risk | Business Impact | Testing Complexity |
|----------|------|-----------|-----------|----------------|-------------------|
| **HIGH** | useCart | 4 | Very High | Critical | High |
| **HIGH** | useOrders | 3 | Very High | Critical | High |  
| **HIGH** | useCentralizedRealtime | 3 | High | Critical | Medium |
| **HIGH** | useAuth | 5 | High | Critical | Medium |
| **MEDIUM** | useStockValidation | 2 | Medium | High | Low |
| **MEDIUM** | useNotifications | 2 | Medium | Medium | Low |
| **MEDIUM** | useProducts | 2 | Medium | Medium | Low |
| **MEDIUM** | usePickupRescheduling | 2 | Medium | Medium | Medium |
| **LOW** | useErrorRecovery | 2 | Low | Low | Low |
| **LOW** | useNoShowHandling | 2 | Low | Low | Low |
| **LOW** | useRealtime | 2 | Low | Low | Low |
| **LOW** | useEntityQuery | Variable | Low | Low | Variable |
| **LOW** | useCheckoutForm | 0 | Very Low | Low | Very Low |

## 🚀 **Phase-by-Phase Implementation Plan**

### **Phase 1: HIGH Priority - Core Business Logic (4 hooks)**

#### **1.1 useCart.ts** - ✅ **COMPLETED** 
- **Status**: 100% success rate (11/11 tests passing)
- **Infrastructure**: Established baseline for all future tests

#### **1.2 useOrders.ts** - **NEXT TARGET**
**Race Condition Scenarios:**
```typescript
describe('useOrders Race Condition Tests', () => {
  // Concurrent order status updates
  it('should handle concurrent status updates on same order')
  
  // Bulk vs individual operations  
  it('should handle bulk status updates during individual updates')
  
  // Admin vs user operations
  it('should handle admin operations during user actions')
  
  // Order statistics calculation races
  it('should maintain statistics consistency during rapid updates')
  
  // Real-time order events
  it('should handle real-time events during manual updates')
});
```

**Estimated Test Count**: 8-10 tests  
**Complexity**: High (order state machines, statistics)  
**Timeline**: 2-3 days

#### **1.3 useCentralizedRealtime.ts**
**Race Condition Scenarios:**
```typescript
describe('useCentralizedRealtime Race Condition Tests', () => {
  // Connection management
  it('should handle concurrent connection attempts')
  it('should handle disconnect during data refresh')
  
  // Subscription conflicts
  it('should handle subscription setup conflicts')
  it('should handle channel authorization races')
  
  // Cross-entity invalidation
  it('should handle cross-entity invalidation conflicts')
});
```

**Estimated Test Count**: 6-8 tests  
**Complexity**: Medium (coordination logic)  
**Timeline**: 1-2 days

#### **1.4 useAuth.ts**  
**Race Condition Scenarios:**
```typescript
describe('useAuth Race Condition Tests', () => {
  // Auth state races
  it('should handle login during logout')
  it('should handle multiple profile updates')
  
  // Token management
  it('should handle token refresh during operations')
  it('should handle auth state vs other operations')
  
  // Cache management  
  it('should handle cache clearing conflicts')
});
```

**Estimated Test Count**: 7-9 tests  
**Complexity**: Medium (auth state management)  
**Timeline**: 1-2 days

**Phase 1 Total**: 30-38 tests, 5-8 days

---

### **Phase 2: MEDIUM Priority - User Experience (4 hooks)**

#### **2.1 useStockValidation.ts**
**Race Condition Scenarios:**
```typescript
describe('useStockValidation Race Condition Tests', () => {
  // Stock vs cart operations
  it('should handle stock refresh during cart operations')
  it('should handle concurrent validation requests')
  
  // Real-time stock updates
  it('should handle real-time stock changes vs cached data')
  it('should handle pre-order vs regular stock conflicts')
});
```

**Estimated Test Count**: 4-5 tests  
**Timeline**: 1 day

#### **2.2 useNotifications.ts**
**Race Condition Scenarios:**
```typescript
describe('useNotifications Race Condition Tests', () => {
  // Notification sending
  it('should handle multiple notification sends')
  it('should handle preference updates during sends')
  
  // Rate limiting and history
  it('should handle rate limiting conflicts')
  it('should handle history updates vs new notifications')
});
```

**Estimated Test Count**: 4-5 tests  
**Timeline**: 1 day

#### **2.3 useProducts.ts**
**Race Condition Scenarios:**
```typescript
describe('useProducts Race Condition Tests', () => {
  // Data refresh operations
  it('should handle concurrent refresh operations')
  it('should handle search vs data refresh')
  it('should handle category updates vs product listings')
});
```

**Estimated Test Count**: 3-4 tests  
**Timeline**: 1 day

#### **2.4 usePickupRescheduling.ts**
**Race Condition Scenarios:**
```typescript
describe('usePickupRescheduling Race Condition Tests', () => {
  // Reschedule operations
  it('should handle multiple reschedule attempts')
  it('should handle validation vs actual reschedule')
  
  // Business logic constraints
  it('should handle limit checking races')
  it('should handle order status vs reschedule operations')
});
```

**Estimated Test Count**: 4-5 tests  
**Timeline**: 1 day

**Phase 2 Total**: 15-19 tests, 4 days

---

### **Phase 3: LOW Priority - Support Features (5 hooks)**

#### **3.1 useErrorRecovery.ts**
**Race Condition Scenarios:**
```typescript
describe('useErrorRecovery Race Condition Tests', () => {
  it('should handle multiple recovery attempts')
  it('should handle recovery vs normal operations')
  it('should handle error log conflicts')
});
```

**Estimated Test Count**: 3-4 tests  
**Timeline**: 0.5 days

#### **3.2 useNoShowHandling.ts**
**Race Condition Scenarios:**
```typescript
describe('useNoShowHandling Race Condition Tests', () => {
  it('should handle multiple processing runs')
  it('should handle order status conflicts')
  it('should handle admin operation timing')
});
```

**Estimated Test Count**: 3-4 tests  
**Timeline**: 0.5 days

#### **3.3 useRealtime.ts**
**Race Condition Scenarios:**
```typescript
describe('useRealtime Race Condition Tests', () => {
  it('should handle init vs cleanup timing')
  it('should handle multiple status refreshes')
});
```

**Estimated Test Count**: 2-3 tests  
**Timeline**: 0.5 days

#### **3.4 useEntityQuery.ts**
**Test as needed for specific implementations**  
**Timeline**: Variable

#### **3.5 useCheckoutForm.ts**
**Local state only - minimal race condition risk**  
**Timeline**: Skip or minimal testing

**Phase 3 Total**: 8-11 tests, 1.5 days

---

## 🛠 **Implementation Strategy**

### **Proven Methodology (from useCart success)**
```typescript
// Real timers (no fake timers)
beforeEach(() => {
  jest.useRealTimers();
  queryClient = new QueryClient({...});
});

// Real short delays in mocks
mockService.operation.mockImplementation(async () => {
  await new Promise(resolve => setTimeout(resolve, 50-100));
  return { success: true };
});

// Product-specific mocking for reliability
mockService.operation.mockImplementation(async (id, data) => {
  if (id === 'test-id-1') return { success: true };
  if (id === 'test-id-2') throw new Error('Conflict');
});

// Proper async assertions
await waitFor(() => {
  expect(result.current.isPending).toBe(false);
});
```

### **Test File Structure**
```
src/hooks/__tests__/
├── useCart.race.test.tsx          ✅ COMPLETED (11/11 tests)
├── useOrders.race.test.tsx        🔄 NEXT (Phase 1.2)
├── useCentralizedRealtime.race.test.tsx
├── useAuth.race.test.tsx
├── useStockValidation.race.test.tsx
├── useNotifications.race.test.tsx
├── useProducts.race.test.tsx
├── usePickupRescheduling.race.test.tsx
├── useErrorRecovery.race.test.tsx
├── useNoShowHandling.race.test.tsx
└── useRealtime.race.test.tsx
```

### **Shared Test Utilities**
```typescript
// Create shared utilities for common patterns
// src/test/race-condition-helpers.ts

export const createConcurrentOperationTest = (operations) => {
  // Helper for testing concurrent operations
};

export const createOptimisticUpdateTest = (hook, operation) => {
  // Helper for testing optimistic updates
};

export const createErrorRecoveryTest = (hook, failureScenario) => {
  // Helper for testing error rollbacks
};
```

## 📈 **Success Metrics**

### **Phase 1 Targets**
- **useOrders**: 85%+ success rate (8/10 tests passing)
- **useCentralizedRealtime**: 90%+ success rate (6/7 tests passing) 
- **useAuth**: 85%+ success rate (7/8 tests passing)

### **Overall Project Targets**
- **Total Tests**: 53-68 race condition tests across all hooks
- **Success Rate**: 85%+ across all phases
- **Execution Time**: <30 seconds for full race condition test suite
- **No Hanging Tests**: 100% completion rate

## ⚡ **Quick Start: Phase 1.2 (useOrders)**

**Immediate Next Steps:**
1. Create `useOrders.race.test.tsx` using proven useCart methodology
2. Focus on order status update races (highest business impact)
3. Test bulk vs individual operation conflicts
4. Validate order statistics consistency during concurrent updates

**Expected Timeline**: 2-3 days to complete useOrders testing

## 🎯 **Long-term Vision**

### **Complete Race Condition Testing Infrastructure**
- **53-68 comprehensive race condition tests** covering all critical user flows
- **Automated CI/CD integration** to catch race conditions before production
- **Performance benchmarks** for concurrent operation scenarios
- **Documentation and best practices** for future hook development

### **Business Impact**
- **Prevent data corruption** in high-traffic scenarios
- **Ensure order integrity** during peak usage periods
- **Maintain real-time data consistency** across multiple users
- **Reduce production bugs** related to concurrent operations

---

**🚀 Ready to proceed with Phase 1.2 (useOrders) implementation using the proven useCart methodology!**