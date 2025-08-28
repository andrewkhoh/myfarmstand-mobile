# Agent 2: Fix Service Test Failures

## Mission
Fix 187 failing service tests by applying the test infrastructure patterns established in Phase 1-2.

## Context
- **Working Directory**: `../test-fixes-fix-service-tests`
- **Branch**: `test-fixes-fix-service-tests`
- **Communication Hub**: `../test-fixes-communication`
- **Test Count**: 187 failing service tests (out of 547 total)

## Your Tasks

### 1. Initial Analysis
```bash
cd ../test-fixes-fix-service-tests
npm run test:services 2>&1 | tee ../test-fixes-communication/status/service-test-initial.txt
```

### 2. Common Patterns to Apply

#### SimplifiedSupabaseMock Pattern
```typescript
// ✅ CORRECT - Mock BEFORE imports
const mockFrom = jest.fn();
jest.mock('config/supabase', () => ({
  supabase: {
    from: mockFrom
  }
}));

// Then imports
import { productService } from '../productService';

// In tests
beforeEach(() => {
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: mockProduct,
      error: null
    })
  });
});
```

#### Schema Validation Issues
```typescript
// ❌ OLD - Missing required fields
const mockProduct = {
  id: '1',
  name: 'Test'
};

// ✅ NEW - Complete mock data
const mockProduct = {
  id: '1',
  name: 'Test Product',
  price: 10.99,
  category: 'produce',
  stock: 100,
  description: 'Test description',
  farm_id: 'farm-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_available: true,
  unit_type: 'lb',
  minimum_order: 1,
  images: []
};
```

#### ValidationMonitor Integration
```typescript
// Add to all service tests
jest.mock('utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn(),
    recordDataIntegrity: jest.fn()
  }
}));
```

### 3. Service Categories to Fix

#### Product Services (40 failures)
- productService.test.ts
- productAdminService.test.ts
- productSearchService.test.ts
- Files: `src/services/__tests__/product*.test.ts`

#### Order Services (35 failures)
- orderService.test.ts
- orderProcessingService.test.ts
- Files: `src/services/__tests__/order*.test.ts`

#### Payment Services (30 failures)
- paymentService.test.ts
- stripeService.test.ts
- Files: `src/services/__tests__/payment*.test.ts`

#### Inventory Services (25 failures)
- inventoryService.test.ts
- stockService.test.ts
- Files: `src/services/inventory/__tests__/*.test.ts`

#### Marketing Services (30 failures)
- campaignService.test.ts
- loyaltyService.test.ts
- Files: `src/services/marketing/__tests__/*.test.ts`

#### Role Services (27 failures)
- roleService.test.ts
- permissionService.test.ts
- Files: `src/services/role-based/__tests__/*.test.ts`

### 4. Transform Function Issues

```typescript
// ❌ OLD - Manual transforms
const transformed = {
  ...data,
  createdAt: data.created_at
};

// ✅ NEW - Use schemas
import { ProductSchema } from 'schemas/productSchemas';
const transformed = ProductSchema.parse(data);
```

### 5. Mock Response Patterns

```typescript
// Consistent mock patterns
const createMockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK'
});

// List response
mockFrom.mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  range: jest.fn().mockResolvedValue(
    createMockSupabaseResponse([mockItem1, mockItem2])
  )
});

// Single response
mockFrom.mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(
    createMockSupabaseResponse(mockItem)
  )
});
```

### 6. Progress Tracking

```bash
# After each service category
echo "$(date): Fixed product services - 40/187 total" >> ../test-fixes-communication/progress/fix-service-tests.md

# Test specific service
npm run test:services -- productService.test.ts

# Full suite check
npm run test:services 2>&1 | grep -E "Test Suites|Tests:" >> ../test-fixes-communication/status/service-progress.txt
```

### 7. Priority Order

1. **Product Services** - Core functionality
2. **Order Services** - Critical path
3. **Payment Services** - Transaction handling
4. **Inventory Services** - Stock management
5. **Marketing Services** - Extensions
6. **Role Services** - Authorization

## Communication Protocol

### Status Updates
```bash
# Every hour or service category completion
echo "$(date): Completed [category] - X/187 fixed" >> ../test-fixes-communication/progress/fix-service-tests.md
```

### If Blocked
```bash
echo "BLOCKED: [Issue] in [service]" >> ../test-fixes-communication/handoffs/service-blockers.md
```

### Completion
```bash
echo "COMPLETE: 187/187 service tests fixed" >> ../test-fixes-communication/status/service-test-final.txt
npm run test:services -- --coverage >> ../test-fixes-communication/status/service-coverage.txt
```

## Quick Reference

### Commands
- `npm run test:services` - Run all service tests
- `npm run test:services -- [pattern]` - Test specific files
- `npm run test:services:watch` - Watch mode

### Key Files
- `src/test/serviceSetup.ts` - Service test setup
- `src/schemas/*.ts` - Schema definitions
- `src/services/__tests__/*.test.ts` - Service tests

## Start Here
1. Run initial test suite to categorize failures
2. Start with product services (most common patterns)
3. Apply SimplifiedSupabaseMock consistently
4. Ensure schema compliance in all mocks
5. Track progress by service category