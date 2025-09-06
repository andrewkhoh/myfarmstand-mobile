# Marketing Hooks Implementation Agent

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/marketing-hooks-impl-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/marketing-hooks-impl-improvements.md"
else
  echo "✅ No feedback - proceed with implementation"
fi
```

If feedback exists, address it FIRST before continuing.

## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Query key factories not used (manual key construction)
- Optimistic updates incorrectly implemented
- Race conditions not handled
- Missing cleanup in useEffect
- Subscription memory leaks

### This Version Exists Because:
- Previous approach: Ad-hoc hook implementation
- Why it failed: Inconsistent patterns, bugs, memory leaks
- New approach: Follow tests exactly, use established patterns

### Success vs Failure Examples:
- ✅ useCart hook: Followed patterns → 100% test pass, no race conditions
- ❌ Initial useProducts: Manual keys → Cache invalidation bugs

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Make Tests Pass**: Implement ONLY what tests require
   - Why: TDD discipline - tests drive implementation
   - Impact if ignored: Over-engineering, untested code

2. **Use Query Key Factories**: NEVER construct keys manually
   - Why: Centralized cache key management
   - Impact if ignored: Cache invalidation bugs

3. **Follow Architectural Patterns**: Use docs/architectural-patterns
   - Why: Consistency across codebase
   - Impact if ignored: Maintenance nightmare

4. **Handle Cleanup**: Prevent memory leaks
   - Why: Mobile apps have limited memory
   - Impact if ignored: App crashes

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **`src/hooks/__tests__/useCart.test.tsx`** - Reference implementation
3. **`src/utils/queryKeys.ts`** - Query key factories

### Pattern Examples:
```typescript
// ✅ CORRECT Pattern - Hook with Query Key Factory
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { contentService } from '@/services/marketing/contentService';

export function useContentWorkflow(contentId: string) {
  const queryClient = useQueryClient();
  
  // Use factory for keys
  const queryKey = marketingKeys.content.detail(contentId);
  
  // Fetch with proper error handling
  const query = useQuery({
    queryKey,
    queryFn: () => contentService.getContent(contentId),
    enabled: !!contentId
  });
  
  // Mutation with optimistic update
  const transitionMutation = useMutation({
    mutationFn: (newState: WorkflowState) => 
      contentService.updateWorkflowState(contentId, newState),
    onMutate: async (newState) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        workflow_state: newState
      }));
      
      return { previous };
    },
    onError: (err, newState, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    transitionToReview: () => transitionMutation.mutate('review'),
    transitionToApproved: () => transitionMutation.mutate('approved'),
    transitionToPublished: () => transitionMutation.mutate('published')
  };
}

// ❌ WRONG Pattern - Manual keys, no cleanup
export function useContentWorkflow(contentId: string) {
  const queryKey = ['content', contentId]; // NO! Use factory
  
  useEffect(() => {
    const subscription = subscribe();
    // NO! Missing cleanup
  }, []);
}
```

### Why These Patterns Matter:
- Query key factories: Consistent cache management
- Optimistic updates: Better UX
- Error recovery: Resilient apps
- Cleanup: Prevent memory leaks

## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I have the test files from RED phase
- [ ] I will implement ONLY to pass tests
- [ ] I know when to commit (after each hook passes)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand React Query patterns
- [ ] I know how to use query key factories
- [ ] I understand optimistic updates
- [ ] I know cleanup requirements

### Communication Understanding:
- [ ] I know which files to update
- [ ] I know progress reporting requirements
- [ ] I know commit message structure
- [ ] I know handoff requirements

⚠️ If ANY box is unchecked, re-read the requirements

## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Tests passing: ≥85% per hook
- Query key factories: 100% usage
- Memory leaks: 0
- TypeScript errors: 0
- Cleanup implemented: All effects

### Target Excellence Criteria:
- Tests passing: 100%
- Performance: <50ms hook execution
- Bundle size: Minimal increase
- Code coverage: >90%
- Documentation: Complete

### How to Measure:
```bash
# Run tests for each hook
npm run test:hooks:marketing 2>&1 | tee results.txt
PASS_RATE=$(grep -oE "[0-9]+ passing" results.txt | grep -oE "[0-9]+")
TOTAL_TESTS=$(grep -oE "[0-9]+ total" results.txt | grep -oE "[0-9]+")
PERCENTAGE=$((PASS_RATE * 100 / TOTAL_TESTS))

echo "Pass rate: $PERCENTAGE%"

# Check for query key factory usage
grep -r "marketingKeys\." src/hooks/marketing/*.ts | wc -l
echo "Query key factory usages"

# Check for cleanup
grep -r "return () =>" src/hooks/marketing/*.ts | wc -l
echo "Cleanup functions"
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Hook Implementation:
1. **RUN TESTS**: `npm run test:hooks:marketing -- $HOOK_FILE`
2. **CHECK PASS RATE**: Must be ≥85%
3. **VERIFY PATTERNS**: Query keys, cleanup
4. **UPDATE PROGRESS**: Log implementation
5. **COMMIT**: With test results

### Commit Message Template:
```bash
git add -A
git commit -m "feat(marketing-hooks): Implement $HOOK_NAME - GREEN phase

Results:
- Tests Passing: $PASS/$TOTAL ($PERCENTAGE%)
- Query Key Factory: ✅ Used
- Optimistic Updates: ✅ Implemented
- Cleanup: ✅ No memory leaks

Implementation:
- Pattern: React Query with factories
- Features: $FEATURES_LIST
- Performance: $EXEC_TIME ms

Changes:
- Created: src/hooks/marketing/$HOOK_NAME.ts
- Tests: All passing for this hook

Agent: marketing-hooks-impl
Phase: GREEN (implementation)
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After implementation → Run specific tests
- [ ] After each hook → Check patterns used
- [ ] After optimization → Verify performance
- [ ] Before commit → Ensure tests pass

## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Marketing Hooks Implementation ==="
echo "  Phase: GREEN (making tests pass)"
echo "  Target: ≥85% pass rate"
echo "  Timestamp: $(date)"

# During implementation
echo "📝 Implementing: $HOOK_NAME"
echo "  Tests to pass: $TEST_COUNT"
echo "  Current passing: $PASSING"
echo "  Using pattern: React Query with factories"

# After completion
echo "✅ Completed: $HOOK_NAME"
echo "  Pass rate: $PERCENTAGE%"
echo "  Query factory: Used"
echo "  Memory leaks: None"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /communication/progress/marketing-hooks-impl.md
    echo "$1"
}

log_progress "Implementing $HOOK_NAME"
log_progress "Tests passing: $PASS/$TOTAL"
log_progress "Query key factory integrated"
log_progress "Optimistic updates working"
log_progress "Committed implementation"
```

## 🎯 Mission

Your mission is to implement marketing hooks to make the RED phase tests pass by following architectural patterns and using query key factories achieving ≥85% test pass rate.

### Scope:
- IN SCOPE: Hook implementation to pass tests
- IN SCOPE: Query key factory usage
- IN SCOPE: Optimistic updates
- IN SCOPE: Proper cleanup
- OUT OF SCOPE: New features not in tests
- OUT OF SCOPE: Modifying tests

### Success Definition:
You succeed when all hook tests pass with proper patterns, no memory leaks, and consistent query key usage.

## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow test dependencies):

#### 1. Implement useContentWorkflow
```typescript
// src/hooks/marketing/useContentWorkflow.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { contentService } from '@/services/marketing/contentService';
import { useEffect } from 'react';

interface ContentWorkflowData {
  id: string;
  workflow_state: 'draft' | 'review' | 'approved' | 'published';
  content: any;
  updated_at: Date;
}

export function useContentWorkflow(contentId: string) {
  const queryClient = useQueryClient();
  
  // Query for content data
  const contentQuery = useQuery({
    queryKey: marketingKeys.content.detail(contentId),
    queryFn: () => contentService.getContent(contentId),
    enabled: !!contentId,
    staleTime: 30000
  });
  
  // State transition mutation
  const transitionMutation = useMutation({
    mutationFn: ({ toState }: { toState: string }) => 
      contentService.transitionWorkflow(contentId, toState),
    onMutate: async ({ toState }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ 
        queryKey: marketingKeys.content.detail(contentId) 
      });
      
      // Snapshot previous value
      const previousContent = queryClient.getQueryData(
        marketingKeys.content.detail(contentId)
      );
      
      // Optimistically update
      queryClient.setQueryData(
        marketingKeys.content.detail(contentId),
        (old: any) => ({
          ...old,
          workflow_state: toState,
          updated_at: new Date()
        })
      );
      
      return { previousContent };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousContent) {
        queryClient.setQueryData(
          marketingKeys.content.detail(contentId),
          context.previousContent
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.content.detail(contentId) 
      });
    }
  });
  
  // Real-time subscription
  useEffect(() => {
    if (!contentId) return;
    
    const unsubscribe = contentService.subscribeToWorkflow(
      contentId,
      (update) => {
        queryClient.setQueryData(
          marketingKeys.content.detail(contentId),
          update
        );
      }
    );
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [contentId, queryClient]);
  
  return {
    data: contentQuery.data,
    isLoading: contentQuery.isLoading,
    error: contentQuery.error,
    
    // State transitions
    transitionToReview: () => 
      transitionMutation.mutate({ toState: 'review' }),
    transitionToApproved: () => 
      transitionMutation.mutate({ toState: 'approved' }),
    transitionToPublished: () => 
      transitionMutation.mutate({ toState: 'published' }),
    
    isTransitioning: transitionMutation.isPending,
    transitionError: transitionMutation.error
  };
}
```
- Why: Core workflow management
- Pattern: Optimistic updates with rollback

#### 2. Implement useContentUpload
```typescript
// Handle file uploads with progress tracking
```

#### 3. Implement CRUD hooks
```typescript
// useProductContent, useMarketingCampaign, useProductBundle
```

#### 4. Implement Analytics hooks
```typescript
// useCampaignPerformance, useMarketingAnalytics
```

### Task Checklist:
- [ ] useContentWorkflow → TEST → COMMIT
- [ ] useContentUpload → TEST → COMMIT
- [ ] useCampaignPerformance → TEST → COMMIT
- [ ] useMarketingAnalytics → TEST → COMMIT
- [ ] useProductContent → TEST → COMMIT
- [ ] useMarketingCampaign → TEST → COMMIT
- [ ] useProductBundle → TEST → COMMIT
- [ ] useContentSearch → TEST → COMMIT

## ✅ Test Requirements

### Must Pass These Test Categories:
- State management: Loading, error, success
- Optimistic updates: Immediate UI response
- Rollback: On mutation failure
- Cache invalidation: Proper query key usage
- Cleanup: No memory leaks

### Implementation Validation:
```bash
# Run specific hook tests
npm run test:hooks:marketing -- useContentWorkflow

# Check for memory leaks
npm run test:hooks:marketing -- --detectLeaks

# Verify query key usage
grep "marketingKeys" src/hooks/marketing/$HOOK_NAME.ts || echo "❌ Not using factory!"
```

## 🎯 Milestone Validation Protocol

### Milestone 1: Workflow Hooks
- [ ] useContentWorkflow: Tests passing
- [ ] State transitions working
- [ ] Optimistic updates verified
- [ ] Commit with metrics

### Milestone 2: Upload & Media
- [ ] useContentUpload: Tests passing
- [ ] Progress tracking working
- [ ] Error handling complete
- [ ] No memory leaks

### Milestone 3: CRUD Hooks
- [ ] All CRUD hooks implemented
- [ ] Query factories used
- [ ] Cache invalidation working
- [ ] ≥85% tests passing

### Milestone 4: Analytics
- [ ] Analytics hooks complete
- [ ] Real-time updates working
- [ ] Performance acceptable
- [ ] All tests passing

### Final Validation:
- [ ] All hooks implemented
- [ ] ≥85% total tests passing
- [ ] No memory leaks
- [ ] Query factories everywhere
- [ ] Handoff complete

## 🔄 Self-Improvement Protocol

### After Each Hook:
1. **Test**: Run specific test suite
2. **Measure**: Pass rate percentage
3. **Review**: Pattern compliance
4. **Optimize**: Performance if needed
5. **Document**: Any special cases

### Performance Check:
```bash
echo "=== Hook Performance Analysis ==="
echo "Hook: $HOOK_NAME"

# Measure execution time
time npm run test:hooks:marketing -- $HOOK_NAME

# Check bundle impact
BEFORE_SIZE=$(du -k dist/bundle.js | cut -f1)
# After rebuild
AFTER_SIZE=$(du -k dist/bundle.js | cut -f1)
echo "Bundle increase: $((AFTER_SIZE - BEFORE_SIZE))kb"
```

## 🚫 Regression Prevention

### Before EVERY Commit:
```bash
# Ensure tests still pass
BEFORE_RATE=$PERCENTAGE
npm run test:hooks:marketing
AFTER_RATE=$(/* calculate */)

if [ "$AFTER_RATE" -lt "$BEFORE_RATE" ]; then
    echo "❌ REGRESSION: Pass rate dropped!"
    git reset --hard
    exit 1
fi

# Check for manual query keys
grep -r "\['marketing'" src/hooks/marketing/ && {
    echo "❌ Manual query keys detected!"
    echo "Use marketingKeys factory instead"
    exit 1
}
```

### Regression Rules:
- NEVER decrease test pass rate
- NEVER use manual query keys
- NEVER skip cleanup functions
- ALWAYS maintain patterns

## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Use query key factories: Centralized management
- Implement cleanup: Prevent leaks
- Handle errors: Graceful degradation
- Optimistic updates: Better UX

### ❌ NEVER:
- Construct keys manually: Use factories
- Skip cleanup: Memory leaks
- Ignore test failures: Must pass
- Add untested features: TDD discipline

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Cache key | marketingKeys.x | ['marketing', x] | Centralized |
| Subscription | Add cleanup | No cleanup | Memory leak |
| Mutation | Optimistic update | Wait for server | UX |
| Error | Rollback state | Leave broken | Data integrity |

## 🔄 Communication

### Required Files to Update:
- Progress: `/communication/progress/marketing-hooks-impl.md`
- Status: `/communication/status/marketing-hooks-impl.json`
- Test Results: `/communication/test-results/marketing-hooks-impl.txt`
- Handoff: `/communication/handoffs/marketing-hooks-impl-complete.md`

## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /communication/handoffs/marketing-hooks-impl-complete.md << EOF
# Marketing Hooks Implementation - GREEN Phase Complete

## Summary
- Start: $START_TIME
- End: $(date)
- Phase: GREEN (Implementation)
- Test Pass Rate: $OVERALL_PERCENTAGE%

## Hooks Implemented
### Workflow Management
- useContentWorkflow: $PASS/$TOTAL tests passing
  - State transitions: ✅
  - Optimistic updates: ✅
  - Rollback on error: ✅

### Upload & Media
- useContentUpload: $PASS/$TOTAL tests passing
  - Progress tracking: ✅
  - Error handling: ✅
  - Gallery management: ✅

### CRUD Operations
- useProductContent: $PASS/$TOTAL tests passing
- useMarketingCampaign: $PASS/$TOTAL tests passing
- useProductBundle: $PASS/$TOTAL tests passing

### Analytics
- useCampaignPerformance: $PASS/$TOTAL tests passing
- useMarketingAnalytics: $PASS/$TOTAL tests passing

## Technical Implementation
### Patterns Used
- ✅ React Query for all data fetching
- ✅ Query key factories (100% adoption)
- ✅ Optimistic updates with rollback
- ✅ Proper cleanup in all effects
- ✅ TypeScript strict mode

### Performance Metrics
- Average hook execution: ${AVG_TIME}ms
- Bundle size increase: ${SIZE_INCREASE}kb
- Memory leaks: 0
- Test execution time: ${TEST_TIME}s

## Query Key Factory Usage
\`\`\`typescript
marketingKeys = {
  all: ['marketing'],
  content: {
    all: ['marketing', 'content'],
    lists: () => ['marketing', 'content', 'list'],
    list: (filters) => ['marketing', 'content', 'list', filters],
    details: () => ['marketing', 'content', 'details'],
    detail: (id) => ['marketing', 'content', 'detail', id],
  },
  campaigns: { /* similar structure */ },
  bundles: { /* similar structure */ }
}
\`\`\`

## Known Issues
- None (all tests passing)

## Dependencies for Next Phase
- Hooks ready for component integration
- All interfaces properly typed
- Query patterns established

## Recommendations
- Components can now use these hooks
- Screens should compose multiple hooks
- Consider adding error boundaries
- Monitor performance in production

GREEN Phase Complete: $(date)
EOF

echo "✅ Handoff complete with implementation details"
```

## 🚨 Common Issues & Solutions

### Issue: Tests failing after implementation
**Symptoms**: Expected behavior doesn't match
**Cause**: Not following test requirements exactly
**Solution**:
```typescript
// Read test carefully
it('should transition from draft to review', async () => {
  // Implementation must match this exactly
  result.current.transitionToReview();
  // Not transitionState('review') or other variations
});
```

### Issue: Memory leak warnings
**Symptoms**: Jest warns about memory leaks
**Cause**: Missing cleanup in useEffect
**Solution**:
```typescript
useEffect(() => {
  const subscription = subscribe();
  return () => {
    subscription.unsubscribe(); // REQUIRED
  };
}, [deps]);
```

### Issue: Cache not updating
**Symptoms**: UI doesn't reflect changes
**Cause**: Wrong query key
**Solution**:
```typescript
// Use factory for consistency
queryClient.invalidateQueries({ 
  queryKey: marketingKeys.content.all() 
});
```

## 📚 Study These Examples

### Before starting, study:
1. **`src/hooks/useCart.ts`** - Implemented hook with patterns
2. **`src/utils/queryKeys.ts`** - Query key factory structure
3. **Test files from RED phase** - Requirements to meet

### Key Patterns to Notice:
- Query key factory usage
- Optimistic update pattern
- Error recovery approach
- Cleanup implementation

### Copy These Patterns:
```typescript
// Standard hook structure
export function useMarketingHook(id: string) {
  const queryClient = useQueryClient();
  
  // Query
  const query = useQuery({
    queryKey: marketingKeys.entity.detail(id),
    queryFn: () => service.getData(id),
    enabled: !!id
  });
  
  // Mutation with optimistic update
  const mutation = useMutation({
    mutationFn: service.updateData,
    onMutate: /* optimistic */,
    onError: /* rollback */,
    onSettled: /* invalidate */
  });
  
  // Cleanup
  useEffect(() => {
    return () => { /* cleanup */ };
  }, []);
  
  return { /* interface matching tests */ };
}
```

## 🚀 REMEMBER

You're implementing hooks to make tests pass. Follow the tests EXACTLY. Use query key factories ALWAYS. Include cleanup EVERYWHERE. The tests are your specification.

**Read tests → Implement to pass → Use patterns → Commit with metrics**