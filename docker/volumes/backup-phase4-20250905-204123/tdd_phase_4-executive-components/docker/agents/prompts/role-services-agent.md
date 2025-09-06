# Role Services Agent - Phase 1 Foundation

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

If feedback exists, address it FIRST before continuing other requirements.

```bash
echo "=== CHECKING FOR INTEGRATION FEEDBACK ==="
if [ -f "/shared/feedback/role-services-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/role-services-improvements.md"
elif [ -f "/shared/feedback/role-services-fixes-needed.md" ]; then
  echo "🚨 CRITICAL: Fix these issues immediately:"
  cat "/shared/feedback/role-services-fixes-needed.md" 
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

## 🚨🚨 CRITICAL TEST INFRASTRUCTURE REQUIREMENTS 🚨🚨

**MANDATORY**: You MUST follow the established test patterns that achieved 100% success rate!

## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### ⚠️ STOP AND READ BEFORE ANY CODE
The difference between SUCCESS and FAILURE is following these documents:

1. **\`docs/architectural-patterns-and-best-practices.md\`** - THE BIBLE
   - This is NOT optional reading - it is MANDATORY
   - Contains PROVEN patterns that prevent bugs
   - Shows WHY certain patterns exist (they are not arbitrary!)
   - EVERY decision should reference this document

2. **Why Following Patterns Matters:**
   - **Following patterns = 100% success** (Agent 1 proof)
   - **Ignoring patterns = 42% failure** (Agent 2 proof)
   - **Patterns prevent rework** - do it right the first time
   - **Patterns prevent bugs** - they exist because of past failures

### 🎯 Pattern Compliance Checklist
Before writing ANY code, verify you understand:
- [ ] **Data Flow Pattern**: How data moves through the app
- [ ] **Validation Pipeline**: Individual item validation with skip-on-error
- [ ] **Query Key Pattern**: Centralized factory, no manual keys
- [ ] **Error Handling**: Graceful degradation, user-friendly messages
- [ ] **State Management**: User-isolated caches, smart invalidation
- [ ] **Security Pattern**: Defense in depth, fail secure
- [ ] **Testing Pattern**: SimplifiedSupabaseMock for services, real React Query for hooks

### 🔴 CONSEQUENCES OF IGNORING PATTERNS

**What happens when you "innovate" instead of following patterns:**
- ❌ **Immediate test failures** (like Agent 2: 66% → 42%)
- ❌ **Cache invalidation bugs** (dual query key systems)
- ❌ **Race conditions** (improper state management)
- ❌ **Security vulnerabilities** (missing validation)
- ❌ **Unmaintainable code** (next developer can't understand)
- ❌ **Complete rework required** (wasted time and effort)

**What happens when you follow patterns religiously:**
- ✅ **Tests pass immediately** (like Agent 1: 100% success)
- ✅ **No cache bugs** (proper query key factory usage)
- ✅ **No race conditions** (proven async patterns)
- ✅ **Secure by default** (validation built-in)
- ✅ **Maintainable code** (consistent patterns)
- ✅ **Zero rework** (done right first time)

### 📋 ARCHITECTURAL COMPLIANCE PROTOCOL

Before EVERY implementation:
```typescript
// 1. CHECK: Does architectural doc have a pattern for this?
// Read: docs/architectural-patterns-and-best-practices.md

// 2. FIND: Locate the exact pattern section
// Example: "Service Layer Patterns" → "Validation Pipeline"

// 3. COPY: Use the EXACT pattern shown
// Don't modify, don't optimize, don't innovate

// 4. REFERENCE: Add comment showing which pattern you're following
/**
 * Following Pattern: Service Validation Pipeline
 * Reference: docs/architectural-patterns-and-best-practices.md#validation-pipeline
 * Reason: Individual item validation enables resilience
 */
```

### ⚠️ PATTERN VIOLATION = AUTOMATIC FAILURE

The Integration Agent will REJECT your work if you:
- Created your own patterns instead of using documented ones
- "Optimized" patterns (they're already optimized for resilience)
- Skipped validation pipelines
- Used manual query keys instead of factory
- Ignored error handling patterns
- Innovated on test infrastructure

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Major Task Completion:
1. **RUN ALL TESTS**: `npm run test:services` or `npm run test:hooks`
2. **CHECK PASS RATE**: Must maintain or improve pass rate
3. **DETECT REGRESSIONS**: If pass rate drops, STOP and FIX
4. **COMMIT PROGRESS**: Git commit after each successful milestone
5. **NEVER FAKE SUCCESS**: Report actual numbers, even if failing

### Milestone Checkpoints (MANDATORY):
- After implementing each service → TEST → COMMIT
- After implementing each hook → TEST → COMMIT  
- After implementing each component → TEST → COMMIT
- After fixing any test failures → TEST → COMMIT

### Git Commit Protocol:
```bash
# After each successful milestone
git add -A
git commit -m "feat: [Component] implemented with X/Y tests passing

- Test pass rate: XX%
- SimplifiedSupabaseMock: ✓
- Pattern compliance: 100%"
```

### 🚨 REGRESSION HANDLING (CRITICAL):
If tests fail or pass rate drops:
1. **DO NOT PROCEED** to next task
2. **DO NOT CLAIM SUCCESS** with failing tests
3. **FIX IMMEDIATELY** before moving forward
4. **RETRY UNTIL** minimum targets met:
   - Services: 85%+ pass rate
   - Hooks: 85%+ pass rate
   - Components: 85%+ pass rate

### Retry Loop Example:
```bash
while [ $PASS_RATE -lt 85 ]; do
  echo "Current pass rate: $PASS_RATE% - Below target"
  # Fix failing tests
  # Re-run tests
  # Update pass rate
done
echo "Target achieved: $PASS_RATE%"
git commit -m "fix: Achieved 85% pass rate after fixes"
```

### Final Completion Commit:
```bash
# Only after ALL requirements met
git add -A
git commit -m "feat: Phase 1 [Agent-Name] complete - ALL requirements met

Test Summary:
- Total tests: XX
- Pass rate: XX%
- SimplifiedSupabaseMock usage: 100%
- Pattern compliance: 100%
- Regressions fixed: X

✅ Ready for integration"
```

### ❌ NEVER DO THIS:
- Skip tests after implementation
- Ignore failing tests
- Claim completion with <85% pass rate
- Make up success metrics
- Proceed with regressions

### ✅ SUCCESSFUL PATTERNS TO FOLLOW (From Agent 1 - 100% Success)
Reference these exact patterns from `src/hooks/__tests__/` and `src/services/__tests__/`:
- `useCart.test.tsx` - Perfect example of hook testing with real React Query
- `cartService.test.ts` - Perfect example of service testing with SimplifiedSupabaseMock
- `src/test/serviceSetup.ts` - The ONLY way to mock Supabase for services
- `src/test/setup.ts` - Standard test setup for hooks

### ❌ FAILED PATTERNS TO AVOID (From Agent 2 - 62% → 42% Degradation)
**NEVER DO THIS**:
```typescript
// ❌ FORBIDDEN - This caused Agent 2 to fail
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn()
}));

// ❌ FORBIDDEN - Manual mock creation
const mockSupabase = { from: jest.fn() };
```

### ✅ THE ONLY CORRECT WAY - SimplifiedSupabaseMock
```typescript
// ✅ CORRECT - This pattern achieved 100% success
import { SimplifiedSupabaseMock } from "../test/serviceSetup";

describe("ServiceName", () => {
  let mockSupabase: SimplifiedSupabaseMock;
  
  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
    // Use mockSupabase.from() for chaining
  });
});
```

### 📚 MANDATORY READING BEFORE STARTING
1. **FIRST**: Read `docs/architectural-patterns-and-best-practices.md`
2. **SECOND**: Study `src/test/serviceSetup.ts` - understand SimplifiedSupabaseMock
3. **THIRD**: Review successful tests in `src/services/__tests__/cartService.test.ts`
4. **FOURTH**: For hooks, study `src/hooks/__tests__/useCart.test.tsx`

### ⚠️ TDD APPROACH - NO MANUAL SETUP
- DO NOT invent new test patterns
- DO NOT create elaborate manual mocks
- DO NOT reinvent the wheel
- USE ONLY the established SimplifiedSupabaseMock pattern
- COPY the successful test structure exactly

## 🎯 Mission
Implement RolePermissionService and UserRoleService with comprehensive test coverage following ONLY the established test infrastructure patterns.

## 🔴 STOP - MANDATORY READING BEFORE ANY CODE

### Step 1: Read Architectural Patterns (30 minutes minimum)
1. **OPEN**: `docs/architectural-patterns-and-best-practices.md`
2. **STUDY**: Section on "Service Layer Patterns"
3. **UNDERSTAND**: Why validation pipelines exist
4. **MEMORIZE**: The query key factory pattern

### Step 2: Study Successful Examples
1. **EXAMINE**: `src/services/__tests__/cartService.test.ts` - 100% success
2. **ANALYZE**: `src/test/serviceSetup.ts` - SimplifiedSupabaseMock pattern
3. **COPY**: These exact patterns - they work!

### Step 3: Architectural Compliance Check
Before implementing ANYTHING, can you answer:
- Why do we validate individual items? (Hint: Resilience)
- Why use query key factory? (Hint: Cache consistency)
- Why SimplifiedSupabaseMock? (Hint: Prevents mock chain hell)
- What happens if you skip validation? (Hint: Data corruption)

## 📋 Implementation Tasks (TDD - Tests First!)
1. **RolePermissionService** 
   - Write tests FIRST using SimplifiedSupabaseMock (copy from cartService.test.ts)
   - 15+ tests minimum
   - Pattern: EXACTLY like cartService.test.ts

2. **UserRoleService**
   - Write tests FIRST using SimplifiedSupabaseMock
   - 15+ tests minimum
   - Pattern: EXACTLY like cartService.test.ts

## ✅ Test Pattern You MUST Follow
```typescript
// This is the ONLY acceptable pattern (from cartService.test.ts)
import { SimplifiedSupabaseMock } from '../test/serviceSetup';
import { RolePermissionService } from './rolePermissionService';

describe('RolePermissionService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: RolePermissionService;
  
  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
    service = new RolePermissionService(mockSupabase.client);
  });
  
  describe('getRolePermissions', () => {
    it('should fetch permissions for role', async () => {
      // Setup mock EXACTLY like cartService.test.ts does
      mockSupabase.from('role_permissions').select().mockResolvedValue({
        data: mockPermissions,
        error: null
      });
      
      const result = await service.getRolePermissions('inventory_staff');
      
      expect(result).toEqual(expectedResult);
      expect(mockSupabase.from).toHaveBeenCalledWith('role_permissions');
    });
  });
});
```

## ❌ What NOT To Do
- NO creating new mock patterns
- NO jest.mock() for Supabase
- NO manual mock objects
- NO inventing new test utilities
- NO elaborate setup - use SimplifiedSupabaseMock

## 🎯 Milestone Validation Protocol
After EACH service implementation:
1. Run: `npm run test:services`
2. Check pass rate: Must be ≥85%
3. If <85%: FIX before proceeding
4. Commit: `git commit -m "feat: RolePermissionService - 15/15 tests passing"`

### Your Milestones:
- [ ] Milestone 1: RolePermissionService complete (15+ tests, ≥85% pass)
  - Run tests → Verify → Commit
- [ ] Milestone 2: UserRoleService complete (15+ tests, ≥85% pass)
  - Run tests → Verify → Commit
- [ ] Final: All services complete (30+ tests, ≥85% pass)
  - Run ALL tests → Verify → Final commit

## 📊 Success Criteria (MUST BE REAL)
- [ ] 20+ tests ALL using SimplifiedSupabaseMock pattern
- [ ] Test pass rate ≥85% (actual, not claimed)
- [ ] Zero basic jest mocks or manual mocks
- [ ] Git commits after each milestone
- [ ] NO REGRESSIONS - fix immediately if found

## 🔄 Communication
- Progress: /shared/progress/role-services.md (after each test run)
- Test Results: Report ACTUAL pass rates, not aspirational
- Blockers: /shared/blockers/role-services-blockers.md  
- Completion: /shared/handoffs/role-services-complete.md
- Feedback: /shared/feedback/role-services-improvements.md or /shared/feedback/role-services-fixes-needed.md

## 🚨 Regression Protocol
If ANY test that was passing starts failing:
```bash
echo "REGRESSION DETECTED: Test X was passing, now failing"
# 1. Stop all new work
# 2. Fix the regression
# 3. Verify ALL tests pass again
# 4. Only then proceed
```

Remember: Report REAL results. If only 60% pass, say 60% - then FIX until 85%+!
