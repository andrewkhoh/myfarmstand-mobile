# Role Navigation Agent - Phase 1 Foundation

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

If feedback exists, address it FIRST before continuing other requirements.

```bash
echo "=== CHECKING FOR INTEGRATION FEEDBACK ==="
if [ -f "/shared/feedback/role-navigation-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/role-navigation-improvements.md"
elif [ -f "/shared/feedback/role-navigation-fixes-needed.md" ]; then
  echo "🚨 CRITICAL: Fix these issues immediately:"
  cat "/shared/feedback/role-navigation-fixes-needed.md" 
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
Implement dynamic role-based navigation system with route guards following ONLY the established test infrastructure patterns.

## 🔴 STOP - READ THIS FIRST
You will use TWO patterns:
1. For NavigationService: Copy `src/services/__tests__/cartService.test.ts` pattern
2. For useNavigationMenu hook: Copy `src/hooks/__tests__/useCart.test.tsx` pattern
DO NOT MIX THESE UP!

## 📋 Implementation Tasks (TDD - Tests First!)
1. **NavigationService** (Service Pattern)
   - Write tests FIRST using SimplifiedSupabaseMock
   - 10+ tests minimum
   - Pattern: EXACTLY like cartService.test.ts

2. **useNavigationMenu Hook** (Hook Pattern)
   - Write tests FIRST using renderHookWithRealQuery
   - 8+ tests minimum
   - Pattern: EXACTLY like useCart.test.tsx

3. **RouteGuard Component** (Component Pattern)
   - Use renderWithRealQuery from race-condition-setup
   - 8+ tests minimum

4. **DynamicNavigator Component** (Component Pattern)
   - Use renderWithRealQuery from race-condition-setup
   - 10+ tests minimum

## ✅ Service Test Pattern (NavigationService)
```typescript
import { SimplifiedSupabaseMock } from '../test/serviceSetup';

describe('NavigationService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: NavigationService;
  
  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
    service = new NavigationService(mockSupabase.client);
  });
  // Tests follow cartService.test.ts pattern
});
```

## ✅ Hook Test Pattern (useNavigationMenu)
```typescript
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('useNavigationMenu', () => {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
  
  it('should fetch menu for role', async () => {
    const { result } = renderHook(() => useNavigationMenu('staff'), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

## ❌ Critical Anti-Patterns from Agent 2's Failure
- NEVER create manual mocks like `const mockFrom = jest.fn()`
- NEVER use jest.mock() for Supabase
- NEVER mix service and hook test patterns
- NEVER create new test infrastructure

## 📊 Success Criteria
- [ ] NavigationService: 10+ tests with SimplifiedSupabaseMock
- [ ] useNavigationMenu: 8+ tests with standard React Query setup
- [ ] All components: Tests with real React Query
- [ ] Zero manual mocks or jest.mock()
- [ ] 100% pattern compliance

## 🔄 Communication
- Progress: /shared/progress/role-navigation.md (every 30 min)
- Blockers: /shared/blockers/role-navigation-blockers.md
- Completion: /shared/handoffs/role-navigation-complete.md
- Feedback: /shared/feedback/role-navigation-improvements.md or /shared/feedback/role-navigation-fixes-needed.md

Remember: Use SimplifiedSupabaseMock for services, renderHookWithRealQuery for hooks!
