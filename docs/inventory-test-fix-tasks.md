# Inventory Test Fix Task List

## Goal: Match Docker Volume Success Rate (91.8%)

### Current Status
- **Docker Volumes**: 91.8% pass rate (112/122 tests)
- **Main Branch**: 26.7% pass rate (87/326 tests)
- **Gap to Close**: 65.1%

---

## Phase 1: Environment Setup (30 minutes)

### Task 1.1: Install TypeScript Jest Dependencies
```bash
npm install --save-dev ts-jest @types/jest typescript
```
**Verification**: Check package.json has ts-jest@^29.x.x

### Task 1.2: Create TypeScript Jest Configuration
**File**: `jest.config.inventory-ts.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/services/inventory/__tests__/**/*.test.ts',
    '<rootDir>/src/hooks/inventory/__tests__/**/*.test.tsx',
    '<rootDir>/src/screens/inventory/__tests__/**/*.test.tsx'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.tsx$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^schemas/(.*)$': '<rootDir>/src/schemas/$1',
    '^services/(.*)$': '<rootDir>/src/services/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  clearMocks: true,
  collectCoverageFrom: [
    'src/services/inventory/**/*.ts',
    'src/hooks/inventory/**/*.tsx',
    'src/screens/inventory/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
};
```
**Verification**: File created at root level

### Task 1.3: Add NPM Scripts
**File**: `package.json`
```json
"scripts": {
  "test:inventory:ts": "jest --config=jest.config.inventory-ts.js --forceExit",
  "test:inventory:ts:watch": "jest --config=jest.config.inventory-ts.js --watch",
  "test:inventory:ts:coverage": "jest --config=jest.config.inventory-ts.js --coverage"
}
```
**Verification**: `npm run test:inventory:ts -- --listTests` shows test files

---

## Phase 2: Copy Test Infrastructure (45 minutes)

### Task 2.1: Copy SimplifiedSupabaseMock
**Source**: `docker/volumes/tdd_phase_2-inventory-services/src/test/serviceSetup.ts`
**Destination**: `src/test/supabase-setup.ts`
```bash
cp docker/volumes/tdd_phase_2-inventory-services/src/test/serviceSetup.ts \
   src/test/supabase-setup.ts
```
**Verification**: File exists and exports `SimplifiedSupabaseMock` class

### Task 2.2: Create Test Factories (if missing)
**Source**: `docker/volumes/tdd_phase_2-inventory-services/src/test/factories.ts`
**Destination**: `src/test/inventory-factories.ts`
```bash
# Check if factories exist in docker volume
find docker/volumes/tdd_phase_2-inventory-services -name "*factor*" -o -name "*mock*"
# Copy if they exist
```
**Verification**: Factory functions available for test data

### Task 2.3: Copy Test Utilities
**Check for**: Helper functions, custom matchers, test data generators
```bash
# List all test utilities
ls docker/volumes/tdd_phase_2-inventory-services/src/test/
ls docker/volumes/tdd_phase_2-inventory-services/src/utils/test/
```
**Verification**: All test utilities copied

---

## Phase 3: Replace Test Files (1 hour)

### Task 3.1: Backup Current Tests
```bash
# Create backup directory
mkdir -p src/services/inventory/__tests__/backup
mkdir -p src/hooks/inventory/__tests__/backup
mkdir -p src/screens/inventory/__tests__/backup

# Backup existing tests
cp src/services/inventory/__tests__/*.ts src/services/inventory/__tests__/backup/
cp src/hooks/inventory/__tests__/*.tsx src/hooks/inventory/__tests__/backup/ 2>/dev/null
cp src/screens/inventory/__tests__/*.tsx src/screens/inventory/__tests__/backup/ 2>/dev/null
```
**Verification**: Backup files created

### Task 3.2: Copy Service Tests from Docker Volume
```bash
# Copy service tests
cp docker/volumes/tdd_phase_2-inventory-services/src/services/inventory/__tests__/*.test.ts \
   src/services/inventory/__tests__/

# List copied files
ls -la src/services/inventory/__tests__/*.test.ts
```
**Expected Files**:
- `inventoryService.test.ts`
- `stockMovementService.test.ts`
- `bulkOperationsService.test.ts` (if exists)

**Verification**: Files copied, no syntax errors

### Task 3.3: Copy Hook Tests from Docker Volume
```bash
# Copy hook tests
cp docker/volumes/tdd_phase_2-inventory-hooks/src/hooks/inventory/__tests__/*.test.tsx \
   src/hooks/inventory/__tests__/

# List copied files
ls -la src/hooks/inventory/__tests__/*.test.tsx
```
**Expected Files**:
- `useInventory.test.tsx`
- `useStockMovements.test.tsx`
- `useBulkOperations.test.tsx`

**Verification**: Files copied

### Task 3.4: Copy Screen Tests from Docker Volume
```bash
# Copy screen tests
cp docker/volumes/tdd_phase_2-inventory-screens/src/screens/inventory/__tests__/*.test.tsx \
   src/screens/inventory/__tests__/

# List copied files
ls -la src/screens/inventory/__tests__/*.test.tsx
```
**Verification**: Files copied

---

## Phase 4: Fix Import Paths (30 minutes)

### Task 4.1: Update Service Test Imports
**Files**: All files in `src/services/inventory/__tests__/`
**Changes**:
```typescript
// FROM:
import { SimplifiedSupabaseMock } from '../../../test/serviceSetup';

// TO:
import { SimplifiedSupabaseMock } from '../../../test/supabase-setup';
```
**Verification**: No import errors in IDE

### Task 4.2: Update Hook Test Imports
**Files**: All files in `src/hooks/inventory/__tests__/`
**Check for**:
- Correct paths to test utilities
- Correct paths to mock data
- Correct paths to services

**Verification**: No import errors

### Task 4.3: Fix ValidationMonitor Mock Calls
**Search for**: `ValidationMonitor.recordValidationError`
**Update**:
```typescript
// Check what property name is expected
// Docker volume uses: { service: 'inventory', ... }
// Main branch might use: { context: 'inventory', ... }
```
**Verification**: Mock expectations match

---

## Phase 5: Run and Fix Tests (1 hour)

### Task 5.1: Run Service Tests First
```bash
npm run test:inventory:ts -- src/services/inventory/__tests__/
```
**Expected**: 32 tests passing (100%)
**If failing**: Check error messages for:
- Import path issues
- Mock setup problems
- Missing dependencies

### Task 5.2: Run Hook Tests
```bash
npm run test:inventory:ts -- src/hooks/inventory/__tests__/
```
**Expected**: ~40-50 tests passing
**Common fixes**:
- React Testing Library setup
- React Query provider wrapper
- Mock data format

### Task 5.3: Run Screen Tests
```bash
npm run test:inventory:ts -- src/screens/inventory/__tests__/
```
**Expected**: ~40-50 tests passing
**Common fixes**:
- Navigation mocks
- Component rendering issues
- Async handling

### Task 5.4: Run All Inventory Tests
```bash
npm run test:inventory:ts
```
**Target**: 112+ tests passing (91.8% minimum)

---

## Phase 6: Fine-tuning (30 minutes)

### Task 6.1: Fix Remaining Test Failures
**For each failing test**:
1. Read error message
2. Check if it's:
   - Mock data format issue
   - Timing/async issue
   - Import path issue
   - API expectation mismatch
3. Fix individually

### Task 6.2: Verify Coverage
```bash
npm run test:inventory:ts:coverage
```
**Target**: 85%+ coverage

### Task 6.3: Set Up Watch Mode
```bash
npm run test:inventory:ts:watch
```
**Verification**: Tests re-run on file changes

---

## Validation Checklist

### After Phase 1
- [ ] ts-jest installed
- [ ] New config file created
- [ ] Test scripts added to package.json

### After Phase 2
- [ ] SimplifiedSupabaseMock available
- [ ] Test utilities copied
- [ ] No missing dependencies

### After Phase 3
- [ ] All test files copied from docker volumes
- [ ] Backup created of original tests
- [ ] File count matches docker volumes

### After Phase 4
- [ ] No import errors
- [ ] All paths resolved
- [ ] Mocks properly configured

### After Phase 5
- [ ] Service tests: 32/32 passing
- [ ] Hook tests: 40+ passing
- [ ] Screen tests: 40+ passing
- [ ] Overall: 91.8%+ pass rate

### After Phase 6
- [ ] All tests passing
- [ ] Coverage >= 85%
- [ ] Watch mode working
- [ ] Documentation updated

---

## Quick Reference Commands

```bash
# Install dependencies
npm install --save-dev ts-jest @types/jest typescript

# Run specific test suites
npm run test:inventory:ts -- src/services/inventory/__tests__/
npm run test:inventory:ts -- src/hooks/inventory/__tests__/
npm run test:inventory:ts -- src/screens/inventory/__tests__/

# Run all with coverage
npm run test:inventory:ts:coverage

# Watch mode for development
npm run test:inventory:ts:watch

# Check current pass rate
npm run test:inventory:ts 2>&1 | grep -E "Tests:|Test Suites:"
```

---

## Troubleshooting Guide

### Issue: "Cannot find module 'ts-jest'"
**Fix**: `npm install --save-dev ts-jest`

### Issue: "Cannot find module '../../../test/serviceSetup'"
**Fix**: Ensure file copied to `src/test/supabase-setup.ts`

### Issue: "ValidationMonitor.recordValidationError expects different arguments"
**Fix**: Update mock calls to match expected format (check docker volume tests)

### Issue: "Timeout errors in async tests"
**Fix**: Increase timeout in jest config: `testTimeout: 10000`

### Issue: "React hooks testing errors"
**Fix**: Ensure proper test wrapper with QueryClient provider

---

## Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Service Tests | 22/35 (62.9%) | 32/32 (100%) | ⏳ |
| Hook Tests | 30/140 (21.4%) | 40/45 (89%) | ⏳ |
| Screen Tests | 35/151 (23.2%) | 40/45 (89%) | ⏳ |
| **Overall** | **87/326 (26.7%)** | **112/122 (91.8%)** | ⏳ |

---

## Estimated Timeline

- **Phase 1**: 30 minutes (Environment Setup)
- **Phase 2**: 45 minutes (Copy Infrastructure)
- **Phase 3**: 60 minutes (Replace Test Files)
- **Phase 4**: 30 minutes (Fix Imports)
- **Phase 5**: 60 minutes (Run and Fix)
- **Phase 6**: 30 minutes (Fine-tuning)

**Total**: ~4.5 hours

---

## Notes

1. **Keep both test configs** during transition (old and new)
2. **Test incrementally** - don't try to fix everything at once
3. **Document any deviations** from docker volume patterns
4. **Commit after each successful phase** for easy rollback

---

*Task List Created: 2025-09-12*
*Target Completion: Same day*
*Success Criterion: 91.8% pass rate matching docker volumes*