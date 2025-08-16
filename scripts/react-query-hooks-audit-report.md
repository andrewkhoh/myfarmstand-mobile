# React Query Hooks Audit Report

Generated: 2025-08-16T13:58:38.315Z
Standard: useCart.ts patterns

## Executive Summary
- Hooks audited: 12 files
- Total hooks: 39
- Average conformance: 36%
- Standard: useCart.ts (100% baseline)

## Hooks by Conformance Score

### ❌ src/hooks/useEntityQuery.ts (10%)

**Hooks:** useEntityQuery, useEntityMutation, useUserEntityQuery, useGlobalEntityQuery, useUserEntityMutation, useGlobalEntityMutation

**Missing Patterns:**
- Stale Time Configuration
- GC Time Configuration
- Refetch Configuration
- Enabled Guard
- Optimistic Updates (onMutate)
- Query Cancellation
- Previous Data Snapshot
- Optimistic Cache Update
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- Authentication Guard
- isPending State
- Mutate & MutateAsync
- Error Handling
- useCallback Usage
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 22, 58, 59, 60)
- ✅ User Context Usage (lines: 18, 39)

**Recommendations:**
- Add Authentication Guard pattern following useCart.ts standard
- Add Optimistic Updates (onMutate) pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Add staleTime configuration with readable time calculation (e.g., 2 * 60 * 1000)
- Add broadcast support for real-time synchronization

---

### ❌ src/hooks/useRealtime.ts (10%)

**Hooks:** useRealtime, useRealtimeNotifications

**Missing Patterns:**
- Query Key Factory Usage
- Stale Time Configuration
- GC Time Configuration
- Refetch Configuration
- Enabled Guard
- Optimistic Updates (onMutate)
- Query Cancellation
- Previous Data Snapshot
- Optimistic Cache Update
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- isPending State
- Mutate & MutateAsync
- Error Handling
- useCallback Usage
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Authentication Guard (lines: 40)
- ✅ User Context Usage (lines: 10)

**Recommendations:**
- Add Query Key Factory Usage pattern following useCart.ts standard
- Add Optimistic Updates (onMutate) pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Import React Query hooks from @tanstack/react-query

---

### ❌ src/hooks/useStockValidation.ts (10%)

**Hooks:** useStockValidation

**Missing Patterns:**
- Query Key Factory Usage
- Stale Time Configuration
- Enabled Guard
- Optimistic Updates (onMutate)
- Query Cancellation
- Previous Data Snapshot
- Optimistic Cache Update
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- Authentication Guard
- User Context Usage
- isPending State
- Mutate & MutateAsync
- Error Handling
- useCallback Usage
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ GC Time Configuration (lines: 57)
- ✅ Refetch Configuration (lines: 59)

**Recommendations:**
- Add Query Key Factory Usage pattern following useCart.ts standard
- Add Authentication Guard pattern following useCart.ts standard
- Add Optimistic Updates (onMutate) pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Add staleTime configuration with readable time calculation (e.g., 2 * 60 * 1000)

---

### ❌ src/hooks/useCentralizedRealtime.ts (15%)

**Hooks:** useCentralizedRealtime, useForceRefreshUserData

**Missing Patterns:**
- Stale Time Configuration
- GC Time Configuration
- Refetch Configuration
- Enabled Guard
- Optimistic Updates (onMutate)
- Query Cancellation
- Previous Data Snapshot
- Optimistic Cache Update
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- isPending State
- Mutate & MutateAsync
- Error Handling
- useCallback Usage
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 66, 74, 82, 90, 118, 126, 152, 160, 191, 199, 207, 235, 236, 239)
- ✅ Authentication Guard (lines: 16, 44, 101, 230)
- ✅ User Context Usage (lines: 10, 227)

**Recommendations:**
- Add Optimistic Updates (onMutate) pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Add staleTime configuration with readable time calculation (e.g., 2 * 60 * 1000)

---

### ❌ src/hooks/useProducts.ts (20%)

**Hooks:** useProducts, useProduct, useProductSearch, useProductById, useCategories, useProductsByCategory

**Missing Patterns:**
- Refetch Configuration
- Optimistic Updates (onMutate)
- Query Cancellation
- Previous Data Snapshot
- Optimistic Cache Update
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- Authentication Guard
- User Context Usage
- isPending State
- Mutate & MutateAsync
- Error Handling
- useCallback Usage
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 14, 15, 16, 17, 26, 44, 61, 78, 95, 113)
- ✅ Stale Time Configuration (lines: 34, 53, 70, 87, 103, 125)
- ✅ GC Time Configuration (lines: 35, 54, 71, 88, 104, 126)
- ✅ Enabled Guard (lines: 52, 69, 86, 124)

**Recommendations:**
- Add Authentication Guard pattern following useCart.ts standard
- Add Optimistic Updates (onMutate) pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard

---

### ❌ src/hooks/useErrorRecovery.ts (40%)

**Hooks:** useErrorRecovery

**Missing Patterns:**
- Stale Time Configuration
- GC Time Configuration
- Refetch Configuration
- Enabled Guard
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- Authentication Guard
- Mutate & MutateAsync
- Error Handling
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 10, 11, 98)
- ✅ Optimistic Updates (onMutate) (lines: 26)
- ✅ Query Cancellation (lines: 28, 29, 30)
- ✅ Previous Data Snapshot (lines: 33, 34, 35)
- ✅ Optimistic Cache Update (lines: 45, 68, 71, 74)
- ✅ User Context Usage (lines: 19)
- ✅ isPending State (lines: 102)
- ✅ useCallback Usage (lines: 2, 81, 97, 98)

**Recommendations:**
- Add Authentication Guard pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Add staleTime configuration with readable time calculation (e.g., 2 * 60 * 1000)
- Add broadcast support for real-time synchronization

---

### ❌ src/hooks/useNoShowHandling.ts (40%)

**Hooks:** useNoShowHandling

**Missing Patterns:**
- Stale Time Configuration
- GC Time Configuration
- Refetch Configuration
- Enabled Guard
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- Authentication Guard
- Mutate & MutateAsync
- Error Handling
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 11, 12, 124)
- ✅ Optimistic Updates (onMutate) (lines: 26)
- ✅ Query Cancellation (lines: 28, 29)
- ✅ Previous Data Snapshot (lines: 32, 33)
- ✅ Optimistic Cache Update (lines: 62, 65)
- ✅ User Context Usage (lines: 20)
- ✅ isPending State (lines: 109, 110)
- ✅ useCallback Usage (lines: 2, 92)

**Recommendations:**
- Add Authentication Guard pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Add staleTime configuration with readable time calculation (e.g., 2 * 60 * 1000)
- Add broadcast support for real-time synchronization

---

### ❌ src/hooks/usePickupRescheduling.ts (40%)

**Hooks:** usePickupRescheduling

**Missing Patterns:**
- Stale Time Configuration
- GC Time Configuration
- Refetch Configuration
- Enabled Guard
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- Authentication Guard
- Mutate & MutateAsync
- Error Handling
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 11, 124)
- ✅ Optimistic Updates (onMutate) (lines: 25)
- ✅ Query Cancellation (lines: 27, 28)
- ✅ Previous Data Snapshot (lines: 31, 32)
- ✅ Optimistic Cache Update (lines: 35, 43, 74, 77)
- ✅ User Context Usage (lines: 19)
- ✅ isPending State (lines: 112)
- ✅ useCallback Usage (lines: 2, 83, 93)

**Recommendations:**
- Add Authentication Guard pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Add staleTime configuration with readable time calculation (e.g., 2 * 60 * 1000)
- Add broadcast support for real-time synchronization

---

### ❌ src/hooks/useAuth.ts (55%)

**Hooks:** useLoginMutation, useRegisterMutation, useLogoutMutation, useUpdateProfileMutation, useChangePasswordMutation, useCurrentUser, useAuthStatus, useRefreshTokenMutation, useAuthOperations

**Missing Patterns:**
- Enabled Guard
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- Authentication Guard
- Mutate & MutateAsync
- useCallback Usage
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 8, 9, 26, 28, 59, 62, 68, 87, 89, 97, 98, 115, 118, 123, 132, 138, 143, 169, 183)
- ✅ Stale Time Configuration (lines: 171)
- ✅ GC Time Configuration (lines: 172)
- ✅ Refetch Configuration (lines: 174, 188)
- ✅ Optimistic Updates (onMutate) (lines: 113)
- ✅ Query Cancellation (lines: 115)
- ✅ Previous Data Snapshot (lines: 118)
- ✅ Optimistic Cache Update (lines: 26, 59, 87, 97, 123, 132, 138)
- ✅ User Context Usage (lines: 221)
- ✅ isPending State (lines: 233, 234, 235, 236, 237)
- ✅ Error Handling (lines: 31, 66, 95, 159, 205)

**Recommendations:**
- Add Authentication Guard pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Add broadcast support for real-time synchronization

---

### ⚠️ src/hooks/useNotifications.ts (60%)

**Hooks:** useNotifications

**Missing Patterns:**
- Refetch Configuration
- Enabled Guard
- Rollback on Error
- Invalidate on Success
- Mutate & MutateAsync
- Error Handling
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 76, 94, 126, 129, 142, 165, 173, 189, 192, 195, 216, 224, 230)
- ✅ Stale Time Configuration (lines: 88, 115)
- ✅ GC Time Configuration (lines: 89, 116)
- ✅ Optimistic Updates (onMutate) (lines: 124, 187)
- ✅ Query Cancellation (lines: 126, 189)
- ✅ Previous Data Snapshot (lines: 129, 192)
- ✅ Optimistic Cache Update (lines: 142, 173, 195, 224)
- ✅ Broadcast Support (lines: 154, 207)
- ✅ Authentication Guard (lines: 52)
- ✅ User Context Usage (lines: 49)
- ✅ isPending State (lines: 234, 236)
- ✅ useCallback Usage (lines: 2, 229, 230)

**Recommendations:**
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard

---

### ⚠️ src/hooks/useOrders.ts (65%)

**Hooks:** useCustomerOrders, useOrders, useOrder, useOrderStats, useUserOrders, useUpdateOrderStatusMutation, useBulkUpdateOrderStatusMutation, useOrderOperations

**Missing Patterns:**
- Rollback on Error
- Broadcast Support
- Invalidate on Success
- Authentication Guard
- Mutate & MutateAsync
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 56, 69, 81, 183, 184, 187, 196, 247, 250)
- ✅ Stale Time Configuration (lines: 12, 84)
- ✅ GC Time Configuration (lines: 13)
- ✅ Refetch Configuration (lines: 15, 16)
- ✅ Enabled Guard (lines: 47, 72, 96)
- ✅ Optimistic Updates (onMutate) (lines: 111, 180)
- ✅ Query Cancellation (lines: 113, 114, 181)
- ✅ Previous Data Snapshot (lines: 117, 118, 119, 183, 184)
- ✅ Optimistic Cache Update (lines: 122, 130, 138, 156, 159, 162, 187, 196, 247, 250)
- ✅ User Context Usage (lines: 23, 174)
- ✅ isPending State (lines: 34, 271, 272)
- ✅ Error Handling (lines: 32, 39)
- ✅ useCallback Usage (lines: 2)

**Recommendations:**
- Add Authentication Guard pattern following useCart.ts standard
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard
- Add broadcast support for real-time synchronization

---

### ⚠️ src/hooks/useCart.ts (70%)

**Hooks:** useCart

**Missing Patterns:**
- Enabled Guard
- Rollback on Error
- Invalidate on Success
- Mutate & MutateAsync
- Typed Query Function
- Typed Mutation Function

**Present Patterns:**
- ✅ Query Key Factory Usage (lines: 41, 210)
- ✅ Stale Time Configuration (lines: 51)
- ✅ GC Time Configuration (lines: 52)
- ✅ Refetch Configuration (lines: 53, 54)
- ✅ Optimistic Updates (onMutate) (lines: 61, 107, 140, 178)
- ✅ Query Cancellation (lines: 62, 108, 141, 179)
- ✅ Previous Data Snapshot (lines: 64, 110, 143, 181)
- ✅ Optimistic Cache Update (lines: 83, 89, 116, 122, 154, 160, 184, 191)
- ✅ Broadcast Support (lines: 94, 127, 165, 195)
- ✅ Authentication Guard (lines: 13)
- ✅ User Context Usage (lines: 11)
- ✅ isPending State (lines: 219, 220, 221, 222)
- ✅ Error Handling (lines: 18, 188)
- ✅ useCallback Usage (lines: 2, 210)

**Recommendations:**
- Add Rollback on Error pattern following useCart.ts standard
- Add Invalidate on Success pattern following useCart.ts standard

---

## Pattern Adoption Summary

- ✅ **Query Key Factory Usage**: 10/12 files (83%)
- ✅ **User Context Usage**: 10/12 files (83%)
- ⚠️ **Optimistic Updates (onMutate)**: 7/12 files (58%)
- ⚠️ **Query Cancellation**: 7/12 files (58%)
- ⚠️ **Previous Data Snapshot**: 7/12 files (58%)
- ⚠️ **Optimistic Cache Update**: 7/12 files (58%)
- ⚠️ **isPending State**: 7/12 files (58%)
- ⚠️ **GC Time Configuration**: 6/12 files (50%)
- ⚠️ **useCallback Usage**: 6/12 files (50%)
- ❌ **Stale Time Configuration**: 5/12 files (42%)
- ❌ **Refetch Configuration**: 4/12 files (33%)
- ❌ **Authentication Guard**: 4/12 files (33%)
- ❌ **Error Handling**: 3/12 files (25%)
- ❌ **Enabled Guard**: 2/12 files (17%)
- ❌ **Broadcast Support**: 2/12 files (17%)
- ❌ **Rollback on Error**: 0/12 files (0%)
- ❌ **Invalidate on Success**: 0/12 files (0%)
- ❌ **Mutate & MutateAsync**: 0/12 files (0%)
- ❌ **Typed Query Function**: 0/12 files (0%)
- ❌ **Typed Mutation Function**: 0/12 files (0%)

## Key Recommendations

### Most Commonly Missing Patterns

1. **Rollback on Error** - Missing in 12/12 files
2. **Invalidate on Success** - Missing in 12/12 files
3. **Mutate & MutateAsync** - Missing in 12/12 files
4. **Typed Query Function** - Missing in 12/12 files
5. **Typed Mutation Function** - Missing in 12/12 files
