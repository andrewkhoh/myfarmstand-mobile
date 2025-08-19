# Supabase RLS 406 Error Fix - Cart Items Stock Validation

**Date**: 2025-08-19  
**Issue**: Cart items stock validation query returning 406 "Not Acceptable" error  
**Status**: ✅ **RESOLVED**  

---

## 🚨 **Problem Description**

### **Error Manifestation**
```
GET https://okqjoyfnfpafjmeszygi.supabase.co/rest/v1/cart_items?select=quantity&user_id=eq.b9dbfdf5-b6fa-41cd-8cb4-740f986267fd&product_id=eq.650e8400-e29b-41d4-a716-446655440013 406 (Not Acceptable)
```

### **Error Context**
- **Location**: `src/services/cartService.ts:330-334` (stock validation during addItem)
- **Function**: `cartService.addItem()` - checking existing cart quantity before adding new items
- **Trigger**: First-time product additions to cart (when no existing cart_item record exists)
- **User Impact**: Browser console errors (406 HTTP status), though functionality worked correctly

---

## 🔍 **Root Cause Analysis**

### **Technical Cause**
The issue was caused by using `.single()` in the Supabase query for checking existing cart quantities:

```typescript
// PROBLEMATIC CODE
const { data: cartItemData, error } = await supabase
  .from('cart_items')
  .select('quantity')
  .eq('user_id', user.id)
  .eq('product_id', product.id)
  .single(); // ❌ Expects exactly 1 row, errors on 0 rows
```

### **Why `.single()` Failed**
- **PostgREST Behavior**: `.single()` expects exactly one row to be returned
- **Cart Logic**: First-time product additions have zero existing cart items
- **Result**: PostgREST returns 406 "Not Acceptable" when 0 rows found instead of 1
- **Error Code**: `PGRST116: "JSON object requested, multiple (or no) rows returned"`

### **Authentication Red Herring** 
Initial investigation focused on RLS (Row Level Security) policies and authentication because:
- 406 errors often indicate permission/authentication issues
- RLS policies control row-level access in Supabase
- Cart queries involve user-specific data filtering

**Debug findings confirmed authentication was working correctly**:
```typescript
// All authentication checks passed ✅
🔐 Auth verification: {
  userExists: true, 
  userId: 'b9dbfdf5-b6fa-41cd-8cb4-740f986267fd', 
  userEmail: 'admin@ex.com', 
  authError: undefined
}

🔐 Session verification: {
  hasSession: true, 
  sessionUserId: 'b9dbfdf5-b6fa-41cd-8cb4-740f986267fd', 
  sessionError: undefined, 
  accessToken: 'present', 
  sessionUserIdMatch: true
}

🧪 Basic cart_items test result: {
  foundRecords: 0, 
  testError: undefined, 
  testErrorCode: undefined
}
```

---

## ✅ **Solution Implementation**

### **Code Change**
**File**: `src/services/cartService.ts:333-337`

```typescript
// BEFORE (406 error on first-time adds)
const { data: cartItemData, error } = await supabase
  .from('cart_items')
  .select('quantity')
  .eq('user_id', user.id)
  .eq('product_id', product.id)
  .single(); // ❌ Fails with 406 on 0 rows

// AFTER (graceful handling of 0 rows)
const { data: cartItemData, error } = await supabase
  .from('cart_items')
  .select('quantity')
  .eq('user_id', user.id)
  .eq('product_id', product.id)
  .maybeSingle(); // ✅ Returns null on 0 rows, no error
```

### **Updated Error Handling**
**File**: `src/services/cartService.ts:373-402`

```typescript
// BEFORE (PGRST116 error code handling)
if (error) {
  if (error.code === 'PGRST116') {
    console.log('✅ No existing cart item found (expected for first add)');
    currentCartQuantity = 0;
  } else {
    console.warn('🚨 Unexpected error getting cart quantity:', error);
    currentCartQuantity = 0;
  }
}

// AFTER (null data handling for maybeSingle)
if (error) {
  console.warn('🚨 Unexpected error getting cart quantity:', error);
  currentCartQuantity = 0;
} else if (cartItemData === null) {
  // maybeSingle() returns null when no rows found - normal for first-time adds
  console.log('✅ No existing cart item found (expected for first add)');
  currentCartQuantity = 0;
} else {
  // Validate and use the returned quantity data
  const quantity = cartItemData.quantity;
  if (typeof quantity === 'number' && quantity >= 0) {
    currentCartQuantity = quantity;
    console.log(`📦 Found existing cart quantity: ${quantity}`);
  } else {
    console.warn('Invalid cart quantity data, defaulting to 0');
    currentCartQuantity = 0;
  }
}
```

---

## 🧪 **Testing & Verification**

### **Test Scenarios**
1. **✅ First-time product addition**: No 406 error, quantity correctly set to 0
2. **✅ Existing cart item update**: Existing quantity retrieved correctly
3. **✅ Invalid cart data**: Graceful fallback to 0 quantity
4. **✅ Authentication edge cases**: Proper error handling maintained

### **Before vs After Behavior**
| Scenario | Before (`.single()`) | After (`.maybeSingle()`) |
|----------|---------------------|-------------------------|
| **No existing cart item** | 406 HTTP error + PGRST116 | `null` data, no error |
| **1 existing cart item** | Returns cart item data | Returns cart item data |
| **Application behavior** | Works correctly | Works correctly |
| **Console logs** | 406 error visible | Clean, no errors |
| **User experience** | Functional but noisy | Functional and clean |

---

## 📚 **Technical Learning & Best Practices**

### **Supabase Query Methods**
- **`.single()`**: Use when you expect exactly 1 row and want errors on 0 or multiple rows
- **`.maybeSingle()`**: Use when you expect 0 or 1 row and want `null` for 0 rows
- **No modifier**: Returns array, use for 0+ rows

### **PostgREST Error Patterns**
- **406 Not Acceptable**: Usually indicates count mismatch with `.single()`
- **PGRST116**: "JSON object requested, multiple (or no) rows returned"
- **Authentication vs Query Issues**: 403 = auth failure, 406 = count mismatch

### **Cart Logic Patterns**
```typescript
// ✅ GOOD: Check for existing cart items (0 or 1 expected)
.maybeSingle()

// ❌ BAD: Enforce exactly 1 cart item (fails on first add)  
.single()

// ✅ GOOD: Get all cart items for user (0+ expected)
// No modifier, returns array
```

---

## 🔧 **Implementation Notes**

### **No Breaking Changes**
- **API Contract**: Same input/output behavior maintained
- **Error Handling**: Existing error recovery patterns preserved  
- **Performance**: No performance impact, same query execution
- **Backward Compatibility**: Full compatibility with existing cart operations

### **Code Quality Improvements**
- **Cleaner Console**: No spurious 406 errors in browser devtools
- **Better Semantics**: Query intent matches actual behavior (0 or 1 rows)
- **Improved Logging**: More accurate log messages for different scenarios

---

## 📊 **Production Impact Assessment**

### **Risk Level**: 🟢 **LOW**
- **Change Scope**: Single query method modification
- **Functional Impact**: None (logic behavior identical)
- **User Impact**: Positive (cleaner error logs)
- **Rollback**: Easy (revert single line change)

### **Monitoring Recommendations**
- **Success Metric**: Absence of 406 errors in cart operations
- **Error Tracking**: Continue monitoring PGRST error codes for other issues
- **Performance**: No performance monitoring needed (same query)
- **User Behavior**: No behavior change expected

---

## 🎯 **Similar Issues Prevention**

### **Code Review Checklist**
- [ ] Does this query expect exactly 1 row? → Use `.single()`
- [ ] Does this query expect 0 or 1 row? → Use `.maybeSingle()` 
- [ ] Does this query expect 0+ rows? → Use no modifier (returns array)
- [ ] Is the error handling appropriate for the query method?

### **Supabase Query Patterns**
```typescript
// User profile (should exist) - use .single()
const profile = await supabase.from('profiles').select().eq('id', userId).single();

// Cart item check (may not exist) - use .maybeSingle()  
const cartItem = await supabase.from('cart_items').select().eq('user_id', userId).eq('product_id', productId).maybeSingle();

// User's orders (0+ expected) - use no modifier
const orders = await supabase.from('orders').select().eq('user_id', userId);
```

---

## 📋 **Summary**

**Problem**: 406 HTTP errors during cart stock validation for first-time product additions  
**Root Cause**: Using `.single()` when 0 rows exist (normal for first-time cart adds)  
**Solution**: Changed to `.maybeSingle()` for graceful 0-row handling  
**Impact**: Eliminated 406 errors while maintaining identical functionality  
**Risk**: Low-risk change with immediate positive impact on console cleanliness  

This fix demonstrates the importance of choosing the correct Supabase query method based on expected row counts rather than assuming authentication issues for 406 errors.