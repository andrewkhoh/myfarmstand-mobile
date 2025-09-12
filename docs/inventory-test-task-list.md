# Inventory Test Task List

## Quick Reference - Priority Tasks

### 🔴 TODAY - Critical Fixes
- [ ] Fix `__DEV__` not defined error
- [ ] Fix `mockFrom` undefined in stockMovementService.mock.test.ts  
- [ ] Separate node vs jest-expo environments

### 🟡 THIS WEEK - Important Fixes
- [ ] Create comprehensive test setup files
- [ ] Add React Native module mocks
- [ ] Fix babel configuration for tests

### 🟢 NEXT WEEK - Quality Improvements
- [ ] Add test factories
- [ ] Configure coverage reporting
- [ ] Document testing procedures

---

## Detailed Task Breakdown

### Priority 1: Critical Fixes (Blocking Issues)

#### 1.1 Fix React Native Global Variables
**Status:** 🔴 Not Started  
**Blocking:** All hooks and screens tests  
**Time Estimate:** 1 hour  

**Tasks:**
- [ ] Create `src/test/globals.js` with React Native globals
- [ ] Add `__DEV__ = false` global definition
- [ ] Add other RN globals (Platform, etc.)
- [ ] Update jest configs to use globals file

**Implementation:**
```javascript
// src/test/globals.js
global.__DEV__ = false;
global.__TEST__ = true;
```

---

#### 1.2 Fix mockFrom Undefined Error
**Status:** 🔴 Not Started  
**Blocking:** 13 service tests  
**Time Estimate:** 30 minutes  

**Tasks:**
- [ ] Open `src/services/inventory/__tests__/stockMovementService.mock.test.ts`
- [ ] Define mockFrom variable properly
- [ ] Ensure all mock variables are initialized
- [ ] Run tests to verify fix

**Implementation:**
```javascript
// Add at top of test file
const mockFrom = jest.fn();
// Or extract from mocked supabase client
```

---

#### 1.3 Fix Test Environment Separation
**Status:** 🔴 Not Started  
**Blocking:** Environment conflicts  
**Time Estimate:** 1 hour  

**Tasks:**
- [ ] Update `jest.config.inventory.services.js` - use node environment
- [ ] Update `jest.config.inventory.js` - use jest-expo for UI
- [ ] Verify configs don't conflict
- [ ] Test both environments separately

**Config Updates:**
```javascript
// Services: testEnvironment: 'node'
// UI: preset: 'jest-expo'
```

---

### Priority 2: Important Improvements

#### 2.1 Create Test Setup Files
**Status:** 🟡 Not Started  
**Impact:** Test consistency  
**Time Estimate:** 2 hours  

**Tasks:**
- [ ] Create `src/test/base-setup.ts`
- [ ] Update `src/test/test-setup.ts` 
- [ ] Create mock initialization
- [ ] Add cleanup functions
- [ ] Configure React Query mocks

**Files to Create:**
```
src/test/
├── base-setup.ts      # Base configuration
├── test-setup.ts      # Main setup
└── serviceSetup.ts    # Service-specific
```

---

#### 2.2 Add React Native Module Mocks
**Status:** 🟡 Not Started  
**Impact:** Module resolution  
**Time Estimate:** 2 hours  

**Tasks:**
- [ ] Create `src/test/__mocks__/react-native/index.js`
- [ ] Mock Image, Platform, Alert modules
- [ ] Mock AsyncStorage
- [ ] Mock navigation modules
- [ ] Test with UI components

**Mock Structure:**
```javascript
// src/test/__mocks__/react-native/index.js
module.exports = {
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Image: {},
  // ... other mocks
};
```

---

#### 2.3 Update Babel Configuration
**Status:** 🟡 Not Started  
**Impact:** Proper transpilation  
**Time Estimate:** 30 minutes  

**Tasks:**
- [ ] Check current babel.config.js
- [ ] Add test-specific configuration
- [ ] Ensure babel-preset-expo is used
- [ ] Test transformation works

---

### Priority 3: Quality Improvements

#### 3.1 Add Test Factories
**Status:** 🟢 Not Started  
**Impact:** Test maintainability  
**Time Estimate:** 1 hour  

**Tasks:**
- [ ] Create `src/test/factories.ts`
- [ ] Add createUser factory
- [ ] Add createProduct factory
- [ ] Add createInventoryItem factory
- [ ] Add resetAllFactories function

---

#### 3.2 Configure Coverage Reporting
**Status:** 🟢 Not Started  
**Impact:** Quality metrics  
**Time Estimate:** 30 minutes  

**Tasks:**
- [ ] Add coverage settings to jest configs
- [ ] Set coverage thresholds
- [ ] Configure coverage directories
- [ ] Add coverage npm scripts

---

#### 3.3 Create Test Documentation
**Status:** 🟢 Not Started  
**Impact:** Developer onboarding  
**Time Estimate:** 1 hour  

**Tasks:**
- [ ] Create testing guide
- [ ] Document test commands
- [ ] Add troubleshooting section
- [ ] Include examples

---

## Daily Checklist

### Day 1 (Environment Setup)
- [ ] Morning: Fix React Native globals (Task 1.1)
- [ ] Morning: Fix mockFrom issue (Task 1.2)
- [ ] Afternoon: Separate environments (Task 1.3)
- [ ] Afternoon: Verify service tests run
- [ ] End of Day: Document progress

### Day 2 (Test Fixes)
- [ ] Morning: Create test setup files (Task 2.1)
- [ ] Afternoon: Add RN module mocks (Task 2.2)
- [ ] Afternoon: Update babel config (Task 2.3)
- [ ] End of Day: Run full test suite

### Day 3 (Quality & Polish)
- [ ] Morning: Add test factories (Task 3.1)
- [ ] Afternoon: Configure coverage (Task 3.2)
- [ ] Afternoon: Write documentation (Task 3.3)
- [ ] End of Day: Final validation

---

## Verification Steps

### After Each Fix
1. Run affected tests
2. Check for new errors
3. Verify pass rate improved
4. Commit working changes

### Test Commands
```bash
# After Priority 1 fixes
npm run test:inventory:services  # Should work
npm run test:inventory:hooks     # Should start working

# After Priority 2 fixes  
npm run test:inventory           # All tests should run

# After Priority 3 fixes
npm run test:inventory -- --coverage  # With coverage
```

---

## Success Criteria

### Minimum Viable Success
- ✅ Service tests: 80%+ pass rate
- ✅ Hooks tests: Running without crashes
- ✅ No environment errors

### Target Success
- ✅ Service tests: 90%+ pass rate
- ✅ Hooks tests: 85%+ pass rate
- ✅ Screens tests: 85%+ pass rate
- ✅ Overall: Match docker volume 91.8%

---

## Blocked/Waiting Items

### Currently Blocked
- Hooks tests: Waiting for React Native globals fix
- Screens tests: Waiting for jest-expo fix
- Integration tests: Waiting for base tests to work

### Dependencies
- babel-preset-expo package installed
- jest-expo package configured
- React Query properly mocked

---

## Notes & Observations

### From Docker Volume Analysis
- Docker volumes achieve 91.8% pass rate
- They use ts-jest with proper setup
- Comprehensive mocks are key to success
- Separate configs prevent conflicts

### Common Pitfalls to Avoid
- Don't mix node and jest-expo environments
- Always mock React Native globals
- Initialize all mock variables
- Keep setup files modular

---

## Quick Fixes Reference

### Fix: ReferenceError: __DEV__ is not defined
```javascript
// Add to setup file
global.__DEV__ = false;
```

### Fix: Cannot find module '../Libraries/Image/Image'
```javascript
// Mock React Native properly
jest.mock('react-native', () => require('./test/__mocks__/react-native'));
```

### Fix: mockFrom is not defined
```javascript
// Define mock properly
const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: [], error: null })
  })
});
```

---

*Last Updated: 2025-09-12*
*Target Completion: 3 days*
*Success Metric: 91.8% pass rate*