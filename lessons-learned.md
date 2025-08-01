# Lessons Learned - Farm Stand Mobile App Development

This document captures key lessons learned during development to help resolve similar issues faster in future increments.

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

## Future Increment Template

### Issue: [Brief Description]

#### Problem Summary
- [What was observed]
- [Impact on functionality]

#### Root Causes Identified
1. **[Cause 1]**
   - **Cause**: [Technical reason]
   - **Effect**: [What happened]
   - **Solution**: [How it was fixed]

#### Quick Resolution Patterns
```tsx
// ❌ Wrong
// [Bad pattern]

// ✅ Correct  
// [Good pattern]
```

#### Time-Saving Checklist
- [ ] [Check item 1]
- [ ] [Check item 2]

#### Prevention Strategies
- [Strategy 1]
- [Strategy 2]

---

*Last Updated: 2025-08-01*
*Increment: 1.5 - Shopping Cart Basic Functionality*
