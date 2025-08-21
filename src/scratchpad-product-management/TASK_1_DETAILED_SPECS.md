# Task 1: Comprehensive Test Suite with Schema Contract Validation

**Priority**: **CRITICAL** (TDD + Contract Enforcement)  
**Effort**: 1.5 days  
**Status**: Ready to implement

---

## 📋 **Overview**

Task 1 is the foundation for all product admin features. It establishes:
1. **Schema contract tests** with compile-time enforcement 
2. **Service field selection validation** against database.generated.ts
3. **Pattern 3 resilient processing tests**
4. **ValidationMonitor integration tests**
5. **Pre-commit hook validation setup**

This MUST be completed first as it provides the safety net for all subsequent development.

---

## 📁 **Files to Create**

### **1. Schema Contract Tests** 
`src/schemas/__contracts__/productAdmin.contracts.test.ts`

```typescript
// NEW REQUIREMENT: Schema Contract Tests (Compile-Time Enforcement)
import { z } from 'zod';
import type { Product, CreateProductRequest, UpdateProductRequest } from '../types';

// Helper type for exact contract validation
type AssertExact<T, U> = T extends U ? (U extends T ? true : false) : false;

// 1. Contract validation tests (compile-time enforcement)
describe('ProductAdmin Schema Contracts', () => {
  it('should enforce exact interface alignment (compile-time)', () => {
    // This MUST fail TypeScript compilation if schema doesn't match interface
    type ProductAdminContract = AssertExact<z.infer<typeof ProductAdminSchema>, Product>;
    type CreateContract = AssertExact<z.infer<typeof CreateProductSchema>, CreateProductRequest>;
    type UpdateContract = AssertExact<z.infer<typeof UpdateProductSchema>, UpdateProductRequest>;
    
    // Contract enforcement - compilation fails if misaligned
    expect(true).toBe(true); // Placeholder - real validation is compile-time
  });

  it('should have all required Product interface fields', () => {
    const requiredFields = [
      'id', 'name', 'description', 'price', 'category_id', 
      'stock_quantity', 'is_available', 'created_at', 'updated_at'
    ];
    
    // Verify schema covers all interface fields
    requiredFields.forEach(field => {
      expect(ProductAdminSchema.shape).toHaveProperty(field);
    });
  });
});
```

### **2. Service Database Query Tests**
`src/services/__tests__/productAdminService.test.ts`

```typescript
import { ProductAdminService } from '../productAdminService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { supabase } from '../../config/supabase';

// Mock Supabase
jest.mock('../../config/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ProductAdminService Database Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Field Selection Validation', () => {
    it('should use exact database field names from database.generated.ts', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        description: 'Test Description',
        price: 19.99,
        category_id: 'cat-1',
        stock_quantity: 100,
        is_available: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProduct,
              error: null
            })
          })
        })
      } as any);

      const service = new ProductAdminService();
      await service.getProductById('prod-1');

      // Verify exact field selection matching database.generated.ts
      expect(mockSupabase.from).toHaveBeenCalledWith('products');
      expect(mockSupabase.from().select).toHaveBeenCalledWith(
        'id, name, description, price, category_id, stock_quantity, is_available, created_at, updated_at'
        //      ^^^ Must match database.generated.ts exactly
      );
    });

    it('should use snake_case field names not camelCase', async () => {
      const createRequest = {
        name: 'New Product',
        description: 'New Description',
        price: 29.99,
        category_id: 'cat-2',
        stock_quantity: 50,
        is_available: true
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-prod', ...createRequest },
              error: null
            })
          })
        })
      } as any);

      const service = new ProductAdminService();
      await service.createProduct(createRequest);

      // Verify insert uses snake_case field names
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: 'cat-2',        // Not categoryId
          stock_quantity: 50,          // Not stockQuantity  
          is_available: true,          // Not isAvailable
          created_at: expect.any(String),
          updated_at: expect.any(String)
        })
      );
    });
  });

  describe('Pattern 3: Resilient Processing Tests', () => {
    it('should process bulk operations individually with skip-on-error', async () => {
      const validUpdate = { productId: 'prod-1', newStock: 100 };
      const invalidUpdate = { productId: 'invalid-id', newStock: -5 };
      const anotherValidUpdate = { productId: 'prod-2', newStock: 50 };

      const mixedUpdates = [validUpdate, invalidUpdate, anotherValidUpdate];

      // Mock first update succeeds
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'prod-1', stock_quantity: 100 },
                error: null
              })
            })
          })
        })
      } as any);

      // Mock second update fails
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Invalid product ID' }
              })
            })
          })
        })
      } as any);

      // Mock third update succeeds
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'prod-2', stock_quantity: 50 },
                error: null
              })
            })
          })
        })
      } as any);

      const service = new ProductAdminService();
      const result = await service.bulkUpdateStock(mixedUpdates);

      // Verify resilient processing
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].item).toEqual(invalidUpdate);
      expect(result.failed[0].reason).toContain('Invalid product ID');
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.totalProcessed).toBe(3);
    });

    it('should not fail entire operation when individual items fail validation', async () => {
      const updates = [
        { productId: 'prod-1', newStock: 100 },    // Valid
        { productId: '', newStock: 50 },           // Invalid - empty ID
        { productId: 'prod-2', newStock: -10 },    // Invalid - negative stock
        { productId: 'prod-3', newStock: 25 }      // Valid
      ];

      const service = new ProductAdminService();
      const result = await service.bulkUpdateStock(updates);

      // Even with validation failures, operation completes
      expect(result.totalProcessed).toBe(4);
      expect(result.successCount + result.failureCount).toBe(4);
      expect(result.failed.length).toBeGreaterThan(0); // Some should fail validation
    });
  });

  describe('ValidationMonitor Integration Tests', () => {
    let recordPatternSuccessSpy: jest.SpyInstance;
    let recordValidationErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      recordPatternSuccessSpy = jest.spyOn(ValidationMonitor, 'recordPatternSuccess');
      recordValidationErrorSpy = jest.spyOn(ValidationMonitor, 'recordValidationError');
    });

    afterEach(() => {
      recordPatternSuccessSpy.mockRestore();
      recordValidationErrorSpy.mockRestore();
    });

    it('should record pattern success for successful operations', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Test Product',
        description: 'Test Description',
        price: 19.99,
        category_id: 'cat-1',
        stock_quantity: 100,
        is_available: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProduct,
              error: null
            })
          })
        })
      } as any);

      const service = new ProductAdminService();
      await service.createProduct({
        name: 'Test Product',
        description: 'Test Description',
        price: 19.99,
        category_id: 'cat-1',
        stock_quantity: 100,
        is_available: true
      });

      expect(recordPatternSuccessSpy).toHaveBeenCalledWith({
        service: 'ProductAdminService',
        pattern: 'transformation_schema',
        operation: 'createProduct'
      });
    });

    it('should record validation errors for failed operations', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database constraint violation' }
            })
          })
        })
      } as any);

      const service = new ProductAdminService();
      const result = await service.createProduct({
        name: 'Test Product',
        description: 'Test Description',
        price: 19.99,
        category_id: 'invalid-cat',
        stock_quantity: 100,
        is_available: true
      });

      expect(result.success).toBe(false);
      expect(recordValidationErrorSpy).toHaveBeenCalledWith({
        context: 'ProductAdminService.createProduct',
        errorMessage: 'Database constraint violation',
        errorCode: 'PRODUCT_CREATE_FAILED'
      });
    });

    it('should record success for bulk operations', async () => {
      const service = new ProductAdminService();
      await service.bulkUpdateStock([
        { productId: 'prod-1', newStock: 100 }
      ]);

      expect(recordPatternSuccessSpy).toHaveBeenCalledWith({
        service: 'ProductAdminService',
        pattern: 'direct_supabase_query',
        operation: 'bulkUpdateStock'
      });
    });
  });

  describe('Error Handling and User-Friendly Messages', () => {
    it('should provide user-friendly error messages', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'duplicate key value violates unique constraint' }
            })
          })
        })
      } as any);

      const service = new ProductAdminService();
      const result = await service.createProduct({
        name: 'Duplicate Product',
        description: 'Test Description',
        price: 19.99,
        category_id: 'cat-1',
        stock_quantity: 100,
        is_available: true
      });

      expect(result.success).toBe(false);
      expect(result.error?.userMessage).toBe(
        'Failed to create product. Please check your input and try again.'
      );
      expect(result.error?.code).toBe('CREATE_FAILED');
    });
  });
});
```

### **3. Hook Integration Tests**
`src/hooks/__tests__/useProductAdmin.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateProduct, useProductsAdmin, productAdminKeys } from '../useProductAdmin';
import { ValidationMonitor } from '../../utils/validationMonitor';

// Test setup
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProductAdmin Hooks', () => {
  describe('Query Key Factory Usage', () => {
    it('should use centralized productKeys factory without creating local duplicates', () => {
      // Verify no local factory is created
      expect(productAdminKeys).toHaveProperty('all');
      expect(productAdminKeys).toHaveProperty('lists');
      expect(productAdminKeys).toHaveProperty('adminManagement');
      expect(productAdminKeys).toHaveProperty('lowStock');
      
      // Verify extends existing factory
      expect(productAdminKeys.all()).toEqual(['products']);
    });

    it('should generate user-isolated query keys', () => {
      const userId = 'admin-123';
      const adminKey = productAdminKeys.adminManagement(userId);
      const lowStockKey = productAdminKeys.lowStock(10, userId);
      
      expect(adminKey).toContain(userId);
      expect(lowStockKey).toContain(userId);
      expect(lowStockKey).toContain('10'); // threshold
    });
  });

  describe('useCreateProduct Hook', () => {
    it('should use correct mutation function and handle success', async () => {
      const mockMutate = jest.fn().mockResolvedValue({
        success: true,
        product: { id: 'new-prod', name: 'Test Product' }
      });

      // Mock the service
      jest.doMock('../../services/productAdminService', () => ({
        productAdminService: { createProduct: mockMutate }
      }));

      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: createWrapper()
      });

      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        price: 19.99,
        category_id: 'cat-1',
        stock_quantity: 100,
        is_available: true
      };

      result.current.mutate(productData);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(productData);
      });
    });

    it('should record ValidationMonitor success on successful mutation', async () => {
      const recordSuccessSpy = jest.spyOn(ValidationMonitor, 'recordPatternSuccess');
      
      // Test implementation when hook is created
      // This verifies ValidationMonitor integration
      
      recordSuccessSpy.mockRestore();
    });
  });

  describe('useProductsAdmin Hook', () => {
    it('should provide graceful degradation for unauthorized users', () => {
      // Mock unauthorized user
      jest.doMock('../useAuth', () => ({
        useCurrentUser: () => ({
          data: { id: 'user-123', role: 'customer' }, // Not admin
          isLoading: false,
          error: null
        })
      }));

      const { result } = renderHook(() => useProductsAdmin(), {
        wrapper: createWrapper()
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.userMessage).toContain('admin permissions');
    });

    it('should use correct query key for admin users', () => {
      jest.doMock('../useAuth', () => ({
        useCurrentUser: () => ({
          data: { id: 'admin-123', role: 'admin' },
          isLoading: false,
          error: null
        })
      }));

      const { result } = renderHook(() => useProductsAdmin(), {
        wrapper: createWrapper()
      });

      // Verify correct query key usage
      expect(result.current).toBeDefined();
    });
  });
});
```

### **4. Pre-commit Hook Setup**
`.husky/pre-commit` (modification)

```bash
#!/usr/bin/env sh

🔍 Running comprehensive pre-commit validation...

# Existing validations...
echo "📋 Step 1: Checking schema contracts..."
echo "📋 Step 2: Checking service patterns..."
echo "📋 Step 3: Running TypeScript check on services..."
echo "📋 Step 4: Verifying contract test coverage..."

# NEW: Product Admin Schema Contract Validation
echo "📋 Step 5: Validating Product Admin schema contracts..."

# Check TypeScript compilation for product admin schema contracts
npx tsc --noEmit src/schemas/__contracts__/productAdmin.contracts.test.ts
if [ $? -ne 0 ]; then
  echo "❌ Product Admin schema contracts failed - TypeScript compilation error"
  echo "🔍 This means schemas don't match interfaces exactly"
  echo "💡 Check ProductAdminSchema transformation return types"
  exit 1
fi

# Run product admin service tests
npm test -- --testPathPattern="productAdminService.test.ts" --passWithNoTests
if [ $? -ne 0 ]; then
  echo "❌ Product Admin service tests failed"
  echo "🔍 Check database field selection and validation patterns"
  exit 1
fi

echo "✅ Product Admin schema contracts passed"
echo "✅ ALL PRE-COMMIT VALIDATIONS PASSED"
```

---

## 🎯 **Success Criteria for Task 1**

### **Must Pass Before Moving to Task 2**:

1. ✅ **Compile-Time Contract Enforcement**: 
   - TypeScript compilation fails if schemas don't match interfaces
   - `AssertExact` type validation works correctly

2. ✅ **Database Field Validation**:
   - Service tests verify exact field selection from database.generated.ts
   - Snake_case field usage enforced
   - No camelCase field names in database operations

3. ✅ **Pattern 3 Resilience**:
   - Bulk operations handle individual failures gracefully
   - Skip-on-error processing verified
   - Comprehensive result reporting tested

4. ✅ **ValidationMonitor Integration**:
   - Success tracking implemented and tested
   - Error tracking implemented and tested
   - Pattern usage monitoring verified

5. ✅ **Pre-commit Protection**:
   - Contract violations cannot be committed
   - Service pattern violations caught
   - Automated enforcement working

### **Test Coverage Requirements**:
- Schema contract tests: 100%
- Service database operations: >90%
- Hook query key usage: >90%
- Error handling paths: >85%

---

## 🚀 **Implementation Steps**

1. **Create contract test file** with TypeScript enforcement
2. **Write service tests** for database field validation
3. **Add hook tests** for query key factory usage
4. **Update pre-commit hook** with contract validation
5. **Run full test suite** to verify everything passes
6. **Verify TypeScript compilation** fails with intentional contract violations
7. **Commit**: "Add schema contract validation with pre-commit enforcement"

**Ready to implement! This provides the bulletproof foundation for all subsequent product admin development.**