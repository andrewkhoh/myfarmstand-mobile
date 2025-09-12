# Inventory Test Improvement Plan

## Executive Summary

This document outlines the plan to improve inventory test pass rates from the current partially working state to match the 91.8% pass rate achieved in the TDD Phase 2 docker volumes.

**Current State:**
- Service tests: Partially working (22 passing, 13 failing)
- Hooks/Screens tests: Not running (React Native environment issues)
- Main issues: Environment configuration, missing mocks, undefined variables

**Target State:**
- Match docker volume performance: 91.8% pass rate (112/122 tests)
- All test suites running successfully
- Proper separation of test environments

## Analysis Results

### Docker Volume Test Performance (Baseline)
```
Location: docker/projects/tdd_phase_2/docker/volumes/
Pass Rate: 112/122 tests (91.8%)
Test Suites: 6 total (4 passed, 2 failed)
Configuration: ts-jest with proper mocks
```

### Main Branch Current State
```
Service Tests: 3 suites (1 passed, 2 failed)
- 22 tests passing
- 13 tests failing (mockFrom undefined)
Hooks/Screens: Cannot run (React Native setup issues)
- Missing __DEV__ global
- React Native module resolution errors
```

## Key Differences Identified

### 1. Test Environment Configuration
| Aspect | Docker Volume | Main Branch | Impact |
|--------|--------------|-------------|---------|
| Services Environment | node | mixed | Medium |
| Hooks Environment | jest-expo with mocks | jest-expo broken | High |
| Setup Files | Comprehensive test-setup.ts | Missing/incomplete | High |
| Babel Config | babel-preset-expo | babel-jest only | Medium |

### 2. Mock Implementation
| Mock Type | Docker Volume | Main Branch | Impact |
|-----------|--------------|-------------|---------|
| React Native globals | Properly mocked | Missing __DEV__ | High |
| Supabase mocks | SimplifiedSupabaseMock | Partial implementation | Medium |
| Test utilities | Complete factories | Missing factories | Low |
| Module mocks | Comprehensive | Incomplete | High |

### 3. Configuration Structure
| Config Aspect | Docker Volume | Main Branch | Impact |
|---------------|--------------|-------------|---------|
| Separate configs | Yes (services/hooks) | Attempted but broken | High |
| Test matchers | Properly configured | Working | Low |
| Transform patterns | Correct for RN | Missing packages | High |
| Module mappers | Complete | Partial | Medium |

## Prioritized Task List

### 🔴 Priority 1: Critical Fixes (Immediate Impact)

#### Task 1.1: Fix React Native Global Mocks
**Problem:** `__DEV__` and other React Native globals are undefined
**Solution:** Add global mocks to setup files
**Impact:** Enables all React Native component tests to run
**Estimated Effort:** 1 hour
**Files to modify:**
- `src/test/test-setup.ts`
- `src/test/serviceSetup.ts`

#### Task 1.2: Fix undefined mockFrom Variable
**Problem:** `mockFrom` is not defined in stockMovementService.mock.test.ts
**Solution:** Properly initialize mock variables
**Impact:** Fixes 13 failing service tests immediately
**Estimated Effort:** 30 minutes
**Files to modify:**
- `src/services/inventory/__tests__/stockMovementService.mock.test.ts`

#### Task 1.3: Separate Test Environments Properly
**Problem:** Mixed environments causing conflicts
**Solution:** Use node for services, jest-expo for UI
**Impact:** Prevents environment conflicts, enables proper testing
**Estimated Effort:** 1 hour
**Files to modify:**
- `jest.config.inventory.js`
- `jest.config.inventory.services.js`

### 🟡 Priority 2: Important Improvements (High Impact)

#### Task 2.1: Create Comprehensive Test Setup
**Problem:** Missing or incomplete test setup files
**Solution:** Port setup from docker volumes
**Impact:** Consistent test environment
**Estimated Effort:** 2 hours
**Files to create/modify:**
- `src/test/base-setup.ts`
- `src/test/test-setup.ts`
- `src/test/serviceSetup.ts`

#### Task 2.2: Add Missing Module Mocks
**Problem:** React Native modules not properly mocked
**Solution:** Create comprehensive mock directory
**Impact:** Fixes module resolution errors
**Estimated Effort:** 2 hours
**Files to create:**
- `src/test/__mocks__/react-native.js`
- `src/test/__mocks__/@react-native-community/*.js`

#### Task 2.3: Fix Babel Configuration
**Problem:** Babel not configured for React Native
**Solution:** Update babel config for tests
**Impact:** Proper transformation of test files
**Estimated Effort:** 30 minutes
**Files to modify:**
- `babel.config.js`
- Create `babel.config.test.js` if needed

### 🟢 Priority 3: Quality Improvements (Nice to Have)

#### Task 3.1: Add Test Factories
**Problem:** No consistent test data generation
**Solution:** Port factories from docker volumes
**Impact:** Easier test maintenance
**Estimated Effort:** 1 hour
**Files to create:**
- `src/test/factories.ts`

#### Task 3.2: Improve Test Coverage Reporting
**Problem:** No coverage visibility
**Solution:** Configure coverage settings
**Impact:** Better quality metrics
**Estimated Effort:** 30 minutes
**Files to modify:**
- All jest.config files

#### Task 3.3: Add Test Documentation
**Problem:** No test running documentation
**Solution:** Create test guide
**Impact:** Easier onboarding
**Estimated Effort:** 1 hour
**Files to create:**
- `docs/testing-guide.md`

## Implementation Steps

### Step 1: Environment Setup (Day 1)
1. Create global mocks for React Native
2. Fix babel configuration
3. Separate test environments properly
4. Verify basic tests run

### Step 2: Fix Failing Tests (Day 1-2)
1. Fix undefined mockFrom issue
2. Update import paths
3. Fix mock implementations
4. Run and verify service tests

### Step 3: Enable UI Tests (Day 2)
1. Add React Native mocks
2. Configure jest-expo properly
3. Test hooks and screens
4. Verify pass rates

### Step 4: Quality Improvements (Day 3)
1. Add test factories
2. Configure coverage
3. Document testing process
4. Create CI/CD integration

## Success Metrics

### Immediate Goals
- [ ] All inventory service tests running
- [ ] No undefined variable errors
- [ ] At least 80% pass rate for services

### Short-term Goals (1 week)
- [ ] Hooks and screens tests running
- [ ] 90% overall pass rate
- [ ] Coverage reporting enabled

### Long-term Goals (2 weeks)
- [ ] Match docker volume pass rate (91.8%)
- [ ] Full test documentation
- [ ] CI/CD integration complete

## Risk Mitigation

### Risk 1: React Native Version Incompatibility
**Mitigation:** Use version-specific mocks, test incrementally

### Risk 2: Breaking Existing Tests
**Mitigation:** Create separate configs first, migrate gradually

### Risk 3: Performance Impact
**Mitigation:** Use focused test runs, optimize setup files

## Testing Commands

### Current Working Commands
```bash
# Partially working
npm run test:inventory:services

# Not working (needs fixes)
npm run test:inventory:hooks
npm run test:inventory
```

### After Implementation
```bash
# All should work
npm run test:inventory           # Run all inventory tests
npm run test:inventory:services  # Run service tests only
npm run test:inventory:hooks     # Run hooks/screens tests
npm run test:inventory:watch     # Watch mode for development
```

## Validation Checklist

- [ ] Service tests pass at 90%+
- [ ] Hooks tests run without environment errors
- [ ] Screen tests render without crashes
- [ ] Coverage reports generate correctly
- [ ] No console errors during test runs
- [ ] Test times under 60 seconds total

## Appendix: Configuration Templates

### Recommended jest.config.inventory.js
```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  setupFiles: ['<rootDir>/src/test/globals.js'],
  testEnvironment: 'node',
  // ... additional config
};
```

### Recommended Mock Structure
```
src/test/
├── __mocks__/
│   ├── react-native.js
│   ├── @react-native-community/
│   └── expo-modules/
├── factories.ts
├── test-setup.ts
├── serviceSetup.ts
└── base-setup.ts
```

## Next Steps

1. Review and approve this plan
2. Create feature branch for test improvements
3. Implement Priority 1 tasks
4. Validate improvements
5. Continue with Priority 2 and 3 tasks
6. Merge to main branch

---

*Document created: 2025-09-12*
*Last updated: 2025-09-12*
*Author: Test Improvement Team*