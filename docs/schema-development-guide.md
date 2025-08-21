# Schema Development Guide

## 🎯 Overview
This guide provides step-by-step processes for developing schema-safe features that prevent violations from reaching the UI layer.

## 🚀 Quick Start Checklist

Before starting any feature that involves data:

1. ✅ Run `npm run validate:all` to ensure current state is clean
2. ✅ Check `database.generated.ts` for available database columns  
3. ✅ Follow the Schema-First Development pattern
4. ✅ Add contract tests for all new schemas
5. ✅ Validate with `npm run validate:all` before committing

## 📋 Step-by-Step Process

### **Step 1: Define TypeScript Interface**

Create or update the TypeScript interface first:

```typescript
// src/types/index.ts
export interface Product {
  id: string;
  name: string;
  description: string;  // Required field
  price: number;
  category_id: string;  // Note: category_id, not category
  stock_quantity: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}
```

**✅ Best Practices:**
- Use exact database column names (check `database.generated.ts`)
- Mark nullable fields as `| null` 
- Use descriptive field names that match database schema

### **Step 2: Create Zod Schema**

Create the validation schema that transforms database data to interface:

```typescript
// src/schemas/product.schema.ts
import { z } from 'zod';
import type { Product } from '../types';

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category_id: z.string(),
  stock_quantity: z.number().nullable(),
  is_available: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    price: data.price,
    category_id: data.category_id,
    stock_quantity: data.stock_quantity,
    is_available: data.is_available,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
});
```

**✅ Critical Requirements:**
- Transform function MUST return the exact TypeScript interface
- All interface fields MUST be present in transform return
- Field types MUST match between schema and interface

### **Step 3: Add Contract Test**

Add the schema to contract enforcement:

```typescript
// src/schemas/__contracts__/schema-contracts.test.ts
import type { Product } from '../../types';
import { ProductSchema } from '../product.schema';

// Add this line for your new schema:
type ProductContract = AssertExact<z.infer<typeof ProductSchema>, Product>;

// The test will fail compilation if schema and interface don't match exactly
```

### **Step 4: Test Contract Enforcement**

```bash
# Test that your schema compiles correctly
npm run test:contracts

# Should show no errors if schema matches interface
```

### **Step 5: Create Service Functions**

Follow the validated service pattern:

```typescript
// src/services/productService.ts
import { ProductSchema } from '../schemas/product.schema';

export const getProduct = async (productId: string): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, category_id, stock_quantity, is_available, created_at, updated_at')
    //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //     Use EXACT field names from database.generated.ts
    .eq('id', productId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch product: ${error.message}`);
  }

  // Always validate through schema
  return ProductSchema.parse(data);
};
```

**✅ Service Pattern Requirements:**
- Use exact database field names in `.select()`
- Always validate responses with schema `.parse()`
- Never manually construct return objects

### **Step 6: Validate All Patterns**

```bash
# Run complete validation
npm run validate:all

# This runs:
# - npm run test:contracts (TypeScript compilation)
# - npm run lint:schemas (Pattern validation)
```

### **Step 7: Test React Query Integration**

```typescript
// src/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { getProduct } from '../services/productService';

export const useProduct = (productId: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    // Data is already validated by service layer
    // UI receives clean, contract-compliant Product objects
  });
};
```

## 🔧 Common Patterns

### **Adding New Entity**

1. **Create Interface** → `src/types/index.ts`
2. **Create Schema** → `src/schemas/entityName.schema.ts`  
3. **Add Contract** → `src/schemas/__contracts__/schema-contracts.test.ts`
4. **Create Service** → `src/services/entityNameService.ts`
5. **Create Hook** → `src/hooks/useEntityName.ts`
6. **Validate** → `npm run validate:all`

### **Modifying Existing Entity**

1. **Update Interface** → Add/modify fields
2. **Update Schema** → Ensure transform matches interface  
3. **Update Services** → Fix field selections if needed
4. **Test Contracts** → `npm run test:contracts`
5. **Test Patterns** → `npm run lint:schemas`

### **Adding Nested/Complex Types**

```typescript
// For complex nested structures
export const OrderSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  items: z.array(OrderItemSchema), // Nested schema
  total: z.number(),
}).transform((data): Order => {
  return {
    id: data.id,
    customer_id: data.customer_id,
    items: data.items, // Already validated by OrderItemSchema
    total: data.total,
  };
});
```

## ❌ Common Pitfalls & Solutions

### **Pitfall 1: Field Name Mismatches**
```typescript
// ❌ WRONG: Guessing field names
.select('category') // Doesn't exist in database

// ✅ CORRECT: Check database.generated.ts
.select('category_id') // Actual database column
```

### **Pitfall 2: Missing Required Fields**
```typescript
// ❌ WRONG: Missing fields in transform
}).transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    // Missing description - compilation error!
  };
});

// ✅ CORRECT: All interface fields present
}).transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    description: data.description, // All fields included
    // ... rest of fields
  };
});
```

### **Pitfall 3: Type Mismatches**
```typescript
// ❌ WRONG: Wrong field type
price: z.string(), // Interface expects number

// ✅ CORRECT: Matching types
price: z.number(), // Matches interface
```

### **Pitfall 4: Skipping Contract Tests**
```typescript
// ❌ WRONG: New schema without contract test
export const NewEntitySchema = z.object({...}); // No contract

// ✅ CORRECT: Always add contract test
export const NewEntitySchema = z.object({...});
// In schema-contracts.test.ts:
type NewEntityContract = AssertExact<z.infer<typeof NewEntitySchema>, NewEntity>;
```

## 🚨 Troubleshooting

### **Contract Compilation Errors**

**Error**: `Property 'fieldName' is missing in type`
**Solution**: Add missing field to schema transform

**Error**: `Type 'string' is not assignable to type 'number'`  
**Solution**: Fix type mismatch between schema and interface

**Error**: `Property 'fieldName' does not exist on type`
**Solution**: Check database.generated.ts for correct field name

### **Pattern Validation Errors**

**Error**: `Field selection violation: using 'category'`
**Solution**: Change to `category_id` (correct database column)

**Error**: `Schema file missing transform function`
**Solution**: Add `.transform((data): InterfaceName => { ... })`

### **Service Validation Errors**

**Error**: `Invalid field selection pattern`
**Solution**: Use exact field names from database schema

**Error**: `Missing schema validation in service`
**Solution**: Always use `SchemaName.parse(data)` for validation

## 🔧 Development Tools

### **Validation Commands**
```bash
# Check all contracts
npm run test:contracts

# Check service patterns  
npm run lint:schemas

# Complete validation
npm run validate:all

# TypeScript check
npm run typecheck
```

### **Debugging Failed Validation**
```bash
# Test specific contract file
npx tsc --noEmit src/schemas/__contracts__/schema-contracts.test.ts

# Test specific service pattern
npm run lint:schemas 2>&1 | grep "VIOLATION"

# Check specific schema compilation
npx tsc --noEmit src/schemas/yourSchema.schema.ts
```

## ✅ Success Criteria

### **Before Committing**:
- [ ] `npm run validate:all` passes
- [ ] All new schemas have contract tests
- [ ] Service functions use schema validation
- [ ] Field selections match database columns

### **Before PR/Deployment**:
- [ ] GitHub Actions schema validation passes
- [ ] No TypeScript compilation errors
- [ ] All contract tests align with interfaces
- [ ] Pattern validation shows no violations

## 🎯 The Goal

**Result**: Every data object that reaches the UI layer is:
- ✅ Type-safe (correct TypeScript types)
- ✅ Complete (all required fields present)  
- ✅ Validated (passed through Zod schema)
- ✅ Consistent (matches database schema exactly)

**UI Layer**: Receives only clean, validated, contract-compliant data with zero possibility of schema violations.