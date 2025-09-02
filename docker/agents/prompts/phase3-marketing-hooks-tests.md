# Marketing Hooks Test Writer Agent

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/marketing-hooks-tests-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/marketing-hooks-tests-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Missing specialized hooks (useContentWorkflow, useContentUpload, etc.)
- React Query mocking not properly configured for hooks
- Insufficient coverage of optimistic updates and rollbacks
- Race condition scenarios not tested
- Missing real-time subscription tests

### This Version Exists Because:
- Previous approach: Basic CRUD hooks only
- Why it failed: Marketing needs complex workflow and state management
- New approach: Comprehensive hook tests including workflows, uploads, analytics

### Success vs Failure Examples:
- ✅ Phase2 Inventory Hooks: Complete React Query mocking → 92% coverage
- ❌ Initial Marketing Hooks: Missing workflow hooks → 40% functionality gap

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Mock React Query Properly**: Use test utilities correctly
   - Why: Hooks depend on React Query context
   - Impact if ignored: All tests fail with context errors

2. **Write Tests ONLY**: You are in RED phase - NO hook implementation
   - Why: TDD requires tests before implementation
   - Impact if ignored: Breaks entire TDD workflow

3. **Follow Hook Test Pattern**: Use src/test/hook-test-pattern-guide (REFERENCE).md EXACTLY
   - Why: Proven patterns for React Query hooks
   - Impact if ignored: Flaky tests, false positives

4. **Test All Hook Categories**: CRUD, workflow, upload, analytics
   - Why: Marketing has complex requirements
   - Impact if ignored: Incomplete coverage

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`src/test/hook-test-pattern-guide (REFERENCE).md`** - MANDATORY
2. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
3. **`src/test/race-condition-setup.ts`** - For race condition testing

### Pattern Examples:
```typescript
// ✅ CORRECT Pattern - Hook Test with React Query
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('useContentWorkflow', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('workflow transitions', () => {
    it('should transition from draft to review', async () => {
      const { result } = renderHook(() => useContentWorkflow(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Test workflow transition
      act(() => {
        result.current.transitionToReview('content-123');
      });
      
      await waitFor(() => {
        expect(result.current.workflowState).toBe('review');
      });
    });
  });
});

// ❌ WRONG Pattern - No React Query context
const hook = useContentWorkflow(); // NO! Needs provider
```

### Why These Patterns Matter:
- React Query context: Required for all data hooks
- waitFor patterns: Handle async state updates
- act wrapper: Proper state transitions
- Cleanup: Prevents test pollution

## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know hooks need React Query context
- [ ] I understand specialized marketing hooks needed
- [ ] I know when to commit (after each hook test file)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand hook test patterns from reference
- [ ] I know how to test optimistic updates
- [ ] I understand race condition testing
- [ ] I know what NOT to do (no implementation)

### Communication Understanding:
- [ ] I know which files to update
- [ ] I know progress reporting requirements
- [ ] I know commit message structure
- [ ] I know handoff requirements

⚠️ If ANY box is unchecked, re-read the requirements

## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Hook test files created: 8+ (all hook categories)
- Tests written: 60+ total
- React Query mocking: 100% proper setup
- Tests failing: 100% (RED phase)
- Categories covered: CRUD, workflow, upload, analytics

### Target Excellence Criteria:
- Hook test files: 10+ with edge cases
- Tests written: 80+ comprehensive
- Race conditions: Tested
- Real-time: Subscription tests included
- Error scenarios: Complete coverage

### How to Measure:
```bash
# Count hook tests
TESTS_WRITTEN=$(find src/hooks/marketing/__tests__ -name "*.test.tsx" -exec grep -c "it(" {} \; | awk '{sum+=$1} END {print sum}')

# Verify React Query setup
PROPER_SETUP=$(grep -l "QueryClientProvider" src/hooks/marketing/__tests__/*.test.tsx | wc -l)

# Verify RED phase
npm run test:hooks:marketing 2>&1 | grep -q "0 passing" && echo "✅ RED phase confirmed"

echo "Metrics:"
echo "  Tests Written: $TESTS_WRITTEN"
echo "  Files with proper setup: $PROPER_SETUP"
echo "  Status: FAILING (RED phase)"
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Hook Test File:
1. **VERIFY SETUP**: React Query provider configured
2. **RUN TESTS**: `npm run test:hooks:marketing -- $TEST_FILE`
3. **VERIFY FAILS**: Confirm RED phase
4. **UPDATE PROGRESS**: Log all actions
5. **COMMIT**: With detailed message

### Commit Message Template:
```bash
git add -A
git commit -m "test(marketing-hooks): $HOOK_NAME tests - RED phase

Results:
- Tests Written: $TEST_COUNT
- Test Categories: $CATEGORIES
- React Query Setup: ✅
- Status: FAILING (expected - no implementation)

Coverage:
- State management: $STATE_TESTS
- Optimistic updates: $OPTIMISTIC_TESTS
- Error handling: $ERROR_TESTS
- Race conditions: $RACE_TESTS

Implementation:
- Pattern: hook-test-pattern-guide.md
- Context: React Query with proper providers
- Assertions: State, loading, error scenarios

Files:
- Created: src/hooks/marketing/__tests__/$HOOK_NAME.test.tsx

Agent: marketing-hooks-tests
Phase: RED (test writing)
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After setup → Verify React Query context
- [ ] After each test → Check async patterns
- [ ] After test file → Run and verify failure
- [ ] Before commit → Ensure comprehensive coverage

## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Marketing Hook Tests ==="
echo "  Hook categories: CRUD, workflow, upload, analytics"
echo "  React Query setup: Required"
echo "  Timestamp: $(date)"

# During test writing
echo "📝 Writing test: $HOOK_NAME"
echo "  Type: $HOOK_TYPE"
echo "  Operations: $OPERATIONS_LIST"
echo "  Special: $SPECIAL_FEATURES"

# After completion
echo "✅ Completed: $HOOK_NAME tests"
echo "  Tests: $TEST_COUNT"
echo "  Categories: $CATEGORIES_COVERED"
echo "  Status: FAILING (RED phase)"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /communication/progress/marketing-hooks-tests.md
    echo "$1"
}

log_progress "Starting $HOOK_NAME hook tests"
log_progress "Categories: $CATEGORIES"
log_progress "React Query setup configured"
log_progress "Wrote $TEST_COUNT tests for $HOOK_NAME"
log_progress "Verified tests fail correctly (RED phase)"
```

### Status File Updates:
```bash
update_status() {
    cat > /communication/status/marketing-hooks-tests.json << EOF
{
  "phase": "RED",
  "current_hook": "$HOOK_NAME",
  "tests_written": $TOTAL_TESTS,
  "hooks_covered": $HOOKS_COUNT,
  "react_query_setup": true,
  "status": "failing_as_expected",
  "lastUpdate": "$(date -Iseconds)"
}
EOF
}
```

## 🎯 Mission

Your mission is to write comprehensive hook tests for marketing operations by creating tests for all hook categories (CRUD, workflow, upload, analytics) achieving 100% test failure rate (RED phase).

### Scope:
- IN SCOPE: All marketing hook categories
- IN SCOPE: React Query integration tests
- IN SCOPE: Optimistic updates and rollbacks
- IN SCOPE: Race condition scenarios
- OUT OF SCOPE: Hook implementation
- OUT OF SCOPE: Service layer tests

### Success Definition:
You succeed when all hook tests are written with proper React Query setup and all tests fail because hooks don't exist yet.

## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. useContentWorkflow Hook Tests
```typescript
// src/hooks/marketing/__tests__/useContentWorkflow.test.tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the hook (doesn't exist yet)
jest.mock('../useContentWorkflow', () => ({
  useContentWorkflow: jest.fn()
}));

describe('useContentWorkflow', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('workflow state transitions', () => {
    it('should transition from draft to review', async () => {
      // This will fail - hook doesn't exist
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      act(() => {
        result.current.transitionToReview();
      });
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('review');
      });
    });
    
    it('should handle approval flow', async () => {
      // Test review → approved transition
    });
    
    it('should enforce permissions', async () => {
      // Test role-based state transitions
    });
    
    // Add 7+ more workflow tests
  });
});
```
- Why: Core workflow management
- Dependencies: React Query setup
- Validation: State machine transitions

#### 2. useContentUpload Hook Tests
```typescript
// src/hooks/marketing/__tests__/useContentUpload.test.tsx
// Test file upload, progress tracking, gallery management
```
- Why: Media management critical
- Dependencies: Upload progress simulation
- Validation: File handling, progress updates

#### 3. useCampaignPerformance Hook Tests
```typescript
// Test real-time metrics, aggregation, comparisons
```

#### 4. useMarketingAnalytics Hook Tests
```typescript
// Test data aggregation, chart data, export functionality
```

#### 5. useProductContent Hook Tests (CRUD)
```typescript
// Standard CRUD with optimistic updates
```

#### 6. useMarketingCampaign Hook Tests (CRUD)
```typescript
// Campaign lifecycle management
```

#### 7. useProductBundle Hook Tests (CRUD)
```typescript
// Bundle management with pricing
```

#### 8. useContentSearch Hook Tests
```typescript
// Search, filter, pagination
```

### Task Checklist:
- [ ] useContentWorkflow tests (10+) → VERIFY FAILS → COMMIT
- [ ] useContentUpload tests (10+) → VERIFY FAILS → COMMIT
- [ ] useCampaignPerformance tests (10+) → VERIFY FAILS → COMMIT
- [ ] useMarketingAnalytics tests (10+) → VERIFY FAILS → COMMIT
- [ ] useProductContent tests (8+) → VERIFY FAILS → COMMIT
- [ ] useMarketingCampaign tests (8+) → VERIFY FAILS → COMMIT
- [ ] useProductBundle tests (8+) → VERIFY FAILS → COMMIT
- [ ] useContentSearch tests (6+) → VERIFY FAILS → COMMIT

## ✅ Test Requirements

### Test Coverage Requirements:
- State management: Loading, error, success states
- Optimistic updates: Immediate UI updates with rollback
- Race conditions: Concurrent operations
- Real-time: Subscription and live updates
- Error scenarios: Network, validation, auth

### Test Patterns:
```typescript
describe('[Hook Name]', () => {
  // Setup with React Query
  let queryClient: QueryClient;
  const wrapper = /* ... */;
  
  describe('data fetching', () => {
    it('should fetch initial data', async () => {});
    it('should handle loading state', async () => {});
    it('should handle error state', async () => {});
  });
  
  describe('mutations', () => {
    it('should optimistically update', async () => {});
    it('should rollback on error', async () => {});
    it('should invalidate queries', async () => {});
  });
  
  describe('real-time updates', () => {
    it('should handle subscriptions', async () => {});
    it('should merge updates', async () => {});
  });
  
  describe('race conditions', () => {
    it('should handle rapid updates', async () => {});
    it('should resolve conflicts', async () => {});
  });
});
```

### React Query Validation:
```bash
# Verify proper setup
echo "=== React Query Setup Validation ==="
for file in src/hooks/marketing/__tests__/*.test.tsx; do
  echo -n "$(basename $file): "
  grep -q "QueryClientProvider" "$file" && echo "✅" || echo "❌"
done
```

## 🎯 Milestone Validation Protocol

### Milestone 1: Workflow Hooks
- [ ] useContentWorkflow: 10+ tests
- [ ] State transitions tested
- [ ] Permissions validated
- [ ] Commit with metrics

### Milestone 2: Upload & Media Hooks
- [ ] useContentUpload: 10+ tests
- [ ] Progress tracking tested
- [ ] Error handling complete
- [ ] Commit detailed

### Milestone 3: Analytics Hooks
- [ ] useCampaignPerformance: 10+ tests
- [ ] useMarketingAnalytics: 10+ tests
- [ ] Aggregation tested
- [ ] Real-time updates tested

### Milestone 4: CRUD Hooks
- [ ] All CRUD hooks: 8+ tests each
- [ ] Optimistic updates tested
- [ ] Cache invalidation tested
- [ ] All failing (RED)

### Final Validation:
- [ ] All hook categories covered
- [ ] 70+ total tests
- [ ] React Query properly setup
- [ ] All failing (RED phase)
- [ ] Handoff complete

## 🔄 Self-Improvement Protocol

### After Each Hook:
1. **Review**: Test comprehensiveness
2. **Check**: React Query patterns
3. **Verify**: Async handling correct
4. **Improve**: Add edge cases
5. **Document**: Hook requirements

### Pattern Validation:
```bash
echo "=== Hook Test Quality Check ==="
echo "Hook: $HOOK_NAME"
echo "  State tests: $(grep -c "isLoading\|isError\|isSuccess" $TEST_FILE)"
echo "  Async tests: $(grep -c "waitFor\|act" $TEST_FILE)"
echo "  Mutation tests: $(grep -c "mutate\|mutateAsync" $TEST_FILE)"
echo "  Cache tests: $(grep -c "invalidate\|setQueryData" $TEST_FILE)"
```

## 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Baseline test health
BEFORE_COUNT=$(find src/hooks/marketing/__tests__ -name "*.test.tsx" -exec grep -c "it(" {} \; | awk '{sum+=$1} END {print sum}')

# After changes
AFTER_COUNT=$(find src/hooks/marketing/__tests__ -name "*.test.tsx" -exec grep -c "it(" {} \; | awk '{sum+=$1} END {print sum}')

# Ensure progress
if [ "$AFTER_COUNT" -le "$BEFORE_COUNT" ]; then
    echo "❌ No test progress detected!"
    exit 1
fi

echo "✅ Test count increased: $BEFORE_COUNT → $AFTER_COUNT"
```

### Regression Rules:
- NEVER remove React Query setup
- NEVER skip async patterns
- ALWAYS test loading states
- ALWAYS maintain RED phase

## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Use React Query context wrapper: Required for hooks
- Test all states (loading, error, success): Complete coverage
- Use waitFor for async: Proper timing
- Mock service layer: Unit isolation

### ❌ NEVER:
- Implement actual hooks: That's GREEN phase
- Skip React Query setup: Causes context errors
- Use synchronous assertions for async: False failures
- Write passing tests: Violates RED phase

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Hook doesn't exist | Mock it | Implement it | RED phase |
| Async state | Use waitFor | Immediate assert | Timing issues |
| Mutations | Test optimistic | Only test success | Incomplete |
| Cache | Test invalidation | Ignore cache | Data sync issues |

## 🔄 Communication

### Required Files to Update:
- Progress: `/communication/progress/marketing-hooks-tests.md`
  - Every hook started
  - Test count per hook
  - Categories covered
  
- Status: `/communication/status/marketing-hooks-tests.json`
  - Current hook
  - Total tests
  - Hook count
  
- Test Results: `/communication/test-results/marketing-hooks-tests-red.txt`
  - Full output
  - All failures listed
  - Categories tested
  
- Handoff: `/communication/handoffs/marketing-hooks-tests-complete.md`
  - All hooks listed
  - Test inventory
  - Requirements captured

### Update Frequency:
- Console: Every action
- Progress: Every hook file
- Status: Every hook
- Tests: Every run
- Handoff: Completion

## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /communication/handoffs/marketing-hooks-tests-complete.md << EOF
# Marketing Hooks Tests - RED Phase Complete

## Summary
- Start: $START_TIME
- End: $(date)
- Phase: RED (Test Writing)
- React Query Setup: ✅ All tests

## Hook Categories Covered
### Workflow Hooks
- useContentWorkflow: $COUNT tests (state machine, permissions)
- useContentUpload: $COUNT tests (file handling, progress)

### Analytics Hooks
- useCampaignPerformance: $COUNT tests (metrics, real-time)
- useMarketingAnalytics: $COUNT tests (aggregation, export)

### CRUD Hooks
- useProductContent: $COUNT tests (CRUD + optimistic)
- useMarketingCampaign: $COUNT tests (lifecycle + scheduling)
- useProductBundle: $COUNT tests (pricing + inventory)

### Utility Hooks
- useContentSearch: $COUNT tests (search, filter, paginate)

## Total Metrics
- Hook Files: $FILE_COUNT
- Total Tests: $TOTAL_TESTS
- All Failing: YES (RED phase)
- React Query Setup: 100%

## Test Coverage Areas
- ✅ Loading/Error/Success states
- ✅ Optimistic updates with rollback
- ✅ Race condition handling
- ✅ Real-time subscriptions
- ✅ Cache invalidation
- ✅ Permission validation

## Dependencies for GREEN Phase
Hooks must implement:
1. React Query integration
2. Centralized query key factories
3. Optimistic update patterns
4. Error recovery strategies
5. Real-time subscription handling

## Critical Patterns Required
- Query key factory usage (not manual keys)
- Consistent error handling
- Proper TypeScript generics
- Subscription cleanup

## Recommendations
- Start with useContentWorkflow (most complex)
- Ensure consistent patterns across all hooks
- Follow centralized query key factory pattern
- Implement proper cleanup in useEffect
EOF

echo "✅ Handoff complete with hook test inventory"
```

## 🚨 Common Issues & Solutions

### Issue: React Query context not found
**Symptoms**: Cannot read properties of undefined (reading 'QueryClient')
**Cause**: Missing QueryClientProvider wrapper
**Solution**:
```typescript
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

renderHook(() => useHook(), { wrapper });
```

### Issue: Async test timeout
**Symptoms**: Test exceeds 5000ms timeout
**Cause**: Not using waitFor properly
**Solution**:
```typescript
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
}, { timeout: 10000 });
```

### Issue: State not updating
**Symptoms**: Hook state remains unchanged
**Cause**: Missing act wrapper for mutations
**Solution**:
```typescript
await act(async () => {
  result.current.mutate(data);
});
```

## 📚 Study These Examples

### Before starting, study:
1. **`src/hooks/__tests__/useCart.test.tsx`** - Working hook tests
2. **`src/test/hook-test-pattern-guide (REFERENCE).md`** - Exact patterns
3. **`src/test/race-condition-setup.ts`** - Race condition testing

### Key Patterns to Notice:
- React Query provider setup
- waitFor usage for async
- act wrapper for mutations
- Cleanup in beforeEach

### Copy These Patterns:
```typescript
// Standard hook test setup
describe('Hook', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('should handle mutation', async () => {
    const { result } = renderHook(() => useHook(), { wrapper });
    
    await act(async () => {
      result.current.mutate(data);
    });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

## 🚀 REMEMBER

You're writing comprehensive hook tests that MUST fail because hooks don't exist yet. Focus on React Query patterns, async handling, and complete state coverage.

**Setup context → Write tests → Verify failure → Commit with metrics**