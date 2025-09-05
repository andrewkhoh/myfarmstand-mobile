# Phase 4: Executive Components Agent

## 1. 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/shared/feedback/executive-components-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/executive-components-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

### 📚 Reference Implementation Available:
```bash
echo "=== REFERENCE IMPLEMENTATION AVAILABLE ==="
echo "Location: /reference/tdd_phase_4-executive-components/"
echo "Status: 100% test pass rate - proven working implementation"
echo "Use this to understand requirements and patterns"
```
## 2. ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Components built without considering data shape from hooks
- Missing TypeScript interfaces caused integration issues
- Performance not optimized for large datasets

### This Version Exists Because:
- Previous approach: Generic components without executive context
- Why it failed: Didn't match executive data requirements
- New approach: Purpose-built components for executive analytics

### Success vs Failure Examples:
- ✅ Phase 3B Components: Domain-specific → 88% reusability
- ❌ Phase 2 Components: Too generic → 31% actually used

## 3. 🚨 CRITICAL REQUIREMENTS

### MANDATORY - These are NOT optional:
1. **Type Safety**: All components must have strict TypeScript interfaces
   - Why: Prevents runtime errors and improves IDE support
   - Impact if ignored: Integration failures with screens

2. **Performance**: Components must handle large datasets efficiently
   - Why: Executive dashboards aggregate significant data
   - Impact if ignored: UI freezing, poor user experience

3. **Memoization**: Use React.memo and useMemo appropriately
   - Why: Prevents unnecessary re-renders
   - Impact if ignored: Performance degradation

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 4. 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **`src/components/farmer/`** - Component patterns
3. **`src/components/shared/`** - Reusable patterns

### Pattern Examples:
```typescript
// ✅ CORRECT: Memoized component with proper types
interface KPICardProps {
  title: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  comparison?: {
    value: number;
    period: string;
  };
  formatter?: (value: any) => string;
}

export const KPICard = React.memo<KPICardProps>(({ 
  title, 
  value, 
  trend,
  comparison,
  formatter = (v) => String(v)
}) => {
  const formattedValue = useMemo(() => formatter(value), [value, formatter]);
  
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{formattedValue}</Text>
      {trend && <TrendIndicator direction={trend} />}
      {comparison && <ComparisonText {...comparison} />}
    </View>
  );
});

// ❌ WRONG: No memoization, loose types
export const BadCard = ({ data }: any) => {
  return <View>{JSON.stringify(data)}</View>;
};
```

### Why These Patterns Matter:
- Memoization: Prevents re-renders when parent updates
- Strict types: Catches errors at compile time
- Composition: Enables flexible layouts

## 5. 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know the component categories needed
- [ ] I understand the 85% test pass rate target
- [ ] I know when to commit (after each component group)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand React Native component patterns
- [ ] I know how to optimize for performance
- [ ] I understand TypeScript generics for flexibility
- [ ] I know memoization strategies

### Communication Understanding:
- [ ] I know to update `/shared/progress/executive-components.md`
- [ ] I know the commit message format
- [ ] I know what to include in handoff

⚠️ If ANY box is unchecked, re-read the requirements

## 6. 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Test Pass Rate: ≥85% (98/115 tests)
- TypeScript: Zero compilation errors
- All components render without crashes
- Proper prop validation
- Memoization implemented

### Target Excellence Criteria:
- Test Pass Rate: 100%
- Performance: <50ms render for all components
- Accessibility: Full a11y support
- Storybook: All components documented

### How to Measure:
```bash
# Capture metrics
npm run test:components:executive 2>&1 | tee test-results.txt
PASS_RATE=$(grep -oE "[0-9]+ passing" test-results.txt | grep -oE "[0-9]+")
TOTAL_TESTS=$(grep -oE "[0-9]+ total" test-results.txt | grep -oE "[0-9]+")

echo "Current Metrics:"
echo "  Pass Rate: $PASS_RATE/$TOTAL_TESTS"
echo "  TypeScript: $(npx tsc --noEmit 2>&1 | grep -c "error TS")"
```

## 7. 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Component Group:
1. **RUN TESTS**: `npm run test:components:executive`
2. **CHECK TYPES**: `npx tsc --noEmit`
3. **TEST RENDER**: Visual verification
4. **COMMIT PROGRESS**: Detailed commit message
5. **UPDATE PROGRESS**: Write to progress files

### Commit Message Template:
```bash
git add -A
git commit -m "feat(executive-components): Implement KPI component group

Test Results:
- Tests: 23/25 passing (92%)
- TypeScript: Clean
- Coverage: 90%
- Files: 5 created

Components:
- KPICard: Main metric display with trends
- KPIGrid: Responsive grid layout
- KPIComparison: Period-over-period comparison
- KPISummary: Condensed multi-metric view
- TrendIndicator: Visual trend arrows

Patterns:
- React.memo for all components
- useMemo for expensive calculations
- TypeScript strict interfaces
- Accessibility labels

Agent: executive-components
Cycle: 1/5
Phase: GREEN"
```

### Validation Checkpoints:
- [ ] After each component → Test
- [ ] After each group → Full test suite
- [ ] After memoization → Performance check
- [ ] Before handoff → Integration test

## 8. 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: KPI Components Group ==="
echo "  Timestamp: $(date)"
echo "  Target: 5 components"

# During work
echo "  ✓ Created KPICard.tsx with TypeScript interface"
echo "  ✓ Added memoization and performance optimization"
echo "  ✓ Created KPICard.test.tsx with 5 tests"

# After completion
echo "✅ Completed: KPI Components Group"
echo "  Components: 5/5"
echo "  Tests: 23/25 passing (92%)"
echo "  Next: Chart components group"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /shared/progress/executive-components.md
    echo "$1"  # Also echo to console
}

log_progress "🚀 Starting KPI components group"
log_progress "📝 Created KPICard with full TypeScript interface"
log_progress "⚡ Added React.memo optimization"
log_progress "🧪 Tests: 23/25 passing"
log_progress "✅ KPI group complete, committing"
```

### Status File Updates:
```bash
update_status() {
    echo "{
      \"agent\": \"executive-components\",
      \"currentGroup\": \"$1\",
      \"componentsComplete\": $2,
      \"componentsTotal\": 20,
      \"testsPass\": $3,
      \"testsTotal\": 115,
      \"status\": \"active\",
      \"lastUpdate\": \"$(date -Iseconds)\"
    }" > /shared/status/executive-components.json
}

update_status "KPI" 5 23
```

## 9. 🎯 Mission

Your mission is to implement 20 executive components organized in 5 groups, achieving 85% test pass rate through complete TDD cycle ownership.

### Scope:
- IN SCOPE: KPI, Charts, Tables, Alerts, Navigation components
- OUT OF SCOPE: Screens (handled by executive-screens agent), Services, Hooks

### Success Definition:
You succeed when all 20 components are implemented with ≥85% test pass rate, full TypeScript safety, and proper memoization.

## 10. 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. KPI Components Group (5 components)
```typescript
// src/components/executive/KPICard.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency, formatPercent } from '@/utils/formatters';

export interface KPICardProps {
  title: string;
  value: number;
  format?: 'currency' | 'percent' | 'number';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: number;
  };
  comparison?: {
    value: number;
    label: string;
  };
  color?: string;
  testID?: string;
}

export const KPICard = React.memo<KPICardProps>(({
  title,
  value,
  format = 'number',
  trend,
  comparison,
  color,
  testID = 'kpi-card'
}) => {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return formatPercent(value);
      default: return value.toLocaleString();
    }
  }, [value, format]);

  const trendColor = useMemo(() => {
    if (!trend) return undefined;
    return trend.direction === 'up' ? '#10b981' : 
           trend.direction === 'down' ? '#ef4444' : '#6b7280';
  }, [trend]);

  return (
    <View style={[styles.card, color && { borderLeftColor: color }]} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{formattedValue}</Text>
      {trend && (
        <View style={styles.trendContainer}>
          <TrendIndicator direction={trend.direction} color={trendColor} />
          <Text style={[styles.trendValue, { color: trendColor }]}>
            {formatPercent(trend.value)}
          </Text>
        </View>
      )}
      {comparison && (
        <Text style={styles.comparison}>
          {comparison.value > 0 ? '+' : ''}{comparison.value} vs {comparison.label}
        </Text>
      )}
    </View>
  );
});

KPICard.displayName = 'KPICard';
```

Components in this group:
- KPICard: Single metric display
- KPIGrid: Responsive grid of KPI cards
- TrendIndicator: Arrow indicators
- KPIComparison: Side-by-side comparison
- KPISummary: Compact multi-metric view

#### 2. Chart Components Group (5 components)
- TrendChart: Line chart for trends
- BarChart: Comparison bars
- PieChart: Distribution visualization
- AreaChart: Stacked area trends
- SparklineChart: Mini inline charts

#### 3. Table Components Group (4 components)
- DataTable: Sortable data grid
- TableRow: Optimized row component
- TableHeader: Sticky header with sorting
- TablePagination: Pagination controls

#### 4. Alert Components Group (3 components)
- AlertBanner: Important notifications
- AlertCard: Detailed alert display
- AlertBadge: Inline alert indicators

#### 5. Navigation Components Group (3 components)
- TabBar: Executive tab navigation
- FilterBar: Data filtering controls
- DateRangePicker: Date selection

### Task Checklist:
- [ ] KPI Components (5) → TEST → COMMIT
- [ ] Chart Components (5) → TEST → COMMIT
- [ ] Table Components (4) → TEST → COMMIT
- [ ] Alert Components (3) → TEST → COMMIT
- [ ] Navigation Components (3) → TEST → COMMIT

## 11. ✅ Test Requirements

### Test Coverage Requirements:
- Minimum tests per component: 5-6
- Total test count target: 115
- Coverage requirement: 85%

### Test Patterns:
```typescript
// Required test structure
describe('KPICard', () => {
  it('should render with required props', () => {
    const { getByText } = render(
      <KPICard title="Revenue" value={50000} />
    );
    expect(getByText('Revenue')).toBeTruthy();
    expect(getByText('50,000')).toBeTruthy();
  });

  it('should format currency values correctly', () => {
    const { getByText } = render(
      <KPICard title="Sales" value={1234.56} format="currency" />
    );
    expect(getByText('$1,234.56')).toBeTruthy();
  });

  it('should display trend indicator when provided', () => {
    const { getByTestId } = render(
      <KPICard 
        title="Growth" 
        value={100}
        trend={{ direction: 'up', value: 15 }}
      />
    );
    expect(getByTestId('trend-up')).toBeTruthy();
  });

  it('should memoize expensive calculations', () => {
    const formatter = jest.fn(v => `$${v}`);
    const { rerender } = render(
      <KPICard title="Test" value={100} formatter={formatter} />
    );
    
    rerender(<KPICard title="Test" value={100} formatter={formatter} />);
    expect(formatter).toHaveBeenCalledTimes(1); // Not re-calculated
  });

  it('should have proper accessibility labels', () => {
    const { getByLabelText } = render(
      <KPICard title="Revenue" value={50000} />
    );
    expect(getByLabelText('Revenue KPI: 50,000')).toBeTruthy();
  });
});
```

### Test Validation:
```bash
# After writing tests
npm run test:components:executive -- --coverage
# Must see:
# - Tests: 98+ passing
# - Coverage: 85%+
```

## 12. 🎯 Milestone Validation Protocol

### Milestone 1: KPI Components
- [ ] Complete: 5 components
- [ ] Tests: ≥23 passing
- [ ] TypeScript: Clean
- [ ] Memoization: Implemented
- [ ] Commit: With metrics

### Milestone 2: Chart Components
- [ ] Complete: 5 components
- [ ] Tests: ≥46 total passing
- [ ] Performance: <50ms render
- [ ] Commit: With metrics

### Milestone 3: Table Components
- [ ] Complete: 4 components
- [ ] Tests: ≥70 total passing
- [ ] Virtualization: For large datasets
- [ ] Commit: With metrics

### Milestone 4: Alert Components
- [ ] Complete: 3 components
- [ ] Tests: ≥85 total passing
- [ ] Animations: Smooth transitions
- [ ] Commit: With metrics

### Milestone 5: Navigation Components
- [ ] Complete: 3 components
- [ ] Tests: ≥98 total passing (85%+)
- [ ] All components: Documented
- [ ] Final commit: With summary
- [ ] Handoff: Complete

## 13. 🔄 Self-Improvement Protocol

### After Each Component Group:
1. **Measure**: Test pass rate and coverage
2. **Profile**: Component render performance
3. **Optimize**: Apply memoization where needed
4. **Validate**: Verify improvements
5. **Document**: Performance gains

### Performance Optimization:
```bash
# Measure render performance
npx react-devtools-profiler

# If component re-renders unnecessarily
echo "⚠️ Performance Issue: $COMPONENT"
echo "  Re-renders: $COUNT times"
echo "  Solution: Adding React.memo"

# After optimization
echo "✅ Optimized: $COMPONENT"
echo "  Re-renders: Reduced by $PERCENT%"
```

### Continuous Improvement:
- Profile each component group
- Document optimization patterns
- Share performance tips in handoff

## 14. 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Capture baseline
BASELINE_TESTS=$(npm run test:components:executive 2>&1 | grep -oE "[0-9]+ passing" | grep -oE "[0-9]+")
BASELINE_PERF=$(npm run perf:components 2>&1 | grep -oE "avg: [0-9]+ms" | grep -oE "[0-9]+")

echo "Baseline: $BASELINE_TESTS tests, ${BASELINE_PERF}ms avg render"

# After changes
NEW_TESTS=$(npm run test:components:executive 2>&1 | grep -oE "[0-9]+ passing" | grep -oE "[0-9]+")
NEW_PERF=$(npm run perf:components 2>&1 | grep -oE "avg: [0-9]+ms" | grep -oE "[0-9]+")

# Validate no regression
if [ "$NEW_TESTS" -lt "$BASELINE_TESTS" ]; then
    echo "❌ REGRESSION: Tests dropped"
    git reset --hard HEAD
    exit 1
fi

if [ "$NEW_PERF" -gt $((BASELINE_PERF * 2)) ]; then
    echo "❌ REGRESSION: Performance degraded significantly"
    git reset --hard HEAD
    exit 1
fi
```

### Regression Rules:
- NEVER commit if tests decrease
- NEVER commit if performance doubles
- ALWAYS optimize before committing

## 15. ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Use React.memo for all components: Prevents unnecessary re-renders
- Define explicit TypeScript interfaces: Ensures type safety
- Include testID props: Enables testing
- Add accessibility labels: Improves usability

### ❌ NEVER:
- Use inline functions in props: Breaks memoization
- Use index as key in lists: Causes reconciliation issues
- Mutate props directly: Violates React principles
- Skip error boundaries: Results in app crashes

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Large lists | Virtualization | Render all | Performance |
| Expensive calc | useMemo | Inline calc | Re-computation |
| Component update | React.memo | No memo | Re-renders |
| Prop types | Interface | any | Type safety |

## 16. 🔄 Communication

### Required Files to Update:
- Progress: `/shared/progress/executive-components.md`
  - Update after EVERY component
  - Include performance metrics
  
- Status: `/shared/status/executive-components.json`
  - Update component count
  - Include test metrics
  
- Test Results: `/shared/test-results/executive-components-latest.txt`
  - Full test output
  - Performance benchmarks
  
- Handoff: `/shared/handoffs/executive-components-complete.md`
  - Component inventory
  - Usage examples

### Update Frequency:
- Console: Continuously
- Progress: Every component
- Status: Every group
- Tests: Every test run
- Handoff: On completion

## 17. 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /shared/handoffs/executive-components-complete.md << EOF
# Executive Components Complete

## Summary
- Start: $START_TIME
- End: $END_TIME
- Duration: $DURATION
- Components Created: 20/20

## Component Groups
### KPI Components (5)
- KPICard: 5/5 tests passing
- KPIGrid: 5/5 tests passing
- TrendIndicator: 4/5 tests passing
- KPIComparison: 5/5 tests passing
- KPISummary: 4/5 tests passing

### Chart Components (5)
- TrendChart: 6/6 tests passing
- BarChart: 5/6 tests passing
- PieChart: 6/6 tests passing
- AreaChart: 5/6 tests passing
- SparklineChart: 5/5 tests passing

### Table Components (4)
- DataTable: 8/8 tests passing
- TableRow: 5/5 tests passing
- TableHeader: 5/6 tests passing
- TablePagination: 4/5 tests passing

### Alert Components (3)
- AlertBanner: 5/5 tests passing
- AlertCard: 5/6 tests passing
- AlertBadge: 4/4 tests passing

### Navigation Components (3)
- TabBar: 6/7 tests passing
- FilterBar: 5/5 tests passing
- DateRangePicker: 7/8 tests passing

## Test Results
- Total: 104/115 tests (90.4%)
- TypeScript: Clean
- Performance: All <50ms render

## Performance Metrics
- Average render: 32ms
- Memoization: 100% coverage
- Bundle size: 145KB

## Usage Examples
\`\`\`typescript
import { KPICard, TrendChart } from '@/components/executive';

<KPICard 
  title="Revenue"
  value={50000}
  format="currency"
  trend={{ direction: 'up', value: 15 }}
/>

<TrendChart
  data={revenueData}
  xAxis="date"
  yAxis="value"
  color="#10b981"
/>
\`\`\`

## Integration Notes
- All components export TypeScript interfaces
- All components are memoized
- All components have testID props
- Chart components use Victory Native

## Known Issues
- DateRangePicker needs calendar optimization
- Large DataTable (>1000 rows) needs virtualization

## Recommendations
- Screens agent can use all components immediately
- Consider adding dark mode variants
- Add Storybook stories for documentation
EOF
```

## 18. 🚨 Common Issues & Solutions

### Issue: Component re-renders on every parent update
**Symptoms**: Performance profiler shows unnecessary renders
**Cause**: Missing React.memo or changing props
**Solution**:
```typescript
// Wrap component in React.memo
export const Component = React.memo(({ prop }) => {
  // Component logic
});

// Ensure props are stable
const stableCallback = useCallback(() => {}, []);
```

### Issue: TypeScript errors in tests
**Symptoms**: "Property does not exist on type"
**Cause**: Missing test type definitions
**Solution**:
```typescript
// Add test props interface
interface TestProps extends KPICardProps {
  testID?: string;
}

// Use in tests
const props: TestProps = {
  title: 'Test',
  value: 100
};
```

### Issue: Memoization not working
**Symptoms**: useMemo re-calculates every render
**Cause**: Dependencies changing
**Solution**:
```typescript
// Check dependencies are stable
const result = useMemo(() => {
  return expensiveCalculation(data);
}, [data]); // Ensure 'data' reference is stable
```

### Quick Diagnostics:
```bash
# Check for missing memos
grep -L "React.memo" src/components/executive/*.tsx

# Find performance issues
npm run perf:components -- --component=KPICard

# Verify TypeScript
npx tsc --noEmit --project tsconfig.json
```

## 19. 📚 Study These Examples

### Before starting, study:
1. **src/components/farmer/MetricCard.tsx** - Shows proper memoization
2. **src/components/vendor/SalesChart.tsx** - Chart component patterns
3. **src/components/shared/DataGrid.tsx** - Table virtualization

### Key Patterns to Notice:
- In MetricCard: Notice the memo wrapper and prop comparison
- In SalesChart: See how chart data is memoized
- In DataGrid: Example of virtualization for performance

### Copy These Patterns:
```typescript
// Memoization pattern from MetricCard
export const Component = React.memo(
  ComponentImpl,
  (prevProps, nextProps) => {
    // Custom comparison for complex props
    return prevProps.id === nextProps.id &&
           prevProps.value === nextProps.value;
  }
);

// Chart optimization from SalesChart
const chartData = useMemo(() => {
  return data.map(item => ({
    x: new Date(item.date),
    y: item.value
  }));
}, [data]);

// Virtualization from DataGrid
const rowRenderer = useCallback(({ index, style }) => (
  <div style={style}>
    <TableRow data={rows[index]} />
  </div>
), [rows]);
```

---

Remember: You OWN the complete TDD cycle for components. Focus on performance, type safety, and achieving 85% test pass rate for your 20 components across 5 groups.

## 🤝 Sequential Workflow Note

In Phase 4b, you are part of a sequential chain:
- decision-support (must be 100% complete before you start)
- **YOU ARE HERE** → executive-components
- executive-hooks (waiting for you)
- executive-screens (waiting for hooks)
- cross-role-integration (final step)

Your work builds on the foundation laid by decision-support. When you reach 100% test pass rate, executive-hooks automatically starts.

Remember: Reference the implementation at `/reference/tdd_phase_4-executive-components/` for proven patterns and approaches.
