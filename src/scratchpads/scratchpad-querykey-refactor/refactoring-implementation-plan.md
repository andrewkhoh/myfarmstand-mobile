# Query Key Infrastructure Refactoring Implementation Plan

**Date**: 2025-08-20  
**Context**: Detailed implementation plan for query key consistency refactoring  
**Status**: 📋 READY FOR EXECUTION

## 🎯 Overview

This document provides the detailed implementation plan for addressing the query key infrastructure inconsistencies identified in the comprehensive audit. The plan is designed to be executed in phases with minimal risk and maximum impact.

## 📊 Refactoring Phases Overview

```
Phase 1: Critical Consistency Fixes (Week 1)
├── 1.1: Products Hook Dual System Elimination
├── 1.2: Service Layer Standardization  
├── 1.3: Auth Hook Factory Integration
└── 1.4: Validation & Testing

Phase 2: Kiosk Integration Enhancement (Week 2)
├── 2.1: Factory Method Extensions
├── 2.2: Kiosk Key Construction Simplification
├── 2.3: Invalidation Pattern Implementation
└── 2.4: Integration Testing

Phase 3: Factory Simplification (Week 3)
├── 3.1: Remove Unused Complexity
├── 3.2: TypeScript Constraint Addition
├── 3.3: Documentation & Guidelines
└── 3.4: Team Training
```

## 🔥 Phase 1: Critical Consistency Fixes

### **1.1 Products Hook Dual System Elimination** ⚠️ HIGH PRIORITY

**Objective**: Remove duplicate query key system in products hook

#### **Files to Modify**:
- `/src/hooks/useProducts.ts`

#### **Current State Analysis**:
```typescript
// ❌ CURRENT: Dual systems
import { productKeys } from '../utils/queryKeyFactory';     // Centralized
export const productQueryKeys = {                           // Local duplicate
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  categories: ['categories'] as const,
  search: (query: string) => ['products', 'search', query] as const,
  byCategory: (categoryId: string | null) => ['products', 'category', categoryId] as const,
};
```

#### **Implementation Steps**:

**Step 1.1.1**: Remove local factory definition
```typescript
// DELETE: Lines 63-72 in useProducts.ts
export const productQueryKeys = { ... };
```

**Step 1.1.2**: Identify all usages of local factory
```bash
# Search for usages:
grep -n "productQueryKeys\." src/hooks/useProducts.ts
```

**Expected Findings**:
- `productQueryKeys.search(searchQuery)` - Line ~316
- `productQueryKeys.byCategory(categoryId)` - Line ~285
- `productQueryKeys.categories` - Line ~201

**Step 1.1.3**: Convert each usage to centralized factory
```typescript
// ❌ BEFORE: Local factory usage
queryKey: productQueryKeys.search(searchQuery),
queryKey: productQueryKeys.byCategory(categoryId),
queryKey: productQueryKeys.categories,

// ✅ AFTER: Centralized factory usage  
queryKey: [...productKeys.lists(), 'search', searchQuery],
queryKey: [...productKeys.lists(), 'category', categoryId],
queryKey: [...productKeys.lists(), 'categories'],
```

**Step 1.1.4**: Check for missing factory methods
If any local methods don't have centralized equivalents, add them to factory:
```typescript
// In /src/utils/queryKeyFactory.ts - if needed
// Add to createQueryKeyFactory result:
search: (query: string, userId?: string) => [...self.lists(userId), 'search', query],
categories: (userId?: string) => [...self.lists(userId), 'categories'],
```

#### **Validation**:
- [ ] All `productQueryKeys` references removed
- [ ] No TypeScript errors
- [ ] Product queries still work correctly
- [ ] Cache invalidation still functions

#### **Risk Assessment**: 🟢 LOW
- Changes are mechanical replacements
- No business logic changes
- Easy to rollback if issues

---

### **1.2 Service Layer Standardization** 🔧 MEDIUM PRIORITY

**Objective**: Standardize query key usage in service layer

#### **Files to Modify**:
- `/src/services/realtimeService.ts`

#### **Current Inconsistencies**:
```typescript
// ❌ INCONSISTENT: Lines 71-73
queryClient.invalidateQueries({ queryKey: ['userOrders'] });
queryClient.invalidateQueries({ queryKey: ['orders', 'user', userId] });
queryClient.invalidateQueries({ queryKey: ['products'] });

// ✅ CORRECT: Line 258
queryClient.invalidateQueries({ queryKey: cartKeys.all(user.id) });
```

#### **Implementation Steps**:

**Step 1.2.1**: Audit all manual key constructions
```bash
# Find manual key constructions in services
grep -r "queryKey: \[" src/services/
grep -r "invalidateQueries.*\[" src/services/
```

**Step 1.2.2**: Replace with factory usage
```typescript
// ❌ BEFORE:
queryClient.invalidateQueries({ queryKey: ['userOrders'] });
queryClient.invalidateQueries({ queryKey: ['orders', 'user', userId] });
queryClient.invalidateQueries({ queryKey: ['products'] });

// ✅ AFTER:
queryClient.invalidateQueries({ queryKey: orderKeys.all(userId) });
queryClient.invalidateQueries({ queryKey: orderKeys.lists(userId) });
queryClient.invalidateQueries({ queryKey: productKeys.all() });
```

**Step 1.2.3**: Add missing imports
```typescript
// Add to service file imports:
import { orderKeys, productKeys } from '../utils/queryKeyFactory';
```

#### **Decision Point**: Service Query Key Awareness
**Options**:
1. **Services use factories for invalidation** (Recommended)
2. **Services return metadata for hooks to handle invalidation**

**Recommendation**: Option 1 - Services can use factories for cache invalidation

#### **Validation**:
- [ ] All manual key constructions replaced
- [ ] Proper imports added
- [ ] Cache invalidation works correctly
- [ ] No performance regressions

#### **Risk Assessment**: 🟡 MEDIUM
- Services touching cache invalidation
- Need careful testing of invalidation patterns

---

### **1.3 Auth Hook Factory Integration** ⚠️ HIGH PRIORITY

**Objective**: Replace local auth key factory with centralized version

#### **Files to Modify**:
- `/src/hooks/useAuth.ts`

#### **Current State**:
```typescript
// ❌ LOCAL: Lines 55-60
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
  status: () => [...authKeys.all, 'status'] as const,
};

// ✅ AVAILABLE: In queryKeyFactory.ts
export const authKeys = createQueryKeyFactory({ entity: 'auth', isolation: 'user-specific' });
```

#### **Implementation Steps**:

**Step 1.3.1**: Remove local auth keys definition
```typescript
// DELETE: Lines 55-60 in useAuth.ts
export const authKeys = { ... };
```

**Step 1.3.2**: Add import for centralized factory
```typescript
// ADD: Import centralized factory
import { authKeys } from '../utils/queryKeyFactory';
```

**Step 1.3.3**: Convert all usages
```bash
# Find all authKeys usages in useAuth.ts
grep -n "authKeys\." src/hooks/useAuth.ts
```

**Expected Conversions**:
```typescript
// ❌ BEFORE:
queryKey: authKeys.user(),
queryKey: authKeys.status(),
queryKey: authKeys.profile(userId),

// ✅ AFTER:
queryKey: authKeys.details(), // or authKeys.detail('user')
queryKey: [...authKeys.lists(), 'status'],
queryKey: [...authKeys.details(userId), 'profile'],
```

**Step 1.3.4**: Handle method mapping differences
The centralized factory may not have exact method matches. Create mapping:
```typescript
// If needed, extend centralized factory with missing methods
// Or use composition patterns:
queryKey: [...authKeys.all(), 'user'],
queryKey: [...authKeys.all(), 'status'], 
queryKey: [...authKeys.lists(userId), 'profile'],
```

#### **Validation**:
- [ ] All local authKeys references removed
- [ ] Import added correctly
- [ ] All auth queries work
- [ ] Login/logout flows functional
- [ ] No authentication regressions

#### **Risk Assessment**: 🟡 MEDIUM-HIGH
- Authentication is critical path
- Need extensive testing
- Potential cache key changes could break sessions

---

### **1.4 Phase 1 Validation & Testing**

#### **Testing Checklist**:
- [ ] **Unit Tests**: All query hooks still work
- [ ] **Integration Tests**: Auth flows work end-to-end
- [ ] **Cache Tests**: Invalidation patterns function correctly
- [ ] **Performance Tests**: No query performance regressions
- [ ] **TypeScript**: No compilation errors
- [ ] **Manual Testing**: All features work in development

#### **Rollback Strategy**:
- Each change in separate git commits
- Feature flags for gradual rollout (if needed)
- Monitoring dashboard for cache hit rates

---

## 🎯 Phase 2: Kiosk Integration Enhancement

### **2.1 Factory Method Extensions** 🔧 MEDIUM PRIORITY

**Objective**: Add missing kiosk-specific methods to centralized factory

#### **Files to Modify**:
- `/src/utils/queryKeyFactory.ts`

#### **Current Kiosk Manual Constructions**:
```typescript
// ❌ CURRENT: Manual spreading in useKiosk.ts
[...kioskKeys.details(user?.id), 'session', sessionId || '']
[...kioskKeys.details(user?.id), 'session', sessionId || '', 'transactions']
[...kioskKeys.lists(user?.id), 'sessions', filters]
[...kioskKeys.lists(user?.id), 'staff', staffId, 'sessions']
```

#### **Implementation Steps**:

**Step 2.1.1**: Extend factory with kiosk-specific methods
```typescript
// In /src/utils/queryKeyFactory.ts
// Modify createQueryKeyFactory to add entity-specific methods

const createKioskSpecificMethods = (self: any) => ({
  // Session-related methods
  session: (sessionId: string, userId?: string) => 
    [...self.details(userId), 'session', sessionId],
  
  sessionTransactions: (sessionId: string, userId?: string) => 
    [...self.details(userId), 'session', sessionId, 'transactions'],
  
  sessionCustomer: (sessionId: string, userId?: string) => 
    [...self.details(userId), 'session', sessionId, 'customer'],
  
  // Staff-related methods
  staffSessions: (staffId: string, userId?: string) => 
    [...self.lists(userId), 'staff', staffId, 'sessions'],
  
  staffPins: (staffId: string, userId?: string) => 
    [...self.lists(userId), 'staff', staffId, 'pins'],
  
  // Filter methods
  sessionsFiltered: (filters: any, userId?: string) => 
    [...self.lists(userId), 'sessions', filters],
});
```

**Step 2.1.2**: Integrate with factory creation
```typescript
// Modify factory creation logic to include entity-specific methods
export const kioskKeys = {
  ...createQueryKeyFactory({ entity: 'kiosk', isolation: 'user-specific' }),
  ...createKioskSpecificMethods(/* factory instance */)
};
```

**Step 2.1.3**: Update TypeScript types
```typescript
// Add types for new methods
interface KioskQueryKeys extends BaseQueryKeys {
  session: (sessionId: string, userId?: string) => readonly string[];
  sessionTransactions: (sessionId: string, userId?: string) => readonly string[];
  sessionCustomer: (sessionId: string, userId?: string) => readonly string[];
  staffSessions: (staffId: string, userId?: string) => readonly string[];
  staffPins: (staffId: string, userId?: string) => readonly string[];
  sessionsFiltered: (filters: any, userId?: string) => readonly string[];
}
```

#### **Validation**:
- [ ] New methods work correctly
- [ ] TypeScript types are correct
- [ ] Backward compatibility maintained
- [ ] No breaking changes for existing usage

---

### **2.2 Kiosk Key Construction Simplification** 🎯 HIGH PRIORITY

**Objective**: Replace manual key spreading with new factory methods

#### **Files to Modify**:
- `/src/hooks/useKiosk.ts`

#### **Implementation Steps**:

**Step 2.2.1**: Replace manual constructions
```typescript
// ❌ BEFORE: Manual spreading
queryKey: [...kioskKeys.details(user?.id), 'session', sessionId || ''],

// ✅ AFTER: Factory method
queryKey: kioskKeys.session(sessionId || '', user?.id),
```

**Step 2.2.2**: Update all kiosk key usages
```bash
# Find all manual spreading patterns
grep -n "kioskKeys\." src/hooks/useKiosk.ts
```

**Expected Replacements**:
```typescript
// Session queries
[...kioskKeys.details(user?.id), 'session', sessionId || '']
→ kioskKeys.session(sessionId || '', user?.id)

// Transaction queries  
[...kioskKeys.details(user?.id), 'session', sessionId || '', 'transactions']
→ kioskKeys.sessionTransactions(sessionId || '', user?.id)

// Filtered sessions
[...kioskKeys.lists(user?.id), 'sessions', filters]
→ kioskKeys.sessionsFiltered(filters, user?.id)
```

**Step 2.2.3**: Update invalidation patterns
```typescript
// ❌ BEFORE:
queryClient.invalidateQueries({ queryKey: [...kioskKeys.details(user?.id), 'session', sessionId] });

// ✅ AFTER:
queryClient.invalidateQueries({ queryKey: kioskKeys.session(sessionId, user?.id) });
```

#### **Validation**:
- [ ] All manual spreading removed
- [ ] Kiosk queries work correctly
- [ ] Cache invalidation functions
- [ ] No query performance issues

---

### **2.3 Invalidation Pattern Implementation** 🔧 LOW PRIORITY

**Objective**: Create centralized invalidation patterns for kiosk operations

#### **Files to Create/Modify**:
- `/src/utils/cacheInvalidation.ts` (new file)
- `/src/hooks/useKiosk.ts`

#### **Implementation Steps**:

**Step 2.3.1**: Create invalidation utility
```typescript
// New file: /src/utils/cacheInvalidation.ts
import { useQueryClient } from '@tanstack/react-query';
import { kioskKeys, cartKeys, orderKeys, productKeys } from './queryKeyFactory';

export const invalidateRelatedCaches = async (
  operation: 'kiosk-session-start' | 'kiosk-session-end' | 'kiosk-transaction',
  context: { userId?: string; sessionId?: string; productIds?: string[] }
) => {
  const queryClient = useQueryClient();
  
  switch (operation) {
    case 'kiosk-session-start':
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: kioskKeys.lists(context.userId) }),
        queryClient.invalidateQueries({ queryKey: kioskKeys.staffSessions(context.userId, context.userId) }),
      ]);
      break;
      
    case 'kiosk-session-end':
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: kioskKeys.session(context.sessionId!, context.userId) }),
        queryClient.invalidateQueries({ queryKey: kioskKeys.lists(context.userId) }),
      ]);
      break;
      
    case 'kiosk-transaction':
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: kioskKeys.sessionTransactions(context.sessionId!, context.userId) }),
        queryClient.invalidateQueries({ queryKey: productKeys.all() }), // Update stock
      ]);
      break;
  }
};
```

**Step 2.3.2**: Use in kiosk hook
```typescript
// In useKiosk.ts
import { invalidateRelatedCaches } from '../utils/cacheInvalidation';

// Replace manual invalidation blocks with:
await invalidateRelatedCaches('kiosk-session-start', { userId: user?.id, sessionId });
```

#### **Validation**:
- [ ] Invalidation patterns work correctly
- [ ] Performance is not degraded
- [ ] Cache consistency maintained

---

## 🔧 Phase 3: Factory Simplification

### **3.1 Remove Unused Complexity** 📉 LOW PRIORITY

**Objective**: Remove over-engineered features that aren't used

#### **Analysis Required**:
```bash
# Find usage of complex features
grep -r "getAllPossibleKeys" src/
grep -r "getInvalidationKeys" src/
grep -r "fallbackToGlobal" src/
```

**If no usage found, remove**:
- `getAllPossibleKeys()` method
- `getInvalidationKeys()` method  
- Complex fallback options
- Unused configuration parameters

---

### **3.2 TypeScript Constraint Addition** 🔒 MEDIUM PRIORITY

**Objective**: Add type safety to prevent incorrect factory usage

#### **Implementation**:
```typescript
// Add entity-specific constraints
interface CartQueryKeys {
  // Cart-specific methods only
  items: (userId?: string) => readonly string[];
  checkout: (userId?: string) => readonly string[];
  // Prevent: stats(), session(), etc.
}

interface KioskQueryKeys {
  // Kiosk-specific methods only
  session: (sessionId: string, userId?: string) => readonly string[];
  staffSessions: (staffId: string, userId?: string) => readonly string[];
  // Prevent: items(), checkout(), etc.
}
```

---

### **3.3 Documentation & Guidelines** 📚 HIGH PRIORITY

**Files to Create**:
- `/docs/query-key-patterns.md`
- `/docs/cache-invalidation-guide.md`

**Content**: Usage patterns, examples, best practices

---

## 📊 Implementation Timeline

### **Week 1: Phase 1 Execution**
- **Day 1-2**: Products hook dual system elimination
- **Day 3**: Service layer standardization
- **Day 4-5**: Auth hook factory integration
- **Day 5**: Testing and validation

### **Week 2: Phase 2 Execution**
- **Day 1-2**: Factory method extensions
- **Day 3-4**: Kiosk key construction simplification
- **Day 5**: Invalidation pattern implementation

### **Week 3: Phase 3 Execution**
- **Day 1-2**: Remove unused complexity
- **Day 3**: TypeScript constraint addition
- **Day 4-5**: Documentation and team training

## 🎯 Success Metrics

### **Quantitative Goals**:
- [ ] **Code Reduction**: 25% reduction in query key related code
- [ ] **Consistency**: 90%+ factory adoption across entities
- [ ] **Manual Construction**: Eliminate 80% of manual key spreading
- [ ] **Import Simplification**: Single import pattern adoption

### **Qualitative Goals**:
- [ ] **Developer Experience**: Clear, consistent patterns
- [ ] **Maintainability**: No duplicate systems
- [ ] **Type Safety**: Prevent common errors
- [ ] **Performance**: No query performance regressions

## 🚨 Risk Mitigation

### **High-Risk Items**:
1. **Auth Hook Changes**: Extensive testing required
2. **Cache Invalidation**: Monitor hit/miss rates
3. **TypeScript Changes**: Ensure no compilation breaks

### **Mitigation Strategies**:
- Separate git commits for each change
- Feature flags for gradual rollout
- Rollback procedures documented
- Monitoring dashboards in place

---

**Next Action**: Begin Phase 1.1 - Products Hook Dual System Elimination