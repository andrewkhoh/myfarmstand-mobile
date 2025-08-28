# Agent 1: Fix Hook Test Failures

## Mission
Fix 27 failing hook tests by applying the test infrastructure patterns established in Phase 1-2.

## Context
- **Working Directory**: `../test-fixes-fix-hook-tests`
- **Branch**: `test-fixes-fix-hook-tests`
- **Communication Hub**: `../test-fixes-communication`
- **Test Count**: 27 failing hook tests (out of 163 total)

## Your Tasks

### 1. Initial Analysis
```bash
cd ../test-fixes-fix-hook-tests
npm run test:hooks 2>&1 | tee ../test-fixes-communication/status/hook-test-initial.txt
```

### 2. Common Patterns to Apply

#### Fix Query Key Issues
```typescript
// ❌ OLD - Local query keys
const productQueryKeys = {
  all: ['products'],
  lists: () => [...productQueryKeys.all, 'list']
};

// ✅ NEW - Centralized factory
import { productKeys } from 'utils/queryKeyFactory';
```

#### Fix Async Cleanup
```typescript
// ❌ OLD - Missing cleanup
it('should test', async () => {
  const { result } = renderHook(() => useProducts());
  // test...
});

// ✅ NEW - Proper cleanup
it('should test', async () => {
  const { result } = renderHook(() => useProducts());
  
  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
  
  // Clean up properly
  await waitFor(() => {
    jest.clearAllMocks();
  });
});
```

#### Fix Timer Issues
```typescript
// ❌ OLD - Fake timers causing issues
beforeEach(() => {
  jest.useFakeTimers();
});

// ✅ NEW - Real timers
beforeEach(() => {
  jest.useRealTimers();
});
```

### 3. Files to Fix (Priority Order)

1. **useProducts.test.tsx** - Query key mismatch
2. **useAuth.test.tsx** - Missing mocks
3. **useNotifications.test.tsx** - Async cleanup
4. **useKiosk.test.tsx** - New query key structure
5. **Marketing hooks** - Mock patterns
6. **Role-based hooks** - Permission mocks

### 4. Required Mock Patterns

```typescript
// SimplifiedSupabaseMock pattern
jest.mock('config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null })
    }))
  }
}));

// ValidationMonitor mock
jest.mock('utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

// React Query mock
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn()
  })
}));
```

### 5. Progress Tracking

After each fix:
```bash
# Test the specific file
npm run test:hooks -- useProducts.test.tsx

# Update progress
echo "$(date): Fixed useProducts.test.tsx - X/27 tests passing" >> ../test-fixes-communication/progress/fix-hook-tests.md

# Run full suite periodically
npm run test:hooks 2>&1 | tee ../test-fixes-communication/status/hook-test-current.txt
```

### 6. Success Criteria
- All 27 failing tests pass
- No new failures introduced
- Tests use centralized patterns
- Proper async cleanup
- No fake timer issues

## Communication Protocol

### Status Updates
```bash
# Every 30 minutes or major milestone
echo "$(date): Status - X/27 fixed, working on [test name]" >> ../test-fixes-communication/progress/fix-hook-tests.md
```

### If Blocked
```bash
echo "BLOCKED: [Issue description] in [file]" >> ../test-fixes-communication/handoffs/hook-blockers.md
```

### Completion
```bash
echo "COMPLETE: 27/27 hook tests fixed" >> ../test-fixes-communication/status/hook-test-final.txt
npm run test:hooks -- --coverage >> ../test-fixes-communication/status/hook-coverage.txt
```

## Quick Reference

### Commands
- `npm run test:hooks` - Run all hook tests
- `npm run test:hooks -- [filename]` - Test specific file
- `npm run test:hooks:watch` - Watch mode

### Key Files
- `src/utils/queryKeyFactory.ts` - Centralized query keys
- `src/test/hooks-setup.ts` - Hook test setup
- `src/hooks/__tests__/*.test.tsx` - Test files to fix

## Start Here
1. Run initial test suite to see all failures
2. Start with useProducts.test.tsx (most common pattern)
3. Apply fixes systematically
4. Track progress in communication hub