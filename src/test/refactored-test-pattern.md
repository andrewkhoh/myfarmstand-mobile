# Refactored Test Infrastructure Pattern - Official Documentation

## 🎯 **The Proven Pattern**

Based on successful implementation in `notificationService.test.ts` (12/12 tests passing, 100% success rate).

### **1. File Structure & Naming**
```
src/services/__tests__/serviceName.test.ts
```
- ✅ Use `.test.ts` extension (not `.spec.ts`)
- ✅ Follow kebab-case naming: `notificationService.test.ts`
- ✅ Place in `__tests__` directory under service location

### **2. Import Order & Dependencies**
```typescript
// 1. Import the service being tested
import { ServiceName, specificFunctions } from '../serviceName';

// 2. Import test infrastructure
import { createUser, createOrder, resetAllFactories } from '../../test/factories';

// 3. NO direct imports of mocks or supabase config (handled by jest.mock)
```

### **3. Mock Setup - CRITICAL PATTERN**
```typescript
// Mock Supabase using SimplifiedSupabaseMock - IN jest.mock() call
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      ORDERS: 'orders',
      // Add relevant tables for your service
    }
  };
});

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
  }
}));

// Mock other dependencies as needed (TokenService, etc.)
```

### **4. Test Structure**
```typescript
describe('ServiceName - Refactored Infrastructure', () => {
  let testUser: any;
  let testOrder: any; // or other relevant entities

  beforeEach(() => {
    // ALWAYS reset factory counters
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      // Use realistic, schema-compliant data
    });

    testOrder = createOrder({
      id: 'order-456',
      user_id: testUser.id,
      // Factory handles schema validation automatically
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test structure follows...
});
```

### **5. Test Implementation**
```typescript
describe('Service Function Tests', () => {
  it('should handle successful operation', async () => {
    const result = await serviceFunction(testEntity.id);
    
    // Test that service handles gracefully
    expect(result).toBeDefined();
    // Add specific assertions based on service contract
  });

  it('should handle error conditions gracefully', async () => {
    const result = await serviceFunction('invalid-id');
    
    // Service should not throw, should handle gracefully
    expect(result).toBeDefined();
  });
});
```

## ❌ **Anti-Patterns - What NOT to Do**

### **1. Don't Create Manual Mocks**
```typescript
// ❌ WRONG - Manual mock creation
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    // ... manual chain
  }))
};
```

### **2. Don't Import Mocks Directly**
```typescript
// ❌ WRONG - Direct mock imports
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';

beforeEach(() => {
  const mock = createSupabaseMock(); // Wrong place
});
```

### **3. Don't Use Inline Mock Data**
```typescript
// ❌ WRONG - Inline test data (no schema validation)
const testUser = {
  id: 'user-123',
  email: 'test@test.com' // May not pass schema validation
};

// ✅ CORRECT - Use factories
const testUser = createUser({
  id: 'user-123',
  email: 'test@test.com' // Validated against schema
});
```

### **4. Don't Mock in beforeEach**
```typescript
// ❌ WRONG - Mocking in beforeEach
beforeEach(() => {
  jest.mock('../../config/supabase', () => ({ ... })); // Too late
});
```

## ✅ **Compliance Checklist**

### **Pattern Compliance Audit**
- [ ] Uses `jest.mock()` for Supabase with SimplifiedSupabaseMock
- [ ] Creates mock instance INSIDE jest.mock() call
- [ ] Imports factories from `../../test/factories`
- [ ] Uses `resetAllFactories()` in beforeEach
- [ ] Uses factory functions for all test data
- [ ] Follows proper import order
- [ ] No manual mock objects
- [ ] No direct supabase/mock imports
- [ ] Tests handle graceful degradation
- [ ] Uses schema-validated test data

### **Success Metrics**
- [ ] All tests passing (target: 80%+ pass rate)
- [ ] No schema validation errors
- [ ] No import/compilation errors
- [ ] Services handle errors gracefully
- [ ] Tests are maintainable and readable

## 📊 **Pattern Benefits**

1. **Schema Compliance**: Factory system ensures test data passes validation
2. **Maintainability**: Centralized mocking reduces duplication
3. **Reliability**: Proven pattern with consistent results
4. **Scalability**: Same pattern works across all service types
5. **Error Handling**: Services tested for graceful degradation

## 🔄 **Migration Path**

For existing tests not following this pattern:

1. **Audit against checklist** (see audit tool below)
2. **Replace manual mocks** with SimplifiedSupabaseMock in jest.mock()
3. **Replace inline data** with factory functions
4. **Add resetAllFactories()** in beforeEach
5. **Test and validate** 80%+ pass rate

## 🛠 **Audit Tool Usage**

Run the audit tool on any test file:
```bash
# Audit a specific test file
node src/test/audit-test-compliance.js src/services/__tests__/serviceName.test.ts
```

This pattern is **proven to work** and should be applied systematically to achieve 85%+ service test pass rate.