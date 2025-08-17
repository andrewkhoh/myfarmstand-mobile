# Race Condition Testing Strategy

## Mutation Process Analysis

### 1. Golden Standard Mutation Lifecycle

Each hook follows this pattern:
```
onMutate → mutationFn → onSuccess/onError
```

**Key Components:**
1. **onMutate**: Cancel queries → Snapshot state → Optimistic update
2. **mutationFn**: Execute actual mutation
3. **onSuccess**: Invalidate queries → Broadcast events
4. **onError**: Rollback to snapshot → Log error

### 2. Race Condition Prevention Mechanisms

#### Query Cancellation
```typescript
await queryClient.cancelQueries({ queryKey });
```
Prevents in-flight requests from overriding optimistic updates.

#### State Snapshots
```typescript
const previousState = queryClient.getQueryData(queryKey);
```
Enables atomic rollback on error.

#### Single Source of Truth
React Query cache is authoritative - no parallel useState for server data.

## Testing for Race Conditions

### 1. Concurrent Mutation Tests

```typescript
describe('Concurrent Mutation Race Conditions', () => {
  it('should handle rapid add-to-cart operations', async () => {
    const { result } = renderHook(() => useCart());
    
    // Fire multiple mutations simultaneously
    const promises = [
      result.current.addToCartAsync({ product: product1, quantity: 1 }),
      result.current.addToCartAsync({ product: product1, quantity: 2 }),
      result.current.addToCartAsync({ product: product1, quantity: 3 })
    ];
    
    await Promise.all(promises);
    
    // Verify final state is consistent
    expect(result.current.items[0].quantity).toBe(6); // 1+2+3
  });
  
  it('should handle interleaved add/remove operations', async () => {
    const { result } = renderHook(() => useCart());
    
    // Add item
    const addPromise = result.current.addToCartAsync({ product, quantity: 5 });
    
    // Immediately remove (before add completes)
    const removePromise = result.current.removeItemAsync(product.id);
    
    await Promise.all([addPromise, removePromise]);
    
    // Verify cart is empty (remove should win as it came after)
    expect(result.current.items.length).toBe(0);
  });
});
```

### 2. Network Latency Simulation

```typescript
describe('Network Latency Race Conditions', () => {
  it('should handle slow network with optimistic updates', async () => {
    // Mock slow network
    jest.spyOn(CartService, 'addToCart').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockCart), 2000))
    );
    
    const { result } = renderHook(() => useCart());
    
    // Start mutation
    const promise = result.current.addToCartAsync({ product, quantity: 1 });
    
    // Immediately check optimistic update
    expect(result.current.items.length).toBe(1);
    expect(result.current.isAdding).toBe(true);
    
    // Wait for actual mutation
    await promise;
    
    // Verify final state matches optimistic update
    expect(result.current.items.length).toBe(1);
    expect(result.current.isAdding).toBe(false);
  });
  
  it('should rollback on network failure', async () => {
    jest.spyOn(CartService, 'addToCart').mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useCart());
    
    try {
      await result.current.addToCartAsync({ product, quantity: 1 });
    } catch (error) {
      // Expected to fail
    }
    
    // Verify rollback to empty cart
    expect(result.current.items.length).toBe(0);
  });
});
```

### 3. State Consistency Tests

```typescript
describe('State Consistency', () => {
  it('should maintain consistency between mutations', async () => {
    const { result } = renderHook(() => useCart());
    
    // Add multiple items
    await result.current.addToCartAsync({ product: product1, quantity: 2 });
    await result.current.addToCartAsync({ product: product2, quantity: 3 });
    
    // Update quantity while another mutation is pending
    const updatePromise = result.current.updateQuantityAsync({ 
      productId: product1.id, 
      quantity: 5 
    });
    
    // Add another item before update completes
    const addPromise = result.current.addToCartAsync({ 
      product: product3, 
      quantity: 1 
    });
    
    await Promise.all([updatePromise, addPromise]);
    
    // Verify all operations applied correctly
    expect(result.current.items).toHaveLength(3);
    expect(result.current.items.find(i => i.product.id === product1.id)?.quantity).toBe(5);
    expect(result.current.total).toBe(calculateExpectedTotal());
  });
});
```

### 4. Query Invalidation Tests

```typescript
describe('Query Invalidation Race Conditions', () => {
  it('should not double-fetch on rapid mutations', async () => {
    const fetchSpy = jest.spyOn(CartService, 'getCart');
    
    const { result } = renderHook(() => useCart());
    
    // Rapid mutations
    await result.current.addToCartAsync({ product: product1, quantity: 1 });
    await result.current.addToCartAsync({ product: product2, quantity: 1 });
    await result.current.updateQuantityAsync({ productId: product1.id, quantity: 3 });
    
    // Wait for invalidations to settle
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    
    // Should batch invalidations, not fetch multiple times
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
```

### 5. Authentication State Changes

```typescript
describe('Authentication Race Conditions', () => {
  it('should handle logout during pending mutation', async () => {
    const { result: cartResult } = renderHook(() => useCart());
    const { result: authResult } = renderHook(() => useAuth());
    
    // Start cart mutation
    const cartPromise = cartResult.current.addToCartAsync({ product, quantity: 1 });
    
    // Logout immediately
    await authResult.current.logoutAsync();
    
    // Cart mutation should fail or be cancelled
    await expect(cartPromise).rejects.toThrow();
    
    // Cart should be empty after logout
    expect(cartResult.current.items).toHaveLength(0);
  });
});
```

### 6. Realtime Subscription Tests

```typescript
describe('Realtime Subscription Race Conditions', () => {
  it('should handle subscription setup during state changes', async () => {
    const { result } = renderHook(() => useRealtime());
    
    // Initialize subscriptions
    const initPromise = result.current.initializeSubscriptionsAsync();
    
    // Immediately try to cleanup (race condition)
    const cleanupPromise = result.current.cleanupSubscriptionsAsync();
    
    await Promise.allSettled([initPromise, cleanupPromise]);
    
    // Final state should be consistent (cleanup wins)
    expect(result.current.status.isInitialized).toBe(false);
    expect(result.current.status.totalSubscriptions).toBe(0);
  });
});
```

### 7. Form State Isolation Tests

```typescript
describe('Form State Isolation', () => {
  it('should not affect form state when cart updates', async () => {
    const { result: formResult } = renderHook(() => useCheckoutForm());
    const { result: cartResult } = renderHook(() => useCart());
    
    // Set form state
    formResult.current.setPaymentMethod('cash_on_pickup');
    formResult.current.setNotes('Test note');
    
    // Update cart
    await cartResult.current.addToCartAsync({ product, quantity: 1 });
    await cartResult.current.updateQuantityAsync({ productId: product.id, quantity: 5 });
    
    // Form state should remain unchanged
    expect(formResult.current.paymentMethod).toBe('cash_on_pickup');
    expect(formResult.current.notes).toBe('Test note');
  });
});
```

## Key Testing Strategies

### 1. Timing-Based Tests
- Use `jest.useFakeTimers()` to control time flow
- Test rapid successive operations
- Simulate network delays with setTimeout

### 2. Mock Service Delays
```typescript
mockImplementation(() => new Promise(resolve => 
  setTimeout(() => resolve(data), DELAY)
))
```

### 3. Concurrent Promise Testing
```typescript
await Promise.all([mutation1, mutation2, mutation3]);
await Promise.race([mutation1, timeout]);
await Promise.allSettled([successMutation, failMutation]);
```

### 4. State Verification Points
- Check optimistic state immediately after mutation start
- Verify final state after mutation completion
- Ensure rollback on error
- Validate state consistency across related queries

### 5. Error Injection
```typescript
jest.spyOn(Service, 'method')
  .mockRejectedValueOnce(new Error('First fails'))
  .mockResolvedValueOnce(successData);
```

### 6. React Query Testing Utils
```typescript
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const { result, waitFor, rerender } = renderHook(
  () => useCart(),
  { wrapper }
);
```

## Race Condition Checklist

- [ ] Test concurrent mutations on same resource
- [ ] Test interleaved add/update/remove operations  
- [ ] Test network failure rollback
- [ ] Test optimistic update consistency
- [ ] Test query cancellation effectiveness
- [ ] Test authentication state changes during mutations
- [ ] Test subscription setup/teardown races
- [ ] Test form state isolation from server state
- [ ] Test broadcast event ordering
- [ ] Test cache invalidation batching
- [ ] Test retry logic with changing state
- [ ] Test error recovery mechanisms