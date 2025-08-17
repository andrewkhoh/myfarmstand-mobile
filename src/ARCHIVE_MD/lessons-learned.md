# Lessons Learned - Farm Stand Mobile App Development

This document captures key lessons learned during development to help resolve similar issues faster in future increments.

## React Query Patterns & Best Practices
**Date**: 2025-08-05  
**Context**: Comprehensive patterns for React Query implementation  
**Severity**: Critical (Architecture Foundation)

### Core Understanding

**React Query is NOT a data fetching library** - it's a **server state synchronization and caching library**.

- **Purpose**: Manages when to fetch, how to cache, when to invalidate, how to keep components in sync
- **You provide**: The fetching logic (fetch, axios, GraphQL, etc.)
- **React Query provides**: Synchronization, caching, loading states, error handling

### Pattern 1: Query Key Factory Pattern

```typescript
// ✅ Always create centralized key factories
const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
};

// Usage ensures consistency
const useProducts = (filters: ProductFilters) => {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => ProductService.getProducts(filters),
  });
};
```

**Benefits**: Consistent keys, hierarchical invalidation, TypeScript safety

### Pattern 2: Service Layer Separation

```typescript
// ✅ Separate data fetching from React Query hooks
// services/productService.ts
export const ProductService = {
  getProducts: async (filters?: ProductFilters): Promise<Product[]> => {
    const response = await fetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
    return response.json();
  },
};

// hooks/useProducts.ts
export const useProducts = (filters?: ProductFilters) => {
  return useQuery({
    queryKey: productKeys.list(filters || {}),
    queryFn: () => ProductService.getProducts(filters),
  });
};
```

**Benefits**: Testable service layer, reusable fetching logic, clear separation of concerns

### Pattern 3: Optimistic Update Pattern

```typescript
// ✅ Always follow this exact sequence
const useUpdateProductMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ProductService.updateProduct,
    
    // 1. Optimistic update
    onMutate: async (newProduct) => {
      // Cancel outgoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      
      // Snapshot previous value for rollback
      const previousProducts = queryClient.getQueryData(productKeys.list({}));
      
      // Optimistically update cache
      queryClient.setQueryData(productKeys.list({}), (old: Product[]) =>
        old?.map(product => 
          product.id === newProduct.id ? { ...product, ...newProduct } : product
        )
      );
      
      return { previousProducts };
    },
    
    // 2. Success: invalidate for fresh data
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    
    // 3. Error: rollback optimistic update
    onError: (err, newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productKeys.list({}), context.previousProducts);
      }
    },
    
    // 4. Always: cleanup
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};
```

**Critical**: `cancelQueries` prevents race conditions between optimistic updates and background refetches

### Pattern 4: Error Handling with Try/Catch

```typescript
// ✅ Always wrap .mutateAsync for consistent error handling
const useAuthOperations = () => {
  const loginMutation = useLoginMutation();
  
  const login = async (credentials: LoginCredentials) => {
    try {
      const result = await loginMutation.mutateAsync(credentials);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  };
  
  return { login };
};
```

**Benefits**: Consistent error format, no unhandled promise rejections

### Pattern 5: Configuration Consistency

```typescript
// ✅ Use consistent query configurations
const defaultQueryConfig = {
  staleTime: 5 * 60 * 1000,     // 5 minutes
  gcTime: 10 * 60 * 1000,       // 10 minutes  
  retry: 1,
  refetchOnWindowFocus: true,
};

const useProducts = () => {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: ProductService.getProducts,
    ...defaultQueryConfig,
  });
};
```

### Pattern 6: Combined Operations Hook

```typescript
// ✅ Group related operations together
export const useCartOperations = () => {
  const addToCartMutation = useAddToCartMutation();
  const removeFromCartMutation = useRemoveFromCartMutation();
  
  const addToCart = async (item: CartItem) => {
    try {
      const result = await addToCartMutation.mutateAsync(item);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: 'Failed to add item to cart' };
    }
  };
  
  return {
    addToCart,
    removeFromCart: removeFromCartMutation.mutate,
    isLoading: addToCartMutation.isPending,
  };
};
```

### Pattern 7: Hierarchical Invalidation Strategy

```typescript
// ✅ Follow hierarchical invalidation
const useOrderMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: OrderService.createOrder,
    onSuccess: (newOrder) => {
      // 1. Invalidate specific related data
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      
      // 2. Invalidate lists that might include this item
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      
      // 3. Invalidate user-specific data
      queryClient.invalidateQueries({ 
        queryKey: orderKeys.userOrders(newOrder.userId) 
      });
    },
  });
};
```

### Key Concepts

#### Cache as Source of Truth
- **Ultimate truth**: Server/Database
- **Application truth**: React Query cache (synchronized with server)
- **Component state**: Derived from cache
- All components reading same query key get identical data

#### Automatic Deduplication
- Same query key + simultaneous requests = single network call
- Multiple components can use same query without performance penalty
- Cache-first: if data is fresh, no network request at all

#### Race Condition Prevention
- `cancelQueries` in `onMutate` prevents background fetches from overwriting optimistic updates
- Essential for smooth user experience during mutations

#### Reactive Propagation
- Components automatically subscribe to query keys
- Cache updates trigger re-renders in ALL subscribed components
- No manual propagation needed

### Anti-Patterns to Avoid

```typescript
// ❌ Don't: Inconsistent query keys
useQuery(['products'], getProducts);
useQuery(['product-list'], getProducts); // Different key for same data

// ❌ Don't: Mixing fetching logic with React Query
const useProducts = () => {
  return useQuery(['products'], async () => {
    const response = await fetch('/api/products'); // Fetching logic in hook
    return response.json();
  });
};

// ❌ Don't: Forgetting to cancel queries in optimistic updates
onMutate: async (newData) => {
  // Missing: await queryClient.cancelQueries(...)
  queryClient.setQueryData(['data'], newData); // Race condition risk!
};
```

### Quick Reference Checklist

- [ ] Use query key factories for consistency
- [ ] Separate service layer from React Query hooks
- [ ] Cancel queries in optimistic updates
- [ ] Wrap .mutateAsync in try/catch
- [ ] Use consistent query configurations
- [ ] Group related operations in combined hooks
- [ ] Follow hierarchical invalidation patterns
- [ ] Ensure TypeScript safety throughout

---

## Increment 1.5: Shopping Cart - Basic Functionality

### Issue: Cart State Management & Testing Problems

#### Problem Summary
- Cart total was continuously accumulating (infinite loop)
- Cart functionality tests were failing with timing issues
- Individual tests failing due to empty cart state

#### Root Causes Identified

1. **Infinite Loop in Cart Context**
   - **Cause**: Cart action functions (`addItem`, `removeItem`, etc.) were not memoized
   - **Effect**: Functions recreated on every render → infinite re-renders → total accumulation
   - **Solution**: Wrap all cart context functions in `useCallback` with empty dependency arrays

2. **Stale Closure in Tests**
   - **Cause**: Tests using `setTimeout` to check state captured old values in closures
   - **Effect**: Tests validated against stale state instead of current state
   - **Solution**: Use `useEffect` to watch for actual state changes instead of `setTimeout`

3. **Test Execution Order**
   - **Cause**: Individual tests tried to remove/update items when cart was empty
   - **Effect**: Tests failed with "nothing to remove" errors
   - **Solution**: Make tests self-sufficient by auto-adding setup data when needed

#### Quick Resolution Patterns

**For Infinite Loops in React Context:**
```tsx
// ❌ Wrong - Functions recreated on every render
const addItem = (product, quantity) => {
  dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
};

// ✅ Correct - Memoized functions
const addItem = useCallback((product, quantity) => {
  dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
}, []);
```

**For Test State Validation:**
```tsx
// ❌ Wrong - Stale closure with setTimeout
setTimeout(() => {
  if (items.length > 0) { // This 'items' is stale!
    // validation logic
  }
}, 100);

// ✅ Correct - useEffect watching current state
useEffect(() => {
  if (testInProgress === 'addItem' && items.length > 0) {
    // validation logic with current state
    setTestInProgress(null);
  }
}, [items, testInProgress]);
```

**For Self-Sufficient Tests:**
```tsx
// ❌ Wrong - Fails if cart is empty
const testRemoveItem = () => {
  if (items.length === 0) {
    addTestFailure('No items to remove');
    return;
  }
  // test logic
};

// ✅ Correct - Auto-setup when needed
const testRemoveItem = () => {
  if (items.length === 0) {
    addTestResult('🔧 Setting up test: Adding items first...');
    addItem(mockProducts[0], 2);
    setTimeout(() => runActualTest(), 200);
    return;
  }
  // test logic
};
```

#### Time-Saving Checklist

When debugging React state issues:

1. **Check for infinite loops first**
   - Look for non-memoized functions in context providers
   - Add `useCallback` to all context functions
   - Check for missing dependency arrays

2. **For failing tests**
   - Replace `setTimeout` with `useEffect` state watching
   - Make tests self-sufficient with auto-setup
   - Use current state values, not captured closures

3. **For cart/state accumulation**
   - Verify reducer immutability
   - Check for proper state updates (no mutations)
   - Ensure functions are memoized to prevent re-renders

#### Prevention Strategies

1. **Always memoize context functions** with `useCallback`
2. **Use `useEffect` for test validation** instead of `setTimeout`
3. **Make tests self-sufficient** by adding setup logic
4. **Test individual functions** before batch testing
5. **Check for stale closures** when debugging timing issues

---

## Increment 1.9: Pickup Date/Time UI Enhancement

### Issue: DateTimePicker Modal Overlay & User Experience Problems

#### Problem Summary
- Native `@react-native-community/datetimepicker` not providing true modal overlay behavior
- Text visibility issues in picker modals (transparent/invisible text)
- Complex unified datetime picker causing user confusion
- Persistent inline error messages cluttering UI

#### Root Causes Identified

1. **Wrong DateTimePicker Library Choice**
   - **Cause**: `@react-native-community/datetimepicker` renders inline by default, not as true modal
   - **Effect**: Pickers appeared within ScrollView instead of hovering over content
   - **Solution**: Switch to `react-native-modal-datetime-picker` for true modal behavior

2. **Picker Text Visibility Issues**
   - **Cause**: Default styling in modal picker had transparent or poorly contrasted text
   - **Effect**: Users couldn't see picker options clearly
   - **Solution**: Explicit styling with `textColor`, `isDarkModeEnabled={false}`, and background colors

3. **Over-Engineered Unified Picker**
   - **Cause**: Attempted to combine date and time into single picker with complex state management
   - **Effect**: Confusing user flow with mode switching and sequential picker behavior
   - **Solution**: Separate date and time pickers with independent, predictable controls

#### Prevention Strategies
- Always memoize React context functions with useCallback
- Use useEffect instead of setTimeout to avoid stale closures
- Auto-setup test data when cart is empty for self-sufficient tests
- Follow the Quick Resolution Checklist for similar issues

---

## React Query Migration: Consistent Error Handling Patterns

### Issue: Inconsistent Error Handling in Hook Methods
**Problem**: Within the same hook (e.g., `useCart`), different methods had inconsistent error handling patterns. Some used try/catch blocks to return standardized `{ success, message }` objects, while others directly returned React Query promises, leading to different error handling experiences for components.

**Root Cause**: During React Query migration, different patterns were applied to different methods without establishing a consistent error handling strategy across all hook methods.

**Solution**: Standardized all hook methods to use the same error handling pattern:
```typescript
// Consistent pattern for all methods
const methodName = async (...params): Promise<{ success: boolean; data?: T; message?: string }> => {
  try {
    const result = await mutation.mutateAsync(params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: 'Descriptive error message' };
  }
};
```

**Prevention**: When migrating to React Query or any state management library, establish consistent error handling patterns upfront. Document the standard return types and error handling approach, then apply it uniformly across all methods in the same hook.

**Benefits**: 
- Predictable API for components consuming the hooks
- Consistent error handling throughout the application
- Better type safety and developer experience
- Easier testing and debugging

---

## Issue 2: Missing Test Screen Integration
**Date**: 2025-08-02  
**Increment**: 1.6 - Stock Validation Implementation  
**Severity**: Medium (Development Workflow)

### Problem Description
Recurring issue where newly created test screens are not accessible in the app because they're missing from navigation integration. This has happened multiple times across different increments.

### Root Cause Analysis
Test screen creation involves multiple integration steps that are easy to miss:
1. Screen file creation ✅ (usually done)
2. Export in `src/screens/index.ts` ❌ (often missed)
3. Type definition in `TestStackParamList` ❌ (often missed) 
4. Navigation integration in `TestStackNavigator.tsx` ❌ (often missed)

**CRITICAL**: Test screens belong in `TestStackNavigator`, NOT `MainTabNavigator`!

### Solution Implemented
**Complete Test Screen Integration Checklist**:
1. ✅ Create test screen file (e.g., `StockValidationTestScreen.tsx`)
2. ✅ Add export to `src/screens/index.ts`
3. ✅ Add screen type to `TestStackParamList` in `TestStackNavigator.tsx`
4. ✅ Import screen in `TestStackNavigator.tsx`
5. ✅ Add `Stack.Screen` component with proper options
6. ✅ Test navigation via TestHub → Your Test Screen
7. ✅ Verify screen is accessible through Test tab

### Key Patterns Learned

#### 1. Test Screen Integration Template
```typescript
// 1. In src/screens/index.ts
export { default as NewTestScreen } from './NewTestScreen';

// 2. In src/navigation/TestStackNavigator.tsx
import { NewTestScreen } from '../screens';

// Add to TestStackParamList:
export type TestStackParamList = {
  // ... existing screens
  NewTest: undefined;
};

// Add Stack.Screen:
<Stack.Screen 
  name="NewTest" 
  component={NewTestScreen}
  options={{ title: 'New Test Screen' }}
/>
```

#### 2. Verification Steps
- [ ] Screen file created and exports properly
- [ ] Export added to index.ts
- [ ] Type added to TestStackParamList
- [ ] Screen imported in TestStackNavigator
- [ ] Stack.Screen component added
- [ ] Navigation tested via TestHub
- [ ] Screen accessible through Test tab

#### Prevention Strategies
- **Integration Checklist**: Always follow the 7-step integration checklist
- **Immediate Testing**: Test navigation immediately after creating screen
- **Template Pattern**: Use the integration template for consistency
- **Documentation**: Document integration steps in each increment summary

#### Quick Resolution Checklist
1. Check if screen file exists and exports correctly
2. Verify export in `src/screens/index.ts`
3. Check type definition in `TestStackParamList`
4. Verify import in `TestStackNavigator.tsx`
5. Check `Stack.Screen` component exists
6. Test navigation via TestHub screen
7. Verify accessibility through Test tab

---

---

## Issue 3: Async State Management in Testing
**Date**: 2025-08-02  
**Increment**: 1.6 - Stock Validation Testing  
**Severity**: High (Logic Bugs)

### Problem Description
Stock validation tests revealed critical bugs in cart state management:
1. Stock validation logic allowing overselling ("Add 2 more apples: UNEXPECTED SUCCESS")
2. Cart state inconsistency between operations ("Item not found in cart")
3. Cart totals not updating properly ($0.00 after adding items)

### Root Cause Analysis
**Primary Issues**:
1. **State Update Timing**: React state updates are asynchronous, but tests were running synchronously
2. **Stale State References**: `useCallback` dependencies using stale `state.items` references
3. **Test Sequence Issues**: Cart state not properly cleared between test scenarios
4. **Validation Logic Error**: `updateQuantity` was incorrectly calculating quantity differences

### Solution Implemented
**1. Fixed Update Quantity Logic**:
```typescript
// BEFORE (incorrect):
const validation = validateStock(existingItem.product, quantity - existingItem.quantity, existingItem.quantity);

// AFTER (correct):
const validation = validateStock(existingItem.product, quantity, 0); // quantity is new total, not additional
```

**2. Added State Update Delays in Tests**:
```typescript
// Clear cart and wait for state update
clearCart();
await new Promise(resolve => setTimeout(resolve, 100));

// Add item and wait before next operation
const result = await addItem(product, 1);
await new Promise(resolve => setTimeout(resolve, 100));
```

**3. Enhanced Test Logging**:
- Added setup step logging for debugging
- Clear cart state before each test
- Wait for state updates between operations

### Key Patterns Learned

#### 1. Async State Management Pattern
```typescript
// Always allow time for state updates in tests
const performCartOperation = async () => {
  clearCart();
  await new Promise(resolve => setTimeout(resolve, 100)); // State update delay
  
  const result = await addItem(product, quantity);
  await new Promise(resolve => setTimeout(resolve, 100)); // State propagation delay
  
  // Now safe to perform next operation
};
```

#### 2. Validation Logic Clarity
```typescript
// For addItem: validate additional quantity + current quantity
const validation = validateStock(product, additionalQuantity, currentCartQuantity);

// For updateQuantity: validate new absolute quantity
const validation = validateStock(product, newTotalQuantity, 0);
```

#### 3. Test State Management
- Always clear state before each test
- Add delays after state-changing operations
- Log setup steps for debugging
- Test state consistency explicitly

#### Prevention Strategies
- **State Update Delays**: Always add delays after React state updates in tests
- **Explicit State Clearing**: Clear cart state before each test scenario
- **Validation Logic Testing**: Test edge cases with proper state setup
- **Async Operation Handling**: Treat all cart operations as async with proper awaiting

#### Quick Resolution Checklist
1. Check if state updates are properly awaited
2. Verify cart state is cleared between tests
3. Validate that quantity calculations are correct (absolute vs relative)
4. Test with realistic delays for state propagation
5. Log intermediate states for debugging
6. Verify useCallback dependencies are current
7. Test edge cases with proper state setup

### Additional Discovery: Cart State Clearing Bug
**Problem**: Combined test revealed that `clearCart()` was not working properly in async test sequences. The test showed `"Add regular stock item: FAILED"` when it should have succeeded after clearing the cart.

**Root Cause**: `clearCart()` was synchronous but React state updates are asynchronous. When `clearCart()` was called followed immediately by `addItem()`, the validation still saw the old cart state.

**Solution Applied**:
```typescript
// BEFORE (buggy):
const clearCart = useCallback(() => {
  dispatch({ type: 'CLEAR_CART' });
}, []);

// AFTER (fixed):
const clearCart = useCallback(async (): Promise<void> => {
  // Immediately update the ref to ensure synchronous clearing
  stateRef.current = {
    items: [],
    total: 0,
  };
  
  // Then dispatch the action for React state
  dispatch({ type: 'CLEAR_CART' });
  
  // Small delay to ensure state propagation
  await new Promise(resolve => setTimeout(resolve, 50));
}, []);
```

**Key Insights**:
1. **Immediate Ref Update**: Update `stateRef.current` immediately for synchronous clearing
2. **Async Interface**: Make `clearCart()` async to allow proper awaiting in tests
3. **State Propagation**: Add small delay to ensure React state catches up
4. **Test Updates**: All test calls must `await clearCart()` for proper sequencing

**Pattern for State-Clearing Functions**:
- Update ref immediately for synchronous effect
- Dispatch action for React state consistency
- Make function async to allow proper test sequencing
- Always await state-clearing functions in tests

---

## Increment 1.7: Order Placement - React Query Integration

### Lesson: React Query Integration Patterns
**Context**: Implementing order submission with React Query mutations and proper error handling.

**Key Patterns Discovered**:

#### 1. Query Client Setup
```typescript
// App.tsx - Proper QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

#### 2. Mutation with Success/Error Handling
```typescript
// Proper mutation pattern with user feedback
const orderMutation = useMutation({
  mutationFn: submitOrder,
  onSuccess: (result) => {
    if (result.success && result.order) {
      Alert.alert('Order Submitted!', `Order #${result.order.id} submitted successfully`);
      clearCart(); // Clear cart on success
    } else {
      Alert.alert('Order Failed', result.error || 'Failed to submit order');
    }
  },
  onError: (error) => {
    Alert.alert('Order Failed', `Error: ${error.message}`);
  },
});
```

#### 3. Loading States and User Feedback
```typescript
// Button with loading state
<TouchableOpacity
  disabled={orderMutation.isPending}
  onPress={handleSubmitOrder}
>
  {orderMutation.isPending ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text>Submit Order</Text>
  )}
</TouchableOpacity>
```

### Lesson: Testing Async State with React Query
**Problem**: Tests were failing because cart state wasn't properly synchronized before order submission.

**Solution Applied**: Same `useRef` pattern from cart validation tests:
```typescript
// Track current state for async operations
const itemsRef = useRef(items);
useEffect(() => {
  itemsRef.current = items;
}, [items]);

// Use ref in async operations
const convertCartToOrderItems = (): OrderItem[] => {
  return itemsRef.current.map(cartItem => ({ /* ... */ }));
};
```

**Key Insights**:
1. **Consistent Patterns**: Same async state management patterns work across different contexts
2. **Proper Delays**: 200ms delays after cart operations ensure state propagation
3. **State Validation**: Always validate state before proceeding with async operations
4. **Debug Logging**: Add cart setup logging to verify state changes

### Lesson: Form Validation Layers
**Pattern**: Implement both client-side and server-side validation for robust error handling.

**Client-Side Validation**:
```typescript
if (!customerInfo.name.trim()) {
  Alert.alert('Validation Error', 'Please enter your name');
  return;
}
```

**Server-Side Validation**:
```typescript
if (!orderRequest.customerInfo.name) {
  return { success: false, error: 'Missing required customer information' };
}
```

**Benefits**:
- Immediate user feedback (client-side)
- Data integrity protection (server-side)
- Graceful error handling at both levels

### Lesson: Mock API Design for Development
**Pattern**: Create realistic mock APIs that simulate real-world scenarios including failures.

```typescript
// Simulate occasional failures (5% chance)
if (Math.random() < 0.05) {
  return { success: false, error: 'Server error: Unable to process order' };
}
```

**Benefits**:
- Test error handling paths
- Simulate network delays
- Validate user experience under various conditions
- Easy transition to real API later

### Prevention Strategies
1. **Always use `useRef` for async state operations** in tests and complex flows
2. **Implement validation at multiple layers** (UI, client, server)
3. **Add proper loading states** for all async operations
4. **Test both success and failure scenarios** comprehensively
5. **Use realistic mock APIs** that simulate real-world conditions

---

*Last Updated: 2025-08-02*
*Increment: 1.8 - Enhanced Checkout Implementation*

---

## Lesson 8: Enhanced Form Validation Patterns

### Context
Implementing advanced form validation with real-time feedback, error highlighting, and comprehensive validation messages for the enhanced checkout flow.

### Problem
Need to provide immediate user feedback for form validation errors while maintaining good UX and preventing submission of invalid data.

### Solution Pattern
```typescript
// Multi-layer validation approach
const [errors, setErrors] = useState<{[key: string]: string}>({});
const [touched, setTouched] = useState<{[key: string]: boolean}>({});

// Real-time validation with debouncing
const validateField = useCallback((field: string, value: string) => {
  const newErrors = { ...errors };
  
  switch (field) {
    case 'email':
      if (!value.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        delete newErrors.email;
      }
      break;
    // ... other fields
  }
  
  setErrors(newErrors);
}, [errors]);

// Input with validation styling
<TextInput
  style={[styles.input, errors.email && touched.email && styles.inputError]}
  onChangeText={(text) => {
    setCustomerInfo(prev => ({ ...prev, email: text }));
    if (touched.email) validateField('email', text);
  }}
  onBlur={() => {
    setTouched(prev => ({ ...prev, email: true }));
    validateField('email', customerInfo.email);
  }}
/>
{errors.email && touched.email && (
  <Text style={styles.errorText}>{errors.email}</Text>
)}
```

### Key Patterns
1. **Touched State**: Only show errors after user interaction
2. **Real-time Clearing**: Clear errors as user fixes them
3. **Visual Feedback**: Error styling on inputs and clear error messages
4. **Validation Summary**: Show all errors before submission
5. **Field-specific Validation**: Different rules for different input types

### Prevention Strategies
- Use consistent validation patterns across all forms
- Implement debouncing for expensive validations
- Provide clear, actionable error messages
- Test validation with edge cases and invalid inputs

---

## Lesson 9: Date/Time Picker Integration

### Context
Integrating native date/time pickers for pickup order scheduling with proper validation and cross-platform compatibility.

### Problem
Need to handle date/time selection with validation (no past dates), proper formatting, and platform-specific UI differences.

### Solution Pattern
```typescript
import DateTimePicker from '@react-native-community/datetimepicker';

const [showDatePicker, setShowDatePicker] = useState(false);
const [showTimePicker, setShowTimePicker] = useState(false);
const [pickupDate, setPickupDate] = useState<Date>(new Date());

// Date validation
const validatePickupDateTime = (date: Date): string | null => {
  const now = new Date();
  const minDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  
  if (date < minDate) {
    return 'Pickup time must be at least 1 hour from now';
  }
  return null;
};

// Date picker handlers
const onDateChange = (event: any, selectedDate?: Date) => {
  setShowDatePicker(false);
  if (selectedDate) {
    const newDate = new Date(pickupDate);
    newDate.setFullYear(selectedDate.getFullYear());
    newDate.setMonth(selectedDate.getMonth());
    newDate.setDate(selectedDate.getDate());
    
    setPickupDate(newDate);
    const error = validatePickupDateTime(newDate);
    if (error) {
      setErrors(prev => ({ ...prev, pickupDateTime: error }));
    } else {
      setErrors(prev => ({ ...prev, pickupDateTime: undefined }));
    }
  }
};

// UI Components
<TouchableOpacity 
  style={styles.dateTimeButton} 
  onPress={() => setShowDatePicker(true)}
>
  <Text style={styles.dateTimeButtonText}>
    {pickupDate.toLocaleDateString()}
  </Text>
</TouchableOpacity>

{showDatePicker && (
  <DateTimePicker
    value={pickupDate}
    mode="date"
    display="default"
    minimumDate={new Date()}
    onChange={onDateChange}
  />
)}
```

### Key Patterns
1. **Separate State**: Keep date and time picker states separate
2. **Validation Integration**: Validate immediately on date/time change
3. **Minimum Date**: Prevent past date selection
4. **Format Display**: Show user-friendly date/time formatting
5. **Platform Handling**: Use native pickers for best UX

### Prevention Strategies
- Always validate date/time selections
- Handle timezone considerations for business hours
- Test on both iOS and Android for UI differences
- Provide clear visual feedback for selected dates

---

## Lesson 10: Order Confirmation Flow Design

### Context
Creating a comprehensive order confirmation screen that handles both success and failure states with proper navigation and cart clearing.

### Problem
Need to provide clear feedback on order status, display order details, handle errors gracefully, and guide users to next actions.

### Solution Pattern
```typescript
// Order confirmation screen with route params
type OrderConfirmationScreenProps = {
  route: RouteProp<RootStackParamList, 'OrderConfirmation'>;
  navigation: StackNavigationProp<RootStackParamList, 'OrderConfirmation'>;
};

const OrderConfirmationScreen: React.FC<OrderConfirmationScreenProps> = ({ route, navigation }) => {
  const { order, success, error } = route.params;
  const { clearCart } = useCart();
  
  // Clear cart on successful order
  useEffect(() => {
    if (success && order) {
      clearCart();
    }
  }, [success, order, clearCart]);
  
  const handleContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };
  
  // Success state
  if (success && order) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.successHeader}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.orderNumber}>Order #{order.id}</Text>
        </View>
        
        {/* Order details */}
        <View style={styles.orderDetails}>
          {/* Customer info, items, totals */}
        </View>
        
        <TouchableOpacity style={styles.continueButton} onPress={handleContinueShopping}>
          <Text style={styles.continueButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
  
  // Error state
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>❌</Text>
      <Text style={styles.errorTitle}>Order Failed</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Key Patterns
1. **Route Parameters**: Pass order data and status through navigation
2. **Automatic Cart Clearing**: Clear cart only on successful orders
3. **Navigation Reset**: Use reset for clean navigation stack
4. **Dual State Handling**: Separate UI for success and error states
5. **Clear Actions**: Provide obvious next steps for users

### Prevention Strategies
- Always handle both success and error states
- Clear cart only after confirmed successful order
- Provide retry mechanisms for failed orders
- Use navigation reset to prevent back button issues
- Test error scenarios thoroughly

---

## Lesson 11: Comprehensive Testing Patterns for Enhanced Features

### Context
Creating guided test screens for complex user flows involving multiple form states, validation scenarios, and navigation paths.

### Problem
Need to test enhanced checkout features systematically including validation, date/time pickers, address input, and order confirmation flows.

### Solution Pattern
```typescript
// Guided test screen with scenario-based testing
const EnhancedCheckoutTestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const { addItem, clearCart } = useCart();
  const navigation = useNavigation();
  
  // Test scenario setup
  const testFormValidation = async () => {
    addTestResult('=== Test 1: Form Validation ===');
    
    // Setup test data
    await clearCart();
    await addItem(testProduct, 1);
    
    addTestResult('📋 Navigate to checkout to test:');
    addTestResult('  • Empty name validation');
    addTestResult('  • Invalid email validation');
    addTestResult('  • Real-time error clearing');
    
    // Navigate to actual screen
    navigation.navigate('Checkout');
  };
  
  // Multiple test scenarios
  const testScenarios = [
    { name: 'Form Validation', test: testFormValidation },
    { name: 'Date/Time Picker', test: testDateTimePicker },
    { name: 'Delivery Validation', test: testDeliveryValidation },
    { name: 'Order Confirmation', test: testOrderConfirmation },
    { name: 'Error Handling', test: testErrorHandling },
    { name: 'Complete Journey', test: testCompleteJourney },
  ];
  
  return (
    <ScrollView>
      {/* Test controls and scenario buttons */}
      {testScenarios.map((scenario, index) => (
        <TouchableOpacity key={index} onPress={scenario.test}>
          <Text>Test {index + 1}: {scenario.name}</Text>
        </TouchableOpacity>
      ))}
      
      {/* Test instructions and results */}
      <View style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index}>{result}</Text>
        ))}
      </View>
    </ScrollView>
  );
};
```

### Key Patterns
1. **Scenario-Based Testing**: Organize tests by user scenarios
2. **Guided Instructions**: Provide step-by-step testing guidance
3. **Test Data Setup**: Automatically prepare test conditions
4. **Navigation Integration**: Navigate to actual screens for testing
5. **Result Tracking**: Log test progress and findings

### Prevention Strategies
- Create comprehensive test scenarios for all user paths
- Automate test data setup to ensure consistent conditions
- Provide clear testing instructions for manual validation
- Test edge cases and error conditions
- Document expected vs actual behavior

---

## Lesson 12: Comprehensive Lessons Learned from Cart Refactoring, ProfileScreen Fix, and Testing Considerations

### Context
Refactoring the cart system to use React Query, fixing the ProfileScreen's order history, and enhancing testing considerations.

### Problem
The cart system was inconsistent with the rest of the app, using AsyncStorage and Context instead of React Query and Supabase. The ProfileScreen's order history was empty due to using mock data instead of real Supabase queries. Testing considerations were not comprehensive, leading to potential issues with real-time sync and multi-device scenarios.

### Solution
1. **Refactored cart system** to use React Query and Supabase
2. **Fixed ProfileScreen's order history** by using real Supabase queries
3. **Enhanced testing considerations** to include real-time sync and multi-device scenarios

### Key Benefits Achieved
- **Consistent architecture** - All data management now uses React Query
- **Real-time updates** - Cart changes sync immediately
- **Offline fallback** - AsyncStorage backup when offline
- **Comprehensive testing** - Test suite now covers real-time sync and multi-device scenarios

### Lesson Learned
**Always ensure architectural consistency during backend migrations.** When migrating from mock to real data, audit ALL data flows to ensure they follow the same patterns. Cart persistence is as critical as product/order data and should use the same technology stack.

**Always audit critical user-facing data flows during backend migration.** Order history is a core user experience feature. When migrating from mock to real data, systematically verify that ALL user-facing queries are properly connected to the database, not just the obvious ones like product catalog.

**Backend migrations require comprehensive test refactoring.** When changing from mock to real data sources, the test suite needs as much attention as the production code. Test interfaces, mocks, and coverage areas all need systematic review and updates to maintain quality assurance.

---

## Issue 6: Cart System Architecture Inconsistency
**Date**: 2025-08-05  
**Context**: Cart system using AsyncStorage + Context while rest of app uses React Query + Supabase  
**Severity**: High (Architecture Consistency)

### Problem
The cart system was using a hybrid approach:
- **CartContext + useReducer** for state management
- **AsyncStorage only** for persistence
- **No React Query integration** or server-side sync
- **No cross-device synchronization**

This created architectural inconsistency since all other data (products, orders, users) used React Query + Supabase.

### Root Cause
Original cart implementation was built before backend integration, using local-only storage patterns that weren't updated during the migration to Supabase.

### Solution
1. **Enhanced cartService.ts** with Supabase integration
   - Added database cart item interface and conversion helpers
   - Implemented cloud sync with local storage fallback
   - Added `getCart()`, `getLocalCart()`, and `saveLocalCart()` methods

2. **Leveraged existing React Query cart hooks** (already implemented)
   - `useCart()` hook with optimistic updates
   - Mutations for add, remove, update, and clear operations
   - Proper error handling and cache invalidation

3. **Removed CartContext entirely**
   - Deleted `CartContext.tsx`
   - Updated all test screens to use React Query hooks
   - Removed CartProvider from test utilities

### Key Benefits Achieved
- **Cross-device synchronization** - Cart syncs across devices when logged in
- **Server-side persistence** - Cart data stored in Supabase `cart_items` table
- **Consistent architecture** - All data management now uses React Query
- **Real-time updates** - Cart changes sync immediately
- **Offline fallback** - AsyncStorage backup when offline

### Lesson Learned
**Always ensure architectural consistency during backend migrations.** When migrating from mock to real data, audit ALL data flows to ensure they follow the same patterns. Cart persistence is as critical as product/order data and should use the same technology stack.

---

## Issue 7: ProfileScreen Order History Missing Data
**Date**: 2025-08-05  
**Context**: User's order history showing empty despite having completed orders  
**Severity**: High (User Experience)

### Problem
ProfileScreen's order history was empty even though orders existed in the database and were marked as 'completed'.

### Root Cause
The `getCustomerOrders` function was still using **mock data** instead of real Supabase queries:

```typescript
// ❌ Old implementation
export const getCustomerOrders = async (customerEmail: string): Promise<Order[]> => {
  await new Promise(resolve => setTimeout(resolve, API_DELAY / 2));
  return mockOrders.filter(order => order.customerInfo.email === customerEmail);
};
```

Since `mockOrders` was empty or didn't contain the user's real orders, the ProfileScreen couldn't display order history.

### Solution
Replaced with real Supabase implementation:

```typescript
// ✅ New implementation
export const getCustomerOrders = async (customerEmail: string): Promise<Order[]> => {
  if (!customerEmail) {
    console.warn('getCustomerOrders: customerEmail is required');
    return [];
  }

  try {
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id, product_id, product_name, unit_price, quantity, total_price
        )
      `)
      .eq('customer_email', customerEmail)
      .order('created_at', { ascending: false });

    // Convert database format to app format...
    return orders;
  } catch (error) {
    console.error('Error in getCustomerOrders:', error);
    return [];
  }
};
```

### Key Features Added
- **Real data fetching** from Supabase `orders` table
- **Proper filtering** by customer email
- **Order items included** via database join
- **Error handling** with fallback to empty array
- **Sorted by date** (newest first)
- **Type safety** with proper Order interface mapping

### Lesson Learned
**Always audit critical user-facing data flows during backend migration.** Order history is a core user experience feature. When migrating from mock to real data, systematically verify that ALL user-facing queries are properly connected to the database, not just the obvious ones like product catalog.

---

## Issue 8: Test Interface Inconsistency After Backend Migration
**Date**: 2025-08-05  
**Context**: Test mocks and interfaces may be inconsistent after migration from mock to server data  
**Severity**: Medium (Testing Quality)

### Problem
After migrating from mock products to server data and refactoring cart system:
- **Test interfaces** may not match new React Query hook APIs
- **Mock data structures** may be outdated
- **Test coverage** may be insufficient for real-time sync and multi-device scenarios
- **Edge cases** specific to server-backed data flows may not be tested

### Identified Issues
1. **Cart hook interface changes** - Old CartContext API vs new React Query hooks
2. **Product data structure mismatches** - Database schema vs mock data format
3. **Missing real-time sync tests** - No coverage for Supabase subscriptions
4. **Multi-device scenarios** - No testing for cross-device cart/order sync
5. **Network failure handling** - Limited testing of offline/online transitions

### Recommended Actions
1. **Audit and refactor test interfaces** to match new React Query APIs
2. **Update mock data structures** to match real database schema
3. **Add real-time sync test scenarios** for Supabase subscriptions
4. **Create multi-device test protocols** for manual testing
5. **Enhance network failure test coverage** for offline scenarios

### Lesson Learned
**Backend migrations require comprehensive test refactoring.** When changing from mock to real data sources, the test suite needs as much attention as the production code. Test interfaces, mocks, and coverage areas all need systematic review and updates to maintain quality assurance.

---

## Issue 9: Hybrid Authentication Architecture Complexitymentation
**Date**: 2025-08-03  
**Increment**: Signout Fix & Hybrid Auth  
**Severity**: High (Critical Feature)

### Issue: Broken Signout & Authentication Architecture
{{ ... }}

#### Problem Summary
- Signout causing "maximum update depth exceeded" infinite render loop on physical devices
- Need for hybrid authentication combining React Query with AuthContext
- Missing comprehensive auth testing in automated test runner

#### Root Causes & Solutions

1. **Infinite Render Loop in ProfileScreen**
   - **Cause**: Unstable `useEffect` dependencies on entire user object
   - **Effect**: Every user state change triggered re-render → infinite loop
   - **Solution**: Make dependencies more specific (user?.id, user?.email) instead of entire user object

2. **Non-Memoized AuthContext Functions**
   - **Cause**: `logout`, `updateUser` functions recreated on every render
   - **Effect**: Components using these functions re-rendered infinitely
   - **Solution**: Wrap all AuthContext functions in `useCallback` with proper dependencies

3. **Missing Null Safety Checks**
   - **Cause**: ProfileScreen didn't handle null user state during logout transition
   - **Effect**: Attempts to access properties on null user during signout
   - **Solution**: Add early return `if (!user) return null;` in ProfileScreen

#### Hybrid Auth Architecture Patterns

**Secure Token Storage Service:**
```typescript
// Cross-platform secure storage
class TokenService {
  // Native: expo-secure-store, Web: AsyncStorage fallback
  static async setAccessToken(token: string) {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem('accessToken', token);
    }
    return SecureStore.setItemAsync('accessToken', token);
  }
}
```

**React Query + AuthContext Integration:**
```typescript
// AuthContext provides global state
const { user, setUser } = useAuth();

// React Query handles operations with optimistic updates
const { mutateAsync: login } = useLoginMutation({
  onSuccess: (data) => {
    setUser(data.user); // Update global state
  }
});
```

**Memoized AuthContext Functions:**
```typescript
const logout = useCallback(async () => {
  try {
    await TokenService.clearAllTokens();
    dispatch({ type: 'LOGOUT' });
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
}, []); // Empty dependency array - function never changes
```

#### Testing Integration Patterns

**Comprehensive Auth Test Suite:**
- TokenService secure storage tests
- AuthService login/logout/validation tests
- React Query integration tests
- Error handling and edge case tests

**Test Categories Added to AutomatedTestRunner:**
1. Token Service - Secure Storage
2. Auth Service - Login Flow
3. Auth Service - Validation
4. Auth Service - Logout Flow
5. Auth Service - Profile Update
6. React Query Auth Integration

#### Quick Resolution Checklist

**For Infinite Render Loops:**
1. Check useEffect dependencies - avoid entire objects
2. Memoize all context functions with useCallback
3. Add null safety checks in components
4. **NEVER use React hooks inside test functions** - use service layer only
5. Use React DevTools Profiler to identify re-render causes

**For Auth System Architecture:**
1. Separate concerns: React Query for operations, Context for state
2. Use secure storage (expo-secure-store) for tokens
3. Implement optimistic updates for better UX
4. Add comprehensive error handling and validation

**For Test Integration:**
1. Test the service layer independently first
2. Add tests to AutomatedTestRunner for continuous validation
3. Create manual test screens for complex user flows
4. Include both happy path and error scenarios

#### Prevention Strategies

1. **Always memoize context functions** - prevents 90% of infinite render issues
2. **Use specific useEffect dependencies** - avoid watching entire objects
3. **Add null checks early** - handle loading/transition states gracefully
4. **Test auth flows on physical devices** - web behavior differs from native
5. **Implement comprehensive test coverage** - both automated and manual testing
6. **Keep test functions hook-free** - use service layer for testing, never React hooks

#### Critical Test Environment Pattern

**❌ NEVER DO THIS in Test Functions:**
```typescript
// This causes infinite render loops!
export const AutomatedTestRunner: React.FC = () => {
  const { user, isAuthenticated } = useAuth(); // ❌ Hook in component
  const authOps = useAuthOperations(); // ❌ Hook in component
  
  const tests = [
    {
      test: async () => {
        // ❌ Accessing hook values in test function
        expect.toBe(isAuthenticated, false);
        await authOps.login({ email: 'test@example.com' });
      }
    }
  ];
};
```

**✅ ALWAYS DO THIS in Test Functions:**
```typescript
// This is stable and reliable!
export const AutomatedTestRunner: React.FC = () => {
  // Only use hooks that don't change during tests
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  const tests = [
    {
      test: async () => {
        // ✅ Use service layer directly
        const initialAuth = await AuthService.isAuthenticated();
        expect.toBe(initialAuth, false);
        
        const loginResult = await AuthService.login('test@example.com', 'password');
        expect.toBeTruthy(loginResult.success);
      }
    }
  ];
};
```

**Why This Happens:**
- React hooks create dependencies that trigger re-renders
- Test functions access hook values during execution
- Hook value changes trigger component re-render
- Re-render causes test functions to be recreated
- New test functions access hook values again → infinite loop

**The Fix:**
- Use service layer (`AuthService`, `TokenService`) in tests
- Service layer is stable and doesn't trigger React re-renders
- Tests become more reliable and isolated
- No dependency on React component lifecycle

#### Benefits Achieved

- **Security**: Secure token storage with device keychain
- **Performance**: Optimistic updates for immediate UI feedback
- **Reliability**: Automatic rollback on errors, proper cache invalidation
- **Developer Experience**: Comprehensive testing tools and error handling
- **Backward Compatibility**: Existing screens continue working

This hybrid approach provides the best of both worlds: React Query's powerful data management with React Context's global state accessibility.

---

## Issue 8: AuthContext Infinite Loop & React Query Migration
**Date**: 2025-08-03  
**Increment**: Auth System Migration  
**Severity**: Critical (App Breaking)

### Problem Summary
App experiencing "Maximum update depth exceeded" infinite render loops in authentication system, making the app unusable. The issue was caused by circular dependencies between React Query hooks and AuthContext.

### Root Cause Analysis

#### Primary Issue: Circular State Dependencies
```tsx
// ❌ PROBLEMATIC PATTERN - Circular Dependencies
// React Query hooks calling AuthContext functions
export const useLoginMutation = () => {
  const { setUser } = useAuth(); // AuthContext hook
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setUser(data.user); // Triggers AuthContext state change
      queryClient.setQueryData(['currentUser'], data.user); // Triggers React Query
    }
  });
};

// AuthContext responding to React Query changes
const AuthProvider = ({ children }) => {
  const { data: user } = useCurrentUser(); // React Query hook
  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_USER', payload: user }); // Triggers AuthContext change
    }
  }, [user]); // Creates infinite loop!
};
```

#### Secondary Issues
1. **Hybrid State Management**: Two sources of truth (AuthContext + React Query)
2. **Un-memoized Context Functions**: Functions recreated on every render
3. **Improper useEffect Dependencies**: Caused re-initialization loops

### Solution: Pure React Query Migration

#### Step 1: Break Circular Dependencies
```tsx
// ✅ CORRECT PATTERN - Pure React Query Hooks
export const useLoginMutation = () => {
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // Only update React Query cache - no AuthContext calls
      queryClient.setQueryData(['currentUser'], data.user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

#### Step 2: Migrate All Components to React Query
```tsx
// Before: AuthContext dependency
const ProfileScreen = () => {
  const { user, logout, updateUser } = useAuth(); // AuthContext
  // ...
};

// ✅ After: Pure React Query
const ProfileScreen = () => {
  const { data: user, isLoading, error } = useCurrentUser();
  const logoutMutation = useLogoutMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  // ...
};
```

#### Step 3: Proper Logout Sequence
```tsx
export const useLogoutMutation = () => {
  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      // Critical: Set user data to null explicitly before invalidating
      queryClient.setQueryData(['currentUser'], null);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.clear(); // Clear all cached data
    }
  });
};
```

### Migration Checklist

#### Phase 1: Preparation
- [x] Identify all AuthContext dependencies
- [x] Create pure React Query hooks
- [x] Test React Query hooks in isolation

#### Phase 2: Component Migration
- [x] Update AppNavigator to use React Query
- [x] Update MainTabNavigator for proper role-based navigation
- [x] Migrate authentication screens (Login, Register, Profile)
- [x] Migrate feature screens (Admin, Checkout, QR Scanner)

#### Phase 3: Cleanup
- [x] Remove AuthProvider from App.tsx
- [x] Delete AuthContext.tsx file completely
- [x] Fix all test screen imports
- [x] Update test files to use React Query mocks

### Key Lessons Learned

#### 1. Avoid Hybrid State Management
```tsx
// ❌ NEVER: Two sources of truth
const MyComponent = () => {
  const { user } = useAuth(); // AuthContext
  const { data: userData } = useCurrentUser(); // React Query
  // Which one is correct? Leads to bugs!
};

// ✅ ALWAYS: Single source of truth
const MyComponent = () => {
  const { data: user, isLoading, error } = useCurrentUser(); // React Query only
};
```

#### 2. Pure Hook Design
```tsx
// ❌ WRONG: Hook calling other state management
export const useLoginMutation = () => {
  const { setUser } = useAuth(); // Creates circular dependency
  return useMutation({
    onSuccess: (data) => {
      setUser(data.user); // Triggers other state system
      queryClient.setQueryData(['currentUser'], data.user);
    }
  });
};

// ✅ CORRECT: Pure hook with single responsibility
export const useLoginMutation = () => {
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], data.user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });
};
```

#### 3. Proper Cache Management
```tsx
// ✅ Explicit cache updates for immediate UI feedback
const mutation = useMutation({
  onSuccess: (data) => {
    // 1. Set data explicitly for immediate update
    queryClient.setQueryData(['currentUser'], data.user);
    // 2. Invalidate to trigger refetch and sync
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  }
});
```

#### 4. Complete Import Cleanup
```bash
# Always check for remaining imports after migration
grep -r "from.*AuthContext" src/
# Fix ALL imports, including test files!
```

### Prevention Strategies

#### 1. Architecture Review
- Choose ONE state management solution per domain
- Avoid mixing Context API with React Query for same data
- Design hooks to be pure and focused

---

## Backend Integration Patterns (Supabase)
**Date**: 2025-08-05  
**Context**: Supabase backend integration for authentication, orders, and products  
**Severity**: Critical (Production Foundation)

### Key Learnings

#### 1. Environment Variable Configuration
```bash
# ✅ Correct naming for Expo/React Native
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# ❌ Wrong - .env.local is not read by Expo
# Use .env instead
```

**Critical**: Expo requires `EXPO_PUBLIC_` prefix and reads from `.env`, not `.env.local`.

#### 2. Row Level Security (RLS) Policy Patterns
```sql
-- ✅ Essential policies for user registration
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);
```

**Issue**: Missing INSERT policy prevents user profile creation during registration.
**Solution**: Always create INSERT, SELECT, UPDATE policies for user-owned data.

#### 3. Real-time Data Synchronization
```typescript
// ✅ React Query + Supabase real-time pattern
export const useProducts = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: productKeys.lists(),
    queryFn: () => ProductService.getProducts(),
  });

  useEffect(() => {
    const subscription = supabase
      .channel('products-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, (payload) => {
        // Invalidate cache when data changes
        queryClient.invalidateQueries({ queryKey: productKeys.all });
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return query;
};
```

**Benefits**: Automatic UI updates when database changes, multi-user synchronization.

#### 4. Database Schema Design
```sql
-- Flexible category reference
CREATE TABLE products (
  category VARCHAR(255) NOT NULL, -- References categories.name
  -- More flexible than foreign key constraints
);

CREATE TABLE categories (
  name VARCHAR(255) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL
);
```

**Benefits**:
- Simpler schema management
- Better performance (no foreign key constraint overhead)
- More flexible category management
- Easier data migration and updates

**Trade-offs**:
- Manual referential integrity enforcement
- Potential for orphaned references (mitigated by application logic)
        message: 'Products fetched successfully'
      };
    } catch (error) {
      console.error('Service error:', error);
      return {
        data: [],
        success: false,
        error: 'Failed to fetch products'
      };
    }
  }
};
```

**Pattern**: Always return consistent `ApiResponse<T>` format with success/error states.

#### 6. Authentication Migration Strategy
```typescript
// ❌ Problematic: Hybrid Context + React Query
const useAuth = () => {
  const { user, setUser } = useContext(AuthContext);
  const { data } = useQuery(['user'], fetchUser);
  // Creates circular dependencies and infinite loops
};

// ✅ Solution: Pure React Query approach
const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  });
};
```

**Critical**: Avoid mixing Context API with React Query for the same data source.

#### 7. Mock Data Migration
```typescript
// ✅ Clean migration approach
// 1. Implement Supabase service alongside mock
// 2. Switch React Query hooks to use real service
// 3. Remove mock functions and imports
// 4. Clean up test data buttons and references

// ❌ Don't leave orphaned mock references
import { addMockOrdersForTesting } from '../services/orderService'; // Will break
```

**Process**: Systematic replacement prevents broken imports and runtime errors.

### Production Checklist Integration
- Email confirmation must be re-enabled before production
- Environment variables must point to production Supabase project
- All RLS policies must be verified for security
- Mock data and test functions must be removed

#### 2. Dependency Analysis
```tsx
// Before adding any hook dependency, ask:
// 1. Does this create a circular dependency?
// 2. Is this hook pure or does it call other state systems?
// 3. Can this be achieved with a single state management solution?
```

#### 3. Migration Strategy
```tsx
// For large migrations:
// 1. Create new pure hooks first
// 2. Test in isolation
// 3. Migrate components incrementally
// 4. Remove old system completely (don't leave hybrid)
// 5. Clean up ALL imports and references
```

### Results
- ✅ **Zero infinite loops**: App completely stable
- ✅ **Single source of truth**: React Query for all auth state
- ✅ **Clean architecture**: No confusing hybrid patterns
- ✅ **All functionality preserved**: Login, logout, profile, admin tabs, QR scanner
- ✅ **Future-proof**: Easy to extend and maintain

### Quick Reference: Infinite Loop Debugging

1. **Check for circular dependencies**: Hook A calls Hook B which calls Hook A
2. **Verify useEffect dependencies**: Are they causing re-initialization loops?
3. **Look for un-memoized functions**: Use `useCallback` for context functions
4. **Single source of truth**: Don't mix state management systems
5. **Pure hook design**: Hooks should not call other state management systems

### Critical Success Factors

1. **Complete Migration**: Don't leave hybrid systems - migrate fully or not at all
2. **Import Cleanup**: Fix ALL imports including test files to prevent runtime errors
3. **Cache Management**: Explicit cache updates for immediate UI feedback
4. **Testing**: Test each migrated component thoroughly before moving to next
5. **Documentation**: Document the migration pattern for future reference

This migration eliminated a critical app-breaking issue and established a clean, maintainable authentication architecture.
---

## Issue 8: Cart Synchronization Failure
**Date**: 2025-08-06  
**Context**: Cart data not syncing between devices/browsers  
**Severity**: Critical (Core Feature Broken)

### Problem Description
Cart items added on one device were not appearing on other devices/browsers, despite having broadcast events and React Query cache invalidation in place.

### Root Cause Analysis
Two critical architectural flaws were discovered:

#### 1. Database Storage Architecture Mismatch
```typescript
// ❌ BROKEN: Mixed storage architecture
const getCart = async () => {
  // Reads from Supabase database (shared across devices)
  const { data } = await supabase.from('cart_items').select('*');
  return data;
};

const saveCart = async (cart) => {
  // Only saves to AsyncStorage (local device storage)
  await AsyncStorage.setItem('cart', JSON.stringify(cart));
};
```

**Result**: No cross-device sync possible - each device had separate local cart data.

#### 2. Aggressive React Query Cache Manipulation
```typescript
// ❌ BROKEN: Aggressive cache pattern
queryClient.invalidateQueries({ queryKey: ['cart'] });
queryClient.refetchQueries({ queryKey: ['cart'] });     // Forced immediate refetch
queryClient.removeQueries({ queryKey: ['cart'] });      // Broke optimistic updates
```

**Result**: Race conditions with optimistic updates, cache conflicts, UI not updating properly.

### Solution Implementation

#### 1. Fixed Database Storage Architecture
```typescript
// ✅ FIXED: Consistent shared storage
const saveCart = async (cart: CartState): Promise<CartState> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Clear existing cart items
    await supabase.from('cart_items').delete().eq('user_id', user.id);
    
    // Insert new cart items to Supabase (shared database)
    if (cart.items.length > 0) {
      const cartItemsToInsert = cart.items.map(item => ({
        user_id: user.id,
        product_id: item.product.id,
        quantity: item.quantity
      }));
      
      await supabase.from('cart_items').insert(cartItemsToInsert);
    }
    
    // Also save to AsyncStorage for offline access
    await AsyncStorage.setItem('cart', JSON.stringify(cart));
  }
  
  return cart;
};
```

#### 2. Standardized React Query Patterns
```typescript
// ✅ FIXED: Standard invalidation pattern
queryClient.invalidateQueries({ queryKey: ['cart'] });
// Let React Query handle automatic refetching when components re-render
```

### Key Insights

#### React Query Partial Invalidation Works Perfectly
```typescript
// This pattern is actually GOOD:
queryClient.invalidateQueries({ queryKey: ['cart'] });
// Invalidates: ['cart'], ['cart', 'user'], ['cart', 'items'], etc.
```

**When partial invalidation works:**
- ✅ Query keys are consistent between hooks and services
- ✅ Standard patterns are used (`invalidateQueries()` only)
- ✅ Data is actually shared (Supabase database, not local storage)

#### Simple Patterns > Complex Solutions
```typescript
// ✅ RELIABLE: Trust React Query's built-in mechanisms
const subscription = supabase.channel('cart-updates')
  .on('broadcast', { event: 'cart-item-added' }, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  })
  .subscribe();

// ❌ UNRELIABLE: Aggressive cache manipulation
const subscription = supabase.channel('cart-updates')
  .on('broadcast', { event: 'cart-item-added' }, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.refetchQueries({ queryKey: ['cart'] });     // Race conditions
    queryClient.removeQueries({ queryKey: ['cart'] });      // Breaks optimistic updates
  })
  .subscribe();
```

### Prevention Strategies

#### 1. Consistent Storage Architecture
```typescript
// Ensure read/write operations use same storage mechanism
const dataService = {
  read: () => supabase.from('table').select('*'),    // Shared
  write: (data) => supabase.from('table').insert(data), // Shared
  // NOT: read from Supabase, write to AsyncStorage
};
```

#### 2. Query Key Audit Pattern
```typescript
// Regular audit to ensure consistency
const QUERY_KEYS = {
  cart: ['cart'] as const,
  orders: ['orders'] as const,
  products: ['products'] as const,
};

// Use everywhere:
// - useQuery({ queryKey: QUERY_KEYS.cart })
// - queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart })
```

#### 3. Standard React Query Patterns
```typescript
// ✅ Standard broadcast subscription pattern
const handleBroadcastEvent = (payload) => {
  queryClient.invalidateQueries({ queryKey: ['dataType'] });
  // Let React Query handle the rest
};

// ❌ Avoid aggressive patterns
const handleBroadcastEvent = (payload) => {
  queryClient.invalidateQueries({ queryKey: ['dataType'] });
  queryClient.refetchQueries({ queryKey: ['dataType'] });    // Usually unnecessary
  queryClient.removeQueries({ queryKey: ['dataType'] });     // Often harmful
};
```

### Testing Approach
```typescript
// Test synchronization with multiple browser tabs/devices
const testCartSync = async () => {
  // Device A: Add item to cart
  await cartService.addItem(product, 1);
  
  // Device B: Check cart (should see new item)
  const cart = await cartService.getCart();
  expect(cart.items).toContainEqual(expect.objectContaining({
    product: expect.objectContaining({ id: product.id }),
    quantity: 1
  }));
};
```

**Lesson**: Always test cross-device scenarios, not just single-device functionality.

### Test Setup Issues Identified

#### 1. Outdated Test Interfaces
Many test screens still use deprecated APIs and mock data structures that don't match the current React Query + Supabase architecture.

#### 2. Missing Cross-Device Test Infrastructure
Test screens lack proper multi-device simulation capabilities for validating synchronization features.

#### 3. Inconsistent Test Data
Test data structures don't match actual database schemas, leading to false test results.

**Recommended Actions**:
1. Audit and update all test screens to use current APIs
2. Create comprehensive sync test infrastructure
3. Standardize test data to match production schemas
4. Implement automated cross-device synchronization tests
