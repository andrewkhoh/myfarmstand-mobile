#!/bin/bash
# Automatic prompt generation for Phase 1 agents
# WITH STRONG EMPHASIS ON TEST INFRASTRUCTURE PATTERNS

set -euo pipefail

PROMPTS_DIR="docker/agents/prompts"
SCRIPTS_DIR="scripts"

echo "📝 Generating Phase 1 Agent Prompts with Test Infrastructure Enforcement..."

# Ensure prompts directory exists
mkdir -p $PROMPTS_DIR

# CRITICAL: Define test infrastructure requirements that ALL agents must follow
read -r -d '' TEST_INFRASTRUCTURE_HEADER << 'EOF' || true
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
EOF

# Generate role-services prompt with test infrastructure emphasis
echo "  Generating role-services prompt..."
cat > $PROMPTS_DIR/role-services-agent.md << EOF
# Role Services Agent - Phase 1 Foundation

$TEST_INFRASTRUCTURE_HEADER

## 🎯 Mission
Implement RolePermissionService and UserRoleService with comprehensive test coverage following ONLY the established test infrastructure patterns.

## 🔴 STOP - MANDATORY READING BEFORE ANY CODE

### Step 1: Read Architectural Patterns (30 minutes minimum)
1. **OPEN**: \`docs/architectural-patterns-and-best-practices.md\`
2. **STUDY**: Section on "Service Layer Patterns"
3. **UNDERSTAND**: Why validation pipelines exist
4. **MEMORIZE**: The query key factory pattern

### Step 2: Study Successful Examples
1. **EXAMINE**: \`src/services/__tests__/cartService.test.ts\` - 100% success
2. **ANALYZE**: \`src/test/serviceSetup.ts\` - SimplifiedSupabaseMock pattern
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
\`\`\`typescript
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
\`\`\`

## ❌ What NOT To Do
- NO creating new mock patterns
- NO jest.mock() for Supabase
- NO manual mock objects
- NO inventing new test utilities
- NO elaborate setup - use SimplifiedSupabaseMock

## 🎯 Milestone Validation Protocol
After EACH service implementation:
1. Run: \`npm run test:services\`
2. Check pass rate: Must be ≥85%
3. If <85%: FIX before proceeding
4. Commit: \`git commit -m "feat: RolePermissionService - 15/15 tests passing"\`

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

## 🚨 Regression Protocol
If ANY test that was passing starts failing:
\`\`\`bash
echo "REGRESSION DETECTED: Test X was passing, now failing"
# 1. Stop all new work
# 2. Fix the regression
# 3. Verify ALL tests pass again
# 4. Only then proceed
\`\`\`

Remember: Report REAL results. If only 60% pass, say 60% - then FIX until 85%+!
EOF

# Generate role-hooks prompt with test infrastructure emphasis
echo "  Generating role-hooks prompt..."
cat > $PROMPTS_DIR/role-hooks-agent.md << EOF
# Role Hooks Agent - Phase 1 Foundation

$TEST_INFRASTRUCTURE_HEADER

## 🎯 Mission
Implement useUserRole and useRolePermissions hooks with React Query integration following ONLY the established test infrastructure patterns.

## 🔴 STOP - READ THIS FIRST
Before writing ANY code:
1. Open and study \`src/hooks/__tests__/useCart.test.tsx\` - This is your BIBLE
2. Open and study \`src/test/setup.ts\` - Standard hook test setup
3. Copy the EXACT pattern - do not innovate on test infrastructure

## 📋 Implementation Tasks (TDD - Tests First!)
1. **useUserRole Hook**
   - Write tests FIRST using standard hook testing pattern (copy from useCart.test.tsx)
   - 10+ tests minimum
   - Pattern: EXACTLY like useCart.test.tsx

2. **useRolePermissions Hook**
   - Write tests FIRST using standard hook testing pattern
   - 10+ tests minimum  
   - Pattern: EXACTLY like useCart.test.tsx

3. **Integration Tests**
   - Test hooks work with services
   - Test data flow is correct
   - No focus on race conditions

## ✅ Test Pattern You MUST Follow
\`\`\`typescript
// This is the ONLY acceptable pattern (from useCart.test.tsx)
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserRole } from '../useUserRole';

describe('useUserRole', () => {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
  
  it('should fetch user role', async () => {
    const { result } = renderHook(() => useUserRole('user123'), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBeDefined();
    });
  });
  
  it('should handle loading state', () => {
    const { result } = renderHook(() => useUserRole('user123'), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});
\`\`\`

## ❌ What NOT To Do  
- NO mocking React Query (never jest.mock('@tanstack/react-query'))
- NO fake timers in tests
- NO creating new test utilities
- NO manual query keys - use queryKeyFactory
- NO complex test scenarios - keep tests simple and focused

## 🎯 Milestone Validation Protocol
After EACH hook implementation:
1. Run: \`npm run test:hooks\`
2. Check pass rate: Must be ≥85%
3. If <85%: FIX before proceeding
4. Commit: \`git commit -m "feat: useUserRole - 10/10 tests passing"\`

### Your Milestones:
- [ ] Milestone 1: useUserRole complete (10+ tests, ≥85% pass)
  - Run tests → Verify → Commit
- [ ] Milestone 2: useRolePermissions complete (10+ tests, ≥85% pass)
  - Run tests → Verify → Commit
- [ ] Milestone 3: Hook integration tests (5+ tests)
  - Run tests → Verify → Commit
- [ ] Final: All hooks complete (25+ tests, ≥85% pass)
  - Run ALL tests → Verify → Final commit

## 📊 Success Criteria (MUST BE REAL)
- [ ] 25+ tests ALL using standard React Query setup
- [ ] Test pass rate ≥85% (actual, not claimed)
- [ ] Integration with services verified
- [ ] Git commits after each milestone
- [ ] NO REGRESSIONS - fix immediately if found

## 🔄 Communication
- Progress: /shared/progress/role-hooks.md (after each test run)
- Test Results: Report ACTUAL numbers like "7/10 passing (70%)"
- Blockers: /shared/blockers/role-hooks-blockers.md
- Completion: /shared/handoffs/role-hooks-complete.md

## 🚨 Continuous Testing Loop
\`\`\`bash
# After implementing each hook
npm run test:hooks
PASS_RATE=\$(calculate_pass_rate)

while [ \$PASS_RATE -lt 85 ]; do
  echo "❌ Current: \$PASS_RATE% - Fixing failures..."
  # Fix failing tests
  npm run test:hooks
  PASS_RATE=\$(calculate_pass_rate)
done

echo "✅ Target achieved: \$PASS_RATE%"
git add -A && git commit -m "feat: Hook complete - \$PASS_RATE% pass rate"
\`\`\`

Remember: Be HONEST about results. Keep tests simple. Fix until you ACTUALLY achieve 85%+!
EOF

# Generate role-navigation prompt with test infrastructure emphasis
echo "  Generating role-navigation prompt..."
cat > $PROMPTS_DIR/role-navigation-agent.md << EOF
# Role Navigation Agent - Phase 1 Foundation

$TEST_INFRASTRUCTURE_HEADER

## 🎯 Mission
Implement dynamic role-based navigation system with route guards following ONLY the established test infrastructure patterns.

## 🔴 STOP - READ THIS FIRST
You will use TWO patterns:
1. For NavigationService: Copy \`src/services/__tests__/cartService.test.ts\` pattern
2. For useNavigationMenu hook: Copy \`src/hooks/__tests__/useCart.test.tsx\` pattern
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
\`\`\`typescript
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
\`\`\`

## ✅ Hook Test Pattern (useNavigationMenu)
\`\`\`typescript
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
\`\`\`

## ❌ Critical Anti-Patterns from Agent 2's Failure
- NEVER create manual mocks like \`const mockFrom = jest.fn()\`
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

Remember: Use SimplifiedSupabaseMock for services, renderHookWithRealQuery for hooks!
EOF

# Generate role-screens prompt
echo "  Generating role-screens prompt..."
cat > $PROMPTS_DIR/role-screens-agent.md << EOF
# Role Screens Agent - Phase 1 Extension

$TEST_INFRASTRUCTURE_HEADER

## 🎯 Mission
Implement RoleDashboard, RoleSelection, and PermissionManagement screens following ONLY the established test patterns.

## ⏳ DEPENDENCIES
Wait for foundation completion, then copy their patterns:
- /shared/handoffs/role-services-complete.md
- /shared/handoffs/role-hooks-complete.md
- /shared/handoffs/role-navigation-complete.md

## 🔴 STOP - STUDY EXISTING SCREEN TESTS FIRST
1. Find and study existing screen tests in \`src/screens/__tests__/\`
2. Use standard React Native Testing Library with React Query wrapper
3. DO NOT create new test infrastructure

## 📋 Implementation Tasks (TDD - Tests First!)
1. **RoleDashboardScreen**
   - Write tests FIRST using standard React Native Testing Library
   - 8+ tests covering all 4 roles
   - Pattern: Follow existing screen tests

2. **RoleSelectionScreen**
   - Write tests FIRST using standard React Native Testing Library
   - 6+ tests minimum
   - Pattern: Follow existing screen tests

3. **PermissionManagementScreen**
   - Write tests FIRST using standard React Native Testing Library
   - 8+ tests minimum
   - Admin-only functionality

## ✅ Screen Test Pattern You MUST Follow
\`\`\`typescript
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('RoleDashboardScreen', () => {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
  
  it('should render dashboard for inventory_staff', async () => {
    const screen = render(<RoleDashboardScreen />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Inventory Dashboard')).toBeTruthy();
    });
  });
});
\`\`\`

## ❌ What NOT To Do
- NO mocking React Query or navigation
- NO creating new render utilities
- NO manual test setup
- NO fake timers
- Use standard testing patterns only

## 📊 Success Criteria
- [ ] 20+ tests ALL using standard React Native Testing Library
- [ ] Tests for all 4 roles (inventory_staff, marketing_staff, executive, admin)
- [ ] Integration with foundation hooks verified
- [ ] Zero new test infrastructure created

## 🔄 Communication
- Progress: /shared/progress/role-screens.md
- Blockers: /shared/blockers/role-screens-blockers.md
- Completion: /shared/handoffs/role-screens-complete.md

Remember: Use existing test patterns ONLY - no innovation on test infrastructure!
EOF

# Generate permission-ui prompt
echo "  Generating permission-ui prompt..."
cat > $PROMPTS_DIR/permission-ui-agent.md << EOF
# Permission UI Agent - Phase 1 Extension

$TEST_INFRASTRUCTURE_HEADER

## 🎯 Mission
Implement permission gates, role indicators, and access control UI components following ONLY established test patterns.

## ⏳ DEPENDENCIES
Wait for foundation completion:
- /shared/handoffs/role-services-complete.md
- /shared/handoffs/role-hooks-complete.md
- /shared/handoffs/role-navigation-complete.md

## 🔴 STOP - STUDY EXISTING COMPONENT TESTS FIRST
1. Find and study existing component tests in \`src/components/__tests__/\`
2. Use standard React Native Testing Library with React Query wrapper
3. COPY existing patterns - do not innovate

## 📋 Implementation Tasks (TDD - Tests First!)
1. **PermissionGate Component**
   - Write tests FIRST using standard testing patterns
   - 8+ tests minimum
   - Pattern: Follow existing component tests

2. **RoleIndicator Component**
   - Write tests FIRST using standard testing patterns
   - 4+ tests minimum
   - Pattern: Follow existing component tests

3. **AccessControlButton Component**
   - Write tests FIRST using standard testing patterns
   - 6+ tests minimum
   - Pattern: Follow existing component tests

4. **PermissionBadge Component**
   - Write tests FIRST using standard testing patterns
   - 5+ tests minimum
   - Pattern: Follow existing component tests

## ✅ Component Test Pattern You MUST Follow
\`\`\`typescript
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('PermissionGate', () => {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
  
  it('should render children when permission granted', async () => {
    const screen = render(
      <PermissionGate permission="inventory.manage">
        <Text>Protected Content</Text>
      </PermissionGate>,
      { wrapper }
    );
    
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeTruthy();
    });
  });
  
  it('should hide children when permission denied', async () => {
    const screen = render(
      <PermissionGate permission="admin.users">
        <Text>Admin Only</Text>
      </PermissionGate>,
      { wrapper }
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Admin Only')).toBeFalsy();
    });
  });
});
\`\`\`

## ❌ What NOT To Do
- NO creating new test utilities
- NO mocking hooks or services
- NO manual permission checks in tests
- Use standard testing patterns only

## 📊 Success Criteria
- [ ] 10+ tests ALL using standard React Native Testing Library
- [ ] Component tests follow existing patterns exactly
- [ ] Zero new test infrastructure
- [ ] 100% pattern compliance

## 🔄 Communication
- Progress: /shared/progress/permission-ui.md
- Blockers: /shared/blockers/permission-ui-blockers.md
- Completion: /shared/handoffs/permission-ui-complete.md

Remember: Copy existing component test patterns - Agent 3 succeeded by following patterns!
EOF

# Generate integration prompt
echo "  Generating integration prompt..."
cat > $PROMPTS_DIR/integration-agent.md << EOF
# Integration Agent - Phase 1 Final Integration

$TEST_INFRASTRUCTURE_HEADER

## 🎯 Mission
Perform end-to-end integration testing ensuring ALL agents followed established test patterns correctly.

## ⏳ DEPENDENCIES
Wait for ALL agents - then AUDIT their pattern compliance:
- /shared/handoffs/role-services-complete.md
- /shared/handoffs/role-hooks-complete.md
- /shared/handoffs/role-navigation-complete.md
- /shared/handoffs/role-screens-complete.md
- /shared/handoffs/permission-ui-complete.md

## 🔴 YOUR CRITICAL RESPONSIBILITY
1. **VERIFY REAL RESULTS**: Run ALL tests yourself - don't trust claims
2. **AUDIT PATTERNS**: Check that ALL agents used SimplifiedSupabaseMock and renderHookWithRealQuery
3. **REJECT FAKE SUCCESS**: If actual pass rate <85%, mark as FAILED
4. **ENFORCE STANDARDS**: Only approve work that ACTUALLY meets targets

### Verification Protocol:
\`\`\`bash
# Don't trust - VERIFY
echo "🔍 Verifying claimed results..."

# Run all test suites
npm run test:services
SERVICE_PASS_RATE=\$(extract_pass_rate)

npm run test:hooks  
HOOK_PASS_RATE=\$(extract_pass_rate)

npm run test:screens
SCREEN_PASS_RATE=\$(extract_pass_rate)

# Check actual vs claimed
if [ \$SERVICE_PASS_RATE -lt 85 ]; then
  echo "❌ FAILED: Services only \$SERVICE_PASS_RATE% (claimed 85%+)"
  echo "Agent must FIX before approval"
fi
\`\`\`

## 📋 Integration Testing Tasks
1. **Architectural Compliance Audit (PRIORITY #1)**
   ```bash
   # Check EVERY file for pattern compliance
   echo "🔍 Auditing architectural pattern compliance..."
   
   # Check for architectural references in code
   grep -r "docs/architectural-patterns" src/ || echo "❌ No architecture references found!"
   
   # Verify validation pipelines
   grep -r "validateIndividually" src/services/ || echo "❌ Missing validation pipelines!"
   
   # Check query key factory usage
   grep -r "queryKeyFactory" src/ | wc -l
   # Should be 50+ uses, not manual keys
   
   # Verify error handling patterns
   grep -r "gracefulDegradation" src/ || echo "❌ Missing error handling!"
   ```

2. **Test Infrastructure Audit**
   - Verify services use SimplifiedSupabaseMock (100% required)
   - Verify hooks use renderHookWithRealQuery (100% required)
   - Verify components use renderWithRealQuery (100% required)
   - REJECT any agent that created new patterns

3. **Architecture Document Verification**
   - Did agents reference architectural docs in comments?
   - Did they follow validation pipeline pattern?
   - Did they use proper error handling?
   - Did they implement security patterns?

2. **Cross-Agent Integration** (8+ tests)
   - Test service-to-hook integration
   - Use ONLY established test patterns

3. **End-to-End Workflows** (16+ tests)
   - Test complete user journeys
   - All 4 roles: inventory_staff, marketing_staff, executive, admin

## ✅ Integration Test Pattern
\`\`\`typescript
// Use existing patterns for integration tests
import { SimplifiedSupabaseMock } from '../test/serviceSetup';
import { render, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Phase 1 Integration', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  
  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
  });
  
  it('should integrate services with hooks', async () => {
    // Test using established patterns only
  });
});
\`\`\`

## ❌ REJECTION CRITERIA
Immediately FAIL any agent that:
- Used jest.mock() for Supabase
- Created manual mocks
- Invented new test utilities
- Did not use SimplifiedSupabaseMock for services
- Did not use standard React Query setup for hooks

## 📊 Phase 1 Success Validation
- [ ] ALL agents followed test patterns (100% compliance)
- [ ] 60+ total tests using correct patterns
- [ ] Zero manual mocks or jest.mock() in codebase
- [ ] SimplifiedSupabaseMock used for ALL service tests
- [ ] Standard React Query setup used for ALL hook tests

## 🚨 FAILURE PROTOCOL
If ANY agent violated patterns:
1. Document violation in /shared/blockers/pattern-violations.md
2. List specific files and line numbers
3. Create remediation plan
4. DO NOT approve Phase 1 until fixed

## 🔄 Communication
- Progress: /shared/progress/integration.md
- Pattern Violations: /shared/blockers/pattern-violations.md
- Final Report: /shared/handoffs/phase1-complete.md

## 🏗️ ARCHITECTURAL PATTERN ENFORCEMENT

### Your Final Checklist Before Approval:
```typescript
// For EVERY component created by agents, verify:

// 1. VALIDATION PATTERN
- [ ] Individual item validation (not batch)
- [ ] Skip-on-error resilience
- [ ] User-friendly error messages
- [ ] Graceful degradation

// 2. QUERY KEY PATTERN  
- [ ] queryKeyFactory used everywhere
- [ ] Zero manual key construction
- [ ] Proper cache invalidation
- [ ] User-isolated caches

// 3. ERROR HANDLING PATTERN
- [ ] Try-catch with specific handling
- [ ] Fallback values provided
- [ ] User notified appropriately
- [ ] System continues functioning

// 4. SECURITY PATTERN
- [ ] Input validation present
- [ ] Defense in depth applied
- [ ] Fail secure (deny by default)
- [ ] No sensitive data exposed

// 5. TEST PATTERN
- [ ] SimplifiedSupabaseMock for services
- [ ] renderHookWithRealQuery for hooks
- [ ] Real React Query (no mocking)
- [ ] 85%+ pass rate achieved
```

### Rejection Reasons (Immediate Failure):
1. **"I optimized the pattern"** → REJECT (patterns are already optimal)
2. **"I created a better way"** → REJECT (follow existing patterns)
3. **"The pattern seemed inefficient"** → REJECT (it's resilient, not inefficient)
4. **Manual mocks found** → REJECT (use SimplifiedSupabaseMock)
5. **<85% pass rate** → REJECT (must meet minimum)
6. **No architecture references** → REJECT (must document pattern usage)

Remember: You are the QUALITY GATE - enforce both test AND architectural patterns!

## Final Message to All Agents:
**SUCCESS = Following docs/architectural-patterns-and-best-practices.md religiously**
**FAILURE = Ignoring patterns and creating your own**

The patterns exist because they WORK. Trust them. Follow them. Succeed.
EOF

echo "✅ All Phase 1 agent prompts generated!"
ls -la $PROMPTS_DIR/