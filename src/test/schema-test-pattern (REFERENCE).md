# Schema Test Pattern Guide
## Using the Refactored Test Infrastructure for Schema Tests

### Overview
Schema tests validate Zod schemas for proper data transformation, validation, and type safety. They follow the database-first validation pattern with transformation schemas.

---

## 🎯 Core Principles

### 1. **Database-First Validation**
- Always validate against actual database structure
- Handle nullable fields gracefully
- Transform snake_case (DB) → camelCase (App)

### 2. **Single Validation Pass**
- One schema does validation + transformation
- No separate validation then transformation steps
- Use `.transform()` method for data mapping

### 3. **Test Infrastructure Integration**
- Use refactored test setup from `src/test/test-setup.ts`
- Follow established patterns from `src/test/base-setup.ts`
- Leverage factory patterns for test data

---

## 📋 Schema Test Template

```typescript
/**
 * Schema Test Template
 * Following MyFarmstand Mobile Architectural Patterns
 */

import { z } from 'zod';
import {
  YourSchema,
  YourTransformSchema,
  YourDatabaseSchema
} from '../your.schema';

describe('Your Schema Tests', () => {
  // 1️⃣ Database-First Validation Tests
  describe('Database Schema Validation', () => {
    it('should handle database nulls gracefully', () => {
      const dbData = {
        id: 'test-123',
        field_name: null,        // DB allows null
        created_at: null,        // DB allows null
        updated_at: null,        // DB allows null
        is_active: null          // DB allows null
      };

      const result = YourTransformSchema.parse(dbData);
      
      // Should transform nulls to appropriate defaults
      expect(result.fieldName).toBe('');  // or appropriate default
      expect(result.isActive).toBe(true); // Default for null boolean
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should validate required fields from database', () => {
      const invalidData = {
        // Missing required id field
        field_name: 'test'
      };

      expect(() => YourDatabaseSchema.parse(invalidData)).toThrow();
    });
  });

  // 2️⃣ Transformation Tests (snake_case → camelCase)
  describe('Schema Transformation', () => {
    it('should transform snake_case to camelCase in one pass', () => {
      const dbData = {
        id: 'test-123',
        user_id: 'user-456',
        field_name: 'Test Value',
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const result = YourTransformSchema.parse(dbData);
      
      // Verify snake_case → camelCase transformation
      expect(result.userId).toBe('user-456');
      expect(result.fieldName).toBe('Test Value');
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBe('2025-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2025-01-01T00:00:00Z');
    });

    it('should preserve debug metadata for troubleshooting', () => {
      const dbData = {
        id: 'test-123',
        field_name: 'test',
        raw_value: 'original'
      };

      const result = YourTransformSchema.parse(dbData);
      
      // Should include _dbData for debugging
      expect(result._dbData).toBeDefined();
      expect(result._dbData.originalFieldName).toBe('test');
      expect(result._dbData.rawValue).toBe('original');
    });
  });

  // 3️⃣ Business Logic Validation
  describe('Business Rules', () => {
    it('should validate business constraints', () => {
      const invalidData = {
        id: 'test-123',
        quantity: -5,          // Should be positive
        price: -10.00,         // Should be positive
        stock_level: 1000000   // Exceeds max threshold
      };

      expect(() => YourTransformSchema.parse(invalidData)).toThrow();
    });

    it('should handle calculated fields correctly', () => {
      const data = {
        id: 'test-123',
        current_stock: 100,
        reserved_stock: 20,
        available_stock: 80  // Should equal current - reserved
      };

      const result = YourTransformSchema.parse(data);
      expect(result.availableStock).toBe(80);
    });
  });

  // 4️⃣ Edge Cases & Error Handling
  describe('Edge Cases', () => {
    it('should handle empty strings as nullable', () => {
      const data = {
        id: 'test-123',
        field_name: '',       // Empty string
        description: ''       // Empty string
      };

      const result = YourTransformSchema.parse(data);
      expect(result.fieldName).toBe(''); // Or appropriate default
      expect(result.description).toBe('');
    });

    it('should handle extreme values', () => {
      const largeData = {
        id: 'test-123',
        amount: 999999999,    // Large but valid
        count: 0              // Zero boundary
      };

      const result = YourTransformSchema.parse(largeData);
      expect(result.amount).toBe(999999999);
      expect(result.count).toBe(0);
    });

    it('should provide clear error messages', () => {
      const invalidData = {
        id: 'test-123',
        email: 'not-an-email',
        phone: '123'  // Too short
      };

      expect(() => YourTransformSchema.parse(invalidData))
        .toThrow(/valid email|phone/i);
    });
  });

  // 5️⃣ Array Processing
  describe('Array Operations', () => {
    it('should handle arrays with individual validation', () => {
      const dataArray = [
        { id: '1', field: 'value1' },
        { id: '2', field: 'value2' }
      ];

      // Process with skip-on-error pattern
      const results = dataArray.map(item => {
        try {
          return YourTransformSchema.parse(item);
        } catch (error) {
          console.warn(`Skipping invalid item: ${item.id}`);
          return null;
        }
      }).filter(Boolean);

      expect(results).toHaveLength(2);
    });
  });

  // 6️⃣ Integration with Service Layer
  describe('Service Integration', () => {
    it('should produce data compatible with service operations', () => {
      const dbData = {
        id: 'test-123',
        // ... database fields
      };

      const transformed = YourTransformSchema.parse(dbData);
      
      // Verify the transformed data has all fields needed by service
      expect(transformed.id).toBeDefined();
      expect(transformed).toHaveProperty('fieldName');
      // Check structure matches service expectations
    });
  });
});
```

---

## 🔧 Schema Implementation Pattern

```typescript
// your.schema.ts
import { z } from 'zod';

// 1️⃣ Raw Database Schema (snake_case)
export const RawDbYourSchema = z.object({
  id: z.string().min(1),
  field_name: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

// 2️⃣ Transform Schema (snake_case → camelCase)
export const YourTransformSchema = RawDbYourSchema.transform((data) => ({
  // App interface format
  id: data.id,
  fieldName: data.field_name || '',
  isActive: data.is_active ?? true,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
  
  // Debug metadata
  _dbData: {
    originalFieldName: data.field_name,
    rawIsActive: data.is_active,
    rawCreatedAt: data.created_at,
    rawUpdatedAt: data.updated_at
  }
}));

// 3️⃣ Request/Response Schemas
export const YourRequestSchema = z.object({
  fieldName: z.string().min(1),
  isActive: z.boolean().optional()
});

export const YourResponseSchema = z.object({
  success: z.boolean(),
  data: YourTransformSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).optional()
});

// 4️⃣ Type exports
export type YourData = z.infer<typeof YourTransformSchema>;
export type YourRequest = z.infer<typeof YourRequestSchema>;
export type YourResponse = z.infer<typeof YourResponseSchema>;
```

---

## ✅ Best Practices

### DO:
- ✅ Use database-first validation
- ✅ Transform in a single pass
- ✅ Handle nulls with defaults (`??` operator)
- ✅ Include debug metadata (`_dbData`)
- ✅ Test edge cases and boundaries
- ✅ Provide clear error messages
- ✅ Use factories for test data generation

### DON'T:
- ❌ Validate business logic in schemas (use service layer)
- ❌ Create duplicate local schemas
- ❌ Mix validation and transformation in separate steps
- ❌ Ignore nullable database fields
- ❌ Use `.strict()` on schemas with relations
- ❌ Forget to export TypeScript types

---

## 🏭 Factory Pattern for Test Data

```typescript
// src/test/factories/your.factory.ts
import { BaseFactory } from './base.factory';

export const YourFactory = {
  ...BaseFactory,
  
  createRaw: (overrides = {}) => ({
    id: 'test-' + Date.now(),
    field_name: 'Test Field',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  createTransformed: (overrides = {}) => ({
    id: 'test-' + Date.now(),
    fieldName: 'Test Field',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _dbData: {},
    ...overrides
  }),
  
  createInvalid: () => ({
    // Missing required fields
    field_name: 'Invalid'
  })
};
```

---

## 📝 Common Schema Patterns

### 1. Nullable Field Handling
```typescript
// Database allows null, app needs default
fieldName: data.field_name || 'default',
isActive: data.is_active ?? true,  // Use ?? for boolean
count: data.count ?? 0              // Use ?? for numbers
```

### 2. JSON Field Parsing
```typescript
metadata: (() => {
  try {
    return typeof data.metadata === 'string' 
      ? JSON.parse(data.metadata) 
      : data.metadata || {};
  } catch {
    console.warn('Failed to parse metadata');
    return {};
  }
})()
```

### 3. Enum Validation
```typescript
status: z.enum(['pending', 'active', 'completed'])
  .nullable()
  .optional()
  .transform(val => val || 'pending')
```

### 4. Date Handling
```typescript
date: z.string()
  .nullable()
  .optional()
  .transform(val => val ? new Date(val) : null)
```

### 5. Relationship Handling
```typescript
// For JOINed data
category: data.categories 
  ? CategorySchema.parse(data.categories)
  : undefined
```

---

## 🧪 Running Schema Tests

```bash
# Run all schema tests
npm test src/schemas/

# Run specific schema test
npm test src/schemas/__tests__/your.schema.test.ts

# Run with coverage
npm test src/schemas/ -- --coverage

# Watch mode for development
npm test src/schemas/ -- --watch
```

---

## 📋 Checklist for New Schema Tests

- [ ] Database-first validation test
- [ ] Null handling test
- [ ] Transformation test (snake_case → camelCase)
- [ ] Required field validation
- [ ] Edge case handling (empty, extreme values)
- [ ] Error message clarity test
- [ ] Array processing test (if applicable)
- [ ] Integration compatibility test
- [ ] Debug metadata preservation test
- [ ] Business rule validation (if applicable)

---

## 🔗 Related Documentation

- `src/test/service-test-pattern.md` - Service layer testing
- `src/test/hook-test-pattern.md` - React hook testing
- `docs/architectural-patterns-and-best-practices.md` - Core patterns
- `CLAUDE.md` - Project memory and guidelines