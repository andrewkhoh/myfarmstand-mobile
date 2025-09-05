# Phase 4: Executive Hooks Enhancement Agent

## 1. 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/shared/feedback/executive-hooks-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/executive-hooks-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

### 📚 Reference Implementation Available:
```bash
echo "=== REFERENCE IMPLEMENTATION AVAILABLE ==="
echo "Location: /reference/tdd_phase_4-executive-hooks/"
echo "Status: 100% test pass rate - proven working implementation"
echo "Use this to understand requirements and patterns"
```
## 2. ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Hooks returned raw data without UI-ready transformations
- Missing pagination and filtering for large datasets
- No real-time subscription setup for live updates

### This Version Exists Because:
- Previous approach: Basic data fetching only
- Why it failed: Screens needed extensive data manipulation
- New approach: Enhance hooks with UI-ready transformations

### Success vs Failure Examples:
- ✅ Phase 3B Hooks: UI-ready data → 91% screen integration
- ❌ Phase 2 Hooks: Raw data only → 45% required screen-level transforms

## 3. 🚨 CRITICAL REQUIREMENTS

### MANDATORY - These are NOT optional:
1. **Query Key Factory**: Use ONLY centralized executiveKeys
   - Why: Prevents cache inconsistencies
   - Impact if ignored: Duplicate cache entries, stale data

2. **UI-Ready Transforms**: Return data shaped for direct component use
   - Why: Reduces component complexity
   - Impact if ignored: Complex screen logic, poor performance

3. **Real-time Subscriptions**: Add WebSocket/SSE support
   - Why: Executive dashboards need live updates
   - Impact if ignored: Stale data, manual refresh required

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 4. 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **`src/hooks/cart/useCart.ts`** - Real-time pattern example
3. **`src/utils/queryKeyFactory.ts`** - Centralized keys

### Pattern Examples:
```typescript
// ✅ CORRECT: Enhanced hook with UI transforms
import { executiveKeys } from '@/utils/queryKeyFactory';

export const useBusinessMetrics = (options?: {
  dateRange?: DateRange;
  department?: string;
  realtime?: boolean;
}) => {
  const queryKey = executiveKeys.metrics(options);
  
  // Fetch with React Query
  const query = useQuery({
    queryKey,
    queryFn: () => businessMetricsService.getMetrics(options),
    select: (data) => {
      // Transform for UI consumption
      return {
        kpis: transformToKPICards(data.metrics),
        charts: transformToChartData(data.trends),
        comparisons: calculateComparisons(data),
        alerts: extractAlerts(data)
      };
    }
  });
  
  // Real-time subscriptions
  useEffect(() => {
    if (options?.realtime) {
      const unsubscribe = realtimeService.subscribe(
        'business-metrics',
        (update) => {
          queryClient.setQueryData(queryKey, (old) => 
            mergeRealtimeUpdate(old, update)
          );
        }
      );
      return unsubscribe;
    }
  }, [options?.realtime, queryKey]);
  
  // Pagination support
  const loadMore = useCallback(() => {
    // Implementation
  }, []);
  
  return {
    ...query,
    kpis: query.data?.kpis || [],
    charts: query.data?.charts || [],
    comparisons: query.data?.comparisons || [],
    alerts: query.data?.alerts || [],
    loadMore
  };
};

// ❌ WRONG: Raw data, local keys, no transforms
export const badHook = () => {
  const { data } = useQuery({
    queryKey: ['executive', 'metrics'], // Local key!
    queryFn: () => fetch('/api/metrics').then(r => r.json())
  });
  return data; // Raw, untransformed
};
```

### Why These Patterns Matter:
- Centralized keys: Consistent cache management
- UI transforms: Ready-to-render data
- Real-time: Live dashboard updates

## 5. 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I'm ENHANCING existing hooks, not replacing
- [ ] I understand the 85% test pass rate for NEW tests
- [ ] I know to preserve existing functionality
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand React Query patterns
- [ ] I know how to add real-time subscriptions
- [ ] I understand data transformation patterns
- [ ] I know centralized query key usage

### Communication Understanding:
- [ ] I know to update `/shared/progress/executive-hooks.md`
- [ ] I know to document enhancements clearly
- [ ] I know what breaking changes to avoid

⚠️ If ANY box is unchecked, re-read the requirements

## 6. 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- NEW Test Pass Rate: ≥85% on enhancement tests
- Existing tests: 100% still passing (no regression)
- TypeScript: Zero compilation errors
- All hooks return UI-ready data
- Real-time subscriptions working

### Target Excellence Criteria:
- Test Pass Rate: 100% all tests
- Performance: <100ms data transform
- Cache hits: >90% for repeated queries
- Real-time latency: <500ms

### How to Measure:
```bash
# Capture metrics
npm run test:hooks:executive 2>&1 | tee test-results.txt
NEW_TESTS=$(grep -A5 "Enhancement Tests" test-results.txt | grep -oE "[0-9]+ passing")
EXISTING_TESTS=$(grep -A5 "Existing Tests" test-results.txt | grep -oE "[0-9]+ passing")

echo "Test Metrics:"
echo "  New Enhancement Tests: $NEW_TESTS"
echo "  Existing Tests: $EXISTING_TESTS"
echo "  TypeScript: $(npx tsc --noEmit 2>&1 | grep -c "error TS")"
```

## 7. 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Hook Enhancement:
1. **RUN ALL TESTS**: `npm run test:hooks:executive`
2. **VERIFY NO REGRESSION**: Existing tests still pass
3. **CHECK REAL-TIME**: Test WebSocket connections
4. **COMMIT PROGRESS**: Detailed commit message
5. **UPDATE PROGRESS**: Write to progress files

### Commit Message Template:
```bash
git add -A
git commit -m "feat(executive-hooks): Enhance useBusinessMetrics for UI

Test Results:
- New tests: 12/15 passing (80%)
- Existing tests: 15/15 passing (100%)
- Total: 27/30 passing (90%)
- Coverage: 92%

Enhancements:
- Added chart data transformation for TrendChart component
- Added KPI card formatting with comparisons
- Implemented real-time subscription support
- Added pagination for detailed metrics
- Using centralized executiveKeys factory

Breaking Changes: NONE
- All existing return values preserved
- New data added as additional properties

Agent: executive-hooks
Cycle: 1/5
Phase: GREEN"
```

### Validation Checkpoints:
- [ ] After each enhancement → Test
- [ ] Verify backwards compatibility → No breaks
- [ ] Test real-time → WebSocket working
- [ ] Before handoff → Full regression test

## 8. 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Enhancing: useBusinessMetrics hook ==="
echo "  Timestamp: $(date)"
echo "  Existing tests: 15/15 passing"
echo "  Target: Add UI transforms + real-time"

# During work
echo "  ✓ Added KPI transformation pipeline"
echo "  ✓ Implemented chart data formatting"
echo "  ✓ Added WebSocket subscription"
echo "  ✓ Preserved all existing functionality"

# After completion
echo "✅ Enhanced: useBusinessMetrics"
echo "  New capabilities: 4 added"
echo "  Tests: 27/30 passing (90%)"
echo "  Breaking changes: 0"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /shared/progress/executive-hooks.md
    echo "$1"  # Also echo to console
}

log_progress "🚀 Starting useBusinessMetrics enhancement"
log_progress "📝 Added UI transformation layer"
log_progress "🔄 Implemented real-time subscriptions"
log_progress "✅ Backwards compatibility verified"
log_progress "🧪 New tests: 12/15 passing"
```

### Status File Updates:
```bash
update_status() {
    echo "{
      \"agent\": \"executive-hooks\",
      \"currentHook\": \"$1\",
      \"enhancements\": $2,
      \"newTests\": $3,
      \"existingTests\": $4,
      \"totalPassRate\": $5,
      \"status\": \"active\",
      \"lastUpdate\": \"$(date -Iseconds)\"
    }" > /shared/status/executive-hooks.json
}

update_status "useBusinessMetrics" 4 12 15 90
```

## 9. 🎯 Mission

Your mission is to enhance 16 existing executive hooks with UI-ready transforms, real-time support, and pagination, achieving 85% pass rate on NEW enhancement tests while maintaining 100% backwards compatibility.

### Scope:
- IN SCOPE: Data transforms, real-time, pagination, filtering
- OUT OF SCOPE: Creating new hooks, breaking existing APIs, services

### Success Definition:
You succeed when all hooks are enhanced with ≥85% new test pass rate and zero breaking changes.

## 10. 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. useBusinessMetrics Enhancement
```typescript
// src/hooks/executive/useBusinessMetrics.ts (ENHANCE, don't replace)

// ADD these UI transforms
const transformToKPICards = (metrics: RawMetrics): KPIData[] => {
  return [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: metrics.revenue,
      format: 'currency',
      trend: calculateTrend(metrics.revenue, metrics.previousRevenue),
      comparison: {
        value: metrics.revenue - metrics.previousRevenue,
        label: 'last period'
      }
    },
    {
      id: 'orders',
      title: 'Total Orders',
      value: metrics.orderCount,
      format: 'number',
      trend: calculateTrend(metrics.orderCount, metrics.previousOrderCount)
    }
    // More KPIs...
  ];
};

const transformToChartData = (trends: RawTrends): ChartData => {
  return {
    labels: trends.dates.map(d => format(d, 'MMM dd')),
    datasets: [
      {
        label: 'Revenue',
        data: trends.revenue,
        color: '#10b981'
      },
      {
        label: 'Orders',
        data: trends.orders,
        color: '#3b82f6'
      }
    ]
  };
};

// ADD real-time subscription
useEffect(() => {
  if (options?.realtime) {
    const channel = `executive:metrics:${userId}`;
    const unsubscribe = realtimeService.subscribe(channel, (event) => {
      if (event.type === 'metrics.updated') {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          ...event.payload
        }));
      }
    });
    return unsubscribe;
  }
}, [options?.realtime, userId, queryKey]);
```

#### 2. useBusinessInsights Enhancement
- Add insight categorization
- Format for InsightCard components
- Add priority scoring
- Real-time alert updates

#### 3. usePerformanceMetrics Enhancement
- Department comparison transforms
- Trend analysis calculations
- Percentile rankings
- Real-time performance updates

#### 4. useRevenueAnalytics Enhancement
- Revenue breakdown by category
- Projection calculations
- Seasonal adjustments
- Real-time transaction updates

#### 5. useInventoryMetrics Enhancement
- Stock level categorization
- Alert threshold calculations
- Turnover rate computing
- Real-time inventory changes

### Enhancement Checklist (All 16 hooks):
- [ ] useBusinessMetrics → ENHANCE → TEST → COMMIT
- [ ] useBusinessInsights → ENHANCE → TEST → COMMIT
- [ ] usePerformanceMetrics → ENHANCE → TEST → COMMIT
- [ ] useRevenueAnalytics → ENHANCE → TEST → COMMIT
- [ ] useInventoryMetrics → ENHANCE → TEST → COMMIT
- [ ] useCustomerAnalytics → ENHANCE → TEST → COMMIT
- [ ] useDepartmentMetrics → ENHANCE → TEST → COMMIT
- [ ] useProductPerformance → ENHANCE → TEST → COMMIT
- [ ] useMarketingROI → ENHANCE → TEST → COMMIT
- [ ] useOperationalEfficiency → ENHANCE → TEST → COMMIT
- [ ] useFinancialSummary → ENHANCE → TEST → COMMIT
- [ ] useGrowthMetrics → ENHANCE → TEST → COMMIT
- [ ] useRiskIndicators → ENHANCE → TEST → COMMIT
- [ ] useCompetitiveAnalysis → ENHANCE → TEST → COMMIT
- [ ] useForecastingData → ENHANCE → TEST → COMMIT
- [ ] useExecutiveSummary → ENHANCE → TEST → COMMIT

## 11. ✅ Test Requirements

### Test Coverage Requirements:
- New tests per hook: 5-8
- Total new tests target: 80-100
- Must NOT break existing tests
- Coverage requirement: 85%

### Test Patterns:
```typescript
describe('useBusinessMetrics Enhancements', () => {
  describe('Existing Functionality (Regression)', () => {
    it('should still return raw metrics data', () => {
      const { result } = renderHook(() => useBusinessMetrics());
      // Verify original data structure still exists
      expect(result.current.data).toHaveProperty('metrics');
    });
  });

  describe('New UI Transforms', () => {
    it('should transform metrics to KPI card format', () => {
      const { result } = renderHook(() => useBusinessMetrics());
      
      expect(result.current.kpis).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            value: expect.any(Number),
            format: expect.stringMatching(/currency|percent|number/),
            trend: expect.objectContaining({
              direction: expect.stringMatching(/up|down|stable/)
            })
          })
        ])
      );
    });

    it('should format chart data for TrendChart component', () => {
      const { result } = renderHook(() => useBusinessMetrics());
      
      expect(result.current.charts).toMatchObject({
        labels: expect.any(Array),
        datasets: expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            data: expect.any(Array),
            color: expect.stringMatching(/^#[0-9a-f]{6}$/i)
          })
        ])
      });
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should subscribe to real-time updates when enabled', () => {
      const subscribeSpy = jest.spyOn(realtimeService, 'subscribe');
      
      renderHook(() => useBusinessMetrics({ realtime: true }));
      
      expect(subscribeSpy).toHaveBeenCalledWith(
        expect.stringContaining('executive:metrics'),
        expect.any(Function)
      );
    });

    it('should update cache on real-time events', async () => {
      const { result } = renderHook(() => 
        useBusinessMetrics({ realtime: true })
      );
      
      // Simulate real-time event
      act(() => {
        realtimeService.emit('executive:metrics', {
          type: 'metrics.updated',
          payload: { revenue: 60000 }
        });
      });
      
      await waitFor(() => {
        expect(result.current.data.revenue).toBe(60000);
      });
    });
  });
});
```

### Test Validation:
```bash
# After enhancements
npm run test:hooks:executive -- --verbose
# Must see:
# - Existing tests: 100% passing
# - New tests: 85%+ passing
```

## 12. 🎯 Milestone Validation Protocol

### Milestone 1: Core Metrics Hooks (4)
- [ ] Enhanced: useBusinessMetrics
- [ ] Enhanced: useBusinessInsights
- [ ] Enhanced: usePerformanceMetrics
- [ ] Enhanced: useRevenueAnalytics
- [ ] Tests: ≥20 new passing, all existing passing
- [ ] Commit: With detailed changes

### Milestone 2: Operational Hooks (4)
- [ ] Enhanced: useInventoryMetrics
- [ ] Enhanced: useOperationalEfficiency
- [ ] Enhanced: useDepartmentMetrics
- [ ] Enhanced: useProductPerformance
- [ ] Tests: ≥40 new passing total
- [ ] Commit: With metrics

### Milestone 3: Analytics Hooks (4)
- [ ] Enhanced: useCustomerAnalytics
- [ ] Enhanced: useMarketingROI
- [ ] Enhanced: useGrowthMetrics
- [ ] Enhanced: useCompetitiveAnalysis
- [ ] Tests: ≥60 new passing total
- [ ] Commit: With metrics

### Milestone 4: Strategic Hooks (4)
- [ ] Enhanced: useFinancialSummary
- [ ] Enhanced: useRiskIndicators
- [ ] Enhanced: useForecastingData
- [ ] Enhanced: useExecutiveSummary
- [ ] Tests: ≥80 new passing total (85%+)
- [ ] Final commit: With summary
- [ ] Handoff: Complete

## 13. 🔄 Self-Improvement Protocol

### After Each Hook:
1. **Measure**: New vs existing test metrics
2. **Profile**: Transform performance
3. **Optimize**: Memoize expensive calculations
4. **Validate**: No regressions
5. **Document**: Enhancement patterns

### Performance Monitoring:
```bash
# Measure transform performance
console.time('transform');
const transformed = transformToKPICards(data);
console.timeEnd('transform');

if (transformTime > 100) {
  echo "⚠️ Slow transform: ${transformTime}ms"
  echo "  Optimizing with memoization..."
}
```

### Continuous Improvement:
- Each hook must maintain backwards compatibility
- Document transform patterns that work well
- Share real-time subscription patterns

## 14. 🚫 Regression Prevention

### Before EVERY Enhancement:
```bash
# Capture existing functionality baseline
npm run test:hooks:executive 2>&1 | tee baseline.txt
BASELINE_PASSING=$(grep -oE "[0-9]+ passing" baseline.txt | head -1)

echo "Baseline: $BASELINE_PASSING"

# After enhancement
npm run test:hooks:executive 2>&1 | tee current.txt
EXISTING_TESTS=$(grep -A10 "Existing Tests" current.txt | grep -oE "[0-9]+ passing")

# Validate no regression
if [ "$EXISTING_TESTS" != "$BASELINE_PASSING" ]; then
    echo "❌ REGRESSION: Existing tests broken!"
    echo "  Was: $BASELINE_PASSING"
    echo "  Now: $EXISTING_TESTS"
    git reset --hard HEAD
    exit 1
fi
```

### Regression Rules:
- NEVER break existing return values
- NEVER change existing function signatures
- ALWAYS add new data as additional properties

## 15. ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Use executiveKeys from centralized factory: No local keys
- Preserve existing return structure: Add, don't replace
- Memoize transforms: Prevent recalculation
- Clean up subscriptions: Prevent memory leaks

### ❌ NEVER:
- Create local query keys: Use centralized factory
- Break existing APIs: Only enhance
- Transform in components: Do it in hooks
- Forget cleanup: Always return unsubscribe

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Add new data | Extend return object | Replace structure | Backwards compat |
| Query keys | executiveKeys.x() | ['executive', 'x'] | Cache consistency |
| Transforms | In hook select | In component | Performance |
| Real-time | WebSocket/SSE | Polling | Efficiency |

## 16. 🔄 Communication

### Required Files to Update:
- Progress: `/shared/progress/executive-hooks.md`
  - Update after EVERY hook enhancement
  - Note backwards compatibility
  
- Status: `/shared/status/executive-hooks.json`
  - Track enhancement count
  - Include test metrics
  
- Test Results: `/shared/test-results/executive-hooks-latest.txt`
  - Separate new vs existing tests
  - Performance benchmarks
  
- Handoff: `/shared/handoffs/executive-hooks-complete.md`
  - List all enhancements
  - Breaking changes (should be none)

### Update Frequency:
- Console: Continuously
- Progress: Every hook
- Status: Every 2 hooks
- Tests: Every test run
- Handoff: On completion

## 17. 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /shared/handoffs/executive-hooks-complete.md << EOF
# Executive Hooks Enhancement Complete

## Summary
- Start: $START_TIME
- End: $END_TIME
- Hooks Enhanced: 16/16
- Breaking Changes: 0

## Enhancement Summary
### Core Metrics (4 hooks)
- useBusinessMetrics: +KPI transforms, +charts, +real-time
- useBusinessInsights: +categorization, +priority, +real-time
- usePerformanceMetrics: +comparisons, +rankings, +real-time
- useRevenueAnalytics: +breakdowns, +projections, +real-time

### Operational (4 hooks)
- useInventoryMetrics: +alerts, +turnover, +real-time
- useOperationalEfficiency: +benchmarks, +trends, +real-time
- useDepartmentMetrics: +comparisons, +drill-down, +real-time
- useProductPerformance: +rankings, +categories, +real-time

### Analytics (4 hooks)
- useCustomerAnalytics: +segments, +behavior, +real-time
- useMarketingROI: +attribution, +campaigns, +real-time
- useGrowthMetrics: +forecasts, +goals, +real-time
- useCompetitiveAnalysis: +positioning, +trends, +real-time

### Strategic (4 hooks)
- useFinancialSummary: +ratios, +cash flow, +real-time
- useRiskIndicators: +scoring, +alerts, +real-time
- useForecastingData: +scenarios, +confidence, +real-time
- useExecutiveSummary: +highlights, +actions, +real-time

## Test Results
- Existing Tests: 80/80 passing (100% - no regression!)
- New Enhancement Tests: 85/100 passing (85%)
- Total: 165/180 passing (91.7%)

## New Capabilities Added
1. UI-ready data transforms (all hooks)
2. Real-time WebSocket subscriptions (all hooks)
3. Pagination support (12 hooks)
4. Advanced filtering (10 hooks)
5. Data aggregation pipelines (8 hooks)

## Performance Metrics
- Average transform time: 45ms
- Real-time latency: 230ms average
- Cache hit rate: 94%

## Usage Examples
\`\`\`typescript
// Before enhancement (still works!)
const { data } = useBusinessMetrics();
console.log(data.metrics); // Raw data

// After enhancement (new capabilities)
const { kpis, charts, loadMore } = useBusinessMetrics({ 
  realtime: true 
});
// kpis: Ready for KPICard components
// charts: Ready for TrendChart component
\`\`\`

## Integration Notes
- All hooks maintain backwards compatibility
- New properties added alongside existing
- Real-time is opt-in via options
- Transforms are memoized for performance

## Known Issues
- useForecastingData scenarios need UX review
- Large dataset pagination needs optimization

## Recommendations
- Screens can use enhanced data immediately
- Components designed to consume transformed data
- Consider adding WebSocket connection pooling
EOF
```

## 18. 🚨 Common Issues & Solutions

### Issue: Transform function runs on every render
**Symptoms**: Performance profiler shows repeated calculations
**Cause**: Transform not memoized
**Solution**:
```typescript
// Use select option in useQuery
useQuery({
  queryKey,
  queryFn,
  select: useCallback((data) => {
    return expensiveTransform(data);
  }, []) // Stable function reference
});
```

### Issue: Real-time subscription memory leak
**Symptoms**: Memory usage increases over time
**Cause**: Subscription not cleaned up
**Solution**:
```typescript
useEffect(() => {
  const unsubscribe = realtimeService.subscribe(channel, handler);
  return unsubscribe; // CRITICAL: Clean up!
}, [channel]);
```

### Issue: Cache key collision
**Symptoms**: Wrong data returned from cache
**Cause**: Not using centralized factory
**Solution**:
```typescript
// Always use factory
const queryKey = executiveKeys.metrics({ userId, dateRange });
// Never manual keys
const queryKey = ['executive', 'metrics', userId]; // BAD!
```

### Quick Diagnostics:
```bash
# Check for local query keys
grep -r "queryKey.*\[" src/hooks/executive/

# Find missing cleanups
grep -r "subscribe" src/hooks/executive/ | grep -v "return"

# Verify transforms are memoized
grep -r "select:" src/hooks/executive/ | grep -v "useCallback"
```

## 19. 📚 Study These Examples

### Before starting, study:
1. **src/hooks/cart/useCart.ts** - Real-time subscription pattern
2. **src/hooks/products/useProducts.ts** - Transform pattern
3. **src/utils/queryKeyFactory.ts** - Centralized keys usage

### Key Patterns to Notice:
- In useCart: See WebSocket subscription with cleanup
- In useProducts: Notice select transform pattern
- In queryKeyFactory: Understand key composition

### Copy These Patterns:
```typescript
// Real-time pattern from useCart
useEffect(() => {
  if (!realtime) return;
  
  const unsubscribe = realtimeService.subscribe(
    `cart:${userId}`,
    (event) => {
      queryClient.setQueryData(queryKey, (old) => {
        // Merge update
        return { ...old, ...event.payload };
      });
    }
  );
  
  return unsubscribe;
}, [realtime, userId, queryKey]);

// Transform pattern from useProducts
const query = useQuery({
  queryKey: productKeys.list(filters),
  queryFn: () => productService.getProducts(filters),
  select: useCallback((data) => {
    return {
      products: data.items,
      pagination: data.meta,
      filters: extractFilters(data)
    };
  }, [])
});

// Factory usage from various hooks
import { executiveKeys } from '@/utils/queryKeyFactory';
const queryKey = executiveKeys.metrics(options);
```

---

Remember: You're ENHANCING existing hooks, not replacing them. Focus on backwards compatibility while achieving 85% pass rate on NEW enhancement tests. All existing functionality must remain intact!

## 🤝 Sequential Workflow Note

In Phase 4b, you are part of a sequential chain:
- decision-support (must be 100% complete before you start)
- 
- 
- 
- 

Your work builds on the foundation laid by previous agents. When you reach 100% test pass rate, the next agent automatically starts.

Remember: Reference the implementation at `/reference/tdd_phase_4-executive-hooks/` for proven patterns and approaches.
