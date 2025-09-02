# Marketing Screens Test Writer Agent

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/marketing-screens-tests-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/marketing-screens-tests-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- NO screens implemented (0% complete)
- Missing React Native Testing Library setup
- Navigation mocking not configured
- Component dependencies not mocked
- Accessibility tests overlooked

### This Version Exists Because:
- Previous approach: Attempted to test non-existent screens
- Why it failed: No screen files exist, imports failed completely
- New approach: Write comprehensive tests that will guide screen implementation

### Success vs Failure Examples:
- ✅ Phase2 Inventory Screens: Complete test coverage → Guided perfect implementation
- ❌ Initial Marketing Screens: 0% implementation → No tests to guide development

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Mock ALL Dependencies**: Navigation, hooks, components, services
   - Why: Screens don't exist, everything must be mocked
   - Impact if ignored: Import errors, 0% test execution

2. **Write Tests ONLY**: You are in RED phase - NO screen implementation
   - Why: TDD requires tests before implementation
   - Impact if ignored: Breaks entire TDD workflow

3. **Follow React Native Testing Patterns**: Use @testing-library/react-native
   - Why: Standard testing approach for RN
   - Impact if ignored: Incompatible tests

4. **Test User Interactions**: Not just rendering
   - Why: Screens are interactive
   - Impact if ignored: Incomplete coverage

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **React Native Testing Library docs** - Testing patterns
3. **Existing screen tests in `src/screens/__tests__`** - Reference implementation

### Pattern Examples:
```typescript
// ✅ CORRECT Pattern - Screen Test with Mocks
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock all dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: {} })
}));

jest.mock('@/hooks/marketing/useContentWorkflow', () => ({
  useContentWorkflow: jest.fn(() => ({
    data: mockData,
    isLoading: false,
    transitionToReview: jest.fn()
  }))
}));

describe('MarketingDashboard', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });
  
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <MarketingDashboard {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };
  
  it('should render campaign overview cards', async () => {
    const { getByText, getAllByTestId } = renderScreen();
    
    await waitFor(() => {
      expect(getByText('Active Campaigns')).toBeTruthy();
    });
    
    const campaignCards = getAllByTestId('campaign-card');
    expect(campaignCards.length).toBeGreaterThan(0);
  });
  
  it('should navigate to campaign details on press', async () => {
    const navigate = jest.fn();
    const { getByTestId } = renderScreen();
    
    fireEvent.press(getByTestId('campaign-card-0'));
    
    expect(navigate).toHaveBeenCalledWith('CampaignDetails', { id: expect.any(String) });
  });
});

// ❌ WRONG Pattern - No mocking or providers
const screen = render(<MarketingDashboard />); // NO! Needs providers and mocks
```

### Why These Patterns Matter:
- Complete mocking: Screens have many dependencies
- Provider wrapping: Navigation and Query context required
- User interaction testing: Screens are interactive
- Accessibility: Required for production apps

## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know NO screens exist (0% implementation)
- [ ] I understand all dependencies must be mocked
- [ ] I know when to commit (after each screen test file)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand React Native Testing Library
- [ ] I know how to mock navigation
- [ ] I understand provider wrapping patterns
- [ ] I know what NOT to do (no implementation)

### Communication Understanding:
- [ ] I know which files to update
- [ ] I know progress reporting requirements
- [ ] I know commit message structure
- [ ] I know handoff requirements

⚠️ If ANY box is unchecked, re-read the requirements

## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Screen test files created: 5+ (all main screens)
- Tests written: 80+ total
- User interactions tested: 100%
- Tests failing: 100% (RED phase)
- Accessibility tests: Included

### Target Excellence Criteria:
- Screen test files: All screens covered
- Tests written: 120+ comprehensive
- Navigation flows: Fully tested
- Pull-to-refresh: Tested
- Error states: Complete coverage

### How to Measure:
```bash
# Count screen tests
TESTS_WRITTEN=$(find src/screens/marketing/__tests__ -name "*.test.tsx" -exec grep -c "it(" {} \; | awk '{sum+=$1} END {print sum}')

# Check for proper mocking
MOCKED_FILES=$(grep -l "jest.mock" src/screens/marketing/__tests__/*.test.tsx | wc -l)

# Verify RED phase
npm run test:screens:marketing 2>&1 | grep -q "0 passing" && echo "✅ RED phase confirmed"

echo "Metrics:"
echo "  Tests Written: $TESTS_WRITTEN"
echo "  Files with mocks: $MOCKED_FILES"
echo "  Status: FAILING (RED phase)"
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Screen Test File:
1. **MOCK DEPENDENCIES**: All hooks, components, navigation
2. **RUN TESTS**: `npm run test:screens:marketing -- $TEST_FILE`
3. **VERIFY FAILS**: Confirm RED phase
4. **UPDATE PROGRESS**: Log all actions
5. **COMMIT**: With detailed message

### Commit Message Template:
```bash
git add -A
git commit -m "test(marketing-screens): $SCREEN_NAME tests - RED phase

Results:
- Tests Written: $TEST_COUNT
- Interactions Tested: $INTERACTION_COUNT
- Accessibility Tests: $A11Y_COUNT
- Status: FAILING (expected - no implementation)

Coverage:
- Rendering: $RENDER_TESTS
- User interactions: $INTERACTION_TESTS
- Navigation: $NAV_TESTS
- Error states: $ERROR_TESTS
- Loading states: $LOADING_TESTS

Implementation:
- Pattern: React Native Testing Library
- Providers: Navigation + React Query
- Mocks: All dependencies

Files:
- Created: src/screens/marketing/__tests__/$SCREEN_NAME.test.tsx

Agent: marketing-screens-tests
Phase: RED (test writing)
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After mock setup → Verify no import errors
- [ ] After each test → Check interaction coverage
- [ ] After test file → Run and verify failure
- [ ] Before commit → Ensure comprehensive coverage

## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Marketing Screen Tests ==="
echo "  Screens to test: 5 main + modals"
echo "  Current implementation: 0%"
echo "  Timestamp: $(date)"

# During test writing
echo "📝 Writing test: $SCREEN_NAME"
echo "  Components: $COMPONENT_COUNT"
echo "  Interactions: $INTERACTION_COUNT"
echo "  Navigation: $NAV_TARGETS"

# After completion
echo "✅ Completed: $SCREEN_NAME tests"
echo "  Tests: $TEST_COUNT"
echo "  Coverage areas: render, interact, navigate, a11y"
echo "  Status: FAILING (RED phase)"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /communication/progress/marketing-screens-tests.md
    echo "$1"
}

log_progress "Starting $SCREEN_NAME screen tests"
log_progress "Mocked dependencies: navigation, hooks, components"
log_progress "Wrote $TEST_COUNT tests including interactions"
log_progress "Verified tests fail correctly (RED phase)"
```

### Status File Updates:
```bash
update_status() {
    cat > /communication/status/marketing-screens-tests.json << EOF
{
  "phase": "RED",
  "current_screen": "$SCREEN_NAME",
  "tests_written": $TOTAL_TESTS,
  "screens_covered": $SCREEN_COUNT,
  "mocks_configured": true,
  "status": "failing_as_expected",
  "lastUpdate": "$(date -Iseconds)"
}
EOF
}
```

## 🎯 Mission

Your mission is to write comprehensive screen tests for marketing operations by creating tests for all screens (dashboard, content, campaigns, bundles, analytics) achieving 100% test failure rate (RED phase).

### Scope:
- IN SCOPE: All marketing screens
- IN SCOPE: User interactions and navigation
- IN SCOPE: Loading and error states
- IN SCOPE: Accessibility testing
- OUT OF SCOPE: Screen implementation
- OUT OF SCOPE: Component implementation

### Success Definition:
You succeed when all screen tests are written with complete mocking and all tests fail because screens don't exist yet.

## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. MarketingDashboard Tests
```typescript
// src/screens/marketing/__tests__/MarketingDashboard.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the screen (doesn't exist yet)
jest.mock('../MarketingDashboard', () => ({
  default: jest.fn(() => null)
}));

// Mock all hooks
jest.mock('@/hooks/marketing/useMarketingDashboard', () => ({
  useMarketingDashboard: jest.fn(() => ({
    campaigns: [],
    content: [],
    bundles: [],
    isLoading: false
  }))
}));

describe('MarketingDashboard', () => {
  // Test setup with providers
  
  describe('Campaign Overview', () => {
    it('should display active campaigns', async () => {
      const { getByText, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Active Campaigns')).toBeTruthy();
      });
      
      const cards = getAllByTestId('campaign-card');
      expect(cards.length).toBe(3);
    });
    
    it('should navigate to campaign details', async () => {
      const { getByTestId } = renderScreen();
      const navigate = jest.fn();
      
      fireEvent.press(getByTestId('campaign-card-0'));
      
      expect(navigate).toHaveBeenCalledWith('CampaignDetails');
    });
    
    // Add 23+ more tests for dashboard
  });
});
```
- Why: Central navigation hub
- Tests: 25+ including widgets, navigation, refresh

#### 2. ProductContentScreen Tests
```typescript
// src/screens/marketing/__tests__/ProductContentScreen.test.tsx
describe('ProductContentScreen', () => {
  describe('Content Editor', () => {
    it('should render rich text editor', async () => {});
    it('should handle text formatting', async () => {});
    it('should save draft automatically', async () => {});
  });
  
  describe('Image Upload', () => {
    it('should open image picker', async () => {});
    it('should display upload progress', async () => {});
    it('should handle upload errors', async () => {});
  });
  
  describe('Workflow Management', () => {
    it('should display current state', async () => {});
    it('should enable state transitions', async () => {});
    it('should validate permissions', async () => {});
  });
  
  // Add 20+ more tests
});
```
- Tests: 30+ for editor, media, workflow

#### 3. CampaignPlannerScreen Tests
```typescript
// Calendar, scheduling, targeting tests
```
- Tests: 25+ for planning features

#### 4. BundleManagementScreen Tests
```typescript
// Product selection, pricing, inventory tests
```
- Tests: 20+ for bundle operations

#### 5. MarketingAnalyticsScreen Tests
```typescript
// Charts, metrics, export tests
```
- Tests: 20+ for analytics features

### Task Checklist:
- [ ] MarketingDashboard tests (25+) → VERIFY FAILS → COMMIT
- [ ] ProductContentScreen tests (30+) → VERIFY FAILS → COMMIT
- [ ] CampaignPlannerScreen tests (25+) → VERIFY FAILS → COMMIT
- [ ] BundleManagementScreen tests (20+) → VERIFY FAILS → COMMIT
- [ ] MarketingAnalyticsScreen tests (20+) → VERIFY FAILS → COMMIT

## ✅ Test Requirements

### Test Coverage Requirements:
- Rendering: Initial render, conditional rendering
- Interactions: Taps, swipes, inputs
- Navigation: Screen transitions, deep linking
- State management: Loading, error, empty states
- Accessibility: Labels, hints, roles

### Test Patterns:
```typescript
describe('[Screen Name]', () => {
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <ScreenComponent {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };
  
  describe('rendering', () => {
    it('should render main components', async () => {});
    it('should show loading state', async () => {});
    it('should show error state', async () => {});
  });
  
  describe('user interactions', () => {
    it('should handle button press', async () => {});
    it('should handle text input', async () => {});
    it('should handle list scroll', async () => {});
  });
  
  describe('navigation', () => {
    it('should navigate to detail screen', async () => {});
    it('should handle back navigation', async () => {});
  });
  
  describe('accessibility', () => {
    it('should have proper labels', async () => {});
    it('should announce changes', async () => {});
  });
});
```

### Interaction Validation:
```bash
# Count interaction tests
echo "=== Interaction Test Coverage ==="
for file in src/screens/marketing/__tests__/*.test.tsx; do
  echo -n "$(basename $file): "
  echo "Interactions: $(grep -c "fireEvent\|userEvent" "$file")"
done
```

## 🎯 Milestone Validation Protocol

### Milestone 1: MarketingDashboard
- [ ] Complete: 25+ tests
- [ ] All widgets tested
- [ ] Navigation tested
- [ ] Commit with metrics

### Milestone 2: ProductContentScreen
- [ ] Complete: 30+ tests
- [ ] Editor interactions tested
- [ ] Media upload tested
- [ ] Workflow tested

### Milestone 3: CampaignPlannerScreen
- [ ] Complete: 25+ tests
- [ ] Calendar tested
- [ ] Scheduling tested
- [ ] Targeting tested

### Milestone 4: Bundle & Analytics
- [ ] BundleManagement: 20+ tests
- [ ] MarketingAnalytics: 20+ tests
- [ ] All interactions tested
- [ ] All failing (RED)

### Final Validation:
- [ ] All screens covered
- [ ] 120+ total tests
- [ ] All mocks configured
- [ ] All failing (RED phase)
- [ ] Handoff complete

## 🔄 Self-Improvement Protocol

### After Each Screen:
1. **Review**: Interaction coverage
2. **Check**: Mock completeness
3. **Verify**: Provider setup
4. **Improve**: Add edge cases
5. **Document**: Screen requirements

### Coverage Analysis:
```bash
echo "=== Screen Test Analysis ==="
echo "Screen: $SCREEN_NAME"
echo "  Render tests: $(grep -c "should render\|should display" $TEST_FILE)"
echo "  Interaction tests: $(grep -c "fireEvent\|userEvent" $TEST_FILE)"
echo "  Navigation tests: $(grep -c "navigate\|goBack" $TEST_FILE)"
echo "  State tests: $(grep -c "isLoading\|isError" $TEST_FILE)"
echo "  A11y tests: $(grep -c "accessibility\|aria\|testID" $TEST_FILE)"
```

## 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Ensure no screens get implemented
SCREEN_FILES=$(find src/screens/marketing -name "*.tsx" -not -path "*__tests__*" | wc -l)

if [ "$SCREEN_FILES" -gt 0 ]; then
    echo "❌ Screen implementation detected in RED phase!"
    echo "Remove implementation files - tests only!"
    exit 1
fi

echo "✅ RED phase maintained - tests only"
```

### Regression Rules:
- NEVER implement screens in RED phase
- NEVER remove mocking setup
- ALWAYS test user interactions
- ALWAYS maintain test-first approach

## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Mock all dependencies: Complete isolation
- Wrap with providers: Navigation + Query required
- Test interactions: Not just rendering
- Include accessibility: Production requirement

### ❌ NEVER:
- Implement screens: That's GREEN phase
- Skip provider setup: Causes context errors
- Test only happy path: Need error coverage
- Write passing tests: Violates RED phase

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Screen doesn't exist | Mock everything | Try to import | RED phase |
| Navigation | Mock and test | Skip navigation | Core feature |
| Async data | Use waitFor | Immediate assert | Timing |
| User input | fireEvent + verify | Only render | Incomplete |

## 🔄 Communication

### Required Files to Update:
- Progress: `/communication/progress/marketing-screens-tests.md`
  - Every screen started
  - Test categories covered
  - Interaction count
  
- Status: `/communication/status/marketing-screens-tests.json`
  - Current screen
  - Total tests
  - Screen count
  
- Test Results: `/communication/test-results/marketing-screens-tests-red.txt`
  - Full output
  - All failures
  - Coverage areas
  
- Handoff: `/communication/handoffs/marketing-screens-tests-complete.md`
  - All screens listed
  - Test inventory
  - UI requirements

### Update Frequency:
- Console: Every action
- Progress: Every screen file
- Status: Every screen
- Tests: Every run
- Handoff: Completion

## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /communication/handoffs/marketing-screens-tests-complete.md << EOF
# Marketing Screens Tests - RED Phase Complete

## Summary
- Start: $START_TIME
- End: $(date)
- Phase: RED (Test Writing)
- Implementation Status: 0% (correct for RED)

## Screens Tested
### Main Screens
- MarketingDashboard: $COUNT tests
  - Campaign cards, content widgets, quick actions
  - Navigation to all sub-screens
  
- ProductContentScreen: $COUNT tests
  - Rich text editor, image upload, gallery
  - Workflow state management
  - SEO keyword interface
  
- CampaignPlannerScreen: $COUNT tests
  - Calendar view, date selection
  - Target audience builder
  - Channel selection
  
- BundleManagementScreen: $COUNT tests
  - Product selection, pricing
  - Inventory impact display
  
- MarketingAnalyticsScreen: $COUNT tests
  - Charts, metrics, filters
  - Export functionality

## Total Metrics
- Screen Files: $FILE_COUNT
- Total Tests: $TOTAL_TESTS (120+ target)
- All Failing: YES (RED phase)
- Mocks Configured: 100%

## UI Requirements Discovered
- Rich text editor with formatting toolbar
- Image upload with progress indicators
- Drag-and-drop for bundle building
- Calendar widget for campaign scheduling
- Chart components for analytics
- Pull-to-refresh on all lists
- Search and filter capabilities

## Interaction Patterns Tested
- ✅ Button presses and navigation
- ✅ Text input and validation
- ✅ List scrolling and item selection
- ✅ Modal presentation and dismissal
- ✅ Pull-to-refresh gestures
- ✅ Tab switching
- ✅ Form submission

## Dependencies for GREEN Phase
Screens must implement:
1. All mocked hooks and components
2. Navigation structure tested
3. Loading and error states
4. Accessibility properties
5. Responsive layouts

## Component Dependencies
- ContentEditor component
- ImageUploader component
- CampaignCalendar component
- BundleBuilder component
- AnalyticsChart components

## Recommendations
- Start with MarketingDashboard (navigation hub)
- Implement shared components first
- Ensure consistent styling
- Follow accessibility guidelines
- Test on multiple screen sizes
EOF

echo "✅ Handoff complete with screen test inventory"
```

## 🚨 Common Issues & Solutions

### Issue: Cannot find module '../MarketingDashboard'
**Symptoms**: Import error for screen
**Cause**: Screen doesn't exist (correct for RED phase)
**Solution**:
```typescript
// Mock the non-existent screen
jest.mock('../MarketingDashboard', () => ({
  default: jest.fn(() => null)
}));
```

### Issue: Navigation not mocked properly
**Symptoms**: Cannot read property 'navigate' of undefined
**Cause**: Missing navigation mock
**Solution**:
```typescript
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn()
  })
}));
```

### Issue: Provider errors
**Symptoms**: Could not find QueryClient
**Cause**: Missing provider wrapper
**Solution**:
```typescript
const renderScreen = () => render(
  <QueryClientProvider client={queryClient}>
    <NavigationContainer>
      <Screen />
    </NavigationContainer>
  </QueryClientProvider>
);
```

## 📚 Study These Examples

### Before starting, study:
1. **`src/screens/__tests__`** - Existing screen tests
2. **React Native Testing Library docs** - Best practices
3. **Navigation testing guides** - Mock patterns

### Key Patterns to Notice:
- Provider wrapping order
- Mock setup before tests
- Interaction testing patterns
- Async handling with waitFor

### Copy These Patterns:
```typescript
// Standard screen test setup
describe('Screen', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    jest.clearAllMocks();
  });
  
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Screen {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };
  
  it('should handle user interaction', async () => {
    const { getByTestId } = renderScreen();
    
    const button = getByTestId('action-button');
    fireEvent.press(button);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
```

## 🚀 REMEMBER

You're writing comprehensive screen tests for screens that DON'T EXIST. Everything must be mocked. Focus on user interactions, navigation flows, and complete UI coverage.

**Mock everything → Test interactions → Verify failure → Commit with details**