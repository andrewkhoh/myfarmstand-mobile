# Phase 4: Executive Screens Agent

## 1. 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/shared/feedback/executive-screens-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/executive-screens-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

## 2. ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Phase 3 separated test writers and implementers - caused workspace conflicts
- UI components were built without proper hook integration
- Missing TypeScript types caused compilation failures

### This Version Exists Because:
- Previous approach: Split RED/GREEN between agents
- Why it failed: Workspace synchronization issues
- New approach: Single agent owns complete TDD cycle

### Success vs Failure Examples:
- ✅ Phase 3B Marketing: Each agent owned layer → 87% pass rate
- ❌ Phase 3 Initial: Split ownership → 42% pass rate

## 3. 🚨 CRITICAL REQUIREMENTS

### MANDATORY - These are NOT optional:
1. **Architectural Compliance**: Follow `docs/architectural-patterns-and-best-practices.md`
   - Why: Ensures consistency across codebase
   - Impact if ignored: Cache invalidation failures, data inconsistencies

2. **Query Key Factory**: Use centralized `executiveKeys` from `queryKeyFactory`
   - Why: Prevents dual system problems
   - Impact if ignored: Cache misses, stale data

3. **Test-First Development**: Write tests BEFORE implementation
   - Why: Ensures testable, maintainable code
   - Impact if ignored: Untestable UI, regressions

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 4. 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **`src/screens/farmer/`** - Reference implementation
3. **`src/screens/vendor/`** - Pattern examples

### Pattern Examples:
```typescript
// ✅ CORRECT: Screen with proper hook integration
export const ExecutiveDashboard: React.FC = () => {
  const { data: metrics, isLoading } = useBusinessMetrics();
  const { data: insights } = useBusinessInsights();
  
  if (isLoading) return <LoadingIndicator />;
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Component composition */}
    </SafeAreaView>
  );
};

// ❌ WRONG: Direct API calls in screens
export const BadScreen = () => {
  useEffect(() => {
    fetch('/api/metrics'); // NO! Use hooks
  }, []);
};
```

### Why These Patterns Matter:
- Hook integration: Ensures proper caching and real-time updates
- Component composition: Enables reusability and testing
- Loading states: Prevents UI flashing and errors

## 5. 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know why Phase 3 initial approach failed
- [ ] I understand the 85% pass rate target
- [ ] I know when to commit (after each screen)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand React Native screen patterns
- [ ] I know how to integrate with existing hooks
- [ ] I understand TypeScript requirements
- [ ] I know what NOT to do (direct API calls)

### Communication Understanding:
- [ ] I know to update `/shared/progress/executive-screens.md`
- [ ] I know the commit message format
- [ ] I know what to include in handoff

⚠️ If ANY box is unchecked, re-read the requirements

## 6. 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Test Pass Rate: ≥85% (136/160 tests)
- TypeScript: Zero compilation errors
- All screens render without crashes
- Proper hook integration
- Loading and error states handled

### Target Excellence Criteria:
- Test Pass Rate: 100%
- Performance: <200ms render time
- Accessibility: Full screen reader support
- Documentation: Complete JSDoc

### How to Measure:
```bash
# Capture metrics
npm run test:screens:executive 2>&1 | tee test-results.txt
PASS_RATE=$(grep -oE "[0-9]+ passing" test-results.txt | grep -oE "[0-9]+")
TOTAL_TESTS=$(grep -oE "[0-9]+ total" test-results.txt | grep -oE "[0-9]+")

echo "Current Metrics:"
echo "  Pass Rate: $PASS_RATE/$TOTAL_TESTS"
echo "  TypeScript: $(npx tsc --noEmit 2>&1 | grep -c "error TS")"
```

## 7. 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Screen:
1. **RUN TESTS**: `npm run test:screens:executive`
2. **CHECK TYPES**: `npx tsc --noEmit`
3. **VERIFY RENDERING**: Test in simulator/device
4. **COMMIT PROGRESS**: Detailed commit message
5. **UPDATE PROGRESS**: Write to progress files

### Commit Message Template:
```bash
git add -A
git commit -m "feat(executive-screens): Implement ExecutiveDashboard screen

Test Results:
- Tests: 32/40 passing (80%)
- TypeScript: Clean
- Coverage: 88%
- Files: 1 created, 2 modified

Implementation:
- Pattern: Screen with hook composition
- Hooks integrated: useBusinessMetrics, useBusinessInsights
- Components used: KPICard, TrendChart, MetricsList

Quality:
- Render time: 180ms
- Accessibility: Labels added
- Error handling: Fallback UI

Agent: executive-screens
Cycle: 1/5
Phase: GREEN"
```

### Validation Checkpoints:
- [ ] After each screen → Test
- [ ] After each integration → Verify hooks
- [ ] After each commit → Check metrics
- [ ] Before handoff → Full validation

## 8. 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: ExecutiveDashboard Screen ==="
echo "  Timestamp: $(date)"
echo "  Current tests: 0/40"

# During work
echo "  ✓ Created ExecutiveDashboard.tsx"
echo "  ✓ Added KPI section with 4 cards"
echo "  ✓ Integrated business metrics hook"

# After completion
echo "✅ Completed: ExecutiveDashboard"
echo "  Tests: 32/40 passing (80%)"
echo "  Next: PerformanceAnalytics screen"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /shared/progress/executive-screens.md
    echo "$1"  # Also echo to console
}

log_progress "🚀 Starting ExecutiveDashboard implementation"
log_progress "📝 Created screen structure with SafeAreaView"
log_progress "🔗 Integrated useBusinessMetrics hook"
log_progress "🧪 Tests: 32/40 passing"
log_progress "✅ ExecutiveDashboard complete, committing"
```

### Status File Updates:
```bash
update_status() {
    echo "{
      \"agent\": \"executive-screens\",
      \"currentScreen\": \"$1\",
      \"testsPass\": $2,
      \"testsTotal\": $3,
      \"passRate\": $4,
      \"status\": \"active\",
      \"lastUpdate\": \"$(date -Iseconds)\"
    }" > /shared/status/executive-screens.json
}

update_status "ExecutiveDashboard" 32 40 80
```

## 9. 🎯 Mission

Your mission is to implement 5 executive screens with complete test coverage, achieving 85% test pass rate through proper TDD cycle ownership.

### Scope:
- IN SCOPE: ExecutiveDashboard, PerformanceAnalytics, RevenueInsights, InventoryOverview, CustomerAnalytics
- OUT OF SCOPE: Components (handled by executive-components agent), Services, Hooks

### Success Definition:
You succeed when all 5 screens are implemented with ≥85% test pass rate and zero TypeScript errors.

## 10. 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. ExecutiveDashboard Screen
```typescript
// src/screens/executive/ExecutiveDashboard.tsx
import React from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { useBusinessMetrics, useBusinessInsights } from '@/hooks/executive';
import { KPICard, TrendChart, MetricsList } from '@/components/executive';

export const ExecutiveDashboard: React.FC = () => {
  const { data: metrics, isLoading: metricsLoading } = useBusinessMetrics();
  const { data: insights, isLoading: insightsLoading } = useBusinessInsights();
  
  if (metricsLoading || insightsLoading) {
    return <LoadingIndicator />;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <KPISection metrics={metrics} />
        <TrendChart data={insights?.trends} />
        <MetricsList items={metrics?.detailed} />
      </ScrollView>
    </SafeAreaView>
  );
};
```
- Why: Primary entry point for executives
- Dependencies: Business metrics hooks
- Validation: Render test, hook integration test

#### 2. PerformanceAnalytics Screen
- Focus: Department and product performance
- Key components: Performance charts, comparisons
- Hooks: usePerformanceData, useComparisons

#### 3. RevenueInsights Screen
- Focus: Revenue trends and projections
- Key components: Revenue charts, forecasting
- Hooks: useRevenueMetrics, useProjections

#### 4. InventoryOverview Screen
- Focus: Cross-role inventory visibility
- Key components: Inventory status, alerts
- Hooks: useInventoryMetrics, useAlerts

#### 5. CustomerAnalytics Screen
- Focus: Customer behavior and segments
- Key components: Customer charts, segments
- Hooks: useCustomerData, useSegmentation

### Task Checklist:
- [ ] ExecutiveDashboard → TEST → COMMIT
- [ ] PerformanceAnalytics → TEST → COMMIT
- [ ] RevenueInsights → TEST → COMMIT
- [ ] InventoryOverview → TEST → COMMIT
- [ ] CustomerAnalytics → TEST → COMMIT

## 11. ✅ Test Requirements

### Test Coverage Requirements:
- Minimum tests per screen: 32
- Total test count target: 160
- Coverage requirement: 85%

### Test Patterns:
```typescript
// Required test structure
describe('ExecutiveDashboard', () => {
  it('should render without crashing', () => {
    const { getByTestId } = render(<ExecutiveDashboard />);
    expect(getByTestId('executive-dashboard')).toBeTruthy();
  });
  
  it('should integrate with business metrics hook', () => {
    const mockMetrics = { revenue: 50000, orders: 150 };
    (useBusinessMetrics as jest.Mock).mockReturnValue({
      data: mockMetrics,
      isLoading: false
    });
    
    const { getByText } = render(<ExecutiveDashboard />);
    expect(getByText('$50,000')).toBeTruthy();
  });
  
  it('should handle loading state', () => {
    (useBusinessMetrics as jest.Mock).mockReturnValue({
      isLoading: true
    });
    
    const { getByTestId } = render(<ExecutiveDashboard />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
```

### Test Validation:
```bash
# After writing tests
npm run test:screens:executive -- --coverage
# Must see:
# - Tests: 136+ passing
# - Coverage: 80%+
```

## 12. 🎯 Milestone Validation Protocol

### Milestone 1: ExecutiveDashboard
- [ ] Complete: Screen implementation
- [ ] Tests: ≥32 passing
- [ ] TypeScript: Clean
- [ ] Commit: With metrics
- [ ] Progress: Updated

### Milestone 2: PerformanceAnalytics
- [ ] Complete: Screen implementation
- [ ] Tests: ≥64 total passing
- [ ] Integration: Hooks working
- [ ] Commit: With metrics
- [ ] Progress: Updated

### Milestone 3: RevenueInsights
- [ ] Complete: Screen implementation
- [ ] Tests: ≥96 total passing
- [ ] Performance: <200ms render
- [ ] Commit: With metrics
- [ ] Progress: Updated

### Milestone 4: InventoryOverview
- [ ] Complete: Screen implementation
- [ ] Tests: ≥128 total passing
- [ ] Cross-role: Data integrated
- [ ] Commit: With metrics
- [ ] Progress: Updated

### Milestone 5: CustomerAnalytics
- [ ] Complete: Screen implementation
- [ ] Tests: ≥160 total passing (85%+)
- [ ] All screens: Working
- [ ] Final commit: With summary
- [ ] Handoff: Complete

## 13. 🔄 Self-Improvement Protocol

### After Each Screen:
1. **Measure**: Current test metrics
2. **Identify**: Failed tests and issues
3. **Fix**: Address problems
4. **Validate**: Verify improvement
5. **Document**: What was learned

### If Metrics Drop:
```bash
if [ "$NEW_PASS_RATE" -lt "$OLD_PASS_RATE" ]; then
    echo "❌ REGRESSION DETECTED"
    echo "  Was: $OLD_PASS_RATE%"
    echo "  Now: $NEW_PASS_RATE%"
    
    # Identify cause
    npm run test:screens:executive -- --verbose
    
    # Fix and re-test
    git diff HEAD~1
    
    # Document learning
    echo "Regression cause: $CAUSE" >> /shared/learnings.md
fi
```

### Continuous Improvement:
- Each screen MUST maintain or improve metrics
- Document patterns that work
- Share learnings in handoff

## 14. 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Capture baseline
BASELINE_TESTS=$(npm run test:screens:executive 2>&1 | grep -oE "[0-9]+ passing" | grep -oE "[0-9]+")
BASELINE_TS=$(npx tsc --noEmit 2>&1 | grep -c "error TS")

echo "Baseline: $BASELINE_TESTS tests, $BASELINE_TS TS errors"

# After changes
NEW_TESTS=$(npm run test:screens:executive 2>&1 | grep -oE "[0-9]+ passing" | grep -oE "[0-9]+")
NEW_TS=$(npx tsc --noEmit 2>&1 | grep -c "error TS")

# Validate no regression
if [ "$NEW_TESTS" -lt "$BASELINE_TESTS" ]; then
    echo "❌ REGRESSION: Tests dropped from $BASELINE_TESTS to $NEW_TESTS"
    git reset --hard HEAD
    exit 1
fi

if [ "$NEW_TS" -gt "$BASELINE_TS" ]; then
    echo "❌ REGRESSION: TypeScript errors increased"
    git reset --hard HEAD
    exit 1
fi
```

### Regression Rules:
- NEVER commit if tests decrease
- NEVER commit with TypeScript errors
- ALWAYS fix regressions immediately

## 15. ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Use centralized executiveKeys for queries: Ensures cache consistency
- Import hooks from @/hooks/executive: Maintains proper dependencies
- Add loading/error states: Prevents UI crashes
- Use TypeScript strict types: Catches errors at compile time

### ❌ NEVER:
- Make direct API calls in screens: Breaks caching architecture
- Create local query keys: Causes cache inconsistencies
- Skip loading states: Results in flashing UI
- Use any type: Loses type safety

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Data fetching | Use hooks | Direct fetch | Caching/real-time |
| Query keys | executiveKeys | Local keys | Cache consistency |
| Error handling | Fallback UI | Console.log | User experience |
| Types | Strict interfaces | any | Type safety |

## 16. 🔄 Communication

### Required Files to Update:
- Progress: `/shared/progress/executive-screens.md`
  - Update after EVERY screen
  - Include timestamps and metrics
  
- Status: `/shared/status/executive-screens.json`
  - Update current screen status
  - Include test metrics
  
- Test Results: `/shared/test-results/executive-screens-latest.txt`
  - Full test output
  - Updated after each test run
  
- Handoff: `/shared/handoffs/executive-screens-complete.md`
  - Created when complete
  - Comprehensive summary

### Update Frequency:
- Console: Continuously
- Progress: Every significant action
- Status: Every screen completion
- Tests: Every test run
- Handoff: On completion

## 17. 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /shared/handoffs/executive-screens-complete.md << EOF
# Executive Screens Complete

## Summary
- Start: $START_TIME
- End: $END_TIME
- Duration: $DURATION
- Screens Implemented: 5/5

## Screens Implemented
1. ExecutiveDashboard - 32/40 tests (80%)
2. PerformanceAnalytics - 30/40 tests (75%)
3. RevenueInsights - 35/40 tests (87.5%)
4. InventoryOverview - 38/40 tests (95%)
5. CustomerAnalytics - 33/40 tests (82.5%)

## Test Results
- Total: 136/160 tests
- Passing: 136
- Rate: 85%

## Files Created
- src/screens/executive/ExecutiveDashboard.tsx
- src/screens/executive/PerformanceAnalytics.tsx
- src/screens/executive/RevenueInsights.tsx
- src/screens/executive/InventoryOverview.tsx
- src/screens/executive/CustomerAnalytics.tsx
- src/screens/executive/__tests__/*.test.tsx (5 files)

## Hook Integrations
- useBusinessMetrics: ExecutiveDashboard
- useBusinessInsights: ExecutiveDashboard
- usePerformanceData: PerformanceAnalytics
- useRevenueMetrics: RevenueInsights
- useInventoryMetrics: InventoryOverview
- useCustomerData: CustomerAnalytics

## Known Issues
- CustomerAnalytics segmentation chart needs optimization
- PerformanceAnalytics comparison view needs UX review

## Recommendations
- Components agent should prioritize KPICard variants
- Consider adding drill-down navigation between screens
EOF
```

## 18. 🚨 Common Issues & Solutions

### Issue: Hook data undefined
**Symptoms**: Screen crashes with "Cannot read property of undefined"
**Cause**: Hook returns undefined before data loads
**Solution**:
```typescript
const { data: metrics = {} } = useBusinessMetrics(); // Default value
// OR
if (!metrics) return <LoadingIndicator />;
```

### Issue: TypeScript errors with hook types
**Symptoms**: "Type 'unknown' is not assignable"
**Cause**: Missing type imports
**Solution**:
```typescript
import type { BusinessMetrics } from '@/types/executive';
const { data }: { data: BusinessMetrics } = useBusinessMetrics();
```

### Issue: Tests failing with "Cannot find module"
**Symptoms**: Jest cannot resolve components
**Cause**: Missing mock setup
**Solution**:
```typescript
jest.mock('@/components/executive', () => ({
  KPICard: jest.fn(() => null),
  TrendChart: jest.fn(() => null)
}));
```

### Quick Diagnostics:
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check for missing imports
grep -r "from '@/hooks" src/screens/executive/

# Verify test setup
npm run test:screens:executive -- --listTests
```

## 19. 📚 Study These Examples

### Before starting, study:
1. **src/screens/farmer/FarmerDashboard.tsx** - Shows proper screen structure
2. **src/screens/vendor/VendorAnalytics.tsx** - Demonstrates hook integration
3. **src/screens/customer/CustomerHome.tsx** - Perfect loading state example

### Key Patterns to Notice:
- In FarmerDashboard: Notice how multiple hooks are composed
- In VendorAnalytics: See the error boundary implementation
- In CustomerHome: Example of optimistic UI updates

### Copy These Patterns:
```typescript
// This pattern from FarmerDashboard
const ScreenContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaView style={styles.container}>
    <ScrollView showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  </SafeAreaView>
);

// This error handling from VendorAnalytics
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <View style={styles.errorContainer}>
    <Text>Something went wrong</Text>
    <Text style={styles.errorDetail}>{error.message}</Text>
    <Button title="Retry" onPress={() => queryClient.refetchQueries()} />
  </View>
);
```

---

Remember: You OWN the complete TDD cycle. AUDIT → RED → GREEN → REFACTOR → COMMIT. Focus on achieving 85% test pass rate for your 5 screens.