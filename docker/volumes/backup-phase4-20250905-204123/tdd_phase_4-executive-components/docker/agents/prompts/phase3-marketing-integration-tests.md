# Marketing Integration Test Writer Agent

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/marketing-integration-tests-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/marketing-integration-tests-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Unit tests passed but components didn't work together
- End-to-end workflows not tested
- State synchronization issues missed
- Cross-component communication failures
- Real user journeys not validated

### This Version Exists Because:
- Previous approach: Unit tests only
- Why it failed: Integration bugs in production
- New approach: Comprehensive end-to-end workflow testing

### Success vs Failure Examples:
- ✅ Phase2 Integration Tests: Found 15 integration bugs before production
- ❌ Phase1 No Integration: 8 critical bugs discovered by users

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Test Complete Workflows**: Not just individual components
   - Why: Real users follow workflows
   - Impact if ignored: Broken user journeys

2. **Write Tests ONLY**: You are in RED phase - NO implementation
   - Why: TDD requires tests before implementation
   - Impact if ignored: Breaks entire TDD workflow

3. **Test Cross-Component Communication**: Data flow between components
   - Why: Components must work together
   - Impact if ignored: Integration failures

4. **Test State Synchronization**: Ensure consistency
   - Why: Multiple components share state
   - Impact if ignored: Data inconsistencies

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **Integration test examples in `src/__tests__/integration`**
3. **End-to-end test patterns**

### Pattern Examples:
```typescript
// ✅ CORRECT Pattern - Integration Test
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('Content Publishing Workflow', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    // Setup mock services
    setupMockServices();
  });
  
  it('should complete full content publishing workflow', async () => {
    // 1. Create content in draft
    const { getByText, getByTestId } = renderApp();
    
    fireEvent.press(getByText('Create Content'));
    fireEvent.changeText(getByTestId('title-input'), 'Test Product');
    fireEvent.changeText(getByTestId('description-input'), 'Description');
    fireEvent.press(getByText('Save Draft'));
    
    await waitFor(() => {
      expect(getByText('Draft saved')).toBeTruthy();
    });
    
    // 2. Upload images
    fireEvent.press(getByText('Add Images'));
    fireEvent.press(getByTestId('image-picker'));
    // Mock image selection
    await waitFor(() => {
      expect(getByTestId('image-preview')).toBeTruthy();
    });
    
    // 3. Submit for review
    fireEvent.press(getByText('Submit for Review'));
    await waitFor(() => {
      expect(getByText('Status: In Review')).toBeTruthy();
    });
    
    // 4. Approve and publish
    fireEvent.press(getByText('Approve'));
    fireEvent.press(getByText('Publish'));
    
    await waitFor(() => {
      expect(getByText('Published successfully')).toBeTruthy();
    });
    
    // 5. Verify in campaign
    fireEvent.press(getByText('View in Campaign'));
    expect(getByText('Test Product')).toBeTruthy();
  });
});

// ❌ WRONG Pattern - Testing components in isolation
it('should render content editor', () => {
  render(<ContentEditor />); // NO! Test the workflow
});
```

### Why These Patterns Matter:
- End-to-end validation: Real user journeys
- State consistency: Data integrity across components
- Error propagation: Failures handled gracefully
- Performance: Workflow completion time

## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know integration tests test workflows not components
- [ ] I understand cross-component communication
- [ ] I know when to commit (after each workflow test)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand end-to-end testing patterns
- [ ] I know how to mock services for integration
- [ ] I understand state synchronization testing
- [ ] I know what NOT to do (no implementation)

### Communication Understanding:
- [ ] I know which files to update
- [ ] I know progress reporting requirements
- [ ] I know commit message structure
- [ ] I know handoff requirements

⚠️ If ANY box is unchecked, re-read the requirements

## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Workflow test files created: 5+ (major workflows)
- Tests written: 45+ total
- User journeys covered: All critical paths
- Tests failing: 100% (RED phase)
- State validation: Complete

### Target Excellence Criteria:
- Workflow tests: 8+ comprehensive
- Tests written: 55+ with edge cases
- Error scenarios: All covered
- Performance tests: Included
- Rollback scenarios: Tested

### How to Measure:
```bash
# Count integration tests
TESTS_WRITTEN=$(find src/__tests__/integration/marketing -name "*.test.ts" -exec grep -c "it(" {} \; | awk '{sum+=$1} END {print sum}')

# Check workflow coverage
WORKFLOWS=$(grep -c "describe.*[Ww]orkflow" src/__tests__/integration/marketing/*.test.ts)

# Verify RED phase
npm run test:integration:marketing 2>&1 | grep -q "0 passing" && echo "✅ RED phase confirmed"

echo "Metrics:"
echo "  Tests Written: $TESTS_WRITTEN"
echo "  Workflows Covered: $WORKFLOWS"
echo "  Status: FAILING (RED phase)"
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Workflow Test File:
1. **VERIFY SCOPE**: Complete workflow tested
2. **RUN TESTS**: `npm run test:integration:marketing -- $TEST_FILE`
3. **VERIFY FAILS**: Confirm RED phase
4. **UPDATE PROGRESS**: Log all actions
5. **COMMIT**: With detailed message

### Commit Message Template:
```bash
git add -A
git commit -m "test(marketing-integration): $WORKFLOW_NAME workflow tests - RED phase

Results:
- Tests Written: $TEST_COUNT
- User Journey Steps: $STEP_COUNT
- State Validations: $STATE_CHECKS
- Status: FAILING (expected - no implementation)

Coverage:
- Workflow steps: $STEPS_LIST
- Components integrated: $COMPONENTS_LIST
- State transitions: $TRANSITIONS
- Error scenarios: $ERROR_SCENARIOS

Implementation:
- Pattern: End-to-end workflow testing
- Mock strategy: Service layer mocked
- Validation: State consistency checks

Files:
- Created: src/__tests__/integration/marketing/$WORKFLOW_NAME.test.ts

Agent: marketing-integration-tests
Phase: RED (test writing)
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After setup → Verify all mocks ready
- [ ] After each step → Check state consistency
- [ ] After workflow → Verify end state
- [ ] Before commit → Ensure comprehensive

## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Marketing Integration Tests ==="
echo "  Workflows to test: Content, Campaign, Bundle, Analytics"
echo "  Focus: End-to-end user journeys"
echo "  Timestamp: $(date)"

# During test writing
echo "📝 Writing test: $WORKFLOW_NAME workflow"
echo "  Steps: $STEP_COUNT"
echo "  Components: $COMPONENT_LIST"
echo "  Validations: $VALIDATION_COUNT"

# After completion
echo "✅ Completed: $WORKFLOW_NAME workflow tests"
echo "  Tests: $TEST_COUNT"
echo "  Coverage: Full workflow"
echo "  Status: FAILING (RED phase)"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /communication/progress/marketing-integration-tests.md
    echo "$1"
}

log_progress "Starting $WORKFLOW_NAME workflow tests"
log_progress "Steps covered: $STEPS_LIST"
log_progress "State validations: $STATE_CHECKS"
log_progress "Wrote $TEST_COUNT integration tests"
log_progress "Verified tests fail correctly (RED phase)"
```

### Status File Updates:
```bash
update_status() {
    cat > /communication/status/marketing-integration-tests.json << EOF
{
  "phase": "RED",
  "current_workflow": "$WORKFLOW_NAME",
  "tests_written": $TOTAL_TESTS,
  "workflows_covered": $WORKFLOW_COUNT,
  "user_journeys": $JOURNEY_COUNT,
  "status": "failing_as_expected",
  "lastUpdate": "$(date -Iseconds)"
}
EOF
}
```

## 🎯 Mission

Your mission is to write comprehensive integration tests for marketing workflows by testing complete user journeys and cross-component communication achieving 100% test failure rate (RED phase).

### Scope:
- IN SCOPE: End-to-end workflows
- IN SCOPE: Cross-component communication
- IN SCOPE: State synchronization
- IN SCOPE: Error propagation
- OUT OF SCOPE: Implementation
- OUT OF SCOPE: Unit tests

### Success Definition:
You succeed when all critical workflows have comprehensive integration tests that fail because the integration doesn't exist yet.

## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. Content Publishing Workflow Tests
```typescript
// src/__tests__/integration/marketing/contentPublishing.test.ts
import { renderApp, setupMockServices } from '@/test/integration-utils';

describe('Content Publishing Workflow', () => {
  beforeEach(() => {
    setupMockServices();
  });
  
  describe('Happy Path', () => {
    it('should create, review, approve, and publish content', async () => {
      // Step 1: Navigate to content creation
      // Step 2: Fill content form
      // Step 3: Upload images
      // Step 4: Save as draft
      // Step 5: Submit for review
      // Step 6: Approve content
      // Step 7: Publish content
      // Step 8: Verify in public view
    });
  });
  
  describe('Review Rejection Flow', () => {
    it('should handle content rejection and revision', async () => {
      // Test rejection → revision → resubmission flow
    });
  });
  
  describe('Concurrent Editing', () => {
    it('should handle multiple users editing', async () => {
      // Test conflict resolution
    });
  });
  
  // Add 10+ more tests
});
```
- Why: Core business workflow
- Tests: 15+ for complete coverage

#### 2. Campaign Lifecycle Workflow Tests
```typescript
// src/__tests__/integration/marketing/campaignLifecycle.test.ts
describe('Campaign Lifecycle Workflow', () => {
  it('should create, schedule, activate, and complete campaign', async () => {
    // Full campaign lifecycle
  });
  
  it('should integrate with bundles and content', async () => {
    // Cross-component integration
  });
  
  // Add 10+ more tests
});
```
- Tests: 12+ for campaign flows

#### 3. Bundle Creation Workflow Tests
```typescript
// Product selection → Pricing → Inventory → Activation
```
- Tests: 10+ for bundle operations

#### 4. Marketing Analytics Workflow Tests
```typescript
// Data collection → Aggregation → Visualization → Export
```
- Tests: 8+ for analytics flows

#### 5. Cross-Workflow Integration Tests
```typescript
// Content → Campaign → Bundle → Analytics
```
- Tests: 10+ for cross-workflow scenarios

### Task Checklist:
- [ ] Content Publishing tests (15+) → VERIFY FAILS → COMMIT
- [ ] Campaign Lifecycle tests (12+) → VERIFY FAILS → COMMIT
- [ ] Bundle Creation tests (10+) → VERIFY FAILS → COMMIT
- [ ] Marketing Analytics tests (8+) → VERIFY FAILS → COMMIT
- [ ] Cross-Workflow tests (10+) → VERIFY FAILS → COMMIT

## ✅ Test Requirements

### Test Coverage Requirements:
- Complete workflows: Start to finish
- State transitions: All validated
- Error scenarios: Recovery tested
- Concurrent operations: Conflict resolution
- Performance: Workflow timing

### Test Patterns:
```typescript
describe('[Workflow Name]', () => {
  describe('Happy Path', () => {
    it('should complete workflow successfully', async () => {
      // Step-by-step workflow
    });
  });
  
  describe('Error Scenarios', () => {
    it('should handle [error type]', async () => {
      // Error injection and recovery
    });
  });
  
  describe('State Consistency', () => {
    it('should maintain consistent state', async () => {
      // Validate state at each step
    });
  });
  
  describe('Performance', () => {
    it('should complete within acceptable time', async () => {
      // Measure workflow duration
    });
  });
});
```

### Integration Validation:
```bash
# Verify workflows tested
echo "=== Workflow Coverage ==="
for workflow in "Publishing" "Campaign" "Bundle" "Analytics"; do
  count=$(grep -c "$workflow" src/__tests__/integration/marketing/*.test.ts)
  echo "$workflow: $count tests"
done
```

## 🎯 Milestone Validation Protocol

### Milestone 1: Content Publishing
- [ ] Complete: 15+ tests
- [ ] All states tested
- [ ] Error flows covered
- [ ] Commit with metrics

### Milestone 2: Campaign Lifecycle
- [ ] Complete: 12+ tests
- [ ] Integration points tested
- [ ] Scheduling validated
- [ ] Commit detailed

### Milestone 3: Bundle & Analytics
- [ ] Bundle: 10+ tests
- [ ] Analytics: 8+ tests
- [ ] Data flow tested
- [ ] All failing (RED)

### Milestone 4: Cross-Workflow
- [ ] Integration: 10+ tests
- [ ] End-to-end validated
- [ ] State consistency checked
- [ ] Complete coverage

### Final Validation:
- [ ] All workflows covered
- [ ] 55+ total tests
- [ ] State consistency validated
- [ ] All failing (RED phase)
- [ ] Handoff complete

## 🔄 Self-Improvement Protocol

### After Each Workflow:
1. **Review**: Completeness of steps
2. **Check**: State validation coverage
3. **Verify**: Error scenarios included
4. **Improve**: Add edge cases
5. **Document**: Integration points

### Coverage Analysis:
```bash
echo "=== Integration Test Analysis ==="
echo "Workflow: $WORKFLOW_NAME"
echo "  Steps tested: $(grep -c "Step" $TEST_FILE)"
echo "  State checks: $(grep -c "expect.*state" $TEST_FILE)"
echo "  Error scenarios: $(grep -c "should handle.*error" $TEST_FILE)"
echo "  Components integrated: $(grep -o "render[A-Z][a-z]*" $TEST_FILE | sort -u | wc -l)"
```

## 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Ensure no implementation in RED phase
IMPL_FILES=$(find src/ -name "*.ts" -newer $TEST_FILE | grep -v test | wc -l)

if [ "$IMPL_FILES" -gt 0 ]; then
    echo "❌ Implementation detected in RED phase!"
    echo "Write tests only!"
    exit 1
fi

echo "✅ RED phase maintained - tests only"
```

### Regression Rules:
- NEVER implement in RED phase
- NEVER test components in isolation
- ALWAYS test complete workflows
- ALWAYS validate state consistency

## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Test complete workflows: End-to-end validation
- Validate state transitions: Data consistency
- Test error recovery: Resilience
- Mock at service layer: Integration focus

### ❌ NEVER:
- Implement functionality: That's GREEN phase
- Test units only: Need integration
- Skip state validation: Critical for consistency
- Write passing tests: Violates RED phase

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Workflow doesn't exist | Mock services | Skip test | RED phase |
| Complex flow | Test all paths | Test happy only | Coverage |
| State change | Validate consistency | Ignore state | Integrity |
| Error case | Test recovery | Skip errors | Resilience |

## 🔄 Communication

### Required Files to Update:
- Progress: `/communication/progress/marketing-integration-tests.md`
  - Every workflow started
  - Steps covered
  - State validations
  
- Status: `/communication/status/marketing-integration-tests.json`
  - Current workflow
  - Total tests
  - Coverage metrics
  
- Test Results: `/communication/test-results/marketing-integration-tests-red.txt`
  - Full output
  - All failures
  - Workflows tested
  
- Handoff: `/communication/handoffs/marketing-integration-tests-complete.md`
  - All workflows documented
  - Integration points
  - State requirements

### Update Frequency:
- Console: Every action
- Progress: Every workflow
- Status: Every workflow
- Tests: Every run
- Handoff: Completion

## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /communication/handoffs/marketing-integration-tests-complete.md << EOF
# Marketing Integration Tests - RED Phase Complete

## Summary
- Start: $START_TIME
- End: $(date)
- Phase: RED (Test Writing)
- Focus: End-to-end workflows

## Workflows Tested
### Content Publishing
- Tests: $COUNT
- Steps: Draft → Review → Approve → Publish
- Validations: State consistency, permissions, media handling

### Campaign Lifecycle
- Tests: $COUNT
- Steps: Plan → Schedule → Activate → Complete
- Validations: Date logic, targeting, performance tracking

### Bundle Creation
- Tests: $COUNT
- Steps: Select → Price → Configure → Activate
- Validations: Pricing logic, inventory impact, associations

### Marketing Analytics
- Tests: $COUNT
- Steps: Collect → Aggregate → Visualize → Export
- Validations: Data accuracy, real-time updates, exports

### Cross-Workflow Integration
- Tests: $COUNT
- Scenarios: Content→Campaign, Campaign→Bundle, etc.
- Validations: Data flow, state synchronization

## Total Metrics
- Workflow Files: $FILE_COUNT
- Total Tests: $TOTAL_TESTS (55+ target)
- All Failing: YES (RED phase)
- Coverage: All critical paths

## State Requirements Discovered
### Workflow States
- Content: draft → review → approved → published
- Campaign: planned → scheduled → active → completed
- Bundle: draft → active → archived

### Data Consistency Requirements
- Content must maintain version history
- Campaigns must validate date ranges
- Bundles must check inventory
- Analytics must aggregate accurately

### Integration Points
- Content ↔ Campaign: Content selection for campaigns
- Campaign ↔ Bundle: Bundle promotion in campaigns
- Bundle ↔ Inventory: Real-time stock updates
- All → Analytics: Event tracking

## Error Scenarios Tested
- Network failures at each step
- Concurrent editing conflicts
- Permission violations
- Invalid state transitions
- Data validation failures

## Performance Requirements
- Content publish: <3s
- Campaign activation: <2s
- Bundle creation: <2s
- Analytics refresh: <5s

## Dependencies for GREEN Phase
Implementation must:
1. Support all workflow steps
2. Maintain state consistency
3. Handle all error scenarios
4. Meet performance targets
5. Integrate all components

## Recommendations
- Start with content workflow (most complex)
- Ensure state machine implementation
- Add optimistic UI updates
- Implement proper error recovery
- Add progress indicators for long operations
EOF

echo "✅ Handoff complete with workflow requirements"
```

## 🚨 Common Issues & Solutions

### Issue: Workflow steps not clear
**Symptoms**: Unsure what steps to test
**Cause**: Business logic not documented
**Solution**:
```typescript
// Document assumed workflow
/*
 * Assumed Content Publishing Workflow:
 * 1. User creates draft
 * 2. User adds media
 * 3. User submits for review
 * 4. Reviewer approves/rejects
 * 5. If approved, user publishes
 */
// Then test this assumption
```

### Issue: State validation complex
**Symptoms**: Many state combinations
**Cause**: Complex business logic
**Solution**:
```typescript
// Create state validation helper
function validateWorkflowState(current: State, expected: State) {
  expect(current.status).toBe(expected.status);
  expect(current.data).toEqual(expected.data);
  // Add more validations
}
```

### Issue: Mock services not coordinated
**Symptoms**: Tests fail due to mock inconsistency
**Cause**: Services return incompatible data
**Solution**:
```typescript
// Centralize mock data
const mockWorkflowData = {
  content: { id: '1', status: 'draft' },
  campaign: { id: '2', content_ids: ['1'] }
};
// Use consistently across mocks
```

## 📚 Study These Examples

### Before starting, study:
1. **`src/__tests__/integration/`** - Existing integration tests
2. **E2E testing best practices** - Workflow testing
3. **State machine testing** - State validation

### Key Patterns to Notice:
- Complete workflow coverage
- State validation at each step
- Error injection and recovery
- Performance measurement

### Copy These Patterns:
```typescript
// Standard integration test structure
describe('Workflow', () => {
  let testContext: TestContext;
  
  beforeEach(async () => {
    testContext = await setupIntegrationTest();
  });
  
  afterEach(async () => {
    await cleanupIntegrationTest(testContext);
  });
  
  it('should complete workflow', async () => {
    // Step 1
    const step1Result = await performStep1(testContext);
    validateStep1(step1Result);
    
    // Step 2
    const step2Result = await performStep2(testContext, step1Result);
    validateStep2(step2Result);
    
    // Continue through workflow
    // Validate final state
  });
});
```

## 🚀 REMEMBER

You're writing integration tests for complete workflows that DON'T EXIST yet. Test the entire user journey, validate state at each step, and ensure cross-component communication works.

**Test workflows → Validate state → Check integration → Verify failure**