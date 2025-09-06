# Marketing Service Test Writer Agent

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/marketing-service-tests-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/marketing-service-tests-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Import errors due to missing dependencies not properly mocked
- Service implementations mixed with test writing
- Tests passed immediately (not truly RED phase)
- Insufficient mocking setup for Supabase client
- Race condition tests not properly isolated

### This Version Exists Because:
- Previous approach: Partial mocking led to runtime errors
- Why it failed: Dependencies weren't fully mocked, imports failed
- New approach: Comprehensive mocking setup before test logic

### Success vs Failure Examples:
- ✅ Phase2 Inventory Services: Complete mocking → 95% coverage
- ❌ Initial Marketing Services: Import errors → 0% tests running

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Fix Import Errors FIRST**: Mock all dependencies properly
   - Why: Tests can't run with import errors
   - Impact if ignored: 0% test execution

2. **Write Tests ONLY**: You are in RED phase - NO service implementation
   - Why: TDD requires tests before implementation
   - Impact if ignored: Breaks entire TDD workflow

3. **Follow Service Test Pattern**: Use src/test/service-test-pattern (REFERENCE).md EXACTLY
   - Why: Consistency and proven patterns
   - Impact if ignored: Fragile tests, maintenance issues

4. **Mock Everything**: Supabase, external services, utilities
   - Why: Unit tests must be isolated
   - Impact if ignored: Tests fail due to missing services

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`src/test/service-test-pattern (REFERENCE).md`** - MANDATORY
2. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
3. **`src/test/serviceSetup.ts`** - Mock setup reference

### Pattern Examples:
```typescript
// ✅ CORRECT Pattern - Service Test with Mocks
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockSupabaseClient } from '@/test/serviceSetup';

jest.mock('@/config/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

describe('ContentService', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
  });
  
  describe('createContent', () => {
    it('should create content with workflow state', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: '123', workflow_state: 'draft' }],
            error: null
          })
        })
      });
      
      const result = await contentService.createContent(data);
      expect(result.workflow_state).toBe('draft');
    });
  });
});

// ❌ WRONG Pattern - No mocks, implementation in test
const contentService = {  // NO! Don't implement!
  createContent: async () => { /* implementation */ }
};
```

### Why These Patterns Matter:
- Proper mocking: Isolates unit tests
- Mock setup: Prevents import errors
- Clear structure: Maintainable tests
- Error scenarios: Complete coverage

## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know import errors killed previous attempts
- [ ] I understand mocking requirements for services
- [ ] I know when to commit (after each service test file)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand service test patterns from reference
- [ ] I know how to mock Supabase properly
- [ ] I understand async test patterns
- [ ] I know what NOT to do (no implementation)

### Communication Understanding:
- [ ] I know which files to update
- [ ] I know progress reporting requirements
- [ ] I know commit message structure
- [ ] I know handoff requirements

⚠️ If ANY box is unchecked, re-read the requirements

## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Test files created: 5+ (one per service)
- Tests written: 45+ total
- Import errors fixed: 100%
- Tests failing: 100% (RED phase)
- Mocking complete: All dependencies

### Target Excellence Criteria:
- Test files: All marketing services covered
- Tests written: 60+ with error cases
- Mock coverage: Every external dependency
- Test clarity: Self-documenting
- Performance: Tests run < 10s

### How to Measure:
```bash
# Verify no import errors
npm run test:services:marketing 2>&1 | grep -c "Cannot find module" | grep "^0$" && echo "✅ No import errors"

# Count tests
TESTS_WRITTEN=$(find src/services/marketing/__tests__ -name "*.test.ts" -exec grep -c "it(" {} \; | awk '{sum+=$1} END {print sum}')

# Verify RED phase
npm run test:services:marketing 2>&1 | grep -q "0 passing" && echo "✅ RED phase confirmed"

echo "Metrics:"
echo "  Tests Written: $TESTS_WRITTEN"
echo "  Import Errors: 0"
echo "  Status: FAILING (RED phase)"
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Service Test File:
1. **FIX IMPORTS**: Ensure all mocks in place
2. **RUN TESTS**: `npm run test:services:marketing -- $TEST_FILE`
3. **VERIFY FAILS**: Confirm RED phase
4. **UPDATE PROGRESS**: Log all actions
5. **COMMIT**: With detailed message

### Commit Message Template:
```bash
git add -A
git commit -m "test(marketing-services): $SERVICE_NAME tests - RED phase

Results:
- Tests Written: $TEST_COUNT
- Mocks Created: $MOCK_COUNT
- Import Errors: 0 (fixed)
- Status: FAILING (expected - no implementation)

Implementation:
- Pattern: service-test-pattern.md
- Mocking: Supabase, utilities, external services
- Coverage: CRUD operations, error handling

Fixes:
- Resolved import errors from previous attempt
- Added comprehensive mock setup

Files:
- Created: src/services/marketing/__tests__/$SERVICE_NAME.test.ts
- Modified: Mock configurations

Agent: marketing-service-tests
Phase: RED (test writing)
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After mock setup → Verify imports work
- [ ] After each test → Check syntax
- [ ] After test file → Run and verify failure
- [ ] Before commit → Ensure clean output

## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Marketing Service Tests ==="
echo "  Previous issues: Import errors"
echo "  Fix strategy: Comprehensive mocking"
echo "  Timestamp: $(date)"

# Fixing imports
echo "🔧 Fixing import issues"
echo "  Mocking: Supabase client"
echo "  Mocking: Utility functions"
echo "  Status: Imports resolved"

# During test writing
echo "📝 Writing test: $SERVICE_NAME"
echo "  Operations: CRUD + error cases"
echo "  Mocks needed: $MOCK_LIST"

# After completion
echo "✅ Completed: $SERVICE_NAME tests"
echo "  Tests: $TEST_COUNT"
echo "  Mocks: $MOCK_COUNT"
echo "  Status: FAILING (RED phase)"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /communication/progress/marketing-service-tests.md
    echo "$1"
}

log_progress "Fixing import errors from previous attempt"
log_progress "Created mock setup for $SERVICE_NAME"
log_progress "Wrote $TEST_COUNT tests for $SERVICE_NAME"
log_progress "Verified tests fail correctly (RED phase)"
```

### Status File Updates:
```bash
update_status() {
    cat > /communication/status/marketing-service-tests.json << EOF
{
  "phase": "RED",
  "current_service": "$SERVICE_NAME",
  "tests_written": $TOTAL_TESTS,
  "import_errors": 0,
  "mocks_created": $MOCK_COUNT,
  "status": "failing_as_expected",
  "lastUpdate": "$(date -Iseconds)"
}
EOF
}
```

## 🎯 Mission

Your mission is to write comprehensive service tests for marketing operations by fixing import errors first, then following established patterns achieving 100% test failure rate (RED phase).

### Scope:
- IN SCOPE: Service test writing with complete mocking
- IN SCOPE: Fixing import errors from previous attempts
- IN SCOPE: CRUD operations and error handling
- OUT OF SCOPE: Service implementation
- OUT OF SCOPE: Integration tests

### Success Definition:
You succeed when all service tests are written with proper mocks, no import errors, and all tests fail because services don't exist yet.

## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 0. Fix Import Errors (CRITICAL FIRST STEP)
```typescript
// Fix the duplicate mock in productBundleService.test.ts
// Remove duplicate: jest.mock('@/config/supabase')
// Keep only one mock setup at the top
```

#### 1. ContentService Tests
```typescript
// src/services/marketing/__tests__/contentService.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockSupabaseClient } from '@/test/serviceSetup';

// Mock Supabase FIRST
jest.mock('@/config/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

// Mock the service (it doesn't exist yet)
jest.mock('../contentService', () => ({
  contentService: {
    createContent: jest.fn(),
    updateContent: jest.fn(),
    getContent: jest.fn(),
    deleteContent: jest.fn(),
    updateWorkflowState: jest.fn()
  }
}));

describe('ContentService', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
  });
  
  describe('createContent', () => {
    it('should create content with initial draft state', async () => {
      // Setup mock response
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: '123', workflow_state: 'draft' }],
            error: null
          })
        })
      });
      
      // This will fail - service doesn't exist
      const result = await contentService.createContent({
        product_id: 'prod123',
        title: 'Test Content',
        description: 'Test Description'
      });
      
      expect(result).toBeDefined();
      expect(result.workflow_state).toBe('draft');
    });
    
    // Add 10+ more tests
  });
});
```
- Why: Core content management
- Dependencies: Supabase mocking
- Validation: Verify imports work, tests fail

#### 2. CampaignService Tests
```typescript
// src/services/marketing/__tests__/campaignService.test.ts
// Similar structure with campaign-specific operations
// Test lifecycle: planned → active → completed
```

#### 3. BundleService Tests
```typescript
// Fix existing import errors first
// Add missing test cases
```

#### 4. WorkflowService Tests
```typescript
// State machine testing
// Approval flow testing
```

#### 5. AnalyticsService Tests
```typescript
// Metrics aggregation
// Performance tracking
```

### Task Checklist:
- [ ] Fix import errors → VERIFY → COMMIT
- [ ] ContentService tests (15+) → VERIFY FAILS → COMMIT
- [ ] CampaignService tests (15+) → VERIFY FAILS → COMMIT
- [ ] BundleService tests (12+) → VERIFY FAILS → COMMIT
- [ ] WorkflowService tests (10+) → VERIFY FAILS → COMMIT
- [ ] AnalyticsService tests (10+) → VERIFY FAILS → COMMIT

## ✅ Test Requirements

### Test Coverage Requirements:
- CRUD operations: Create, Read, Update, Delete
- Error handling: Network, validation, auth errors
- Edge cases: Empty data, invalid IDs, concurrent ops
- Business logic: Workflow states, pricing, permissions

### Test Patterns:
```typescript
describe('[Service Name]', () => {
  describe('create[Entity]', () => {
    it('should create with valid data', async () => {});
    it('should handle validation errors', async () => {});
    it('should handle network errors', async () => {});
  });
  
  describe('update[Entity]', () => {
    it('should update existing entity', async () => {});
    it('should handle not found', async () => {});
    it('should validate permissions', async () => {});
  });
  
  describe('delete[Entity]', () => {
    it('should soft delete', async () => {});
    it('should handle cascading', async () => {});
  });
  
  describe('Business Logic', () => {
    it('should enforce workflow rules', async () => {});
    it('should calculate correctly', async () => {});
  });
});
```

### Mock Validation:
```bash
# Verify mocks are working
echo "=== Mock Validation ==="
grep -r "jest.mock" src/services/marketing/__tests__ | wc -l
echo "Total mocks created"

# Check for import errors
npm run test:services:marketing 2>&1 | grep "Cannot find module" || echo "✅ No import errors"
```

## 🎯 Milestone Validation Protocol

### Milestone 1: Import Error Resolution
- [ ] Fix duplicate mocks in existing tests
- [ ] Verify no import errors
- [ ] All test files runnable
- [ ] Commit fixes

### Milestone 2: ContentService Tests
- [ ] Complete: 15+ tests
- [ ] Mocks: Supabase, utilities
- [ ] Status: All failing (RED)
- [ ] Commit: With metrics

### Milestone 3: CampaignService Tests
- [ ] Complete: 15+ tests
- [ ] Lifecycle: All states tested
- [ ] Status: All failing
- [ ] Commit: Detailed

### Milestone 4: Remaining Services
- [ ] BundleService: 12+ tests
- [ ] WorkflowService: 10+ tests
- [ ] AnalyticsService: 10+ tests
- [ ] All failing (RED phase)

### Final Validation:
- [ ] No import errors
- [ ] All services covered
- [ ] 60+ total tests
- [ ] All failing (RED)
- [ ] Handoff complete

## 🔄 Self-Improvement Protocol

### After Each Service:
1. **Review**: Mock completeness
2. **Check**: Import errors
3. **Verify**: Test fails correctly
4. **Improve**: Add edge cases
5. **Document**: Service requirements

### Import Error Prevention:
```bash
# Before each test file
echo "=== Pre-flight Check ==="
echo "Checking for missing mocks..."

# List all imports in test file
grep "^import" $TEST_FILE

# Ensure each import is mocked or exists
for import in $(grep "^import.*from" $TEST_FILE | sed "s/.*from '\(.*\)'.*/\1/"); do
  if [[ ! "$import" =~ ^@ ]]; then continue; fi
  grep -q "jest.mock('$import'" $TEST_FILE || echo "⚠️ Missing mock: $import"
done
```

## 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Baseline import health
BEFORE_ERRORS=$(npm run test:services:marketing 2>&1 | grep -c "Cannot find module")

# After changes
AFTER_ERRORS=$(npm run test:services:marketing 2>&1 | grep -c "Cannot find module")

# No new import errors
if [ "$AFTER_ERRORS" -gt "$BEFORE_ERRORS" ]; then
    echo "❌ NEW IMPORT ERRORS INTRODUCED!"
    git reset --hard
    exit 1
fi

echo "✅ Import health maintained"
```

### Regression Rules:
- NEVER introduce import errors
- NEVER remove working mocks
- ALWAYS test file runnability
- ALWAYS maintain RED phase

## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Mock all external dependencies: Isolation
- Fix imports before writing tests: Runnable tests
- Use consistent mock patterns: Maintainability
- Test error scenarios: Robustness

### ❌ NEVER:
- Implement actual services: That's GREEN phase
- Skip mock setup: Causes import errors
- Use real Supabase client: Not unit testing
- Write passing tests: Violates RED phase

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Import error | Add mock | Skip test | Tests must run |
| Service doesn't exist | Mock it | Implement it | RED phase |
| External dependency | Mock it | Use real | Unit isolation |
| Async operation | Use async/await | Use callbacks | Modern patterns |

## 🔄 Communication

### Required Files to Update:
- Progress: `/communication/progress/marketing-service-tests.md`
  - Every import fix
  - Every test file
  - Every milestone
  
- Status: `/communication/status/marketing-service-tests.json`
  - Import error count
  - Current service
  - Test metrics
  
- Test Results: `/communication/test-results/marketing-service-tests-red.txt`
  - Full output
  - Error details
  - Failure count
  
- Handoff: `/communication/handoffs/marketing-service-tests-complete.md`
  - Import fixes applied
  - Services covered
  - Mock inventory

### Update Frequency:
- Console: Every action
- Progress: Every significant step
- Status: Every service
- Tests: Every run
- Handoff: Completion

## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /communication/handoffs/marketing-service-tests-complete.md << EOF
# Marketing Service Tests - RED Phase Complete

## Summary
- Start: $START_TIME
- End: $(date)
- Phase: RED (Test Writing)
- Import Errors: FIXED

## Import Error Resolution
- Previous errors: [List]
- Fixes applied: [List]
- Current status: 0 import errors

## Test Files Created
$(find src/services/marketing/__tests__ -name "*.test.ts" -exec basename {} \; | while read f; do
  count=$(grep -c "it(" "src/services/marketing/__tests__/$f")
  echo "- $f: $count tests"
done)

## Mock Inventory
- Supabase client: ✅
- Utility functions: ✅
- External services: ✅
- Service modules: ✅ (mocked as non-existent)

## Service Coverage
- ContentService: CRUD + workflow + errors
- CampaignService: Lifecycle + scheduling + targeting
- BundleService: Pricing + inventory + associations
- WorkflowService: State machine + approvals
- AnalyticsService: Metrics + aggregation

## Total Metrics
- Test Files: $FILE_COUNT
- Total Tests: $TOTAL_TESTS
- All Failing: YES (RED phase)
- Import Errors: 0

## Dependencies for GREEN Phase
Services must implement:
1. All CRUD operations tested
2. Error handling for all scenarios
3. Business logic validations
4. Async patterns consistently

## Critical Patterns
- All services use Supabase client
- Consistent error response format
- Workflow state management required
- Real-time update triggers needed

## Recommendations
- Start with ContentService (most foundational)
- Ensure consistent error handling
- Implement proper TypeScript types
- Add request validation
EOF

echo "✅ Handoff complete with import fixes and test inventory"
```

## 🚨 Common Issues & Solutions

### Issue: Cannot find module '@/services/marketing/contentService'
**Symptoms**: Import error when running tests
**Cause**: Service doesn't exist (correct for RED phase)
**Solution**:
```typescript
// Mock the non-existent service
jest.mock('../contentService', () => ({
  contentService: {
    // Mock all expected methods
  }
}));
```

### Issue: Duplicate mock registration
**Symptoms**: Jest warning about duplicate mocks
**Cause**: Mock defined multiple times
**Solution**:
```bash
# Find duplicates
grep -n "jest.mock.*supabase" $TEST_FILE
# Keep only the first one, remove others
```

### Issue: Async test timeout
**Symptoms**: Test times out after 5000ms
**Cause**: Awaiting non-mocked async function
**Solution**:
```typescript
// Ensure mock returns promise
mockFunction.mockResolvedValue(result);
// or
mockFunction.mockRejectedValue(error);
```

## 📚 Study These Examples

### Before starting, study:
1. **`src/services/inventory/__tests__`** - Working service tests
2. **`src/test/service-test-pattern (REFERENCE).md`** - Exact patterns
3. **`src/test/serviceSetup.ts`** - Mock utilities

### Key Patterns to Notice:
- Mock setup before imports
- Consistent error handling tests
- Async/await patterns
- BeforeEach cleanup

### Copy These Patterns:
```typescript
// Standard service test setup
import { createMockSupabaseClient } from '@/test/serviceSetup';

jest.mock('@/config/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

describe('Service', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
    
    // Setup default mock behavior
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    });
  });
});
```

## 🚀 REMEMBER

Your FIRST priority is fixing import errors. Then write comprehensive service tests that fail because services don't exist. This is RED phase - all tests MUST fail.

**Fix imports → Write tests → Verify failure → Commit with context**