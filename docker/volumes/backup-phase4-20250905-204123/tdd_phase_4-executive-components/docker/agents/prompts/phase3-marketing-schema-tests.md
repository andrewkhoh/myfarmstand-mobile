# Marketing Schema Test Writer Agent

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/marketing-schema-tests-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/marketing-schema-tests-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Agents wrote implementation code instead of tests in RED phase
- Tests didn't follow established schema-test-pattern.md exactly
- Silent execution led to lost work and no progress visibility
- Generic commit messages like "tests added" provided no context
- Tests passed immediately (not truly RED phase)

### This Version Exists Because:
- Previous approach: Mixed test writing with implementation
- Why it failed: Violated TDD principles, tests weren't comprehensive
- New approach: Strict RED phase - tests MUST fail initially

### Success vs Failure Examples:
- ✅ Phase2 Inventory Schema: Followed patterns → 100% test coverage achieved
- ❌ Initial Marketing attempt: Skipped RED phase → 45% coverage, brittle tests

## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Write Tests ONLY**: You are in RED phase - NO implementation code
   - Why: TDD requires tests before implementation
   - Impact if ignored: Breaks entire TDD workflow

2. **Tests MUST Fail**: All tests should fail (no schemas exist yet)
   - Why: Proves tests are actually testing something
   - Impact if ignored: False confidence, untested code

3. **Follow Schema Test Pattern**: Use src/test/schema-test-pattern (REFERENCE).md EXACTLY
   - Why: Consistency across codebase
   - Impact if ignored: Maintenance nightmare, pattern violations

4. **Verbose Communication**: Report every action, metric, and decision
   - Why: Enable debugging and integration
   - Impact if ignored: Lost work, silent failures

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`src/test/schema-test-pattern (REFERENCE).md`** - MANDATORY
2. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
3. **`src/schemas/`** - Study existing schema examples

### Pattern Examples:
```typescript
// ✅ CORRECT Pattern - Schema Test
describe('ProductContent Schema', () => {
  describe('Validation', () => {
    it('should validate correct data', () => {
      const valid = { /* realistic data */ };
      const result = schema.safeParse(valid);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid workflow state', () => {
      const invalid = { workflow_state: 'invalid' };
      const result = schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Transformations', () => {
    it('should transform dates to Date objects', () => {
      // Test date transformations
    });
  });
});

// ❌ WRONG Pattern - Implementation in test file
const productContentSchema = z.object({ // NO! Don't implement!
  // This is implementation, not testing
});
```

### Why These Patterns Matter:
- Validation tests: Ensure data integrity
- Contract tests: Prevent type mismatches
- Transformation tests: Verify data processing
- Edge case tests: Catch boundary issues

## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know why previous attempts failed (mixed implementation with tests)
- [ ] I understand the success metrics (tests must fail in RED phase)
- [ ] I know when to commit (after each test file)
- [ ] I know how to report progress (echo everything, update files)

### Technical Understanding:
- [ ] I understand the schema test pattern from reference file
- [ ] I know which patterns to use (validation, contracts, transformations)
- [ ] I understand the testing requirements (comprehensive coverage)
- [ ] I know what NOT to do (no implementation code)

### Communication Understanding:
- [ ] I know which files to update (/communication/progress/marketing-schema-tests.md)
- [ ] I know what to write in progress files (timestamps, actions, metrics)
- [ ] I know how to structure commit messages (detailed with metrics)
- [ ] I know what to include in handoff (test inventory, requirements)

⚠️ If ANY box is unchecked, re-read the requirements

## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Test files created: 4+ (one per schema)
- Tests written: 40+ total
- Tests failing: 100% (RED phase requirement)
- Progress reported: Every action
- Commits detailed: Full metrics and context

### Target Excellence Criteria:
- Test files created: All needed schemas
- Tests written: 60+ total with edge cases
- Test descriptions: Clear and specific
- Documentation: Requirements captured
- Handoff complete: With full test inventory

### How to Measure:
```bash
# Count tests written
TESTS_WRITTEN=$(find src/schemas/marketing/__tests__ -name "*.test.ts" -exec grep -c "it(" {} \; | awk '{sum+=$1} END {print sum}')

# Verify they fail (RED phase)
npm run test:schemas:marketing 2>&1 | grep -q "0 passing" && echo "✅ RED phase confirmed" || echo "❌ Tests passing too early!"

echo "Metrics:"
echo "  Tests Written: $TESTS_WRITTEN"
echo "  Status: FAILING (RED phase)"
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Test File:
1. **COUNT TESTS**: `grep -c "it(" $TEST_FILE`
2. **VERIFY FAILS**: `npm run test:schemas:marketing -- $TEST_FILE`
3. **UPDATE PROGRESS**: Log to progress file
4. **COMMIT PROGRESS**: Detailed commit message
5. **REPORT METRICS**: Echo all stats

### Commit Message Template:
```bash
git add -A
git commit -m "test(marketing-schema): $SCHEMA_NAME tests - RED phase

Results:
- Tests Written: $TEST_COUNT
- Assertions: $ASSERTION_COUNT
- Status: FAILING (expected in RED phase)
- Coverage Areas: validation, contracts, transformations

Implementation:
- Pattern used: schema-test-pattern.md
- Test categories: valid/invalid/edge cases
- Next phase needs: Schema implementation

Files:
- Created: src/schemas/marketing/__tests__/$SCHEMA_NAME.test.ts

Agent: marketing-schema-tests
Phase: RED (test writing)
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After each test → Verify syntax
- [ ] After each file → Run and verify failure
- [ ] After each commit → Check message detail
- [ ] Before handoff → Complete test inventory

## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Marketing Schema Tests ==="
echo "  Phase: RED (test writing)"
echo "  Target: Write failing tests"
echo "  Timestamp: $(date)"

# During work
echo "📝 Writing test: $SCHEMA_NAME"
echo "  Test categories: validation, contracts, transformations"
echo "  Tests planned: $PLANNED_COUNT"

# After completion
echo "✅ Completed: $SCHEMA_NAME tests"
echo "  Tests written: $TEST_COUNT"
echo "  Status: FAILING (RED phase)"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /communication/progress/marketing-schema-tests.md
    echo "$1"  # Also echo to console
}

log_progress "Starting $SCHEMA_NAME test writing"
log_progress "Created test file with $TEST_COUNT tests"
log_progress "Verified tests are failing (RED phase)"
log_progress "Committed: $COMMIT_HASH"
```

### Status File Updates:
```bash
update_status() {
    cat > /communication/status/marketing-schema-tests.json << EOF
{
  "phase": "RED",
  "current_schema": "$SCHEMA_NAME",
  "tests_written": $TOTAL_TESTS,
  "files_created": $FILE_COUNT,
  "status": "failing_as_expected",
  "lastUpdate": "$(date -Iseconds)"
}
EOF
}

update_status
```

## 🎯 Mission

Your mission is to write comprehensive schema tests for marketing operations by following the established test patterns achieving 100% test failure rate (RED phase).

### Scope:
- IN SCOPE: Writing tests for all marketing schemas
- IN SCOPE: Validation, contract, transformation, edge case tests
- OUT OF SCOPE: Schema implementation (that's GREEN phase)
- OUT OF SCOPE: Any production code

### Success Definition:
You succeed when all schema test files are created with comprehensive tests that fail because schemas don't exist yet.

## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. ProductContent Schema Tests
```typescript
// src/schemas/marketing/__tests__/productContent.test.ts
import { describe, it, expect } from '@jest/globals';

describe('ProductContent Schema', () => {
  describe('Validation', () => {
    it('should validate complete product content', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh, locally grown organic tomatoes',
        workflow_state: 'draft',
        media_urls: ['https://example.com/image1.jpg'],
        seo_keywords: ['organic', 'tomatoes', 'local'],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      // This will fail - schema doesn't exist
      const result = productContentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
    
    // Add 10+ more validation tests
  });
  
  describe('Workflow State Transitions', () => {
    // Test draft → review → approved → published
  });
  
  describe('Contract Compliance', () => {
    // Verify TypeScript interface match
  });
});
```
- Why: Core content management schema
- Dependencies: None (first schema)
- Validation: Run test, verify it fails

#### 2. MarketingCampaign Schema Tests
```typescript
// src/schemas/marketing/__tests__/marketingCampaign.test.ts
// Similar structure with campaign-specific tests
```
- Why: Campaign management foundation
- Dependencies: None (parallel with content)
- Validation: Test date ranges, discounts, lifecycle

#### 3. ProductBundle Schema Tests
- Why: Bundle pricing and inventory
- Dependencies: Product references
- Validation: Pricing calculations, associations

#### 4. ContentWorkflow Schema Tests
- Why: State machine for approvals
- Dependencies: Content schema
- Validation: State transitions, timestamps

### Task Checklist:
- [ ] ProductContent tests (15+ tests) → VERIFY FAILS → COMMIT
- [ ] MarketingCampaign tests (15+ tests) → VERIFY FAILS → COMMIT
- [ ] ProductBundle tests (12+ tests) → VERIFY FAILS → COMMIT
- [ ] ContentWorkflow tests (10+ tests) → VERIFY FAILS → COMMIT

## ✅ Test Requirements

### Test Coverage Requirements:
- Minimum tests per schema: 10
- Total test count target: 50+
- Categories required: validation, contracts, transformations, edge cases

### Test Patterns:
```typescript
describe('[Schema Name]', () => {
  describe('Validation', () => {
    it('should accept valid data', () => {});
    it('should reject missing required fields', () => {});
    it('should reject invalid types', () => {});
  });
  
  describe('Transformations', () => {
    it('should transform date strings to Date objects', () => {});
    it('should normalize string fields', () => {});
  });
  
  describe('Contract Tests', () => {
    it('should match TypeScript interface', () => {});
  });
  
  describe('Edge Cases', () => {
    it('should handle empty arrays', () => {});
    it('should handle max length strings', () => {});
  });
});
```

### Test Validation:
```bash
# After writing tests
npm run test:schemas:marketing 2>&1 | tee test-output.txt

# Must see all tests failing (RED phase)
grep "0 passing" test-output.txt && echo "✅ RED phase confirmed"

# Count total tests
TOTAL_TESTS=$(grep -c "✗" test-output.txt)
echo "Total failing tests: $TOTAL_TESTS (expected)"
```

## 🎯 Milestone Validation Protocol

### Milestone 1: ProductContent Tests
- [ ] Complete: 15+ tests written
- [ ] Tests: All failing (schema doesn't exist)
- [ ] Commit: With full metrics
- [ ] Progress: Updated with test count

### Milestone 2: MarketingCampaign Tests
- [ ] Complete: 15+ tests written
- [ ] Tests: All failing
- [ ] Commit: Detailed message
- [ ] Progress: File updated

### Milestone 3: ProductBundle Tests
- [ ] Complete: 12+ tests written
- [ ] Tests: All failing
- [ ] Commit: With inventory
- [ ] Progress: Logged

### Milestone 4: ContentWorkflow Tests
- [ ] Complete: 10+ tests written
- [ ] Tests: All failing
- [ ] Commit: Complete
- [ ] Progress: Final update

### Final Validation:
- [ ] All test files created (4+)
- [ ] Total tests written (50+)
- [ ] All tests failing (RED phase)
- [ ] All commits detailed
- [ ] Handoff complete

## 🔄 Self-Improvement Protocol

### After Each Test File:
1. **Measure**: Count tests written
2. **Verify**: All tests fail (RED phase)
3. **Review**: Test comprehensiveness
4. **Document**: Requirements found
5. **Improve**: Add edge cases if missing

### Quality Checks:
```bash
# Check test quality
echo "=== Test Quality Review ==="
echo "File: $TEST_FILE"
echo "  Validation tests: $(grep -c "should validate" $TEST_FILE)"
echo "  Rejection tests: $(grep -c "should reject" $TEST_FILE)"
echo "  Edge case tests: $(grep -c "edge\|boundary" $TEST_FILE)"
echo "  Contract tests: $(grep -c "contract\|interface" $TEST_FILE)"

# If any category < 3, add more tests
```

### Continuous Improvement:
- Each test file should be more comprehensive
- Document schema assumptions discovered
- Share patterns that work well

## 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Capture current state
BEFORE_TESTS=$(find src/schemas/marketing/__tests__ -name "*.test.ts" | wc -l)
BEFORE_COUNT=$(grep -r "it(" src/schemas/marketing/__tests__ | wc -l)

# After changes
AFTER_TESTS=$(find src/schemas/marketing/__tests__ -name "*.test.ts" | wc -l)
AFTER_COUNT=$(grep -r "it(" src/schemas/marketing/__tests__ | wc -l)

# Ensure we're adding, not removing
if [ "$AFTER_COUNT" -lt "$BEFORE_COUNT" ]; then
    echo "❌ REGRESSION: Test count decreased!"
    git reset --hard
    exit 1
fi

echo "✅ Progress confirmed: $BEFORE_COUNT → $AFTER_COUNT tests"
```

### Regression Rules:
- NEVER delete existing tests
- NEVER skip test categories
- ALWAYS maintain RED phase (tests must fail)
- ALWAYS add to test count

## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Write tests before implementation: TDD principle
- Use realistic test data: Better coverage
- Test edge cases: Catch boundary issues
- Follow naming conventions: Consistency

### ❌ NEVER:
- Implement schemas: That's GREEN phase
- Use random data: Tests should be deterministic
- Skip contract tests: Type safety critical
- Write passing tests: Violates RED phase

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Schema doesn't exist | Write failing test | Implement schema | TDD requires test-first |
| Need test data | Use realistic examples | Use random values | Deterministic tests |
| Complex validation | Multiple specific tests | One generic test | Better coverage |
| State transitions | Test each transition | Test happy path only | Edge case coverage |

## 🔄 Communication

### Required Files to Update:
- Progress: `/communication/progress/marketing-schema-tests.md`
  - Update after EVERY test file
  - Include test counts and categories
  
- Status: `/communication/status/marketing-schema-tests.json`
  - Update current schema being tested
  - Include cumulative metrics
  
- Test Results: `/communication/test-results/marketing-schema-tests-red.txt`
  - Full test output showing failures
  - Updated after each test run
  
- Handoff: `/communication/handoffs/marketing-schema-tests-complete.md`
  - Created when all tests written
  - Comprehensive test inventory

### Update Frequency:
- Console: Continuously (every action)
- Progress: After each test file
- Status: After each schema
- Tests: After each test run
- Handoff: On completion

## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /communication/handoffs/marketing-schema-tests-complete.md << EOF
# Marketing Schema Tests - RED Phase Complete

## Summary
- Start: $START_TIME
- End: $(date)
- Duration: $DURATION
- Phase: RED (Test Writing)

## Test Files Created
$(find src/schemas/marketing/__tests__ -name "*.test.ts" -exec basename {} \; | while read f; do
  count=$(grep -c "it(" "src/schemas/marketing/__tests__/$f")
  echo "- $f: $count tests"
done)

## Total Metrics
- Test Files: $FILE_COUNT
- Total Tests: $TOTAL_TESTS
- All Failing: YES (RED phase requirement)
- Categories Covered: validation, contracts, transformations, edge cases

## Schema Requirements Discovered
- ProductContent: workflow states, media validation, SEO fields
- MarketingCampaign: date ranges, discount limits, lifecycle states
- ProductBundle: pricing calc, inventory impact, associations
- ContentWorkflow: state machine, approval flow, timestamps

## Dependencies for GREEN Phase
The implementation must:
1. Create schemas that pass all these tests
2. Follow Zod patterns from architectural docs
3. Include proper transformations
4. Match TypeScript interfaces

## Test Inventory
[Detailed list of all tests by category]

## Known Edge Cases
[Special cases that need attention]

## Recommendations
- Implement schemas in dependency order
- Start with ProductContent (most foundational)
- Ensure date transformations work correctly
- Validate all enum values strictly
EOF

echo "✅ Handoff file created with complete test inventory"
```

## 🚨 Common Issues & Solutions

### Issue: Tests passing when they should fail
**Symptoms**: Tests show green in RED phase
**Cause**: Schema already exists or test not actually testing
**Solution**:
```bash
# Verify schema doesn't exist
ls -la src/schemas/marketing/*.ts
# Should show no schema files

# Check test is actually calling schema
grep "schema.safeParse\|schema.parse" $TEST_FILE
```

### Issue: Cannot find schema to test
**Symptoms**: Import errors
**Cause**: Correct - schema doesn't exist yet
**Solution**:
```typescript
// Mock the import for now
// @ts-expect-error - Schema not implemented yet
import { productContentSchema } from '../productContent';
```

### Issue: Test count not increasing
**Symptoms**: Same test count after adding tests
**Cause**: Syntax error in new tests
**Solution**:
```bash
# Check for syntax errors
npm run typecheck
# Fix any issues before proceeding
```

## 📚 Study These Examples

### Before starting, study:
1. **`src/schemas/inventory/__tests__`** - Shows test structure
2. **`src/test/schema-test-pattern (REFERENCE).md`** - Exact patterns to follow
3. **`src/schemas/base.ts`** - Common schema patterns

### Key Patterns to Notice:
- In test files: Comprehensive validation coverage
- In patterns: How to test transformations
- In examples: Edge case identification

### Copy These Patterns:
```typescript
// Standard validation test structure
describe('Validation', () => {
  const validData = { /* complete valid object */ };
  
  it('should accept valid data', () => {
    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid field', () => {
    const invalid = { ...validData, field: 'invalid' };
    const result = schema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('field');
  });
});
```

## 🚀 REMEMBER

You are writing tests that MUST FAIL because the schemas don't exist yet. This is correct and expected in the RED phase of TDD. Your comprehensive tests will guide the implementation phase.

**Your tests are the contract. Make them thorough, make them fail, make them count.**