# TDD Phase 3B: Marketing Hooks Agent

## 1. Agent Identification
**Agent ID**: marketing-hooks  
**Layer**: React Hooks/State Management
**Phase**: TDD Phase 3B - Combined RED/GREEN/REFACTOR
**Target**: 85% test pass rate

## 2. Feedback Check
**Before every action**, check for:
- `/communication/feedback/marketing-hooks-feedback.md`
- Adjust approach based on feedback before proceeding

## 3. Historical Context
**Previous Phase 3 Attempts**:
- Hooks layer had ~20/60 tests (33% coverage)
- Missing 40 critical hook tests
- 4 specialized hooks not implemented at all
- Phase 3B combines test writing and implementation

## 4. Requirements & Scope
**From PHASE3-TDD-IMPLEMENTATION-PLAN.md**:
- Hooks layer: ~20/60 tests exist
- Missing 40 hook tests for:
  - useContentWorkflow (10 tests)
  - useContentUpload (10 tests)
  - useCampaignPerformance (10 tests)
  - useMarketingAnalytics (10 tests)
- Need to implement 4 missing hooks completely

**Success Metric**: 85% test pass rate (51/60 tests passing)

## 5. Technical Patterns

### React Query Hook Pattern
```typescript
// ✅ CORRECT: Hook with proper React Query setup
export function useContentWorkflow(contentId: string) {
  const queryClient = useQueryClient();
  
  // Query for current state
  const contentQuery = useQuery({
    queryKey: marketingKeys.content.detail(contentId),
    queryFn: () => contentWorkflowService.getContent(contentId),
    staleTime: 30000,
  });
  
  // Mutation for state transitions
  const transitionMutation = useMutation({
    mutationFn: ({ targetState }: { targetState: WorkflowState }) =>
      contentWorkflowService.transitionTo(contentId, targetState),
    onMutate: async ({ targetState }) => {
      // Optimistic update
      await queryClient.cancelQueries({ 
        queryKey: marketingKeys.content.detail(contentId) 
      });
      
      const previous = queryClient.getQueryData(
        marketingKeys.content.detail(contentId)
      );
      
      queryClient.setQueryData(
        marketingKeys.content.detail(contentId),
        (old: ProductContent) => ({
          ...old,
          workflowState: targetState,
        })
      );
      
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          marketingKeys.content.detail(contentId),
          context.previous
        );
      }
    },
    onSettled: () => {
      // Invalidate to refetch truth
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.content.detail(contentId) 
      });
    },
  });
  
  return {
    content: contentQuery.data,
    isLoading: contentQuery.isLoading,
    error: contentQuery.error,
    transitionTo: transitionMutation.mutate,
    isTransitioning: transitionMutation.isPending,
  };
}
```

### File Upload Hook Pattern
```typescript
// ✅ CORRECT: Upload hook with progress tracking
export function useContentUpload(contentId: string) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const queryClient = useQueryClient();
  
  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'image' | 'document' }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contentId', contentId);
      formData.append('type', type);
      
      return await uploadService.uploadFile(formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total!
          );
          setUploadProgress(progress);
        },
      });
    },
    onSuccess: (data) => {
      // Update content with new file reference
      queryClient.setQueryData(
        marketingKeys.content.detail(contentId),
        (old: ProductContent) => ({
          ...old,
          [data.type === 'image' ? 'imageUrls' : 'documents']: [
            ...(old[data.type === 'image' ? 'imageUrls' : 'documents'] || []),
            data.url,
          ],
        })
      );
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });
  
  return {
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    uploadProgress,
    error: uploadMutation.error,
  };
}
```

## 6. Communication Templates

### Progress Update (Every 30 mins)
```markdown
## 🔄 Marketing Hooks Progress Update

**Current Cycle**: [1/2]
**Test Status**: [45/60] tests passing (75%)
**Active Task**: Implementing useCampaignPerformance hook

### ✅ Completed This Cycle
- Implemented useContentWorkflow hook (10/10 tests passing)
- Implemented useContentUpload hook (8/10 tests passing)
- Fixed existing useMarketingDashboard tests (15/15 passing)
- Added optimistic updates to all mutations

### 🚧 In Progress
- useCampaignPerformance real-time updates
- useMarketingAnalytics aggregation logic

### ⏭️ Next Steps
- Complete analytics hook implementation
- Fix remaining upload progress tests
- Add error boundary integration

**Blockers**: None
**ETA to 85% target**: 45 minutes
```

### Commit Message Format
```bash
# Hook implementation commit
git commit -m "feat(marketing-hooks): Implement content workflow hooks

- Add useContentWorkflow with state transitions
- Add useContentUpload with progress tracking
- Implement optimistic updates with rollback
- Add proper error handling

Test Status: 45/60 passing (75%)
Target Progress: 88% of goal"
```

## 7. Test Implementation Checklist

### Phase 1: AUDIT (First 30 mins)
```bash
# 1. Run existing hook tests
npm run test:hooks:marketing 2>&1 | tee initial-hooks-test.log

# 2. Identify missing hooks
find src/hooks/marketing -name "*.ts" -not -name "*.test.ts" | \
  xargs -I {} basename {} .ts | sort > implemented-hooks.txt
  
grep -h "describe\|it" src/hooks/marketing/__tests__/*.test.ts | \
  grep -o "use[A-Z][a-zA-Z]*" | sort -u > tested-hooks.txt

# 3. Document gaps
comm -23 implemented-hooks.txt tested-hooks.txt > missing-tests.txt

echo "## Hooks Audit
- Implemented hooks: $(wc -l < implemented-hooks.txt)
- Tested hooks: $(wc -l < tested-hooks.txt)  
- Missing test coverage: $(wc -l < missing-tests.txt)
- Current pass rate: X/60
" > /communication/progress/marketing-hooks.md
```

### Phase 2: RED (Write missing tests)
```typescript
// src/hooks/marketing/__tests__/useContentWorkflow.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContentWorkflow } from '../useContentWorkflow';

describe('useContentWorkflow', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('state transitions', () => {
    it('should load content with current workflow state', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.content).toBeDefined();
      });
      
      expect(result.current.content?.workflowState).toBe('draft');
    });
    
    it('should optimistically update on transition', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      act(() => {
        result.current.transitionTo({ targetState: 'review' });
      });
      
      // Immediate optimistic update
      expect(result.current.content?.workflowState).toBe('review');
      expect(result.current.isTransitioning).toBe(true);
    });
    
    it('should rollback on transition error', async () => {
      // Mock service to fail
      jest.spyOn(contentWorkflowService, 'transitionTo')
        .mockRejectedValueOnce(new Error('Invalid transition'));
      
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      const originalState = result.current.content?.workflowState;
      
      act(() => {
        result.current.transitionTo({ targetState: 'published' });
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.content?.workflowState).toBe(originalState);
      });
    });
  });
  
  describe('permission checks', () => {
    it('should disable transitions based on user role', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1', { role: 'viewer' }),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      expect(result.current.canTransitionTo('approved')).toBe(false);
      expect(result.current.canTransitionTo('review')).toBe(false);
    });
  });
});
```

### Phase 3: GREEN (Implement hooks)
```typescript
// src/hooks/marketing/useContentWorkflow.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { contentWorkflowService } from '@/services/marketing';
import type { WorkflowState, ProductContent } from '@/types/marketing';

interface UseContentWorkflowOptions {
  role?: UserRole;
}

export function useContentWorkflow(
  contentId: string,
  options?: UseContentWorkflowOptions
) {
  const queryClient = useQueryClient();
  const userRole = options?.role || useUserRole();
  
  // Permission matrix
  const permissions = {
    viewer: [],
    editor: ['review'],
    manager: ['review', 'approved'],
    admin: ['review', 'approved', 'published'],
  };
  
  const contentQuery = useQuery({
    queryKey: marketingKeys.content.detail(contentId),
    queryFn: () => contentWorkflowService.getContent(contentId),
    staleTime: 30000,
  });
  
  const transitionMutation = useMutation({
    mutationFn: ({ targetState }: { targetState: WorkflowState }) => {
      // Check permissions before attempting
      if (!canTransitionTo(targetState)) {
        return Promise.reject(new Error('Insufficient permissions'));
      }
      
      return contentWorkflowService.transitionTo(contentId, targetState);
    },
    onMutate: async ({ targetState }) => {
      await queryClient.cancelQueries({ 
        queryKey: marketingKeys.content.detail(contentId) 
      });
      
      const previous = queryClient.getQueryData<ProductContent>(
        marketingKeys.content.detail(contentId)
      );
      
      if (previous) {
        queryClient.setQueryData(
          marketingKeys.content.detail(contentId),
          {
            ...previous,
            workflowState: targetState,
            lastModified: new Date(),
          }
        );
      }
      
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          marketingKeys.content.detail(contentId),
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.content.detail(contentId) 
      });
    },
  });
  
  const canTransitionTo = (targetState: WorkflowState): boolean => {
    return permissions[userRole]?.includes(targetState) ?? false;
  };
  
  return {
    content: contentQuery.data,
    isLoading: contentQuery.isLoading,
    error: contentQuery.error || transitionMutation.error,
    transitionTo: transitionMutation.mutate,
    isTransitioning: transitionMutation.isPending,
    canTransitionTo,
    availableTransitions: permissions[userRole] || [],
  };
}
```

## 8. Workspace Management
```bash
# Your dedicated workspace
WORKSPACE="/workspace"
BRANCH="tdd_phase_3b-marketing-hooks"

# Initial setup
cd $WORKSPACE
git checkout -b $BRANCH

# Frequent commits during implementation
git add src/hooks/marketing/
git commit -m "wip: marketing-hooks - implementing $(date +%H:%M)"
```

## 9. Error Recovery Procedures

### React Query Test Issues
```bash
# Common test timeout fix
export REACT_QUERY_TEST_TIMEOUT=10000

# Debug hanging tests
npm run test:hooks:marketing -- --detectOpenHandles --forceExit

# Isolate problematic test
npm run test:hooks:marketing -- --testNamePattern="should rollback" --verbose
```

### Hook Testing Patterns
```typescript
// ✅ CORRECT: Proper async hook testing
it('should handle async operations', async () => {
  const { result } = renderHook(() => useContentUpload('id'), { wrapper });
  
  // Act must be async for mutations
  await act(async () => {
    result.current.upload({ file: mockFile, type: 'image' });
  });
  
  // Wait for mutation to complete
  await waitFor(() => {
    expect(result.current.isUploading).toBe(false);
  });
  
  expect(result.current.uploadProgress).toBe(0);
});
```

## 10. Dependencies & Integration Points

### Required Dependencies
- Schema layer exports (from marketing-schema agent)
- Service layer methods (from marketing-services agent)
- Query key factories from utils

### Hook Consumers
- marketing-screens will use these hooks
- Components will consume hook state
- Integration tests will verify hook orchestration

## 11. File Organization

### Hook Structure
```bash
src/hooks/marketing/
  ├── __tests__/
  │   ├── useContentWorkflow.test.tsx
  │   ├── useContentUpload.test.tsx
  │   ├── useCampaignPerformance.test.tsx
  │   ├── useMarketingAnalytics.test.tsx
  │   └── test-utils.tsx  # Shared test utilities
  ├── useContentWorkflow.ts
  ├── useContentUpload.ts
  ├── useCampaignPerformance.ts
  ├── useMarketingAnalytics.ts
  └── index.ts  # Barrel exports
```

## 12. Hook Implementation Patterns

### Composable Hooks
```typescript
// ✅ CORRECT: Compose smaller hooks
export function useMarketingDashboard() {
  const campaigns = useActiveCampaigns();
  const content = usePendingContent();
  const analytics = useMarketingAnalytics();
  
  return {
    stats: {
      activeCampaigns: campaigns.data?.length ?? 0,
      pendingContent: content.data?.length ?? 0,
      totalRevenue: analytics.data?.revenue ?? 0,
    },
    isLoading: campaigns.isLoading || content.isLoading || analytics.isLoading,
    refetchAll: () => {
      campaigns.refetch();
      content.refetch();
      analytics.refetch();
    },
  };
}
```

### Real-time Updates
```typescript
// ✅ CORRECT: WebSocket integration
export function useCampaignPerformance(campaignId: string) {
  const queryClient = useQueryClient();
  
  // Base query
  const performanceQuery = useQuery({
    queryKey: marketingKeys.campaign.performance(campaignId),
    queryFn: () => campaignService.getPerformance(campaignId),
  });
  
  // Real-time subscription
  useEffect(() => {
    const unsubscribe = realtimeService.subscribe(
      `campaign:${campaignId}:metrics`,
      (update) => {
        queryClient.setQueryData(
          marketingKeys.campaign.performance(campaignId),
          (old) => ({
            ...old,
            ...update,
          })
        );
      }
    );
    
    return unsubscribe;
  }, [campaignId, queryClient]);
  
  return performanceQuery;
}
```

## 13. Performance Optimization

### Query Optimization
```typescript
// ✅ CORRECT: Prefetching and caching
export function useMarketingContent() {
  const queryClient = useQueryClient();
  
  // Prefetch next page
  const prefetchNext = useCallback((page: number) => {
    queryClient.prefetchQuery({
      queryKey: marketingKeys.content.list({ page: page + 1 }),
      queryFn: () => contentService.getPage(page + 1),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient]);
  
  const contentQuery = useInfiniteQuery({
    queryKey: marketingKeys.content.list(),
    queryFn: ({ pageParam = 1 }) => contentService.getPage(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 30000,
  });
  
  // Prefetch on page load
  useEffect(() => {
    if (contentQuery.data?.pages.length === 1) {
      prefetchNext(1);
    }
  }, [contentQuery.data, prefetchNext]);
  
  return contentQuery;
}
```

## 14. Security Patterns

### Secure Data Handling
```typescript
// ✅ CORRECT: Sanitize and validate
export function useContentEditor(contentId: string) {
  const sanitizeMutation = useMutation({
    mutationFn: async (html: string) => {
      // Client-side sanitization
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href'],
      });
      
      // Server validation
      return await contentService.updateContent(contentId, {
        description: sanitized,
      });
    },
  });
  
  return {
    updateContent: sanitizeMutation.mutate,
    isSaving: sanitizeMutation.isPending,
  };
}
```

## 15. Testing Execution Commands
```bash
# Full hook test suite
npm run test:hooks:marketing

# Coverage report
npm run test:hooks:marketing -- --coverage

# Watch mode
npm run test:hooks:marketing -- --watch

# Debug specific hook
node --inspect-brk ./node_modules/.bin/jest \
  --runInBand \
  --config jest.config.hooks.js \
  useContentWorkflow.test.tsx

# Run with verbose output
npm run test:hooks:marketing -- --verbose --no-coverage
```

## 16. Rollback Procedures
```bash
# If hooks break catastrophically
git stash
git checkout origin/main -- src/hooks/marketing/

# Verify baseline
npm run test:hooks:marketing

# Incrementally reapply
git stash pop
git add -p
npm run test:hooks:marketing  # Test each change
```

## 17. Success Criteria

### Completion Checklist
- [ ] 85% test pass rate achieved (51/60 tests)
- [ ] All 4 specialized hooks implemented
- [ ] Optimistic updates working correctly
- [ ] Error handling with proper rollback
- [ ] Real-time subscriptions integrated
- [ ] TypeScript types properly exported
- [ ] No memory leaks in tests

### Final Handoff Document
```markdown
# Marketing Hooks Layer - Handoff

## Final Status
- **Test Pass Rate**: 85% (51/60 tests passing)
- **New Hooks Implemented**: 4/4
- **Coverage**: 87%
- **TypeScript**: Clean

## Completed Work
1. Implemented useContentWorkflow with state machine
2. Added useContentUpload with progress tracking
3. Created useCampaignPerformance with real-time
4. Built useMarketingAnalytics with aggregation
5. Fixed all existing hook tests

## Hook Exports
\`\`\`typescript
export {
  useContentWorkflow,
  useContentUpload,
  useCampaignPerformance,
  useMarketingAnalytics,
  useMarketingDashboard,
} from './hooks/marketing';
\`\`\`

## Known Issues
- 9 tests skipped pending WebSocket mock setup
- Upload progress requires XMLHttpRequest mock
- Analytics aggregation needs optimization

## Next Agent Dependencies
- marketing-screens can now use all hooks
- Components have full hook coverage
- Integration layer can orchestrate hooks
```

## 18. Communication Protocols

### Status Updates (Every 15 mins)
```bash
echo "{
  \"agent\": \"marketing-hooks\",
  \"cycle\": $CYCLE,
  \"testsPass\": $PASS,
  \"testsFail\": $FAIL,
  \"testPassRate\": $RATE,
  \"status\": \"active\",
  \"phase\": \"$PHASE\",
  \"lastUpdate\": \"$(date -Iseconds)\"
}" > /communication/status/marketing-hooks.json
```

### Progress Tracking
```bash
# Detailed progress log
cat >> /communication/progress/marketing-hooks.md << EOF

## $(date +"%H:%M") Update
- Tests passing: $PASS/$TOTAL
- Current hook: $CURRENT_HOOK
- Status: $STATUS
- Next: $NEXT_TASK
EOF
```

## 19. Final Notes

### Implementation Priority
1. **useContentWorkflow** - Core functionality, blocks screens
2. **useContentUpload** - Required for content management
3. **useCampaignPerformance** - Real-time dashboard updates
4. **useMarketingAnalytics** - Can be simpler initially

### Testing Focus Areas
- Optimistic updates and rollback
- Error boundary integration
- Memory leak prevention
- Concurrent request handling
- Cache invalidation logic

### Common Hook Pitfalls
- Forgetting to cancel queries on unmount
- Not handling loading states properly
- Missing error boundaries
- Incorrect dependency arrays
- Not memoizing callbacks

Remember: 85% test pass rate is the goal. Focus on implementing the 4 missing hooks and fixing the highest-value test failures first.