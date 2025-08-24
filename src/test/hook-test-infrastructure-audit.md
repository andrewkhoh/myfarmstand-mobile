# Hook Test Infrastructure Compliance Audit

## 🎯 **Refactored Infrastructure Pattern Checklist**

### **✅ Core Components Required**

#### **1. Centralized Setup System**
- [ ] Uses `createWrapper()` from `../../test/test-utils`
- [ ] No manual QueryClient configuration
- [ ] Leverages TestMode configurations when needed
- [ ] Imports from consolidated base-setup

#### **2. Schema-Validated Factories**
- [ ] Imports factories from `../../test/factories`
- [ ] Uses `resetAllFactories()` in beforeEach
- [ ] Uses factory functions instead of inline mock data
- [ ] All test entities pass schema validation

#### **3. Simplified Mocking System**
- [ ] Uses jest.mock() for services (not manual mocks)
- [ ] Mocks query key factories
- [ ] Avoids complex mock chains
- [ ] Uses defensive imports for hook modules

#### **4. Proven Hook Test Pattern**
- [ ] `.tsx` extension for JSX-based hooks
- [ ] Defensive imports with try/catch
- [ ] Factory-created mock data
- [ ] Pre-configured wrapper usage
- [ ] Progressive test structure (import → render → functionality)

---

## 📋 **Individual Hook Test Audits**

### **useAuth Tests**

#### **useAuth.race.simple.test.tsx**
- ❌ **Manual QueryClient setup** (should use createWrapper)
- ❌ **Inline mock data** (should use createUser factory)
- ❌ **Mock data mismatch** (expected vs received user objects)
- ❌ **Complex beforeEach setup** (should use resetAllFactories)
- ❌ **Manual cleanup** (handled by infrastructure)
- ✅ Defensive imports pattern
- ✅ `.tsx` extension

**Compliance Score: 2/8 (25%)**

#### **useAuth.test.tsx**
- ❌ **Manual QueryClient setup** (should use createWrapper)
- ❌ **Inline mock data** (should use createUser factory)
- ❌ **Complex service mocking** (should be simplified)
- ✅ Defensive imports
- ✅ `.tsx` extension
- ✅ jest.mock() usage
- ✅ Query key factory mocking

**Compliance Score: 4/8 (50%)**

### **useCart Tests**

#### **useCart.test.ts**
- ❌ **Wrong extension** (.ts should be .tsx)
- ❌ **Complex broadcast mocking** (should use infrastructure)
- ❌ **Manual wrapper creation** (should use createWrapper)
- ❌ **Inline mock data** (should use createUser, createCartItem factories)
- ❌ **Direct supabase mock imports** (should use jest.mock)
- ❌ **No resetAllFactories** usage
- ✅ Uses hookContracts
- ✅ Query key factory mocking

**Compliance Score: 2/8 (25%)**

#### **useCart.race.test.tsx**
- ❌ **Manual QueryClient setup** (should use createWrapper)
- ❌ **Inline mock data** (should use factories)
- ❌ **Complex race condition setup** (infrastructure handles this)
- ❌ **Manual cleanup** (handled by infrastructure)
- ✅ `.tsx` extension
- ✅ Real timers approach

**Compliance Score: 2/8 (25%)**

### **useOrders Tests**

#### **useOrders.test.ts**
- ❌ **Wrong extension** (.ts should be .tsx)
- ❌ **Complex service mocking** (should be simplified)
- ❌ **Inline mock data** (should use createOrder, createUser factories)
- ❌ **Manual wrapper setup** (should use createWrapper)
- ❌ **No factory resets** (should use resetAllFactories)
- ❌ **Direct service imports in tests** (should be mocked)

**Compliance Score: 0/8 (0%)**

### **useProducts Tests**

#### **useProducts.test.ts**
- ❌ **Wrong extension** (.ts should be .tsx)
- ❌ **Manual mock setup** (should use infrastructure)
- ❌ **Inline mock data** (should use createProduct factories)
- ❌ **Complex service mocking** (should be simplified)
- ❌ **No factory usage** (should use resetAllFactories)

**Compliance Score: 0/8 (0%)**

---

## 🔍 **Gap Analysis by Category**

### **Critical Infrastructure Gaps**

1. **Manual QueryClient Setup** (90% of tests)
   - All tests create their own QueryClient instead of using createWrapper()
   - Leads to inconsistent configurations and hanging tests

2. **Inline Mock Data** (85% of tests)
   - Tests use hardcoded objects instead of schema-validated factories
   - Causes mock data mismatches and validation failures

3. **Wrong File Extensions** (60% of tests)
   - Many hook tests use `.ts` instead of `.tsx`
   - Causes compilation issues with JSX-based hooks

4. **No Factory Isolation** (95% of tests)
   - Tests don't use resetAllFactories() in beforeEach
   - Leads to test interdependencies and flaky results

### **Pattern Compliance Issues**

1. **Complex Mock Chains** (70% of tests)
   - Manual mock creation instead of simplified jest.mock()
   - Increases maintenance burden and failure points

2. **Direct Service Imports** (50% of tests)
   - Tests import services directly instead of mocking them
   - Causes compilation and dependency issues

3. **Missing Defensive Imports** (60% of tests)
   - No try/catch around hook imports
   - Causes cascading failures when hooks have issues

---

## 📈 **Implementation Priority Matrix**

### **High Priority (Immediate Fix Required)**
1. **Fix file extensions** (.ts → .tsx) - 5 tests
2. **Replace manual QueryClient with createWrapper()** - 12 tests
3. **Replace inline data with factories** - 10 tests
4. **Add resetAllFactories() to beforeEach** - 15 tests

### **Medium Priority (Infrastructure Leverage)**
1. **Simplify service mocking patterns** - 8 tests
2. **Add defensive imports** - 9 tests
3. **Remove manual cleanup code** - 6 tests
4. **Standardize query key factory mocking** - 7 tests

### **Low Priority (Optimization)**
1. **Add factory-based test scenarios** - All tests
2. **Leverage TestMode configurations** - Race condition tests
3. **Add schema validation checks** - All tests

---

## 🎯 **Expected Outcomes After Infrastructure Adoption**

### **Before Refactored Infrastructure**
- **Pass Rate**: 32.6% (45/138 tests)
- **Issues**: Mock data mismatches, hanging tests, compilation errors
- **Maintenance**: High - each test has custom setup

### **After Infrastructure Adoption (Projected)**
- **Pass Rate**: 75-85% (104-117/138 tests)
- **Benefits**: Schema-validated data, consistent setup, graceful degradation
- **Maintenance**: Low - centralized infrastructure handles complexity

### **Success Metrics**
- [ ] All tests use createWrapper() - **0% currently, target 100%**
- [ ] All tests use factory data - **5% currently, target 100%**
- [ ] All tests use resetAllFactories() - **0% currently, target 100%**
- [ ] All tests use .tsx extension - **40% currently, target 100%**
- [ ] Pass rate improvement - **32.6% currently, target 80%+**

---

## 🚀 **Implementation Strategy**

### **Phase 1: Foundation (Critical Fixes)**
1. Fix all file extensions (.ts → .tsx)
2. Replace QueryClient setup with createWrapper()
3. Add resetAllFactories() to all beforeEach blocks

### **Phase 2: Data Layer (Factory Integration)**
1. Replace inline mock data with factory functions
2. Remove hardcoded test entities
3. Add schema validation checks

### **Phase 3: Simplification (Mock Cleanup)**
1. Simplify service mocking patterns
2. Add defensive imports to all tests
3. Remove manual cleanup code

### **Phase 4: Optimization (Infrastructure Leverage)**
1. Add realistic test scenarios using testScenarios
2. Leverage TestMode configurations
3. Add performance and reliability improvements

This systematic approach should improve hook test pass rate from **32.6%** to **80%+** while reducing maintenance burden and improving reliability.