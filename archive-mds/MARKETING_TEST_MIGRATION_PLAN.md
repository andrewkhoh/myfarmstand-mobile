# Marketing Test Migration Plan

## Executive Summary
Migrate marketing tests from Docker volumes (Phase 3B) to main branch with **ZERO breaking changes** to production code.

**Current State:**
- Docker Volumes: 122/122 service tests passing (100%), 84/89 hook tests passing (94.4%)
- Main Branch: 122/146 service tests passing (83.6%), hooks not yet tested

**Target State:**
- Match Docker volume pass rates without modifying ANY production service code
- Only test infrastructure and test files will be modified

## Risk Assessment & Mitigation

### 🟢 LOW RISK - Test Infrastructure Changes
These changes only affect test execution, not production code:
- Jest configuration files (`jest.config.*.js`)
- Test setup files (`src/test/*`)
- Test files (`__tests__/*.test.ts`)
- Mock implementations

### 🔴 HIGH RISK - Production Code Changes
**THESE WILL NOT BE TOUCHED:**
- Service implementations (`src/services/marketing/*.ts`)
- Schema definitions (`src/schemas/marketing/*.ts`)
- Hook implementations (`src/hooks/marketing/*.ts`)
- Component code (`src/components/marketing/*.tsx`)

## Migration Safeguards

### 1. Pre-Migration Verification
```bash
# Create checksums of all production files
find src/services/marketing -name "*.ts" -not -path "*/__tests__/*" | xargs md5sum > pre-migration-checksums.txt
find src/schemas/marketing -name "*.ts" -not -path "*/__tests__/*" | xargs md5sum >> pre-migration-checksums.txt
find src/hooks/marketing -name "*.ts" -not -path "*/__tests__/*" | xargs md5sum >> pre-migration-checksums.txt
```

### 2. Post-Migration Verification
```bash
# Verify no production files changed
find src/services/marketing -name "*.ts" -not -path "*/__tests__/*" | xargs md5sum > post-migration-checksums.txt
find src/schemas/marketing -name "*.ts" -not -path "*/__tests__/*" | xargs md5sum >> post-migration-checksums.txt
find src/hooks/marketing -name "*.ts" -not -path "*/__tests__/*" | xargs md5sum >> post-migration-checksums.txt
diff pre-migration-checksums.txt post-migration-checksums.txt
# Should show NO differences
```

### 3. Git Protection
```bash
# Create a protection branch before changes
git checkout -b marketing-test-migration-protection
git add src/services/marketing/*.ts src/schemas/marketing/*.ts src/hooks/marketing/*.ts
git commit -m "PROTECTION: Lock production marketing code before test migration"
```

## Detailed Task List

### Phase 1: Analysis & Documentation (No Code Changes)
- [ ] Document all test failures and their root causes
- [ ] Map test file names to actual service file names
- [ ] Identify mock pattern differences between Docker and main
- [ ] Create rollback plan

### Phase 2: Test Infrastructure Setup (Test Files Only)
- [ ] Create `src/test/marketing-mocks.ts` with proper mock patterns
- [ ] Update `jest.config.marketing.js` configuration
- [ ] Create test-specific setup files

### Phase 3: Fix Test Files (No Service Changes)

#### 3.1 Fix Mock Hoisting Issues
**Problem:** `jest.mock()` can't reference external variables
**Solution:** Inline mock implementations

```typescript
// ❌ BROKEN - Current pattern
import { createMockSupabaseClient } from '@/test/serviceSetup';
jest.mock('@/config/supabase', () => ({
  supabase: createMockSupabaseClient() // FAILS - can't access external
}));

// ✅ FIXED - New pattern
jest.mock('@/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }
}));
```

#### 3.2 Fix Import Path Mismatches
**Files to Update:**
- `analyticsService.test.ts` → import from `../marketingAnalytics.service`
- `bundleService.test.ts` → verify imports `../bundleService`
- `workflowService.test.ts` → verify imports `../workflowService`
- `campaignService.test.ts` → verify imports `../campaignService`

#### 3.3 Test File Changes Required
| Test File | Issue | Fix Required |
|-----------|-------|--------------|
| analyticsService.test.ts | Mock hoisting + wrong import | Inline mock + fix import path |
| bundleService.test.ts | Mock hoisting | Inline mock |
| campaignService.test.ts | Mock hoisting | Inline mock |
| workflowService.test.ts | Mock hoisting | Inline mock |
| contentService.test.ts | Undefined supabase | Fix mock initialization |

### Phase 4: Validation (Read-Only)
- [ ] Run all marketing service tests
- [ ] Run all marketing hook tests
- [ ] Verify production code unchanged (checksum comparison)
- [ ] Generate coverage report

## Implementation Steps

### Step 1: Create Marketing Mock Module
```typescript
// src/test/mocks/marketing-supabase.mock.ts
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn()
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn()
    }))
  },
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn()
  }
};
```

### Step 2: Update Each Test File
For each failing test, apply this pattern:

```typescript
// Before test imports
jest.mock('@/config/supabase', () => {
  // Inline mock definition - no external references
  const mockFrom = jest.fn();
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    // ... rest of chain methods
  });
  
  return {
    supabase: { from: mockFrom }
  };
});

// Then import the service
import { actualService } from '../actualServiceFile';
```

### Step 3: Validation Commands
```bash
# Test execution
npm run test:marketing:services
npm run test:marketing:hooks

# Verify no production changes
git status src/services/marketing/*.ts src/schemas/marketing/*.ts src/hooks/marketing/*.ts
# Should show NO modified files outside __tests__ folders

# Check specific service integrity
git diff src/services/marketing/marketingCampaign.service.ts
# Should show NO changes
```

## Rollback Plan

### If Tests Break Production:
1. `git checkout marketing-test-migration-protection -- src/services/marketing/`
2. `git checkout marketing-test-migration-protection -- src/schemas/marketing/`
3. `git checkout marketing-test-migration-protection -- src/hooks/marketing/`

### If Tests Still Fail:
1. Revert test file changes: `git checkout HEAD~1 -- src/services/marketing/__tests__/`
2. Restore original jest config: `git checkout HEAD~1 -- jest.config.marketing.js`

## Success Criteria

### Must Have (Required):
- [ ] Zero changes to production service files
- [ ] Zero changes to production schema files
- [ ] Zero changes to production hook files
- [ ] Service tests: ≥100 tests passing (current: 122)
- [ ] No new dependencies added to package.json (production deps)

### Should Have (Target):
- [ ] Service tests: 122/122 passing (100%)
- [ ] Hook tests: 84/89 passing (94.4%)
- [ ] All test files using consistent mock patterns

### Nice to Have:
- [ ] Consolidated mock utilities for future tests
- [ ] Documentation for adding new marketing tests
- [ ] Coverage reports matching Docker volumes

## Timeline

1. **Phase 1 (Documentation)**: 30 minutes
2. **Phase 2 (Infrastructure)**: 1 hour
3. **Phase 3 (Fix Tests)**: 2-3 hours
4. **Phase 4 (Validation)**: 30 minutes

**Total Estimated Time**: 4-5 hours

## Command Reference

```bash
# Create protection snapshot
./scripts/protect-marketing-code.sh

# Run migration
./scripts/migrate-marketing-tests.sh

# Validate no changes
./scripts/validate-marketing-unchanged.sh

# Run tests
npm run test:marketing:services
npm run test:marketing:hooks
npm run test:marketing

# Rollback if needed
./scripts/rollback-marketing-tests.sh
```

## Notes

- This migration ONLY touches test infrastructure
- Production code remains 100% unchanged
- All changes are reversible
- Tests can fail without affecting production functionality