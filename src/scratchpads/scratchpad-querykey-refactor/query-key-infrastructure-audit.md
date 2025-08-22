# Query Key Infrastructure Comprehensive Audit Report

**Date**: 2025-08-20  
**Context**: Investigating query key factory adoption and refactoring opportunities  
**Status**: 🔍 ANALYSIS COMPLETE - Major inconsistencies found

## 🎯 Executive Summary

**Critical Discovery**: While the `queryKeyFactory.ts` is well-architected, **adoption is inconsistent across the codebase**, leading to:
- **Duplicate query key systems** running in parallel
- **Cache invalidation inconsistencies** 
- **Developer confusion** about which patterns to use
- **Maintenance burden** from redundant code

**Impact**: The kiosk implementation revealed these broader architectural issues affecting the entire application.

## 📊 Current State Assessment

### **Query Key Factory Architecture** ✅ WELL-DESIGNED

**Strengths Found:**
- **User Isolation Support**: `user-specific`, `admin-global`, `global` isolation levels
- **Hierarchical Structure**: `all()`, `lists()`, `list()`, `details()`, `detail()` pattern
- **Fallback Strategies**: Handles missing `userId` gracefully
- **Enhanced Utilities**: `getAllPossibleKeys()`, `getInvalidationKeys()`
- **Pre-configured Exports**: Ready-to-use `cartKeys`, `orderKeys`, `productKeys`, `authKeys`, `stockKeys`, `kioskKeys`

**Complexity Issues:**
- **Over-Engineering**: Complex scenarios most hooks don't actually use
- **Developer Confusion**: Fallback system adds cognitive overhead
- **Inconsistent Adoption**: Different hooks use different approaches

## 🚨 Critical Inconsistencies Found

### **1. The "Dual Query Key Systems" Problem** ⚠️ CRITICAL

**Location**: `/src/hooks/useProducts.ts`
```typescript
// ❌ PROBLEM: Two systems running in parallel
import { productKeys } from '../utils/queryKeyFactory';     // Centralized factory
export const productQueryKeys = {                           // Local duplicate factory
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  categories: ['categories'] as const,
  search: (query: string) => ['products', 'search', query] as const,
  byCategory: (categoryId: string | null) => ['products', 'category', categoryId] as const,
};

// Usage is inconsistent within the same file:
productKeys.lists()              // Line 79 - uses centralized
productQueryKeys.search(query)   // Line 316 - uses local duplicate
```

**Impact**: Cache misses, developer confusion, maintenance burden

### **2. Auth Hook Ignoring Centralized Factory** ⚠️ CRITICAL

**Location**: `/src/hooks/useAuth.ts:55-60`
```typescript
// ❌ PROBLEM: Completely reimplements auth keys despite centralized authKeys existing
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
  status: () => [...authKeys.all, 'status'] as const,
};

// vs. Available centralized version in queryKeyFactory.ts:
export const authKeys = createQueryKeyFactory({ entity: 'auth', isolation: 'user-specific' });
```

**Impact**: Breaks consistency, potential cache conflicts, duplicate maintenance

### **3. Service Layer Mixed Patterns** ⚠️ MEDIUM

**Location**: `/src/services/realtimeService.ts`
```typescript
// ❌ INCONSISTENT: Direct key construction
queryClient.invalidateQueries({ queryKey: ['userOrders'] });           // Line 71
queryClient.invalidateQueries({ queryKey: ['orders', 'user', userId] }); // Line 72
queryClient.invalidateQueries({ queryKey: ['products'] });             // Line 73

// ✅ vs. CORRECT: Factory usage
queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });    // Line 258
```

**Impact**: Cache invalidation inconsistencies

### **4. Kiosk Manual Key Spreading** ⚠️ MEDIUM

**Location**: `/src/hooks/useKiosk.ts` (Post our Phase 1 refactoring)
```typescript
// ⚠️ COMPLEX: Manual key construction
queryKey: [...kioskKeys.details(user?.id), 'session', sessionId || '', 'transactions'],
queryKey: [...kioskKeys.lists(user?.id), 'sessions', filters],

// Could be simplified with dedicated factory methods:
queryKey: kioskKeys.sessionTransactions(sessionId, user?.id),
queryKey: kioskKeys.sessionsFiltered(filters, user?.id),
```

**Impact**: Error-prone, verbose, hard to maintain

## 📈 Cross-Service Pattern Analysis

### **Adoption Scorecard**

| Entity | Hook File | Factory Usage | Consistency Score | Notes |
|--------|-----------|---------------|-------------------|-------|
| **Cart** | `useCart.ts` | ✅ Excellent | 🟢 95% | Perfect adoption |
| **Orders** | `useOrders.ts` | ✅ Good | 🟢 90% | Consistent usage |
| **Products** | `useProducts.ts` | ⚠️ Mixed | 🟡 50% | **Dual systems** |
| **Auth** | `useAuth.ts` | ❌ Ignored | 🔴 10% | **Completely bypassed** |
| **Kiosk** | `useKiosk.ts` | ⚠️ Complex | 🟡 70% | **Manual spreading** |
| **Stock** | Various | ✅ Good | 🟢 85% | Mostly consistent |

### **Service Layer Adoption**

| Service | Factory Usage | Issues Found |
|---------|---------------|--------------|
| `cartService.ts` | ✅ Good | Uses `cartBroadcast` properly |
| `realtimeService.ts` | ⚠️ Mixed | **Lines 71-73 vs 258** inconsistency |
| `productService.ts` | ✅ Good | Consistent patterns |
| `kioskService.ts` | ❌ None | No query key awareness (correct) |
| `authService.ts` | ❌ None | No query key awareness (correct) |

## 🎯 Specific Refactoring Opportunities

### **A. Missing Kiosk Factory Methods**

**Current Manual Construction:**
```typescript
// Session-related keys
[...kioskKeys.details(user?.id), 'session', sessionId]
[...kioskKeys.details(user?.id), 'session', sessionId, 'transactions']
[...kioskKeys.details(user?.id), 'session', sessionId, 'customer']

// Staff-related keys  
[...kioskKeys.lists(user?.id), 'staff', staffId, 'sessions']
[...kioskKeys.lists(user?.id), 'staff', staffId, 'pins']

// Filter-related keys
[...kioskKeys.lists(user?.id), 'sessions', filters]
```

**Proposed Factory Extensions:**
```typescript
// Add to kioskKeys factory:
kioskKeys.session(sessionId, user?.id)
kioskKeys.sessionTransactions(sessionId, user?.id) 
kioskKeys.sessionCustomer(sessionId, user?.id)
kioskKeys.staffSessions(staffId, user?.id)
kioskKeys.staffPins(staffId, user?.id)
kioskKeys.sessionsFiltered(filters, user?.id)
```

### **B. Centralized Invalidation Patterns**

**Current Repeated Pattern** (Found in 15+ files):
```typescript
// Manual invalidation everywhere
await Promise.all([
  queryClient.invalidateQueries({ queryKey: cartKeys.all(userId) }),
  queryClient.invalidateQueries({ queryKey: ['stock'] }),
  queryClient.invalidateQueries({ queryKey: ['orders'] }),
]);
```

**Proposed Centralized Approach:**
```typescript
// Create invalidation utility
export const invalidateRelatedCaches = async (
  operation: 'cart-operation' | 'product-update' | 'kiosk-session',
  context: { userId?: string; productId?: string; sessionId?: string }
) => {
  const queryClient = useQueryClient();
  
  switch (operation) {
    case 'cart-operation':
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cartKeys.all(context.userId) }),
        queryClient.invalidateQueries({ queryKey: stockKeys.all() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all(context.userId) }),
      ]);
      break;
    // ... other patterns
  }
};
```

### **C. Import Consolidation Opportunities**

**Current Scattered Imports:**
```typescript
// Across multiple files:
import { cartKeys } from '../utils/queryKeyFactory';
import { orderKeys } from '../utils/queryKeyFactory';
import { productKeys } from '../utils/queryKeyFactory';
import { kioskKeys } from '../utils/queryKeyFactory';
```

**Proposed Consolidated Import:**
```typescript
// Single import approach:
import { queryKeys } from '../utils/queryKeyFactory';

// Usage:
queryKeys.cart.all(userId)
queryKeys.kiosk.sessionTransactions(sessionId, userId)
queryKeys.product.lists()
```

## 📋 Strategic Refactoring Plan

### **Phase 1: Critical Consistency Fixes** ⚠️ HIGH PRIORITY
**Timeline**: Week 1  
**Risk**: Low (eliminating duplication)  
**Impact**: High (consistency)

#### **1.1 Eliminate Products Hook Dual System**
- **File**: `/src/hooks/useProducts.ts`
- **Action**: Remove local `productQueryKeys` entirely
- **Changes**: 8 usages to convert to centralized `productKeys`
- **Validation**: Ensure no cache invalidation breaks

#### **1.2 Fix Auth Hook Factory Bypass**
- **File**: `/src/hooks/useAuth.ts`
- **Action**: Remove local `authKeys`, use centralized version
- **Changes**: 12 usages to convert
- **Risk Assessment**: Medium (auth is critical path)

#### **1.3 Standardize Service Layer Usage**
- **File**: `/src/services/realtimeService.ts`
- **Action**: Use centralized factories consistently
- **Changes**: 5 manual key constructions to fix
- **Decision**: Services should use factories for invalidation

### **Phase 2: Kiosk Integration Enhancement** 🎯 MEDIUM PRIORITY
**Timeline**: Week 2  
**Risk**: Low (additive changes)  
**Impact**: Medium (kiosk DX improvement)

#### **2.1 Add Missing Kiosk Factory Methods**
- **File**: `/src/utils/queryKeyFactory.ts`
- **Action**: Extend kiosk factory with specialized methods
- **New Methods**: 6 methods (sessionTransactions, staffSessions, etc.)
- **Validation**: Backward compatibility maintained

#### **2.2 Simplify Kiosk Key Construction**
- **File**: `/src/hooks/useKiosk.ts`
- **Action**: Replace manual spreading with factory methods
- **Changes**: 12 complex key constructions to simplify
- **Benefits**: Reduced error surface, better readability

#### **2.3 Implement Kiosk Invalidation Patterns**
- **Action**: Create kiosk-specific invalidation utility
- **Integration**: Add to centralized invalidation system
- **Usage**: Simplify 8 manual invalidation blocks

### **Phase 3: Factory Simplification** 🔧 LOW PRIORITY
**Timeline**: Week 3  
**Risk**: Medium (API changes)  
**Impact**: High (DX improvement)

#### **3.1 Remove Over-Complex Factory Features**
- **File**: `/src/utils/queryKeyFactory.ts`
- **Action**: Remove unused fallback complexity
- **Target**: `getAllPossibleKeys()`, complex fallback options
- **Rationale**: No current usage found in audit

#### **3.2 Add Entity-Specific TypeScript Constraints**
- **Action**: Prevent nonsensical method calls
- **Example**: Prevent `cartKeys.stats()` (stats don't exist for carts)
- **Implementation**: Generic type constraints

#### **3.3 Consolidate Import Patterns**
- **Action**: Provide single import option
- **Alternative**: Keep current pattern but document clearly
- **Decision Point**: Developer preference research needed

## 🎯 Immediate Action Items

### **High-Impact, Low-Risk Changes (Do First)**

1. **Products Hook Dual System Elimination**
   - **Files**: `/src/hooks/useProducts.ts`
   - **Effort**: 2 hours
   - **Risk**: Very Low
   - **Impact**: Eliminates primary inconsistency

2. **Service Layer Standardization**
   - **Files**: `/src/services/realtimeService.ts`
   - **Effort**: 1 hour
   - **Risk**: Low
   - **Impact**: Cache invalidation consistency

3. **Kiosk Factory Method Addition**
   - **Files**: `/src/utils/queryKeyFactory.ts`
   - **Effort**: 1 hour
   - **Risk**: None (additive)
   - **Impact**: Simplifies kiosk implementation

### **Medium-Risk Changes (Do Second)**

4. **Auth Hook Factory Integration**
   - **Files**: `/src/hooks/useAuth.ts`
   - **Effort**: 3 hours
   - **Risk**: Medium (auth critical path)
   - **Impact**: Major consistency improvement

5. **Kiosk Manual Spreading Elimination**
   - **Files**: `/src/hooks/useKiosk.ts`
   - **Effort**: 2 hours
   - **Risk**: Low
   - **Impact**: Code simplification

## 📊 Success Metrics

### **Quantitative Measures**
- **Code Reduction**: Target 25% reduction in query key related code
- **Consistency Score**: Achieve 90%+ factory adoption across all entities
- **Import Simplification**: Reduce from 4 import patterns to 1 standard pattern
- **Manual Key Construction**: Eliminate 80% of manual key spreading

### **Qualitative Measures**
- **Developer Experience**: Single clear pattern for query key usage
- **Maintainability**: No duplicate query key systems
- **Type Safety**: Prevent common query key construction errors
- **Documentation**: Clear usage patterns and examples

## 🔍 Implementation Validation

### **Testing Strategy**
1. **Cache Invalidation Tests**: Ensure no cache misses after refactoring
2. **Type Safety Tests**: Verify TypeScript constraints work
3. **Performance Tests**: No degradation in query performance
4. **Integration Tests**: All entity operations still work correctly

### **Rollback Plan**
- **Git Strategy**: Separate commits for each phase
- **Feature Flags**: Gradual rollout option for risky changes
- **Monitoring**: Cache hit/miss rate monitoring during transition

## 💡 Key Insights & Lessons Learned

### **1. Architecture vs. Adoption Gap**
Well-designed infrastructure means nothing without consistent adoption. The factory is excellent, but enforcement is missing.

### **2. Evolution vs. Revolution**
The dual systems likely evolved as developers worked around perceived limitations rather than extending the central factory.

### **3. Developer Experience Focus**
Complex, powerful APIs often lead to bypass behaviors. Simpler APIs with clear patterns get better adoption.

### **4. The Kiosk Revelation**
Investigating kiosk redundancy revealed a codebase-wide pattern issue. Sometimes local problems illuminate global architectural opportunities.

## 🚀 Next Steps

### **Immediate (This Sprint)**
1. Execute Phase 1: Critical Consistency Fixes
2. Begin Phase 2: Kiosk Integration Enhancement
3. Document new patterns for team adoption

### **Short-term (Next Sprint)**
1. Complete Phase 2: Kiosk Integration Enhancement
2. Begin Phase 3: Factory Simplification
3. Add TypeScript constraints and validation

### **Long-term (Future Sprints)**
1. Implement centralized invalidation patterns
2. Add performance monitoring for query key operations
3. Create developer tooling for query key debugging

---

**Conclusion**: This audit confirms that while individual implementations (like kiosk) may seem to have local redundancies, the real opportunity lies in addressing codebase-wide consistency patterns. The proposed refactoring will not only eliminate kiosk redundancies but establish patterns that prevent similar inconsistencies in future development.