# 🤖 Multi-Agent Prompt Guidelines
*Essential requirements for creating effective and honest AI agent prompts*

## Table of Contents
1. [Core Principles](#core-principles)
2. [Mandatory Requirements](#mandatory-requirements)
3. [Test Infrastructure Enforcement](#test-infrastructure-enforcement)
4. [Architectural Compliance](#architectural-compliance)
5. [Continuous Validation](#continuous-validation)
6. [Honest Reporting](#honest-reporting)
7. [Integration & Quality Gates](#integration--quality-gates)
8. [Prompt Template](#prompt-template)

## Core Principles

### 1. **Truth Over Claims**
Agents must report ACTUAL results, not aspirational ones. If tests are failing at 60%, they must report 60% and work to fix it, not claim success.

### 2. **Pattern Compliance Over Innovation**
Following established patterns leads to 100% success. Creating new patterns leads to 42% failure. Agents must COPY successful patterns, not innovate.

### 3. **Continuous Validation**
After EVERY major task, agents must test, verify, and commit. No moving forward with regressions.

### 4. **Architectural Guidelines Are Law**
`docs/architectural-patterns-and-best-practices.md` is not optional reading - it's mandatory. Every implementation must reference and follow these patterns.

## Mandatory Requirements

### Every Agent Prompt MUST Include:

```markdown
## 🚨 CRITICAL REQUIREMENTS

1. **Architectural Compliance**
   - READ: `docs/architectural-patterns-and-best-practices.md` BEFORE any code
   - FOLLOW: Every pattern exactly as documented
   - REFERENCE: Add comments showing which pattern you're following
   - NEVER: Optimize or innovate on established patterns

2. **Test Infrastructure**
   - USE: SimplifiedSupabaseMock for ALL service tests
   - USE: renderHookWithRealQuery for ALL hook tests
   - COPY: Successful test patterns from existing tests
   - NEVER: Create manual mocks or use jest.mock()

3. **Continuous Validation**
   - TEST: After every component implementation
   - VERIFY: Pass rate ≥85% before proceeding
   - COMMIT: Only when tests actually pass
   - FIX: Immediately if regression detected

4. **Honest Reporting**
   - REPORT: Actual numbers (e.g., "7/10 tests passing = 70%")
   - NEVER: Claim success with failing tests
   - RETRY: Until minimum targets actually met
   - DOCUMENT: All failures and fixes in progress logs
```

## Test Infrastructure Enforcement

### Successful Patterns to Follow (100% Success Rate)

```typescript
// ✅ CORRECT - SimplifiedSupabaseMock Pattern
import { SimplifiedSupabaseMock } from '../test/serviceSetup';

describe('ServiceName', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  
  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
  });
});
```

### Failed Patterns to Avoid (42% Failure Rate)

```typescript
// ❌ FORBIDDEN - Manual Mock Creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

// ❌ FORBIDDEN - Manual Mock Objects
const mockSupabase = { from: jest.fn() };
```

### Required Test References

Agents must study these files BEFORE writing any code:
- `src/services/__tests__/cartService.test.ts` - Service testing pattern
- `src/hooks/__tests__/useCart.test.tsx` - Hook testing pattern
- `src/test/serviceSetup.ts` - SimplifiedSupabaseMock implementation
- `src/test/race-condition-setup.ts` - Real React Query setup

## Architectural Compliance

### Pattern Compliance Protocol

```typescript
// Before EVERY implementation:

// 1. CHECK: Does architectural doc have a pattern for this?
// Read: docs/architectural-patterns-and-best-practices.md

// 2. FIND: Locate the exact pattern section
// Example: "Service Layer Patterns" → "Validation Pipeline"

// 3. COPY: Use the EXACT pattern shown
// Don't modify, don't optimize, don't innovate

// 4. REFERENCE: Add comment showing which pattern
/**
 * Following Pattern: Service Validation Pipeline
 * Reference: docs/architectural-patterns-and-best-practices.md#validation-pipeline
 * Reason: Individual item validation enables resilience
 */
```

### Key Patterns to Enforce

1. **Validation Pipeline**: Individual item validation with skip-on-error
2. **Query Key Factory**: Centralized factory, no manual keys
3. **Error Handling**: Graceful degradation with user-friendly messages
4. **State Management**: User-isolated caches with smart invalidation
5. **Security**: Defense in depth, fail secure by default

## Continuous Validation

### Milestone Validation Protocol

```bash
# After EACH major component:

# 1. Run tests
npm run test:services  # or test:hooks, test:screens

# 2. Extract pass rate
PASS_RATE=$(calculate_pass_rate)

# 3. Retry loop if below target
while [ $PASS_RATE -lt 85 ]; do
  echo "Current: $PASS_RATE% - Fixing failures..."
  # Fix failing tests
  npm run test:services
  PASS_RATE=$(calculate_pass_rate)
done

# 4. Commit only when successful
git add -A
git commit -m "feat: [Component] - $PASS_RATE% tests passing

- SimplifiedSupabaseMock: ✓
- Pattern compliance: 100%
- Architectural reference: docs/architectural-patterns-and-best-practices.md"
```

### Regression Handling

```markdown
## 🚨 REGRESSION PROTOCOL

If ANY test that was passing starts failing:
1. **STOP** all new work immediately
2. **IDENTIFY** what caused the regression
3. **FIX** the regression before any new code
4. **VERIFY** all tests pass again
5. **DOCUMENT** the fix in commit message
6. **ONLY THEN** proceed with new work

NEVER proceed with broken tests!
```

## Honest Reporting

### Progress Reporting Requirements

```markdown
## Progress Updates Must Include:

1. **Actual Test Results**
   - "15/20 tests passing (75%)" ✅
   - "All tests passing" (when 5 are failing) ❌

2. **Pattern Compliance Status**
   - "Using SimplifiedSupabaseMock: Yes" ✅
   - "Created custom mock solution" ❌

3. **Regression Status**
   - "No regressions detected" ✅
   - "3 tests now failing that were passing" (must fix!)

4. **Blockers**
   - Document ANY issue preventing 85% pass rate
   - Include specific error messages
   - Request help if truly blocked
```

### Final Completion Requirements

```bash
# Only claim completion when ALL of these are TRUE:

✅ Test pass rate ≥85% (ACTUAL, verified)
✅ SimplifiedSupabaseMock used for ALL service tests
✅ renderHookWithRealQuery used for ALL hook tests
✅ Zero manual mocks or jest.mock() in code
✅ Architectural patterns followed 100%
✅ All regressions fixed
✅ Git commits after each milestone
✅ Documentation references architecture guide
```

## Integration & Quality Gates

### Integration Agent Requirements

The integration/final agent must be configured as a strict quality gate:

```markdown
## 🔴 INTEGRATION AGENT RESPONSIBILITIES

1. **VERIFY Don't Trust**
   - Re-run ALL tests independently
   - Compare actual vs claimed results
   - Reject if actual < claimed

2. **Pattern Compliance Audit**
   - grep for jest.mock() → FAIL if found
   - grep for SimplifiedSupabaseMock → FAIL if not found
   - grep for manual mocks → FAIL if found

3. **Architecture Compliance Check**
   - Verify references to architectural docs
   - Check validation pipeline implementation
   - Confirm query key factory usage
   - Validate error handling patterns

4. **Rejection Criteria** (Automatic Failure)
   - Pass rate <85% despite claims
   - Manual mocks found
   - Pattern violations detected
   - No architectural references
   - Regressions not fixed
```

## Prompt Template

### Standard Agent Prompt Structure

```markdown
# [Agent Name] - [Project Phase]

$TEST_INFRASTRUCTURE_HEADER  # Include mandatory requirements

## 🎯 Mission
[Clear description of what agent must accomplish]

## 🔴 STOP - MANDATORY READING
1. `docs/architectural-patterns-and-best-practices.md` - Architectural patterns
2. `src/services/__tests__/cartService.test.ts` - Service test pattern
3. `src/hooks/__tests__/useCart.test.tsx` - Hook test pattern
4. `src/test/serviceSetup.ts` - SimplifiedSupabaseMock

## 📋 Implementation Tasks (TDD Required)
1. Task 1 - Write tests FIRST using established patterns
2. Task 2 - Implement to pass tests
3. Task 3 - Validate ≥85% pass rate

## 🎯 Milestone Checkpoints
- [ ] Milestone 1: [Component] (X tests, ≥85% pass) → TEST → COMMIT
- [ ] Milestone 2: [Component] (Y tests, ≥85% pass) → TEST → COMMIT
- [ ] Final: All complete (Z tests, ≥85% pass) → TEST → FINAL COMMIT

## ✅ Success Criteria (MUST BE REAL)
- [ ] X+ tests with ≥85% ACTUAL pass rate
- [ ] SimplifiedSupabaseMock for ALL services
- [ ] renderHookWithRealQuery for ALL hooks
- [ ] Zero manual mocks or jest.mock()
- [ ] Architecture patterns followed 100%
- [ ] Git commits after each milestone

## ❌ Failure Conditions
- Creating new test patterns
- Pass rate <85%
- Manual mocks found
- Claiming false success
- Ignoring architectural patterns

## 🔄 Communication
- Progress: /shared/progress/[agent].md (with REAL numbers)
- Blockers: /shared/blockers/[agent]-blockers.md
- Completion: /shared/handoffs/[agent]-complete.md

Remember: Report REAL results. Fix until you ACTUALLY achieve targets!
```

## Summary

Successful multi-agent prompts enforce:

1. **Honesty**: Real results, not claims
2. **Patterns**: Follow existing successful patterns exactly
3. **Architecture**: Treat architectural docs as law
4. **Testing**: Continuous validation with retry loops
5. **Quality**: Integration agent as strict gatekeeper
6. **Documentation**: Reference patterns in code
7. **Persistence**: Retry until actual success achieved

These guidelines ensure agents produce high-quality, maintainable code that actually works, rather than claiming success while leaving technical debt and bugs.

---

*Based on lessons learned from real agent implementations where following patterns led to 100% success while ignoring them led to 42% failure.*