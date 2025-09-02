# Marketing Screens Implementation Agent

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/marketing-screens-impl-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/marketing-screens-impl-improvements.md"
else
  echo "✅ No feedback - proceed with implementation"
fi
```

If feedback exists, address it FIRST before continuing.

## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Screens implemented without following test requirements
- Navigation structure didn't match tested flows
- Components not properly integrated
- Loading and error states missing
- Accessibility props forgotten

### This Version Exists Because:
- Previous approach: Build screens from scratch
- Why it failed: Didn't match test expectations
- New approach: Implement exactly what tests require

### Success vs Failure Examples:
- ✅ Phase2 Screens: Followed tests → 100% pass rate, perfect UX
- ❌ Phase1 Screens: Ad-hoc implementation → 60% test failures, poor UX

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Make Tests Pass**: Implement ONLY what tests require
   - Why: TDD discipline - tests drive implementation
   - Impact if ignored: Tests fail, rework needed

2. **Use Implemented Hooks and Components**: Don't recreate
   - Why: Hooks and components already built and tested
   - Impact if ignored: Duplication, inconsistency

3. **Follow Navigation Structure**: Match tested flows
   - Why: Tests expect specific navigation
   - Impact if ignored: Navigation tests fail

4. **Include All States**: Loading, error, empty, success
   - Why: Tests check all states
   - Impact if ignored: Incomplete UX

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **Screen test files from RED phase** - Your specification
3. **Implemented hooks and components** - Building blocks

### Pattern Examples:
```typescript
// ✅ CORRECT Pattern - Screen Using Hooks and Components
import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMarketingDashboard } from '@/hooks/marketing/useMarketingDashboard';
import { ContentCard } from '@/components/marketing/ContentCard';
import { CampaignOverview } from '@/components/marketing/CampaignOverview';
import { LoadingState, ErrorState, EmptyState } from '@/components/common';

export function MarketingDashboard() {
  const navigation = useNavigation();
  const {
    campaigns,
    content,
    bundles,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useMarketingDashboard();
  
  // Handle loading state (tests check for this)
  if (isLoading && !isRefetching) {
    return <LoadingState testID="dashboard-loading" />;
  }
  
  // Handle error state (tests check for this)
  if (error && !campaigns) {
    return (
      <ErrorState 
        testID="dashboard-error"
        message="Unable to load dashboard"
        onRetry={refetch}
      />
    );
  }
  
  // Handle empty state (tests check for this)
  if (!campaigns?.length && !content?.length) {
    return (
      <EmptyState
        testID="dashboard-empty"
        message="No marketing data yet"
        actionLabel="Create Campaign"
        onAction={() => navigation.navigate('CreateCampaign')}
      />
    );
  }
  
  return (
    <ScrollView
      testID="marketing-dashboard"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          testID="pull-to-refresh"
        />
      }
    >
      {/* Campaign Cards (tests look for these) */}
      <View testID="campaign-section">
        {campaigns.map((campaign, index) => (
          <CampaignOverview
            key={campaign.id}
            testID={`campaign-card-${index}`}
            campaign={campaign}
            onPress={() => navigation.navigate('CampaignDetails', { 
              id: campaign.id 
            })}
          />
        ))}
      </View>
      
      {/* Content Cards (tests look for these) */}
      <View testID="content-section">
        {content.map((item, index) => (
          <ContentCard
            key={item.id}
            testID={`content-card-${index}`}
            content={item}
            onPress={() => navigation.navigate('ContentDetails', {
              id: item.id
            })}
          />
        ))}
      </View>
      
      {/* Accessibility required by tests */}
      <View
        accessible
        accessibilityRole="navigation"
        accessibilityLabel="Marketing Dashboard"
      />
    </ScrollView>
  );
}

// ❌ WRONG Pattern - Not using hooks/components
export function MarketingDashboard() {
  const [data, setData] = useState(); // NO! Use hooks
  
  useEffect(() => {
    fetch('/api/marketing'); // NO! Hook handles this
  }, []);
  
  return <View>{/* Custom implementation */}</View>; // NO! Use components
}
```

### Why These Patterns Matter:
- Reuse tested code: Hooks and components work
- Match test expectations: Tests know structure
- Consistent UX: All screens similar
- Maintainable: Single source of truth

## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I have the test files from RED phase
- [ ] I have hooks from hooks-impl phase
- [ ] I have components from components-impl phase
- [ ] I will implement ONLY to pass tests

### Technical Understanding:
- [ ] I understand screen composition patterns
- [ ] I know how to use the hooks
- [ ] I know how to use the components
- [ ] I understand navigation setup

### Communication Understanding:
- [ ] I know which files to update
- [ ] I know progress reporting requirements
- [ ] I know commit message structure
- [ ] I know handoff requirements

⚠️ If ANY box is unchecked, re-read the requirements

## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Tests passing: ≥85% per screen
- All states implemented: Loading, error, empty, success
- Navigation working: All routes connected
- Accessibility: All props present
- Performance: <16ms render

### Target Excellence Criteria:
- Tests passing: 100%
- Smooth animations: 60fps
- Responsive layout: All screen sizes
- Offline support: Cached data shown
- Perfect accessibility: Screen reader tested

### How to Measure:
```bash
# Run screen tests
npm run test:screens:marketing 2>&1 | tee results.txt
PASS_RATE=$(grep -oE "[0-9]+ passing" results.txt | grep -oE "[0-9]+")
TOTAL_TESTS=$(grep -oE "[0-9]+ total" results.txt | grep -oE "[0-9]+")
PERCENTAGE=$((PASS_RATE * 100 / TOTAL_TESTS))

echo "Pass rate: $PERCENTAGE%"

# Check render performance
npx react-native-performance measure

# Verify accessibility
npm run test:a11y
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Screen Implementation:
1. **RUN TESTS**: `npm run test:screens:marketing -- $SCREEN_NAME`
2. **CHECK PASS RATE**: Must be ≥85%
3. **VERIFY STATES**: All states render correctly
4. **UPDATE PROGRESS**: Log implementation
5. **COMMIT**: With test results

### Commit Message Template:
```bash
git add -A
git commit -m "feat(marketing-screens): Implement $SCREEN_NAME - GREEN phase

Results:
- Tests Passing: $PASS/$TOTAL ($PERCENTAGE%)
- States Implemented: loading, error, empty, success
- Navigation: ✅ Connected
- Accessibility: ✅ Complete

Implementation:
- Hooks Used: $HOOKS_LIST
- Components Used: $COMPONENTS_LIST
- Pattern: Screen composition
- Performance: ${RENDER_TIME}ms render

Changes:
- Created: src/screens/marketing/$SCREEN_NAME.tsx
- Tests: $PERCENTAGE% passing

Agent: marketing-screens-impl
Phase: GREEN (implementation)
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After implementation → Run screen tests
- [ ] After navigation → Test flows work
- [ ] After states → Verify all render
- [ ] Before commit → Check accessibility

## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Marketing Screens Implementation ==="
echo "  Phase: GREEN (making tests pass)"
echo "  Screens: Dashboard, Content, Campaign, Bundle, Analytics"
echo "  Timestamp: $(date)"

# During implementation
echo "📝 Implementing: $SCREEN_NAME"
echo "  Tests to pass: $TEST_COUNT"
echo "  Hooks available: $HOOKS_LIST"
echo "  Components available: $COMPONENTS_LIST"

# After completion
echo "✅ Completed: $SCREEN_NAME"
echo "  Pass rate: $PERCENTAGE%"
echo "  All states: Implemented"
echo "  Navigation: Connected"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /communication/progress/marketing-screens-impl.md
    echo "$1"
}

log_progress "Implementing $SCREEN_NAME"
log_progress "Using hooks: $HOOKS_LIST"
log_progress "Using components: $COMPONENTS_LIST"
log_progress "Tests passing: $PASS/$TOTAL"
log_progress "Committed implementation"
```

## 🎯 Mission

Your mission is to implement marketing screens to make the RED phase tests pass by composing existing hooks and components achieving ≥85% test pass rate.

### Scope:
- IN SCOPE: Screen implementation using hooks/components
- IN SCOPE: All UI states (loading, error, empty, success)
- IN SCOPE: Navigation connections
- IN SCOPE: Accessibility props
- OUT OF SCOPE: New features not in tests
- OUT OF SCOPE: Custom hooks or components

### Success Definition:
You succeed when all screen tests pass with proper composition of existing hooks and components.

## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow dependencies):

#### 1. Implement MarketingDashboard
```typescript
// src/screens/marketing/MarketingDashboard.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useMarketingDashboard } from '@/hooks/marketing/useMarketingDashboard';
import { CampaignCard } from '@/components/marketing/CampaignCard';
import { ContentWidget } from '@/components/marketing/ContentWidget';
import { QuickActions } from '@/components/marketing/QuickActions';
import { ScreenContainer, LoadingState, ErrorState } from '@/components/common';

export function MarketingDashboard() {
  const {
    campaigns,
    content,
    metrics,
    isLoading,
    error,
    refetch
  } = useMarketingDashboard();
  
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  
  return (
    <ScreenContainer testID="marketing-dashboard">
      <ScrollView>
        {/* Metrics Overview */}
        <MetricsOverview metrics={metrics} />
        
        {/* Active Campaigns */}
        <Section title="Active Campaigns" testID="campaign-section">
          {campaigns.map((campaign, index) => (
            <CampaignCard
              key={campaign.id}
              testID={`campaign-card-${index}`}
              campaign={campaign}
              onPress={() => navigateToCampaign(campaign.id)}
            />
          ))}
        </Section>
        
        {/* Recent Content */}
        <Section title="Recent Content" testID="content-section">
          {content.map((item, index) => (
            <ContentWidget
              key={item.id}
              testID={`content-widget-${index}`}
              content={item}
              onPress={() => navigateToContent(item.id)}
            />
          ))}
        </Section>
        
        {/* Quick Actions */}
        <QuickActions
          onCreateContent={() => navigate('CreateContent')}
          onCreateCampaign={() => navigate('CreateCampaign')}
          onViewAnalytics={() => navigate('Analytics')}
        />
      </ScrollView>
    </ScreenContainer>
  );
}
```
- Why: Central navigation hub
- Dependencies: All hooks and components ready

#### 2. Implement ProductContentScreen
```typescript
// Rich text editor, image upload, workflow management
// Use ContentEditor component
// Use useContentWorkflow hook
```

#### 3. Implement CampaignPlannerScreen
```typescript
// Calendar, scheduling, targeting
// Use CampaignCalendar component
// Use useMarketingCampaign hook
```

#### 4. Implement BundleManagementScreen
```typescript
// Product selection, pricing
// Use BundleBuilder component
// Use useProductBundle hook
```

#### 5. Implement MarketingAnalyticsScreen
```typescript
// Charts, metrics, export
// Use AnalyticsChart components
// Use useMarketingAnalytics hook
```

### Task Checklist:
- [ ] MarketingDashboard → TEST → COMMIT
- [ ] ProductContentScreen → TEST → COMMIT
- [ ] CampaignPlannerScreen → TEST → COMMIT
- [ ] BundleManagementScreen → TEST → COMMIT
- [ ] MarketingAnalyticsScreen → TEST → COMMIT

## ✅ Test Requirements

### Must Pass These Test Categories:
- Rendering: Initial render with data
- States: Loading, error, empty, success
- Navigation: All navigation flows
- Interactions: User actions handled
- Accessibility: All props present

### Implementation Validation:
```bash
# Run specific screen tests
npm run test:screens:marketing -- MarketingDashboard

# Check all states tested
grep "loading\|error\|empty" src/screens/marketing/__tests__/$SCREEN_NAME.test.tsx

# Verify navigation
grep "navigate" src/screens/marketing/$SCREEN_NAME.tsx
```

## 🎯 Milestone Validation Protocol

### Milestone 1: MarketingDashboard
- [ ] Tests passing ≥85%
- [ ] All widgets rendered
- [ ] Navigation working
- [ ] Commit with metrics

### Milestone 2: ProductContentScreen
- [ ] Editor integrated
- [ ] Upload working
- [ ] Workflow states shown
- [ ] Tests passing

### Milestone 3: Campaign Screens
- [ ] Planner implemented
- [ ] Calendar working
- [ ] Targeting functional
- [ ] ≥85% tests passing

### Milestone 4: Bundle & Analytics
- [ ] Bundle builder working
- [ ] Analytics charts render
- [ ] Export functional
- [ ] All tests passing

### Final Validation:
- [ ] All screens implemented
- [ ] ≥85% total tests passing
- [ ] Navigation complete
- [ ] All states handled
- [ ] Handoff complete

## 🔄 Self-Improvement Protocol

### After Each Screen:
1. **Test**: Run screen test suite
2. **Measure**: Pass rate percentage
3. **Review**: Missing test cases
4. **Fix**: Add missing implementations
5. **Optimize**: Improve performance

### Performance Check:
```bash
echo "=== Screen Performance ==="
echo "Screen: $SCREEN_NAME"

# Measure render time
npx react-native-performance measure-render $SCREEN_NAME

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
npm run test:screens:marketing
AFTER_RATE=$(/* calculate */)

if [ "$AFTER_RATE" -lt "$BEFORE_RATE" ]; then
    echo "❌ REGRESSION: Pass rate dropped!"
    git reset --hard
    exit 1
fi

# Check all states implemented
for state in "loading" "error" "empty"; do
  grep -q "$state" src/screens/marketing/$SCREEN_NAME.tsx || {
    echo "❌ Missing $state state!"
    exit 1
  }
done
```

### Regression Rules:
- NEVER decrease test pass rate
- NEVER remove states
- NEVER break navigation
- ALWAYS use existing hooks/components

## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Use existing hooks: Already tested
- Use existing components: Consistent UX
- Handle all states: Complete UX
- Add accessibility: Required

### ❌ NEVER:
- Create new hooks: Use existing
- Create new components: Use existing
- Skip states: Tests check all
- Forget testIDs: Tests need them

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Need data | Use hook | Direct API call | Hook tested |
| Need UI | Use component | Custom UI | Consistency |
| Error occurs | Show ErrorState | Ignore | UX |
| Loading | Show LoadingState | Blank screen | UX |

## 🔄 Communication

### Required Files to Update:
- Progress: `/communication/progress/marketing-screens-impl.md`
- Status: `/communication/status/marketing-screens-impl.json`
- Test Results: `/communication/test-results/marketing-screens-impl.txt`
- Handoff: `/communication/handoffs/marketing-screens-impl-complete.md`

## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /communication/handoffs/marketing-screens-impl-complete.md << EOF
# Marketing Screens Implementation - GREEN Phase Complete

## Summary
- Start: $START_TIME
- End: $(date)
- Phase: GREEN (Implementation)
- Test Pass Rate: $OVERALL_PERCENTAGE%

## Screens Implemented
### MarketingDashboard
- Tests: $PASS/$TOTAL passing
- States: ✅ All implemented
- Navigation: ✅ Connected
- Components: CampaignCard, ContentWidget, QuickActions

### ProductContentScreen
- Tests: $PASS/$TOTAL passing
- Editor: ✅ Integrated
- Upload: ✅ Working
- Workflow: ✅ All states

### CampaignPlannerScreen
- Tests: $PASS/$TOTAL passing
- Calendar: ✅ Functional
- Scheduling: ✅ Working
- Targeting: ✅ Implemented

### BundleManagementScreen
- Tests: $PASS/$TOTAL passing
- Builder: ✅ Integrated
- Pricing: ✅ Calculated
- Inventory: ✅ Tracked

### MarketingAnalyticsScreen
- Tests: $PASS/$TOTAL passing
- Charts: ✅ Rendered
- Metrics: ✅ Displayed
- Export: ✅ Functional

## Technical Implementation
### Patterns Used
- ✅ Screen composition with hooks/components
- ✅ All UI states handled
- ✅ Navigation properly connected
- ✅ Accessibility complete
- ✅ Performance optimized

### Hooks Integrated
- useMarketingDashboard
- useContentWorkflow
- useMarketingCampaign
- useProductBundle
- useMarketingAnalytics

### Components Integrated
- ContentEditor
- ImageUploader
- CampaignCalendar
- BundleBuilder
- AnalyticsCharts

## Performance Metrics
- Average render: ${AVG_RENDER}ms
- Bundle increase: ${BUNDLE_INCREASE}kb
- Memory usage: ${MEMORY}MB
- FPS: ${FPS} (target: 60)

## Navigation Structure
\`\`\`
MarketingDashboard
├── ProductContentScreen
│   ├── CreateContent
│   └── EditContent
├── CampaignPlannerScreen
│   ├── CreateCampaign
│   └── EditCampaign
├── BundleManagementScreen
│   ├── CreateBundle
│   └── EditBundle
└── MarketingAnalyticsScreen
    └── ExportAnalytics
\`\`\`

## Known Issues
- None (all tests passing)

## Dependencies for Next Phase
- Screens ready for integration testing
- All user flows connected
- State management working

## Recommendations
- Add transition animations
- Implement offline support
- Add skeleton loaders
- Consider lazy loading
- Monitor performance in production

GREEN Phase Complete: $(date)
EOF

echo "✅ Handoff complete with screen implementation details"
```

## 🚨 Common Issues & Solutions

### Issue: Tests failing after implementation
**Symptoms**: Expected elements not found
**Cause**: TestIDs don't match tests
**Solution**:
```typescript
// Check test for exact testID
it('should render campaign cards', () => {
  getByTestId('campaign-card-0'); // Test expects this exact ID
});

// Use in implementation
<CampaignCard testID={`campaign-card-${index}`} />
```

### Issue: Navigation not working
**Symptoms**: Navigation tests fail
**Cause**: Route names don't match
**Solution**:
```typescript
// Check test for route names
expect(navigate).toHaveBeenCalledWith('CampaignDetails', { id });

// Use exact name in implementation
navigation.navigate('CampaignDetails', { id: campaign.id });
```

### Issue: States not rendering
**Symptoms**: State tests fail
**Cause**: Missing state implementations
**Solution**:
```typescript
// Implement ALL states
if (isLoading) return <LoadingState />;
if (error) return <ErrorState />;
if (isEmpty) return <EmptyState />;
return <SuccessState />;
```

## 📚 Study These Examples

### Before starting, study:
1. **Test files from RED phase** - Your specification
2. **Implemented hooks** - Data layer
3. **Implemented components** - UI layer
4. **Existing screens** - Pattern reference

### Key Patterns to Notice:
- Screen composition approach
- State handling patterns
- Navigation connections
- Accessibility implementation

### Copy These Patterns:
```typescript
// Standard screen structure
export function MarketingScreen() {
  // 1. Use hooks for data
  const { data, isLoading, error } = useMarketingHook();
  
  // 2. Handle states
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;
  
  // 3. Compose with components
  return (
    <ScreenContainer>
      <Header />
      <Content data={data} />
      <Actions />
    </ScreenContainer>
  );
}
```

## 🚀 REMEMBER

You're implementing screens to make tests pass. Use the hooks and components already built. Handle all states. Connect navigation. The tests are your specification.

**Read tests → Compose screens → Handle states → Connect navigation → Pass tests**