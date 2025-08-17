# Centralized System Migration Guide

## 🎯 Overview

This guide outlines the migration from entity-specific query keys and broadcast patterns to a centralized factory system that ensures consistent user isolation and broadcast routing.

## 🏗️ New Architecture Components

### 1. Query Key Factory (`/src/utils/queryKeyFactory.ts`)
- **Purpose**: Standardized query key generation with user isolation
- **Benefits**: Consistent patterns, type safety, automatic user routing
- **Entities**: Cart, Orders, Products, Auth, Stock

### 2. Broadcast Factory (`/src/utils/broadcastFactory.ts`)
- **Purpose**: Centralized broadcast routing with user/admin targeting
- **Benefits**: Automatic channel routing, consistent error handling
- **Targets**: User-specific, Admin-only, Global

### 3. Entity Query Hooks (`/src/hooks/useEntityQuery.ts`)
- **Purpose**: Reusable query/mutation patterns with automatic broadcast
- **Benefits**: DRY principle, automatic user context, built-in broadcast support

### 4. Centralized Realtime (`/src/services/centralized-realtime.ts`)
- **Purpose**: Single realtime service using factory system
- **Benefits**: User isolation, role-based subscriptions, consistent patterns

## 🔄 Migration Strategy

### Phase 1: Cart System (Priority 1)
**Status**: Ready for migration
**Goal**: Fix cross-user cart contamination

#### Before (Current):
```typescript
// useCart.ts
export const CART_QUERY_KEY = ['cart'];
export const getUserCartQueryKey = (userId: string | undefined) => 
  userId ? [...CART_QUERY_KEY, userId] : CART_QUERY_KEY;

// Manual broadcast in cartService.ts
await BroadcastHelper.sendCartUpdate(event, payload);
```

#### After (New System):
```typescript
// useCart.ts
import { cartKeys, cartBroadcast } from '../utils/queryKeyFactory';
import { useUserEntityQuery, useUserEntityMutation } from './useEntityQuery';

// Automatic user isolation and broadcast
const useCart = () => useUserEntityQuery('cart', cartService.getCart);
const useAddItem = () => useUserEntityMutation('cart', cartService.addItem, 'cart-item-added');
```

### Phase 2: Order System (Priority 2)
**Status**: Ready for migration
**Goal**: Fix cross-user order contamination, proper admin/user isolation

#### Before (Current):
```typescript
// Mixed patterns across hooks
const orderKeys = {
  all: ['orders'] as const,
  userOrders: (userId: string) => [...orderKeys.all, 'user', userId] as const,
};

// Global broadcast causing contamination
await BroadcastHelper.sendOrderUpdate(event, payload);
```

#### After (New System):
```typescript
// Automatic user/admin routing
const useUserOrders = () => useUserEntityQuery('orders', orderService.getUserOrders);
const useAdminOrders = () => useGlobalEntityQuery('orders', orderService.getAllOrders);
const useCreateOrder = () => useUserEntityMutation('orders', orderService.create, 'new-order');
```

### Phase 3: Product System (Priority 3)
**Status**: Ready for migration
**Goal**: Maintain global behavior, standardize patterns

#### Before (Current):
```typescript
// Complex manual query keys
export const productQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...productQueryKeys.details(), id] as const,
  // ... many more
};
```

#### After (New System):
```typescript
// Simplified with factory
const useProducts = () => useGlobalEntityQuery('products', productService.getAll);
const useProduct = (id: string) => useGlobalEntityQuery('products', () => productService.getById(id));
```

## 📋 Migration Checklist

### ✅ Phase 1: Cart Migration
- [ ] Update `useCart.ts` to use `cartKeys` factory
- [ ] Update `cartService.ts` to use `cartBroadcast`
- [ ] Replace manual query keys with factory keys
- [ ] Update all cart mutations to use `useUserEntityMutation`
- [ ] Test cross-user isolation
- [ ] Validate badge count fixes

### ⏳ Phase 2: Order Migration
- [ ] Update `useOrders.ts` to use `orderKeys` factory
- [ ] Update `orderService.ts` to use `orderBroadcast.user` and `orderBroadcast.admin`
- [ ] Separate user vs admin query patterns
- [ ] Update ProfileScreen to use user-specific keys
- [ ] Update AdminScreen to use admin-specific keys
- [ ] Test user/admin isolation

### ⏳ Phase 3: Product Migration
- [ ] Update `useProducts.ts` to use `productKeys` factory
- [ ] Update `productService.ts` to use `productBroadcast`
- [ ] Simplify complex query key patterns
- [ ] Maintain global broadcast behavior
- [ ] Test real-time product updates

### ⏳ Phase 4: Realtime Migration
- [ ] Replace `realtimeService.ts` with `centralized-realtime.ts`
- [ ] Update `App.tsx` to use `useCentralizedRealtime`
- [ ] Remove old realtime service
- [ ] Test all subscription patterns
- [ ] Validate user isolation

## 🧪 Testing Strategy

### 1. Create Migration Test Screen
```typescript
// Test all patterns work correctly
const MigrationTestScreen = () => {
  // Test user isolation
  // Test admin routing
  // Test global broadcasts
  // Test query key consistency
};
```

### 2. Cross-User Testing
- Multiple browser tabs with different users
- Validate cart isolation
- Validate order isolation
- Validate admin-only broadcasts

### 3. Performance Testing
- Query key consistency
- Broadcast efficiency
- Memory usage
- Subscription cleanup

## 🎯 Expected Benefits

### ✅ Consistency
- All entities follow same patterns
- Standardized user isolation
- Consistent broadcast routing

### ✅ Maintainability
- Single source of truth
- Easy to add new entities
- Centralized error handling

### ✅ Type Safety
- Full TypeScript support
- Compile-time validation
- Proper entity typing

### ✅ Bug Prevention
- Automatic user isolation
- Prevents cross-user contamination
- Consistent cache invalidation

## 🚨 Migration Risks

### 1. Breaking Changes
- Query key changes may break existing code
- Broadcast routing changes may affect subscriptions
- Need comprehensive testing

### 2. Performance Impact
- More complex query key generation
- Additional broadcast routing logic
- Monitor for performance regressions

### 3. Learning Curve
- New patterns for developers
- Factory system complexity
- Need good documentation

## 📝 Next Steps

1. **Apply Phase 1 (Cart)**: Fix immediate cross-user contamination
2. **Validate Phase 1**: Comprehensive testing of cart isolation
3. **Apply Phase 2 (Orders)**: Fix order contamination and admin routing
4. **Apply Phase 3 (Products)**: Standardize product patterns
5. **Apply Phase 4 (Realtime)**: Migrate to centralized realtime service
6. **Final Validation**: End-to-end testing of all patterns

## 🔗 Related Files

- `/src/utils/queryKeyFactory.ts` - Query key generation
- `/src/utils/broadcastFactory.ts` - Broadcast routing
- `/src/hooks/useEntityQuery.ts` - Reusable entity patterns
- `/src/services/centralized-realtime.ts` - Centralized subscriptions
- This migration guide for step-by-step process
