# React Query Cache Collision Investigation

**Date**: 2025-08-19  
**Issue**: Products showing undefined names after checkout operations  
**Root Cause**: Query key collision between two different hooks  
**Status**: ✅ RESOLVED  

## 📋 Problem Summary

Products would load correctly on initial page load, but after completing checkout operations, all products would suddenly have `undefined` names, causing UI filtering to break and products to disappear from the shop screen.

**Key Symptoms:**
```javascript
// Console logs after checkout
⚠️ Filtering out invalid product: {id: undefined, name: undefined, nameType: 'undefined'}
❌ Found products with undefined names: (18) [{…}, {…}, {…}, ...]
```

## 🔍 Investigation Process

### Step 1: Initial Hypothesis - Validation Issues
**Assumption**: Zod validation was failing due to recent schema changes  
**Evidence Against**: Other validation was working correctly (order validation showing proper Zod errors)  
**Conclusion**: Validation system was functioning properly

### Step 2: Systematic Validation Audit
**Actions Taken**:
- Fixed product service queries (removed complex JOINs)
- Updated cart service to use simplified queries  
- Removed non-existent `images` column from select statements
- Ensured consistent `category` vs `category_id` field usage

**Result**: Initial load worked, but post-checkout refetch still broken

### Step 3: Timing Analysis Breakthrough
**Key Insight**: Issue only occurred "after order confirmation screen.. after a while"  
**This pointed to**: Post-checkout cache invalidation, not initial load

### Step 4: Network Request Comparison
**Critical Discovery**: Two completely different network requests

**Initial Load (Working)**:
```
GET /products?select=id,name,description,price,stock_quantity,category,image_url,is_available,is_pre_order,min_pre_order_quantity,max_pre_order_quantity,unit,weight,sku,tags,created_at,updated_at&is_available=eq.true&order=name.asc
```

**Post-Checkout Refetch (Broken)**:
```
GET /products?select=id,stock_quantity,is_pre_order,min_pre_order_quantity,max_pre_order_quantity&is_available=eq.true
```

**Smoking Gun**: The refetch was using a completely different query with only 5 fields!

## 🚨 Root Cause Analysis

### The Cache Collision
```typescript
// useProducts.ts - Full product data
const productsQuery = useQuery({
  queryKey: ['products'], // ← Same key!
  queryFn: () => getProducts() // Full product fields
});

// useStockValidation.ts - Minimal stock data  
const stockQuery = useQuery({
  queryKey: stockKeys.lists('global'), // ← Resolves to ['products']!
  queryFn: () => supabase
    .from('products')
    .select('id, stock_quantity, is_pre_order, min_pre_order_quantity, max_pre_order_quantity') // Only stock fields
});
```

### The Query Key Factory Issue
```typescript
// useStockValidation.ts
const stockKeys = createQueryKeyFactory({
  entity: 'products', // ← SAME ENTITY AS MAIN PRODUCTS!
  isolation: 'global'
});
```

### The Invalidation Trigger
```typescript
// useCart.ts - clearCart onSuccess
const getRelatedQueryKeys = (userId: string) => [
  cartKeys.all(userId),
  ['products'], // ← Invalidates BOTH hooks!
  ['stock-validation'],
];
```

### The Sequence of Events
1. ✅ User completes checkout successfully
2. ✅ `CheckoutScreen.onSuccess` calls `clearCart()`
3. ✅ Cart clear mutation succeeds
4. ⚠️ **Cart invalidates `['products']` query key**
5. ⚠️ **BOTH useProducts AND useStockValidation refetch**
6. 💥 **React Query cache collision: stock data overwrites full product data**
7. 💥 **UI receives products with only stock fields, names are undefined**

## 🔧 Solution Implementation

### Fix 1: Separate Query Key Entities
```typescript
// useStockValidation.ts - BEFORE
const stockKeys = createQueryKeyFactory({
  entity: 'products', // ❌ Conflicts with main products
  isolation: 'global'
});

// useStockValidation.ts - AFTER  
const stockKeys = createQueryKeyFactory({
  entity: 'stock', // ✅ Separate entity namespace
  isolation: 'global'
});
```

### Fix 2: Targeted Cache Invalidation
```typescript
// useCart.ts - BEFORE
const getRelatedQueryKeys = (userId: string) => [
  cartKeys.all(userId),
  ['products'], // ❌ Broad invalidation causing conflicts
  ['stock-validation'],
];

// useCart.ts - AFTER
const getRelatedQueryKeys = (userId: string) => [
  cartKeys.all(userId),
  ['stock'], // ✅ Only invalidate stock validation
  ['orders'],
];
```

### Fix 3: Explicit Query Key Override
```typescript
// useStockValidation.ts - Additional safety measure
const stockQueryKey = ['products', 'stock', user.id]; // ✅ Explicitly separate from ['products']
```

## 🎯 Key Learnings

### 1. React Query Cache Key Hygiene
**Rule**: Different data shapes MUST use different query keys
```typescript
// ❌ BAD - Same key, different data shapes
['products'] → Full product objects
['products'] → Minimal stock objects  

// ✅ GOOD - Different keys for different data
['products'] → Full product objects
['products', 'stock'] → Minimal stock objects
```

### 2. Query Key Factory Collision Risks
**Problem**: Entity-based factories can create unexpected collisions
```typescript
// Both resolve to ['products'] - COLLISION!
createQueryKeyFactory({ entity: 'products', isolation: 'global' })
createQueryKeyFactory({ entity: 'products', isolation: 'user-specific' })
```

**Solution**: Use specific entity names or explicit overrides

### 3. Cache Invalidation Blast Radius
**Problem**: Broad invalidations can trigger unintended refetches
```typescript
// ❌ Invalidates everything products-related
queryClient.invalidateQueries({ queryKey: ['products'] });

// ✅ Surgical invalidation
queryClient.invalidateQueries({ queryKey: ['products', 'stock'] });
```

### 4. Network Request Debugging
**Method**: Compare URLs between working and broken scenarios
- Initial load vs. refetch requests
- Look for completely different select fields
- Identify which hook/service is making each request

### 5. Timing-Based Bug Investigation
**Red Flags**: 
- "Works initially but breaks later"
- "Only happens after certain operations"
- "Cache invalidation triggers the issue"

**Strategy**: Focus on mutation `onSuccess` handlers and cache invalidation chains

## 📚 Best Practices Established

### Query Key Naming Convention
```typescript
// Entity separation
['products'] - Full product data
['products', 'stock'] - Stock validation data  
['products', 'detail', id] - Individual product details
['stock'] - General stock operations
```

### Cache Invalidation Patterns
```typescript
// Surgical invalidation - prefer specific keys
queryClient.invalidateQueries({ queryKey: ['products', 'stock'] });

// Avoid broad patterns that can cause collisions  
queryClient.invalidateQueries({ queryKey: ['products'] }); // Too broad
```

### Hook Separation of Concerns
```typescript
// Each hook should own its data domain
useProducts() → Full product data for UI
useStockValidation() → Stock-specific data for validation
useCart() → Cart operations and state
```

## 🚀 Impact and Results

**Before Fix**:
- ❌ Products disappeared after checkout
- ❌ UI showed undefined product names
- ❌ User experience broken post-purchase

**After Fix**:
- ✅ Products maintain full data integrity
- ✅ No cache collisions between hooks
- ✅ Checkout flow works seamlessly
- ✅ Stock validation operates independently

## 🔄 Prevention Strategies

1. **Query Key Auditing**: Regular review of all query keys for potential collisions
2. **Network Request Monitoring**: Compare request patterns in different scenarios  
3. **Cache Invalidation Reviews**: Ensure invalidations are surgical, not broad
4. **Hook Responsibility Mapping**: Clear ownership of data domains
5. **Integration Testing**: Test full user flows, not just individual components

## 🎓 Meta-Learning

This investigation demonstrates the importance of:
- **Systematic debugging**: From validation → timing → network → cache analysis
- **Evidence-based investigation**: Network requests revealed the truth vs. assumptions
- **Root cause focus**: Not stopping at symptoms but finding the exact collision point
- **Holistic thinking**: Understanding how multiple systems interact (React Query + multiple hooks)

The solution wasn't complex code, but **identifying the exact intersection** where two reasonable designs created an unreasonable interaction.