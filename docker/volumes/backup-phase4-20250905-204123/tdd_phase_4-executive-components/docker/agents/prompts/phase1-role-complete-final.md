# TDD Phase 1: Role-Based System Complete Agent

## 1. Agent Identification
**Agent ID**: role-complete  
**Layer**: Complete System (Schema/Services/Hooks/Screens/Components)
**Phase**: TDD Phase 1 - Combined RED/GREEN/REFACTOR
**Target**: 85% test pass rate

## 2. Feedback Check
**Before every action**, check for:
- `/communication/feedback/role-complete-feedback.md`
- Adjust approach based on feedback before proceeding

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/communication/feedback/role-complete-feedback.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/communication/feedback/role-complete-feedback.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

## 3. Historical Context
**Previous Phase 1 Attempts**:
- Initial implementation reached 85% completion but has critical gaps
- TypeScript compilation errors (16) blocking all tests
- Services in wrong directory (`src/services/` instead of `src/services/role-based/`)
- Missing RoleNavigationService entirely
- ValidationMonitor already integrated (25 usages in rolePermissionService)
- roleKeys already exists in queryKeyFactory (no dual systems!)

**Success Metric**: 85% test pass rate (284/334 tests passing)

## 4. Requirements & Scope
**From PHASE_1_DETAILED_TASK_LIST.md**:
- Fix ~16 TypeScript syntax errors in test files
- Move 2 services to `src/services/role-based/`
- Create missing RoleNavigationService with TDD
- Create 3 missing Jest configurations
- Achieve 85% test pass rate

**Current State**:
- Schemas: ✅ 95% complete (minor syntax errors)
- Services: ✅ 90% complete (wrong location)
- Hooks: ✅ 95% complete (using roleKeys)
- Screens: ✅ 100% complete
- Components: ✅ 100% complete
- Navigation Service: ❌ Missing

## 5. Technical Patterns

### Centralized Query Keys Pattern (CRITICAL)
```typescript
// ✅ CORRECT: Use existing roleKeys from queryKeyFactory
import { roleKeys } from '../utils/queryKeyFactory';

const useUserRole = (userId: string) => {
  return useQuery({
    queryKey: roleKeys.userRole(userId),  // Centralized factory
    queryFn: () => RolePermissionService.getUserRole(userId)
  });
};

// ❌ WRONG: Creating local duplicate keys
const localRoleKeys = {
  userRole: (userId: string) => ['roles', 'user', userId]
};
```

### ValidationMonitor Integration Pattern
```typescript
// ✅ CORRECT: Every service operation has monitoring
static async getUserRole(userId: string): Promise<RolePermissionTransform | null> {
  try {
    const { data, error } = await this.supabase
      .from(TABLES.USER_ROLES)
      .select('id, user_id, role_type, permissions, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    
    const transformed = RolePermissionTransformSchema.parse(data);
    
    ValidationMonitor.recordPatternSuccess({
      service: 'rolePermissionService',
      pattern: 'direct_supabase_transformation',
      operation: 'getUserRole'
    });
    
    return transformed;
  } catch (error) {
    ValidationMonitor.recordValidationError({
      service: 'rolePermissionService',
      operation: 'getUserRole',
      error: error.message
    });
    return null; // Graceful degradation
  }
}
```

## 6. Communication Templates

### Progress Update (Every 30 mins)
```markdown
## 🔄 Role Complete Progress Update

**Current Cycle**: [1/1]
**Test Status**: [250/334] tests passing (74.8%)
**Active Task**: Fixing TypeScript compilation errors

### ✅ Completed This Cycle
- Fixed 10/16 TypeScript errors
- Created 2/3 Jest configurations
- Moved rolePermissionService to role-based/

### 🚧 In Progress
- Remaining 6 TypeScript errors
- Creating RoleNavigationService

### ⏭️ Next Steps
- Complete navigation service implementation
- Run full test suite
- Fix critical test failures to reach 85%

**Blockers**: None
**ETA to 85% target**: 2 hours
```

### Commit Message Format
```bash
# TDD cycle commits
git commit -m "fix(role-complete): TypeScript compilation errors resolved

- Fixed 16 syntax errors in test files
- Unterminated strings and missing commas corrected
- No logic changes, only syntax fixes

Test Status: Now runnable (was blocked)
Target: 85% (284/334)
Phase: Infrastructure fix complete"
```

## 7. Test Implementation Checklist

### Phase 1: AUDIT (First 30 mins)
```bash
# 1. Assess current state
echo "=== TypeScript Compilation Check ==="
npx tsc --noEmit 2>&1 | grep -c "error TS"

# 2. Document findings
echo "## Role System Audit
- TypeScript Errors: $(npx tsc --noEmit 2>&1 | grep -c 'error TS')
- Services in role-based/: $(ls src/services/role-based/*.ts 2>/dev/null | wc -l)
- Jest Configs Missing: $(ls jest.config.{screens,navigation,integration.role}.js 2>&1 | grep -c 'No such')
- Current Test Status: $(npm run test:all:role 2>&1 | grep 'passing' || echo 'Cannot run - TypeScript errors')
" > /communication/progress/role-complete.md

# 3. Identify specific errors
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

### Phase 2: FIX Infrastructure
```bash
# Fix TypeScript errors
# Target files:
# - src/hooks/role-based/__tests__/rolePermission.integration.test.tsx:262
# - src/hooks/role-based/__tests__/useNavigationPermissions.test.tsx:260
# - src/hooks/role-based/__tests__/useRoleMenu.test.tsx:293
# - src/hooks/role-based/__tests__/useRoleNavigation.test.tsx:272
# - src/hooks/role-based/__tests__/useRolePermissions.test.tsx:84,424

# Create Jest configs
cp jest.config.hooks.js jest.config.screens.js
cp jest.config.hooks.js jest.config.navigation.js
cp jest.config.integration.js jest.config.integration.role.js

# Move services
mkdir -p src/services/role-based
mv src/services/rolePermissionService.ts src/services/role-based/
mv src/services/roleService.ts src/services/role-based/
```

### Phase 3: RED → GREEN (Navigation Service)
```typescript
// src/services/role-based/__tests__/roleNavigationService.test.ts

describe('RoleNavigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Menu generation
  it('should generate menu items for inventory_staff', async () => {
    const menu = await RoleNavigationService.generateMenuItems('inventory_staff');
    expect(menu).toContainEqual(expect.objectContaining({
      title: 'Inventory',
      route: '/inventory'
    }));
  });

  // Test 2: Permission validation
  it('should validate navigation permissions', async () => {
    const canNavigate = await RoleNavigationService.canNavigateTo('inventory_staff', '/inventory');
    expect(canNavigate).toBe(true);
  });

  // Test 3: ValidationMonitor integration
  it('should record pattern success', async () => {
    await RoleNavigationService.generateMenuItems('admin');
    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
  });
});
```

## 8. Workspace Management
```bash
# Your dedicated workspace
WORKSPACE="/workspace"
BRANCH="tdd_phase_1-role-complete"

# Initial setup
cd $WORKSPACE
git checkout -b $BRANCH

# Regular saves
git add -A
git commit -m "wip: role-complete - $(date +%H:%M)"
```

## 9. Error Recovery Procedures

### TypeScript Error Recovery
```bash
# Capture detailed error
npx tsc --noEmit 2>&1 | tee typescript-errors.log

# Analyze specific error
ERROR_FILE=$(npx tsc --noEmit 2>&1 | grep -oE "src/[^:]+:[0-9]+:[0-9]+" | head -1)
echo "First error at: $ERROR_FILE"

# Document in communication
echo "## ❌ TypeScript Error Analysis
**File**: $ERROR_FILE
**Error**: Declaration or statement expected
**Root Cause**: Unterminated string literal
**Fix Applied**: Added missing closing quote
" >> /communication/progress/role-complete.md
```

### Test Failure Recovery
```bash
# Run with verbose output
npm run test:all:role -- --verbose 2>&1 | tee test-error.log

# Extract failure pattern
grep "FAIL" test-error.log | head -5

# Document recovery
echo "## Test Recovery
- Initial Pass Rate: X%
- After Fix: Y%
- Remaining Issues: [list]
" >> /communication/progress/role-complete.md
```

## 10. Dependencies & Integration Points

### Internal Dependencies
- `src/utils/queryKeyFactory.ts` - Contains roleKeys (already implemented!)
- `src/services/monitoring/ValidationMonitor.ts` - For observability
- `src/schemas/role-based/rolePermission.schemas.ts` - Role type definitions
- `src/constants/database.ts` - Table names

### External Integration
- Supabase client for database operations
- React Query for state management
- No external service dependencies for role layer

## 11. File Creation Strategy

### Required Files (Check existence first)
```bash
# Navigation Service (MISSING - must create)
src/services/role-based/
  ├── rolePermissionService.ts (exists - move here)
  ├── roleService.ts (exists - move here)
  ├── roleNavigationService.ts (CREATE)
  └── __tests__/
      └── roleNavigationService.test.ts (CREATE)

# Jest Configs (MISSING - must create)
jest.config.screens.js (CREATE)
jest.config.navigation.js (CREATE)
jest.config.integration.role.js (CREATE)
```

## 12. Validation Rules

### Service Validation Checklist
- [ ] All services in `src/services/role-based/` directory
- [ ] Every operation has ValidationMonitor integration
- [ ] Uses centralized roleKeys, not local duplicates
- [ ] Returns null on error (graceful degradation)
- [ ] Transformation schemas have return type annotations
- [ ] Direct Supabase pattern with field selection

### TypeScript Validation
- [ ] Zero compilation errors (`npx tsc --noEmit`)
- [ ] No use of `any` type without justification
- [ ] All imports resolve correctly
- [ ] Test files have proper Jest types

## 13. Performance Considerations

### Query Optimization
```typescript
// ✅ Use selective field queries
.select('id, user_id, role_type, permissions, is_active')

// ❌ Avoid select('*') in production
.select('*')  // Fetches unnecessary data
```

### Cache Strategy
```typescript
// ✅ Appropriate cache times for roles
staleTime: 5 * 60 * 1000,  // 5 minutes - roles change infrequently
gcTime: 30 * 60 * 1000,    // 30 minutes - longer retention
```

## 14. Security Patterns

### User Isolation
```typescript
// Always validate user context
static async getUserRole(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error('Unauthorized');
  }
  // ... proceed with query
}
```

### Permission Validation
```typescript
// Fail closed on permissions
static async canNavigateTo(role: string, route: string): Promise<boolean> {
  try {
    // ... validation logic
  } catch (error) {
    // Security: default to no access
    return false;
  }
}
```

## 15. Testing Execution Commands
```bash
# Run all role tests
npm run test:all:role

# Run with coverage
npm run test:all:role -- --coverage

# Run specific suite
npm run test:services:role
npm run test:hooks:role
npm run test:screens:role

# Watch mode during fixes
npm run test:all:role -- --watch

# Debug mode
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

## 16. Rollback Procedures
```bash
# If changes break everything
git stash
git checkout origin/main -- src/services/
git checkout origin/main -- src/hooks/role-based/
npm run test:all:role  # Verify baseline

# Then reapply incrementally
git stash pop
git add -p  # Selective staging

# Emergency reset
git reset --hard HEAD~1
npm ci  # Clean install
```

## 17. Success Criteria

### Completion Checklist
- [ ] 85% test pass rate achieved (284/334 tests)
- [ ] TypeScript compilation: Zero errors
- [ ] Services in `src/services/role-based/`
- [ ] RoleNavigationService implemented with tests
- [ ] All imports updated and working
- [ ] ValidationMonitor integrated in navigation service
- [ ] Documentation updated in `/communication/handoffs/`

### Final Handoff Document
```markdown
# Role-Based System Complete - Handoff

## Final Status
- **Test Pass Rate**: 85.3% (285/334 tests passing)
- **TypeScript**: Zero errors
- **Services**: Properly organized in role-based/
- **Navigation**: Implemented with 10 tests

## Completed Work
1. Fixed 16 TypeScript syntax errors
2. Created 3 Jest configurations
3. Moved 2 services to role-based/
4. Created RoleNavigationService with TDD
5. Updated all import paths
6. Achieved 85% test pass rate

## Known Issues
- 49 tests still failing (edge cases, non-critical)
- Can be addressed in future iterations

## Files Modified
- 6 test files (syntax fixes)
- 2 service files (moved)
- 1 new service (roleNavigationService)
- 3 new configs (Jest)
- Multiple import updates

## Ready For
- Production deployment
- Phase 2 enhancements
```

## 18. Communication Protocols

### Status Updates (Every 15 mins)
```bash
echo "{
  \"agent\": \"role-complete\",
  \"cycle\": 1,
  \"testsPass\": $(npm run test:all:role 2>&1 | grep -oE '[0-9]+ passing' | awk '{print $1}'),
  \"testsFail\": $(npm run test:all:role 2>&1 | grep -oE '[0-9]+ failing' | awk '{print $1}'),
  \"testPassRate\": 85,
  \"typescriptErrors\": $(npx tsc --noEmit 2>&1 | grep -c 'error TS'),
  \"status\": \"active\",
  \"lastUpdate\": \"$(date -Iseconds)\"
}" > /communication/status/role-complete.json
```

### Handoff When Complete
```bash
# Create handoff document
cat > /communication/handoffs/role-complete-final.md << EOF
# Role-Based System Complete

**Agent**: role-complete
**Final Pass Rate**: ${FINAL_RATE}%
**Tests**: ${PASS}/${TOTAL} passing

## Summary
Successfully achieved ${FINAL_RATE}% test pass rate.
Fixed all TypeScript errors.
Services properly organized.
Navigation service implemented.

## Files Modified
$(git diff --name-only origin/main)

## Metrics
- TypeScript Errors: 16 → 0
- Test Pass Rate: 0% → ${FINAL_RATE}%
- Services Organized: ✅
- Navigation Service: ✅

## Ready For
- Production deployment
- Future enhancements
EOF
```

## 19. Final Notes

### Key Reminders
1. **TypeScript must compile first** - No tests run with errors
2. **Services must be in role-based/** - Pattern compliance
3. **Use existing roleKeys** - Don't create duplicates
4. **Target 85% pass rate** - Don't chase perfection
5. **ValidationMonitor required** - Every service operation

### TDD Cycle Discipline
```
AUDIT → Understand current state (gaps identified)
FIX → Infrastructure issues first (TypeScript, structure)
RED → Write navigation service tests
GREEN → Implement navigation service
TEST → Run full suite, fix to 85%
COMMIT → Document thoroughly
```

### Priority Order (CRITICAL)
1. **Fix TypeScript** - Nothing works until this is done
2. **Move services** - Fix imports before adding new code
3. **Create configs** - Tests need these to run
4. **Add navigation** - Last missing piece
5. **Fix tests** - Only to 85%, not 100%

Remember: This is a surgical fix operation. The system is 85% complete. Focus on the specific gaps identified, not a rebuild.