# TDD Phase 3B: Marketing Schema Agent

## 1. Agent Identification
**Agent ID**: marketing-schema  
**Layer**: Schema/Data Models
**Phase**: TDD Phase 3B - Combined RED/GREEN/REFACTOR
**Target**: 85% test pass rate

## 2. Feedback Check
**Before every action**, check for:
- `/communication/feedback/marketing-schema-feedback.md`
- Adjust approach based on feedback before proceeding

## 3. Historical Context
**Previous Phase 3 Attempts**:
- Phase 3 separated test writers and implementers - caused workspace issues
- Phase 3B combines both in single agent for complete ownership
- Existing work may have partial tests/implementation
- Focus on test pass rate, not starting from scratch

## 4. Requirements & Scope
**From PHASE3-TDD-IMPLEMENTATION-PLAN.md**:
- Schema layer: ~30/37 tests may exist
- Missing 7 contract tests for:
  - ProductContent workflow state transitions
  - MarketingCampaign lifecycle validation
  - ProductBundle pricing calculations
- May have existing implementation with failing tests

**Success Metric**: 85% test pass rate (32/37 tests passing)

## 5. Technical Patterns

### Database-First Validation Pattern
```typescript
// ✅ CORRECT: Database-first with transform
export const productContentTransform = productContentSchema.transform((data) => ({
  ...data,
  imageUrls: data.imageUrls || [],
  seoKeywords: data.seoKeywords || [],
  lastModified: new Date(data.lastModified)
})) satisfies z.ZodType<ProductContent>;
```

### Contract Testing Pattern
```typescript
// ✅ CORRECT: Contract test with compile-time verification
describe('ProductContent Contract Tests', () => {
  it('should enforce workflow state transitions at compile time', () => {
    type ValidTransition = 
      | { from: 'draft'; to: 'review' }
      | { from: 'review'; to: 'approved' | 'draft' }
      | { from: 'approved'; to: 'published' | 'draft' };
    
    // This should cause TypeScript error if invalid
    const invalid: ValidTransition = { from: 'published', to: 'review' }; // ❌ TS Error
  });
});
```

## 6. Communication Templates

### Progress Update (Every 30 mins)
```markdown
## 🔄 Marketing Schema Progress Update

**Current Cycle**: [1/2]
**Test Status**: [25/37] tests passing (67.5%)
**Active Task**: Implementing ProductBundle pricing validation

### ✅ Completed This Cycle
- Fixed 5 ProductContent workflow tests
- Added missing transform schemas
- Resolved TypeScript contract violations

### 🚧 In Progress
- ProductBundle pricing calculation tests
- Inventory impact validation

### ⏭️ Next Steps
- Complete remaining 2 contract tests
- Fix MarketingCampaign lifecycle validation

**Blockers**: None
**ETA to 85% target**: 45 minutes
```

### Commit Message Format
```bash
# TDD cycle commits
git commit -m "test(marketing-schema): RED phase - Add 7 missing contract tests

- ProductContent workflow state transition tests (3)
- MarketingCampaign lifecycle validation tests (2)  
- ProductBundle pricing calculation tests (2)

Test Status: 30/37 passing (81%)
Target: 85% (32/37)
Phase: RED → GREEN transition"
```

## 7. Test Implementation Checklist

### Phase 1: AUDIT (First 30 mins)
```bash
# 1. Assess current state
npm run test:schemas:marketing 2>&1 | tee initial-test-run.log

# 2. Document findings
echo "## Schema Test Audit
- Tests Found: $(find src/schemas/marketing -name "*.test.ts" | wc -l)
- Tests Passing: X/Y
- Coverage: X%
- Missing Tests: [list]
" > /communication/progress/marketing-schema.md

# 3. Identify gaps
grep -r "describe\|it\|test" src/schemas/marketing/__tests__/
```

### Phase 2: RED (Add missing tests)
```typescript
// src/schemas/marketing/__contracts__/productContent.contracts.test.ts

describe('ProductContent Workflow Contract', () => {
  // Test 1: Draft → Review transition
  it('should enforce draft to review transition', () => {
    const draftContent = createProductContent({ workflowState: 'draft' });
    const transition = validateTransition(draftContent, 'review');
    expect(transition.valid).toBe(true);
  });

  // Test 2: Published state is terminal
  it('should prevent transitions from published state', () => {
    const publishedContent = createProductContent({ workflowState: 'published' });
    const transition = validateTransition(publishedContent, 'draft');
    expect(transition.valid).toBe(false);
    expect(transition.error).toMatch(/Cannot transition from published/);
  });
});
```

### Phase 3: GREEN (Make tests pass)
```typescript
// src/schemas/marketing/productContent.schema.ts

export const workflowTransitions = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['published', 'draft'],
  published: [] // Terminal state
} as const;

export function validateTransition(
  content: ProductContent,
  targetState: WorkflowState
): ValidationResult {
  const allowedTransitions = workflowTransitions[content.workflowState];
  
  if (!allowedTransitions.includes(targetState)) {
    return {
      valid: false,
      error: `Cannot transition from ${content.workflowState} to ${targetState}`
    };
  }
  
  return { valid: true };
}
```

## 8. Workspace Management
```bash
# Your dedicated workspace
WORKSPACE="/workspace"
BRANCH="tdd_phase_3b-marketing-schema"

# Initial setup
cd $WORKSPACE
git checkout -b $BRANCH

# Regular saves
git add -A
git commit -m "wip: marketing-schema - $(date +%H:%M)"
```

## 9. Error Recovery Procedures

### Test Failure Recovery
```bash
# Capture detailed error
npm run test:schemas:marketing -- --verbose 2>&1 | tee test-error.log

# Analyze TypeScript errors
npx tsc --noEmit 2>&1 | grep -A5 "error TS"

# Document in communication
echo "## ❌ Test Failure Analysis
**Test**: ProductBundle pricing calculation
**Error**: Type 'number | undefined' is not assignable to type 'number'
**Root Cause**: Missing null check in transform schema
**Fix Applied**: Added nullish coalescing with default value
" >> /communication/progress/marketing-schema.md
```

## 10. Dependencies & Integration Points

### Internal Dependencies
- `src/types/marketing.types.ts` - Core type definitions
- `src/utils/validation/` - Shared validation utilities
- `src/schemas/base/` - Base schema patterns

### External Integration
- No external service dependencies for schema layer
- Must maintain compatibility with service layer expectations

## 11. File Creation Strategy

### Required Files (Check existence first)
```bash
# Contract tests
src/schemas/marketing/__contracts__/
  ├── productContent.contracts.test.ts
  ├── marketingCampaign.contracts.test.ts
  └── productBundle.contracts.test.ts

# Transform schemas  
src/schemas/marketing/transforms/
  ├── productContent.transform.ts
  ├── marketingCampaign.transform.ts
  └── productBundle.transform.ts
```

## 12. Validation Rules

### Schema Validation Checklist
- [ ] All schemas have `.transform()` with explicit return types
- [ ] Database fields handle null/undefined appropriately
- [ ] Dates are properly parsed from strings
- [ ] Arrays have default empty array fallbacks
- [ ] Enums match database constraints exactly
- [ ] Nested objects use `.strict()` for extra field detection

## 13. Performance Considerations

### Schema Optimization
```typescript
// ✅ Parse once, use everywhere
const parsedContent = productContentTransform.parse(rawData);

// ❌ Avoid repeated parsing
function processContent(data: unknown) {
  const parsed = schema.parse(data); // Don't parse in loops
}
```

## 14. Security Patterns

### Input Sanitization
```typescript
// Always sanitize user-generated content
export const contentSchema = z.object({
  description: z.string()
    .transform(val => DOMPurify.sanitize(val))
    .refine(val => val.length > 0, "Description required after sanitization"),
  userContent: z.string()
    .transform(val => sanitizeHtml(val, { allowedTags: ['p', 'br', 'strong', 'em'] }))
});
```

## 15. Testing Execution Commands
```bash
# Run with coverage
npm run test:schemas:marketing -- --coverage

# Watch mode during development
npm run test:schemas:marketing -- --watch

# Run specific test file
npm run test:schemas:marketing -- productContent.contracts.test.ts

# Debug mode
node --inspect-brk ./node_modules/.bin/jest --runInBand --config jest.config.schemas.js
```

## 16. Rollback Procedures
```bash
# If tests break catastrophically
git stash
git checkout origin/main -- src/schemas/marketing/
npm run test:schemas:marketing  # Verify baseline

# Then reapply changes incrementally
git stash pop
git add -p  # Selective staging
```

## 17. Success Criteria

### Completion Checklist
- [ ] 85% test pass rate achieved (32/37 tests)
- [ ] All TypeScript compilation errors resolved
- [ ] Contract tests provide compile-time safety
- [ ] Transform schemas have explicit return types
- [ ] No console errors or warnings
- [ ] Documentation updated in `/communication/handoffs/`

### Final Handoff Document
```markdown
# Marketing Schema Layer - Handoff

## Final Status
- **Test Pass Rate**: 86.5% (32/37 tests passing)
- **Coverage**: 92%
- **TypeScript**: Zero errors

## Completed Work
1. Added 7 missing contract tests
2. Implemented workflow state transitions
3. Fixed pricing calculation validation
4. Added transform schemas with proper types

## Known Issues
- 5 tests skipped pending service layer integration
- Bundle discount calculation needs business rule clarification

## Next Agent Dependencies
- marketing-services needs updated schema exports
- marketing-hooks can now use type-safe schemas
```

## 18. Communication Protocols

### Status Updates (Every 15 mins)
```bash
echo "{
  \"agent\": \"marketing-schema\",
  \"cycle\": $CYCLE,
  \"testsPass\": $PASS,
  \"testsFail\": $FAIL,
  \"testPassRate\": $RATE,
  \"status\": \"active\",
  \"lastUpdate\": \"$(date -Iseconds)\"
}" > /communication/status/marketing-schema.json
```

### Handoff When Complete
```bash
# Create handoff document
cat > /communication/handoffs/marketing-schema-complete.md << EOF
# Marketing Schema Complete

**Agent**: marketing-schema
**Final Pass Rate**: $FINAL_RATE%
**Tests**: $PASS/$TOTAL passing

## Summary
Successfully achieved ${FINAL_RATE}% test pass rate.
All contract tests implemented and passing.
TypeScript compilation clean.

## Files Modified
$(git diff --name-only origin/main)

## Ready For
- marketing-services (can use updated schemas)
- marketing-hooks (type-safe schema imports)
EOF
```

## 19. Final Notes

### Key Reminders
1. **Test pass rate is the primary metric** - not coverage or line count
2. **Audit first** - Don't duplicate existing work
3. **Incremental commits** - Save progress frequently
4. **Communicate verbosely** - Over-communicate rather than under
5. **Pattern compliance** - Follow established patterns exactly

### TDD Cycle Discipline
```
AUDIT → Understand current state
RED → Write/fix failing tests  
GREEN → Minimal code to pass
REFACTOR → Only after green
COMMIT → Document thoroughly
```

Remember: The goal is 85% test pass rate. Whether tests existed before or implementation was partial doesn't matter - focus on making tests pass.