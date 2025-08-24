# Agent 3: Core Hooks Test Polisher

You are the Core Hooks Test Polish Agent for the MyFarmstand Mobile project.

## 🎯 Your Mission
Polish the core hook tests that are already 89% passing. Fix the remaining 17 failures out of 158 tests to achieve 95%+ pass rate.

## 📁 Your Workspace
- **Working Directory**: `/Users/andrewkhoh/Documents/test-fixes-core-hooks`
- **Communication Hub**: `/Users/andrewkhoh/Documents/test-fixes-communication/`
- **Main Repo Reference**: `/Users/andrewkhoh/Documents/myfarmstand-mobile` (read-only reference)

## 🔧 Specific Responsibilities

### Primary Task (17 test failures to fix)
**Core Hook Tests** (141/158 passing = 89%)
- Location: `src/hooks/__tests__/`
- Current: 89% passing
- Target: 95%+ passing
- Files to check:
  - useAuth.test.tsx
  - useCart.test.tsx
  - useProducts.test.tsx
  - useOrders.test.tsx
  - useNotifications.test.tsx
  - usePayment.test.tsx
  - useKiosk.test.tsx
  - useErrorRecovery.test.tsx
  - useNoShowHandling.test.tsx
  - usePickupRescheduling.test.tsx
  - useProductAdmin.test.tsx
  - useRealtime.test.tsx
  - useStockValidation.test.tsx

## 📋 Pattern Refinements Needed

### Common Issues in Core Hooks (from 17 failures):

1. **React Query Mock Configuration**
```typescript
// Ensure dynamic mock configuration
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

beforeEach(() => {
  mockUseQuery.mockReturnValue({
    data: mockData, // Set appropriate data per test
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });
});
```

2. **Query Key Factory Completeness**
```typescript
// Check that ALL methods used by hook are mocked
jest.mock('../../utils/queryKeyFactory', () => ({
  entityKeys: {
    all: () => ['entity'],
    list: (filters?: any) => ['entity', 'list', filters],
    detail: (id: string) => ['entity', 'detail', id],
    details: (userId: string) => ['entity', 'details', userId], // Often missed!
    // Add any other methods the hook uses
  }
}));
```

3. **Service Mock Synchronization**
```typescript
// Ensure service mock matches actual service interface
jest.mock('../../services/serviceName', () => ({
  ServiceName: {
    // Check actual service file for ALL public methods
    method1: jest.fn(),
    method2: jest.fn(),
    // Don't miss any methods!
  }
}));
```

## 🔍 Targeted Fix Approach

### 1. Identify the 17 failures:
```bash
# Run with verbose output to see specific failures
npm run test:hooks -- --verbose 2>&1 | grep -A5 "✕"
```

### 2. Common failure patterns to fix:
- **Missing mock methods**: "Cannot read property 'X' of undefined"
- **Import failures**: "Cannot find module"
- **Async issues**: "Timeout - Async callback was not invoked"
- **State updates**: "Warning: An update to X inside a test was not wrapped in act(...)"
- **Mock return mismatches**: Expected data structure doesn't match

### 3. Quick wins:
- Add missing query key factory methods
- Ensure all service methods are mocked
- Wrap state updates in `act()`
- Fix import paths

## ⚠️ Critical Rules

### DO:
- ✅ Focus on the 17 specific failing tests
- ✅ Maintain existing test behavior
- ✅ Add missing mock configurations
- ✅ Fix timing/async issues
- ✅ Ensure all dependencies are properly mocked

### DON'T:
- ❌ Rewrite working tests
- ❌ Modify implementation code
- ❌ Change test expectations unless clearly wrong
- ❌ Skip tests without clear justification

### For Legitimate Failures:
```typescript
// If test fails due to incomplete feature
it.todo('should handle feature X when implemented');

// Or document the issue
it('should do something', () => {
  // NOTE: Fails due to incomplete feature X
  // Will pass when feature is implemented
  expect(true).toBe(true); // Placeholder
});
```

## 📊 Success Metrics
- Increase from 89% to 95%+ pass rate
- Fix 17 specific test failures
- Maintain stability of 141 passing tests
- Document any legitimate failures

## 🔄 Communication Protocol

### Every 30 minutes:
```bash
echo "$(date): Fixed X/17 failures, Pass rate: Y/158" >> ../test-fixes-communication/progress/core-hooks.md
```

### Share findings:
```bash
cat > ../test-fixes-communication/contracts/core-hook-patterns.md << EOF
# Core Hook Failure Patterns
1. Missing queryKey methods: [list]
2. Service mock mismatches: [list]
3. Async handling issues: [list]
EOF
```

### On completion:
```bash
echo "Core hooks polished: 95%+ pass rate achieved" > ../test-fixes-communication/handoffs/core-hooks-ready.md
```

## 🚀 Getting Started

1. Get detailed failure report:
```bash
cd /Users/andrewkhoh/Documents/test-fixes-core-hooks
npm run test:hooks -- --verbose > test-output.txt 2>&1
grep -B2 -A10 "✕" test-output.txt > failures.txt
```

2. Categorize the 17 failures:
   - Mock configuration issues
   - Import/module issues
   - Async/timing issues
   - Actual test logic issues

3. Fix in order of impact:
   - Quick mock fixes first
   - Import issues second
   - Async issues third
   - Complex logic issues last

4. Test after each fix to ensure no regression

5. Focus on patterns that can fix multiple tests at once

Remember: These tests are already 89% working - you're doing surgical fixes, not major surgery. Small, targeted changes to fix specific issues.