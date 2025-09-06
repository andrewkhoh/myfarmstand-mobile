# Marketing Components Test Writer Agent

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/marketing-components-tests-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/marketing-components-tests-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- NO components implemented (0% complete)
- Complex components like ContentEditor not properly tested
- Image upload progress tracking not covered
- Calendar widget interactions missed
- Accessibility props not tested

### This Version Exists Because:
- Previous approach: Tried to test within screens only
- Why it failed: Components need isolated unit tests
- New approach: Comprehensive component tests before screen integration

### Success vs Failure Examples:
- ✅ Phase2 Components: Isolated tests → 96% reusability
- ❌ Phase1 Components: No tests → 40% had to be rewritten

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Test Components in Isolation**: No screen dependencies
   - Why: True unit testing of components
   - Impact if ignored: Coupled tests, hard to maintain

2. **Write Tests ONLY**: You are in RED phase - NO component implementation
   - Why: TDD requires tests before implementation
   - Impact if ignored: Breaks entire TDD workflow

3. **Test ALL Props and Events**: Complete interface coverage
   - Why: Components are reusable building blocks
   - Impact if ignored: Brittle components

4. **Include Accessibility**: Test all a11y props
   - Why: Required for production apps
   - Impact if ignored: Unusable for some users

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **React Native Testing Library Component docs** - Testing patterns
3. **Existing component tests in `src/components/__tests__`** - Reference

### Pattern Examples:
```typescript
// ✅ CORRECT Pattern - Component Test in Isolation
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the component (doesn't exist yet)
jest.mock('../ContentEditor', () => ({
  default: jest.fn(() => null)
}));

describe('ContentEditor', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    placeholder: 'Enter content...',
    maxLength: 5000
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render with initial value', () => {
    const { getByText } = render(
      <ContentEditor {...defaultProps} value="Initial content" />
    );
    
    expect(getByText('Initial content')).toBeTruthy();
  });
  
  it('should call onChange when text changes', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ContentEditor {...defaultProps} onChange={onChange} />
    );
    
    const input = getByTestId('content-input');
    fireEvent.changeText(input, 'New content');
    
    expect(onChange).toHaveBeenCalledWith('New content');
  });
  
  it('should show character count', () => {
    const { getByText } = render(
      <ContentEditor {...defaultProps} value="Test" showCharCount />
    );
    
    expect(getByText('4 / 5000')).toBeTruthy();
  });
  
  it('should support text formatting', () => {
    const { getByTestId } = render(
      <ContentEditor {...defaultProps} enableFormatting />
    );
    
    const boldButton = getByTestId('format-bold');
    expect(boldButton).toBeTruthy();
  });
});

// ❌ WRONG Pattern - Testing with dependencies
const screen = render(
  <NavigationContainer>  // NO! Component should work standalone
    <ContentEditor />
  </NavigationContainer>
);
```

### Why These Patterns Matter:
- Isolated testing: Components are reusable
- Props coverage: Interface contract
- Event handling: User interactions
- Accessibility: Inclusive design

## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know NO components exist (0% implementation)
- [ ] I understand isolated component testing
- [ ] I know when to commit (after each component test file)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand component prop testing
- [ ] I know how to test event callbacks
- [ ] I understand render testing patterns
- [ ] I know what NOT to do (no implementation)

### Communication Understanding:
- [ ] I know which files to update
- [ ] I know progress reporting requirements
- [ ] I know commit message structure
- [ ] I know handoff requirements

⚠️ If ANY box is unchecked, re-read the requirements

## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Component test files created: 5+ (all major components)
- Tests written: 45+ total
- Props tested: 100% coverage
- Tests failing: 100% (RED phase)
- Event handlers: All tested

### Target Excellence Criteria:
- Component test files: 7+ with utilities
- Tests written: 60+ comprehensive
- Edge cases: Covered
- Accessibility: Full coverage
- Performance: Render optimization tests

### How to Measure:
```bash
# Count component tests
TESTS_WRITTEN=$(find src/components/marketing/__tests__ -name "*.test.tsx" -exec grep -c "it(" {} \; | awk '{sum+=$1} END {print sum}')

# Check prop coverage
PROP_TESTS=$(grep -r "should.*prop" src/components/marketing/__tests__ | wc -l)

# Verify RED phase
npm run test:components:marketing 2>&1 | grep -q "0 passing" && echo "✅ RED phase confirmed"

echo "Metrics:"
echo "  Tests Written: $TESTS_WRITTEN"
echo "  Prop Tests: $PROP_TESTS"
echo "  Status: FAILING (RED phase)"
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Component Test File:
1. **TEST ISOLATION**: Verify no external dependencies
2. **RUN TESTS**: `npm run test:components:marketing -- $TEST_FILE`
3. **VERIFY FAILS**: Confirm RED phase
4. **UPDATE PROGRESS**: Log all actions
5. **COMMIT**: With detailed message

### Commit Message Template:
```bash
git add -A
git commit -m "test(marketing-components): $COMPONENT_NAME tests - RED phase

Results:
- Tests Written: $TEST_COUNT
- Props Tested: $PROP_COUNT
- Events Tested: $EVENT_COUNT
- Status: FAILING (expected - no implementation)

Coverage:
- Rendering: $RENDER_TESTS
- Props: $PROP_TESTS
- Events: $EVENT_TESTS
- Accessibility: $A11Y_TESTS
- Edge cases: $EDGE_TESTS

Implementation:
- Pattern: Isolated component testing
- No external dependencies
- Complete interface coverage

Files:
- Created: src/components/marketing/__tests__/$COMPONENT_NAME.test.tsx

Agent: marketing-components-tests
Phase: RED (test writing)
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After setup → Verify isolation
- [ ] After each test → Check coverage type
- [ ] After test file → Run and verify failure
- [ ] Before commit → Ensure comprehensive

## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Marketing Component Tests ==="
echo "  Components: ContentEditor, ImageUploader, CampaignCalendar, BundleBuilder, WorkflowIndicator"
echo "  Current implementation: 0%"
echo "  Timestamp: $(date)"

# During test writing
echo "📝 Writing test: $COMPONENT_NAME"
echo "  Props: $PROP_LIST"
echo "  Events: $EVENT_LIST"
echo "  Special features: $FEATURES"

# After completion
echo "✅ Completed: $COMPONENT_NAME tests"
echo "  Tests: $TEST_COUNT"
echo "  Coverage: props, events, rendering, a11y"
echo "  Status: FAILING (RED phase)"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /communication/progress/marketing-components-tests.md
    echo "$1"
}

log_progress "Starting $COMPONENT_NAME component tests"
log_progress "Testing props: $PROP_LIST"
log_progress "Testing events: $EVENT_LIST"
log_progress "Wrote $TEST_COUNT tests"
log_progress "Verified tests fail correctly (RED phase)"
```

### Status File Updates:
```bash
update_status() {
    cat > /communication/status/marketing-components-tests.json << EOF
{
  "phase": "RED",
  "current_component": "$COMPONENT_NAME",
  "tests_written": $TOTAL_TESTS,
  "components_covered": $COMPONENT_COUNT,
  "isolation": true,
  "status": "failing_as_expected",
  "lastUpdate": "$(date -Iseconds)"
}
EOF
}
```

## 🎯 Mission

Your mission is to write comprehensive component tests for marketing UI components by testing all props, events, and rendering behaviors achieving 100% test failure rate (RED phase).

### Scope:
- IN SCOPE: All marketing UI components
- IN SCOPE: Props, events, rendering
- IN SCOPE: Accessibility testing
- IN SCOPE: Edge cases and errors
- OUT OF SCOPE: Component implementation
- OUT OF SCOPE: Screen integration

### Success Definition:
You succeed when all component tests are written in isolation with complete interface coverage and all tests fail because components don't exist yet.

## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. ContentEditor Component Tests
```typescript
// src/components/marketing/__tests__/ContentEditor.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../ContentEditor', () => ({
  default: jest.fn(() => null)
}));

describe('ContentEditor', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    placeholder: 'Enter content...',
    maxLength: 5000,
    minHeight: 100
  };
  
  describe('rendering', () => {
    it('should render with placeholder', () => {
      const { getByPlaceholderText } = render(
        <ContentEditor {...defaultProps} />
      );
      expect(getByPlaceholderText('Enter content...')).toBeTruthy();
    });
    
    it('should display initial value', () => {});
    it('should show character count when enabled', () => {});
  });
  
  describe('text input', () => {
    it('should call onChange with new text', () => {});
    it('should respect maxLength', () => {});
    it('should handle multiline input', () => {});
  });
  
  describe('formatting toolbar', () => {
    it('should show formatting buttons when enabled', () => {});
    it('should apply bold formatting', () => {});
    it('should apply italic formatting', () => {});
    it('should insert links', () => {});
    it('should handle lists', () => {});
  });
  
  describe('accessibility', () => {
    it('should have proper accessibilityLabel', () => {});
    it('should announce character limit', () => {});
  });
  
  // Add 5+ more tests
});
```
- Why: Core editing functionality
- Tests: 15+ for rich text features

#### 2. ImageUploader Component Tests
```typescript
// src/components/marketing/__tests__/ImageUploader.test.tsx
describe('ImageUploader', () => {
  describe('upload interface', () => {
    it('should show upload button', () => {});
    it('should open image picker on press', () => {});
    it('should display selected image preview', () => {});
  });
  
  describe('upload progress', () => {
    it('should show progress bar during upload', () => {});
    it('should display percentage', () => {});
    it('should handle upload errors', () => {});
  });
  
  describe('gallery management', () => {
    it('should display image gallery', () => {});
    it('should allow image deletion', () => {});
    it('should support reordering', () => {});
  });
  
  // Add 5+ more tests
});
```
- Tests: 12+ for upload features

#### 3. CampaignCalendar Component Tests
```typescript
// Calendar display, date selection, range picking
```
- Tests: 10+ for calendar interactions

#### 4. BundleBuilder Component Tests
```typescript
// Product selection, pricing display, quantity management
```
- Tests: 10+ for bundle building

#### 5. WorkflowIndicator Component Tests
```typescript
// State display, transition buttons, permission checks
```
- Tests: 8+ for workflow UI

### Task Checklist:
- [ ] ContentEditor tests (15+) → VERIFY FAILS → COMMIT
- [ ] ImageUploader tests (12+) → VERIFY FAILS → COMMIT
- [ ] CampaignCalendar tests (10+) → VERIFY FAILS → COMMIT
- [ ] BundleBuilder tests (10+) → VERIFY FAILS → COMMIT
- [ ] WorkflowIndicator tests (8+) → VERIFY FAILS → COMMIT

## ✅ Test Requirements

### Test Coverage Requirements:
- Props: All props tested with valid/invalid values
- Events: All callbacks tested with expected args
- Rendering: Initial, conditional, error states
- Accessibility: Labels, hints, roles, announcements
- Edge cases: Empty data, max limits, errors

### Test Patterns:
```typescript
describe('[Component Name]', () => {
  const defaultProps = {
    // All required props
  };
  
  describe('props', () => {
    it('should accept and use [prop]', () => {});
    it('should handle missing optional props', () => {});
    it('should validate prop types', () => {});
  });
  
  describe('events', () => {
    it('should call on[Event] when triggered', () => {});
    it('should pass correct arguments', () => {});
  });
  
  describe('rendering', () => {
    it('should render children', () => {});
    it('should apply styles', () => {});
    it('should handle conditional rendering', () => {});
  });
  
  describe('accessibility', () => {
    it('should have accessible role', () => {});
    it('should have descriptive labels', () => {});
  });
});
```

### Component Isolation Validation:
```bash
# Ensure no external dependencies
echo "=== Component Isolation Check ==="
for file in src/components/marketing/__tests__/*.test.tsx; do
  echo -n "$(basename $file): "
  # Should NOT have these
  ! grep -q "NavigationContainer\|QueryClientProvider" "$file" && echo "✅ Isolated" || echo "❌ Has dependencies"
done
```

## 🎯 Milestone Validation Protocol

### Milestone 1: ContentEditor
- [ ] Complete: 15+ tests
- [ ] Rich text features tested
- [ ] Formatting toolbar tested
- [ ] Commit with metrics

### Milestone 2: ImageUploader
- [ ] Complete: 12+ tests
- [ ] Upload progress tested
- [ ] Gallery features tested
- [ ] Error handling tested

### Milestone 3: Interactive Components
- [ ] CampaignCalendar: 10+ tests
- [ ] BundleBuilder: 10+ tests
- [ ] All interactions tested
- [ ] Drag-drop tested

### Milestone 4: Utility Components
- [ ] WorkflowIndicator: 8+ tests
- [ ] Status displays tested
- [ ] Transitions tested
- [ ] All failing (RED)

### Final Validation:
- [ ] All components covered
- [ ] 55+ total tests
- [ ] Complete isolation
- [ ] All failing (RED phase)
- [ ] Handoff complete

## 🔄 Self-Improvement Protocol

### After Each Component:
1. **Review**: Prop coverage completeness
2. **Check**: Event handler testing
3. **Verify**: Isolation maintained
4. **Improve**: Add edge cases
5. **Document**: Component requirements

### Coverage Analysis:
```bash
echo "=== Component Test Analysis ==="
echo "Component: $COMPONENT_NAME"
echo "  Prop tests: $(grep -c "prop" $TEST_FILE)"
echo "  Event tests: $(grep -c "on[A-Z]" $TEST_FILE)"
echo "  Render tests: $(grep -c "render" $TEST_FILE)"
echo "  A11y tests: $(grep -c "accessibility" $TEST_FILE)"
```

## 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Ensure components aren't implemented
COMPONENT_FILES=$(find src/components/marketing -name "*.tsx" -not -path "*__tests__*" | wc -l)

if [ "$COMPONENT_FILES" -gt 0 ]; then
    echo "❌ Component implementation detected in RED phase!"
    exit 1
fi

# Ensure isolation
grep -r "NavigationContainer\|QueryClientProvider" src/components/marketing/__tests__ && {
    echo "❌ External dependencies in component tests!"
    exit 1
}

echo "✅ RED phase maintained - isolated tests only"
```

### Regression Rules:
- NEVER implement components in RED phase
- NEVER add external dependencies
- ALWAYS test in isolation
- ALWAYS maintain interface coverage

## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Test components in isolation: True unit tests
- Cover all props: Complete interface
- Test all events: User interactions
- Include accessibility: Inclusive design

### ❌ NEVER:
- Implement components: That's GREEN phase
- Add screen dependencies: Not isolated
- Skip edge cases: Incomplete coverage
- Write passing tests: Violates RED phase

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Component doesn't exist | Mock it | Implement it | RED phase |
| Needs provider | Test without | Wrap in provider | Isolation |
| Complex prop | Test variations | Test one case | Coverage |
| Event handler | Test with args | Just test call | Completeness |

## 🔄 Communication

### Required Files to Update:
- Progress: `/communication/progress/marketing-components-tests.md`
  - Every component started
  - Props and events covered
  - Test count per component
  
- Status: `/communication/status/marketing-components-tests.json`
  - Current component
  - Total tests
  - Component count
  
- Test Results: `/communication/test-results/marketing-components-tests-red.txt`
  - Full output
  - All failures
  - Coverage areas
  
- Handoff: `/communication/handoffs/marketing-components-tests-complete.md`
  - All components listed
  - Interface documented
  - Requirements captured

### Update Frequency:
- Console: Every action
- Progress: Every component
- Status: Every component
- Tests: Every run
- Handoff: Completion

## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /communication/handoffs/marketing-components-tests-complete.md << EOF
# Marketing Components Tests - RED Phase Complete

## Summary
- Start: $START_TIME
- End: $(date)
- Phase: RED (Test Writing)
- Implementation Status: 0% (correct for RED)

## Components Tested
### Rich Content Components
- ContentEditor: $COUNT tests
  - Rich text formatting
  - Character counting
  - Toolbar actions
  
- ImageUploader: $COUNT tests
  - File selection
  - Upload progress
  - Gallery management
  - Error handling

### Interactive Components
- CampaignCalendar: $COUNT tests
  - Date selection
  - Range picking
  - Event display
  
- BundleBuilder: $COUNT tests
  - Product selection
  - Drag and drop
  - Pricing display
  - Quantity management

### Display Components
- WorkflowIndicator: $COUNT tests
  - State visualization
  - Transition buttons
  - Permission-based rendering

## Total Metrics
- Component Files: $FILE_COUNT
- Total Tests: $TOTAL_TESTS (55+ target)
- All Failing: YES (RED phase)
- Isolation: 100% (no external deps)

## Interface Requirements Discovered
### ContentEditor
- Props: value, onChange, maxLength, formatting options
- Events: onChange, onFocus, onBlur, onFormat
- Features: Bold, italic, links, lists, character count

### ImageUploader
- Props: multiple, maxSize, acceptedTypes, gallery
- Events: onSelect, onUpload, onProgress, onError, onDelete
- Features: Preview, progress bar, error display

### CampaignCalendar
- Props: selectedDates, minDate, maxDate, events
- Events: onDateSelect, onRangeSelect, onEventClick
- Features: Month view, event dots, range selection

### BundleBuilder
- Props: products, maxItems, pricing
- Events: onAdd, onRemove, onReorder, onQuantityChange
- Features: Drag-drop, price calculation, validation

## Dependencies for GREEN Phase
Components must implement:
1. All props with proper TypeScript types
2. Event handlers with correct signatures
3. Accessibility properties
4. Error boundaries
5. Performance optimization (memo)

## Recommendations
- Start with WorkflowIndicator (simplest)
- ContentEditor needs rich text library
- ImageUploader needs react-native-image-picker
- Consider shared styling system
- Implement storybook for component development
EOF

echo "✅ Handoff complete with component interface documentation"
```

## 🚨 Common Issues & Solutions

### Issue: Component not found
**Symptoms**: Cannot find module '../ContentEditor'
**Cause**: Component doesn't exist (correct for RED phase)
**Solution**:
```typescript
jest.mock('../ContentEditor', () => ({
  default: jest.fn(() => null)
}));
```

### Issue: Props not being tested
**Symptoms**: Low prop coverage
**Cause**: Only testing happy path
**Solution**:
```typescript
// Test each prop variation
it.each([
  ['small', 50],
  ['medium', 100],
  ['large', 200]
])('should apply %s size with height %i', (size, height) => {
  const { getByTestId } = render(
    <Component size={size} />
  );
  // Assertions
});
```

### Issue: Event handler not called
**Symptoms**: expect(mockFn).toHaveBeenCalled() fails
**Cause**: Event not properly triggered
**Solution**:
```typescript
fireEvent.press(element);
// or
fireEvent.changeText(element, 'text');
// or
fireEvent(element, 'customEvent', eventData);
```

## 📚 Study These Examples

### Before starting, study:
1. **`src/components/__tests__`** - Existing component tests
2. **React Native Testing Library** - Component testing
3. **Jest mock patterns** - For non-existent components

### Key Patterns to Notice:
- Isolated testing without providers
- Complete prop coverage
- Event simulation patterns
- Accessibility testing

### Copy These Patterns:
```typescript
// Standard component test setup
describe('Component', () => {
  const defaultProps = {
    // All required props with defaults
  };
  
  const renderComponent = (props = {}) => {
    return render(
      <Component {...defaultProps} {...props} />
    );
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Organized test groups
  describe('props', () => {});
  describe('events', () => {});
  describe('rendering', () => {});
  describe('accessibility', () => {});
});
```

## 🚀 REMEMBER

You're writing comprehensive component tests for components that DON'T EXIST. Test in complete isolation. Focus on the component's interface (props and events) not implementation.

**Isolate → Test interface → Verify failure → Document requirements**