# Service Test Setup Patterns - Analysis

## 📋 **Successful Test Pattern Analysis**

Based on analysis of working service tests (`authService.test.ts`, `productAdminService.test.ts`, `stockRestorationService.test.ts`):

## 🎯 **Pattern 1: Simple Global Mock Approach** (AuthService)

```typescript
/**
 * AuthService Test
 * Testing authentication functionality
 */

import { AuthService } from '../authService';

// Mock the supabase module at the service level
const mockSupabase = require('../../config/supabase').supabase;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful login', async () => {
    // Setup successful login mock
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: { /* session data */ },
        user: { /* user data */ }
      },
      error: null
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { /* database data */ },
            error: null
          })
        })
      })
    });

    const result = await AuthService.login('test@example.com', 'password123');
    
    expect(result.success).toBe(true);
  });
});
```

**Key Elements:**
- ✅ Uses global mock from serviceSetup.ts via `require()`
- ✅ Simple `jest.clearAllMocks()` in beforeEach
- ✅ Direct mock setup in each test
- ✅ No explicit ValidationMonitor mocking (relies on global)

## 🎯 **Pattern 2: Local Mock Definition** (ProductAdminService)

```typescript
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock ValidationMonitor before importing service
const mockValidationMonitor = {
  trackSuccess: jest.fn(),
  trackFailure: jest.fn(),
  trackMismatch: jest.fn(),
  getMetrics: jest.fn(),
};

jest.mock('../../utils/validationMonitor', () => ({
  validationMonitor: mockValidationMonitor,
}));

// Mock Supabase LOCALLY (complete definition)
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          single: jest.fn(),
          range: jest.fn(),
        })),
        single: jest.fn(),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
      order: jest.fn(),
      range: jest.fn(),
    })),
  })),
};

jest.mock('../../config/supabase', () => ({
  supabase: mockSupabase,
  TABLES: {
    PRODUCTS: 'products',
    CATEGORIES: 'categories'
  }
}));

import { ProductAdminService } from '../productAdminService';
import { validationMonitor } from '../../utils/validationMonitor';

describe('ProductAdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get all products with resilient processing', async () => {
    // Setup specific mock responses
    mockSupabase.from().select().order().range.mockResolvedValue({
      data: [/* test data */],
      error: null
    });

    const result = await ProductAdminService.getAllProducts(0, 10);
    
    expect(result.success).toHaveLength(1);
    expect(validationMonitor.trackSuccess).toHaveBeenCalled();
  });
});
```

**Key Elements:**
- ✅ Explicit ValidationMonitor mock before imports
- ✅ Complete local Supabase mock definition
- ✅ Explicit jest.mock() calls
- ✅ Imports service AFTER mocks are defined

## 🎯 **Pattern 3: Hybrid Approach** (StockRestorationService)

```typescript
import { StockRestorationService } from '../stockRestorationService';

// Mock the supabase module (uses global)
const mockSupabase = require('../../config/supabase').supabase;

// Mock broadcast utilities (specific modules)
const mockSendOrderBroadcast = require('../../utils/broadcastFactory').sendOrderBroadcast;

// Mock type mappers (specific functions)
const mockGetOrderItems = require('../../utils/typeMappers').getOrderItems;

describe('StockRestorationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should restore stock for cancelled order', async () => {
    // Setup complex mock chain
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [/* stock data */],
          error: null
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [/* updated data */],
          error: null
        })
      })
    });

    mockGetOrderItems.mockReturnValue([/* order items */]);
    
    const result = await StockRestorationService.restoreStock(mockOrder);
    
    expect(result.success).toBe(true);
  });
});
```

**Key Elements:**
- ✅ Uses global mocks for common services (supabase)
- ✅ Specific mocks for utility functions
- ✅ Complex query chain mocking
- ✅ Multiple mock setups per test

## 🔑 **Critical Success Factors**

### **1. Mock Setup Order**
```typescript
// ✅ CORRECT ORDER
jest.mock('../../utils/validationMonitor');  // Mock first
import { Service } from '../service';         // Import after
```

### **2. ValidationMonitor Patterns**
```typescript
// Pattern A: Explicit mock (ProductAdmin style)
jest.mock('../../utils/validationMonitor');

// Pattern B: Global mock (Auth style)
// Uses mock from serviceSetup.ts automatically
```

### **3. Supabase Query Chain Mocking**
```typescript
// For simple queries (.single())
mockSupabase.from.mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: mockData,
        error: null
      })
    })
  })
});

// For update operations (.update().eq().select().single())
mockSupabase.from.mockReturnValue({
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: updatedData,
          error: null
        })
      })
    })
  })
});

// For insert operations (.insert().select().single())
mockSupabase.from.mockReturnValue({
  insert: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: insertedData,
        error: null
      })
    })
  })
});

// For list queries (.select().order().range())
mockSupabase.from.mockReturnValue({
  select: jest.fn().mockReturnValue({
    order: jest.fn().mockReturnValue({
      range: jest.fn().mockResolvedValue({
        data: [/* array data */],
        error: null
      })
    })
  })
});
```

### **4. Error Case Mocking**
```typescript
// Not found (PGRST116)
single: jest.fn().mockResolvedValue({
  data: null,
  error: { code: 'PGRST116', message: 'The result contains 0 rows' }
})

// Database error
single: jest.fn().mockResolvedValue({
  data: null,
  error: { message: 'Database connection failed', code: 'PGRST000' }
})
```

## 📝 **WORKING PATTERN CONFIRMED: AuthService Pattern (Pattern 1 Modified)**

**✅ TESTED AND WORKING** for inventory service:

```typescript
// Mock ValidationMonitor before importing service
jest.mock('../../../utils/validationMonitor');

import { InventoryService } from '../inventoryService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock the supabase module at the service level (exact authService pattern)
const mockSupabase = require('../../../config/supabase').supabase;

describe('InventoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get inventory item', async () => {
    // Setup mock return data (authService exact pattern)
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockData,
            error: null
          })
        })
      })
    });

    const result = await InventoryService.getInventoryItem(testId);
    
    expect(result).toBeDefined();
    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
  });
});
```

**Why This Works:**
1. ✅ Uses global mock from serviceSetup.ts via `require()`
2. ✅ Simple jest.mock() for ValidationMonitor
3. ✅ Direct mock chain setup matching Supabase query pattern
4. ✅ ValidationMonitor calls work as expected

## 🎯 **Next Steps**

1. Apply Pattern 2 to all remaining inventory service tests
2. Create complete mock chains for each operation type
3. Test systematically: read → update → insert → bulk → permissions
4. Document any code issues discovered during testing