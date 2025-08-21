# Architectural Patterns & Best Practices
**MyFarmstand Mobile - Development Standards**  
**Version**: 1.0  
**Last Updated**: 2025-08-19  
**Status**: 📚 **CANONICAL REFERENCE**

## 🎯 **Philosophy: Quality-First Architecture**

This codebase prioritizes **data integrity, user experience, and maintainability** over raw performance metrics. Every pattern is designed with production resilience and developer experience in mind.

### **Core Principles**
1. **Fail gracefully** - Systems degrade gracefully rather than crash completely
2. **Validate defensively** - Assume external data can be malformed or incomplete
3. **User experience first** - Never break the user's workflow due to edge cases
4. **Type safety everywhere** - Leverage TypeScript's strengths throughout
5. **Monitor everything** - Track both successes and failures for production insights

---

## 🧪 **Zod Validation Patterns**

### **Pattern 1: Single Validation Pass Principle**
**Rule**: Each piece of data should be validated exactly once at the appropriate boundary.

```typescript
// ✅ CORRECT: Single validation + transformation
const TransformSchema = RawDbSchema.transform((data) => ({
  // Validate input and transform to app format in one step
  id: data.id,
  appField: data.snake_case_field || '',
  processedAt: new Date().toISOString()
}));

// Usage:
const result = TransformSchema.parse(rawDatabaseData);

// ❌ ANTI-PATTERN: Double validation
const step1 = DbSchema.parse(rawData);      // First validation
const step2 = AppSchema.parse(step1);       // Second validation (redundant)
```

### **Pattern 2: Database-First Validation**
**Rule**: Always validate against database reality, not application assumptions.

```typescript
// ✅ CORRECT: Handle database nulls explicitly
const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().nullable().optional(), // Database allows null
  created_at: z.string().nullable().optional(),    // Database allows null
}).transform((data) => ({
  // Transform with proper defaults
  id: data.id,
  name: data.name.trim(),
  email: data.email || undefined,
  createdAt: data.created_at || new Date().toISOString()
}));

// ❌ WRONG: Assuming fields are always present
const BadSchema = z.object({
  email: z.string().email().default('no-email@example.com') // Don't fabricate data
});
```

### **Pattern 2 Enhancement: Database-Interface Alignment Audit** 🚨
**Critical Discovery**: Interface-database mismatches cause runtime errors that should be caught at development time.

```typescript
// ✅ AUDIT CHECKLIST: Before implementing schemas (MANDATORY)
// 1. Compare interface fields to database.generated.ts
// 2. Ensure service selects ALL interface-expected database fields
// 3. Verify transformation maps correct database fields to interface fields
// 4. Check no interface field lacks database backing

// Example of systematic audit:
// Database Reality (database.generated.ts):
type DatabaseProduct = {
  category: string;      // Category name from database
  category_id: string;   // Foreign key to categories table
  name: string;
  price: number;
}

// Interface Expectation (types/index.ts):
interface Product {
  category_id: string;   // Must map from database.category_id
  category?: Category;   // Must be populated by service or transformation
  name: string;          // Must map from database.name
  price: number;         // Must map from database.price
}

// ✅ CORRECT: Service selects all required fields
const { data } = await supabase
  .from('products')
  .select('category, category_id, name, price') // All interface-expected fields
  .eq('is_available', true);

// ✅ CORRECT: Schema validates all database fields
const RawProductSchema = z.object({
  category: z.string(),      // Matches database
  category_id: z.string(),   // Matches database
  name: z.string(),
  price: z.number(),
});

// ✅ CORRECT: Transformation maps correct fields
export const ProductSchema = RawProductSchema.transform((data) => ({
  category_id: data.category_id,  // Correct mapping!
  category: undefined,            // TODO: Populate or make optional
  name: data.name,
  price: data.price,
}));

// 🚨 WARNING SIGNS that indicate Pattern 2 violations:
// - Interface has fields not in database.generated.ts
// - Service select statement missing interface-expected fields
// - Transformation maps wrong database fields (e.g., category_id: data.category)
// - Schema validates incomplete data structure
// - UI breaks with "cannot read property 'name' of undefined" errors

// ❌ CRITICAL ANTI-PATTERN: Incomplete database field selection
const badService = await supabase
  .from('products')
  .select('category')  // Missing category_id! Interface expects both!
  .eq('is_available', true);

// ❌ CRITICAL ANTI-PATTERN: Wrong field mapping in transformation
const BadProductSchema = RawProductSchema.transform((data) => ({
  category_id: data.category,  // WRONG! Maps category name to ID field
  // Missing category population
}));
```

### **Pattern 3: Resilient Item Processing**
**Rule**: Process collections item-by-item with graceful degradation.

```typescript
// ✅ CORRECT: Individual validation with skip-on-error
const processProducts = (rawProducts: unknown[]): Product[] => {
  const validProducts: Product[] = [];
  
  for (const rawProduct of rawProducts) {
    try {
      const product = ProductSchema.parse(rawProduct);
      validProducts.push(product);
    } catch (error) {
      // Log for monitoring but continue processing
      ValidationMonitor.recordValidationError({
        context: 'ProductService.processProducts',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PRODUCT_VALIDATION_FAILED'
      });
      console.warn('Invalid product, skipping:', rawProduct.id);
      // Continue with other products - don't break the entire operation
    }
  }
  
  return validProducts;
};

// ❌ WRONG: All-or-nothing validation
const badProcessing = (rawProducts: unknown[]): Product[] => {
  return rawProducts.map(raw => ProductSchema.parse(raw)); // One failure breaks all
};
```

### **Pattern 4: Transformation Schema Architecture**

```typescript
// Step 1: Raw database schema (input validation only)
const RawDbEntitySchema = z.object({
  id: z.string().min(1),
  snake_case_field: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

// Step 2: Transformation schema (DB → App format)
export const DbEntityTransformSchema = RawDbEntitySchema.transform((data) => ({
  // App interface format
  id: data.id,
  camelCaseField: data.snake_case_field || '',
  isActive: data.is_active ?? true,
  createdAt: data.created_at || new Date().toISOString(),
  
  // Internal metadata for debugging/monitoring
  _dbData: {
    originalSnakeCase: data.snake_case_field,
    rawActive: data.is_active
  }
}));

// Step 3: Service usage
const entity = DbEntityTransformSchema.parse(rawDbData);
```

### **Pattern 4 Enhancement: Transformation Completeness Validation** 🚨
**Critical Discovery**: Incomplete transformations cause runtime type mismatches that should be caught at compile time.

```typescript
// ✅ COMPLETENESS VALIDATION: Use TypeScript return annotations to catch incomplete transformations
// This is the most important Pattern 4 enhancement - it prevents interface-transformation mismatches

// Step 1: Always define the target interface first
interface Product {
  id: string;
  name: string;
  category_id: string;   // Database field
  category?: Category;   // Populated object
  price: number;
}

// Step 2: Use return type annotation in transformation
export const ProductSchema = RawProductSchema.transform((data): Product => {
  //                                                          ^^^^^^^^
  //                                                    CRITICAL: This return type annotation
  //                                                    will cause TypeScript compile errors
  //                                                    if transformation is incomplete!
  
  return {
    id: data.id,
    name: data.name,
    category_id: data.category_id,  // ✅ Correct mapping
    category: undefined,            // ⚠️ TODO: Populate or make optional
    price: data.price,
    // ❌ Missing any required interface field = TypeScript error!
  };
});

// ✅ AUDIT PATTERN: Transformation-Interface Alignment Check
// Run this check for every schema to ensure completeness:

type TransformationOutput = z.infer<typeof ProductSchema>;
type InterfaceMatch = TransformationOutput extends Product ? true : false;
//   ^^^^^^^^^^ This should be `true`. If `false`, transformation is incomplete!

// Example of what TypeScript will catch:
const BadProductSchema = RawProductSchema.transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    // ❌ TypeScript Error: Missing required 'category_id' and 'price' fields!
  };
});

// ✅ PATTERN: Handle missing population logic explicitly
// If you can't populate a field immediately, document it:

export const ProductSchema = RawProductSchema.transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    category_id: data.category_id,
    // TODO: Populate category object by:
    // Option A: JOIN categories in service
    // Option B: Lookup categories in transformation
    // Option C: Make category optional in interface
    category: undefined as Category | undefined,  // Explicit undefined for clarity
    price: data.price,
  };
});

// 🚨 WARNING SIGNS of Pattern 4 violations:
// - Runtime errors: "Cannot read property 'name' of undefined"  
// - UI breaks with missing data that should be present
// - TypeScript compiles but interface expectations don't match transformation output
// - Manual type casting or `as any` to bypass TypeScript errors
// - Schema transforms partial data but interface expects complete data

// ❌ CRITICAL ANTI-PATTERN: Bypassing TypeScript safety
const DangerousSchema = RawProductSchema.transform((data) => {
  return {
    id: data.id,
    name: data.name,
    // Missing fields, but no type annotation = TypeScript can't help!
  } as Product; // ❌ NEVER use `as Product` to bypass incomplete transformations!
});

// ✅ TESTING PATTERN: Validate transformation completeness
describe('ProductSchema transformation completeness', () => {
  it('should populate all required interface fields', () => {
    const rawData = { id: '1', name: 'Test', category_id: 'cat1', price: 10 };
    const result = ProductSchema.parse(rawData);
    
    // Verify every interface field is present
    expect(result.id).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.category_id).toBeDefined();
    expect(result.price).toBeDefined();
    
    // Document incomplete fields explicitly
    expect(result.category).toBeUndefined(); // TODO: Populate category object
  });
});
```

---

## 🔒 **Schema Contract Management**

### **Philosophy: No Schema Violations in UI Layer**
**Rule**: Schema violations must be impossible to reach production through automated enforcement, not developer discipline.

The contract management system provides multiple layers of protection ensuring the UI layer receives only validated, type-safe data:

```
DATABASE → SERVICE → HOOK → COMPONENT → UI
    ↑         ↑        ↑        ↑
   [1]       [2]      [3]     [4]
```

1. **Database Layer**: Zod schemas validate at data source
2. **Service Layer**: Pattern validation catches field selection bugs  
3. **Hook Layer**: React Query with validated data
4. **Component Layer**: TypeScript ensures correct prop types

### **Pattern 1: Compile-Time Contract Enforcement**
**Rule**: TypeScript compilation must fail when schemas don't match interfaces exactly.

```typescript
// ✅ CORRECT: Schema contract that enforces interface alignment
import { z } from 'zod';
import type { Product } from '../types';

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(), // Must match interface exactly
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

// Contract enforcement test (required for every schema)
type ProductContract = AssertExact<z.infer<typeof ProductSchema>, Product>;

// ❌ VIOLATION: Missing required field - compilation fails
export const BrokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Missing description field
}).transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    // Missing description - TS2741 error
  };
});
```

**Contract Test Result:**
```bash
$ npx tsc --noEmit schema-file.ts
error TS2741: Property 'description' is missing in type
```

### **Pattern 2: Service Field Selection Validation**
**Rule**: Service layer must use exact database column names and validate all responses.

```typescript
// ✅ CORRECT: Validated service pattern
export const getProduct = async (id: string): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, category_id, stock_quantity, is_available, created_at, updated_at')
    //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //     Exact database field names (validated by lint:schemas)
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch product: ${error.message}`);
  
  // Always validate through schema
  return ProductSchema.parse(data);
};

// ❌ VIOLATION: Wrong field selection - caught by pattern validator
export const getBrokenProduct = async (id: string): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, category, stock_quantity') // Wrong: 'category' should be 'category_id'
    .eq('id', id)
    .single();
    
  // Manual construction - bypasses validation
  return {
    id: data.id,
    name: data.name,
    // Easy to miss fields or get types wrong
  } as Product; // Dangerous type assertion
};
```

**Pattern Validation Result:**
```bash
$ npm run lint:schemas
⚠️ Field selection violation: using 'category' - should be 'category_id'
```

### **Pattern 3: Pre-Commit Contract Validation**
**Rule**: Violations cannot be committed to the repository.

```bash
# .husky/pre-commit
#!/usr/bin/env sh
echo "🔍 Running schema contract validation..."

# Check TypeScript compilation for schema contracts
npx tsc --noEmit src/schemas/__contracts__/schema-contracts.test.ts
if [ $? -ne 0 ]; then
  echo "❌ Schema contracts failed - TypeScript compilation error"
  exit 1
fi

# Run schema pattern validation  
npm run lint:schemas
if [ $? -ne 0 ]; then
  echo "❌ Schema pattern validation failed"
  exit 1
fi

echo "✅ All schema validations passed"
```

**Pre-Commit Protection:**
- ❌ Code with contract violations cannot be committed
- ❌ Wrong field selections cannot be committed
- ❌ Missing schema validations cannot be committed

### **Pattern 4: Failure Simulation Testing**
**Rule**: Contract system effectiveness must be proven with intentional violations.

```typescript
// Failure simulation test - demonstrates violations are caught
const TestMissingField = (): Product => {
  return {
    id: "test",
    name: "test product",
    // Missing required 'description' field
    price: 10.99,
    stock_quantity: 5,
    category_id: "cat1",
    is_available: true,
    created_at: "2023-01-01",
    updated_at: "2023-01-01"
  }; // TypeScript error: Property 'description' is missing
};

const TestWrongType = (): Product => {
  return {
    id: "test",
    name: "test product", 
    description: "test description",
    price: "wrong type", // Should be number, not string
    // ... rest of fields
  }; // TypeScript error: Type 'string' is not assignable to type 'number'
};
```

**Simulation Results:**
- ✅ Missing fields caught: `TS2741: Property 'description' is missing`
- ✅ Wrong types caught: `TS2322: Type 'string' is not assignable to type 'number'`

### **Contract Management Best Practices**

#### **✅ Required for Every Schema:**
```typescript
// 1. Interface definition
export interface EntityName { ... }

// 2. Zod schema with exact transform
export const EntitySchema = z.object({ ... }).transform((data): EntityName => { ... });

// 3. Contract test
type EntityContract = AssertExact<z.infer<typeof EntitySchema>, EntityName>;

// 4. Service validation
export const getEntity = async () => {
  const data = await fetchFromDatabase();
  return EntitySchema.parse(data); // Always validate
};
```

#### **❌ Contract Violations:**
```typescript
// Never bypass validation
const entity = data as EntityName; // Dangerous type assertion

// Never manually construct return objects
return { id: data.id, name: data.name }; // Easy to miss fields

// Never skip contract tests
export const NewSchema = z.object({ ... }); // Missing contract test

// Never guess field names
.select('category') // Should be 'category_id' from database.generated.ts
```

### **Automated Enforcement Pipeline**

```mermaid
graph TD
    A[Developer writes code] --> B[Pre-commit hook]
    B --> C{Contract validation}
    C -->|Pass| D[Code committed]
    C -->|Fail| E[Commit blocked]
    D --> F[GitHub Actions CI]
    F --> G{Full validation}
    G -->|Pass| H[PR approved]
    G -->|Fail| I[PR blocked]
    H --> J[Production deployment]
    J --> K[UI receives clean data]
    
    E --> L[Fix violations locally]
    I --> L
    L --> A
```

### **Success Metrics**
- ✅ **Zero schema violations** reach production
- ✅ **All new schemas** pass contract validation
- ✅ **Field selection bugs** caught pre-commit  
- ✅ **UI layer protection** - only validated data reaches components

**Result**: UI components receive type-safe, complete, validated data with zero possibility of schema violations.

---

## ⚡ **React Query Patterns**

### **Pattern 1: Centralized Query Key Factory Usage** ⚠️ CRITICAL
**Rule**: Always use the centralized query key factory. Never create local duplicate systems.

```typescript
// ✅ CORRECT: Use centralized factory consistently
import { cartKeys, productKeys, orderKeys } from '../utils/queryKeyFactory';

const useCart = () => {
  return useQuery({
    queryKey: cartKeys.all(userId),
    queryFn: cartService.getCart,
    // ...
  });
};

const useProducts = () => {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: productService.getProducts,
    // ...
  });
};

// ❌ ANTI-PATTERN: Local duplicate factory
export const localProductKeys = {
  all: ['products'] as const,
  lists: () => [...localProductKeys.all, 'list'] as const,
  search: (query: string) => ['products', 'search', query] as const,
};

// This creates dual systems and cache inconsistencies!
```

**Critical Discovery**: The audit revealed **dual query key systems** running in parallel across hooks, causing cache invalidation inconsistencies and developer confusion.

### **Pattern 2: User-Isolated Query Keys**
**Rule**: Always isolate user data with proper query key strategies.

```typescript
// ✅ CORRECT: User isolation with fallback strategy
export const createQueryKeyFactory = (config: QueryKeyConfig) => {
  return {
    all: (userId?: string, options?: QueryKeyOptions) => {
      const base = [config.entity] as const;
      
      if (config.isolation === 'user-specific' && userId) {
        return [...base, userId] as const;
      }
      
      if (config.isolation === 'user-specific' && !userId && options?.fallbackToGlobal) {
        console.warn(`⚠️ ${config.entity} falling back to global query key`);
        return [...base, 'global-fallback'] as const;
      }
      
      return base;
    }
  };
};

// Usage:
export const cartKeys = createQueryKeyFactory({ 
  entity: 'cart', 
  isolation: 'user-specific' 
});

// ❌ WRONG: No user isolation
const badKeys = {
  all: ['cart'] // All users share the same cache key!
};
```

### **Pattern 3: Entity-Specific Factory Methods**
**Rule**: Extend factories with entity-specific methods rather than manual key spreading.

```typescript
// ✅ CORRECT: Entity-specific factory methods
export const kioskKeys = {
  ...createQueryKeyFactory({ entity: 'kiosk', isolation: 'user-specific' }),
  // Entity-specific extensions
  session: (sessionId: string, userId?: string) => 
    [...kioskKeys.details(userId), 'session', sessionId],
  sessionTransactions: (sessionId: string, userId?: string) => 
    [...kioskKeys.details(userId), 'session', sessionId, 'transactions'],
  staffSessions: (staffId: string, userId?: string) => 
    [...kioskKeys.lists(userId), 'staff', staffId, 'sessions'],
};

// Usage:
queryKey: kioskKeys.sessionTransactions(sessionId, user?.id)

// ❌ WRONG: Manual key spreading
queryKey: [...kioskKeys.details(user?.id), 'session', sessionId, 'transactions']
```

**Benefits**: Reduces error surface, improves readability, enables better TypeScript support.

### **Pattern 2: Optimized Cache Configuration**
**Rule**: Tune cache settings based on data volatility and user expectations.

```typescript
// ✅ CORRECT: Context-appropriate cache settings
const useCart = () => {
  return useQuery({
    queryKey: cartKeys.all(userId),
    queryFn: cartService.getCart,
    staleTime: 2 * 60 * 1000,  // 2 minutes - cart changes frequently
    gcTime: 5 * 60 * 1000,     // 5 minutes - reasonable cleanup
    refetchOnMount: true,       // Always check on mount for cart
    refetchOnWindowFocus: false, // Don't spam on focus changes
  });
};

const useProducts = () => {
  return useQuery({
    queryKey: productKeys.all(),
    queryFn: productService.getProducts,
    staleTime: 5 * 60 * 1000,   // 5 minutes - products change less often
    gcTime: 10 * 60 * 1000,     // 10 minutes - longer cache retention
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};
```

### **Pattern 3: Smart Query Invalidation**
**Rule**: Invalidate related queries intelligently without over-invalidating.

```typescript
// ✅ CORRECT: Targeted invalidation with fallbacks
const getRelatedQueryKeys = (userId: string) => [
  cartKeys.all(userId),
  ['stock'],    // Invalidate stock validation cache (not full products)
  ['orders'],   // Invalidate order history that might be affected
  // Don't invalidate products - they rarely change due to cart operations
];

const addToCartMutation = useMutation({
  mutationFn: cartService.addItem,
  onSuccess: () => {
    // Invalidate only related queries
    getRelatedQueryKeys(userId).forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  },
  onError: (error) => {
    // Don't invalidate on error - keep existing cache
    console.error('Cart operation failed:', error);
  }
});

// ❌ WRONG: Over-invalidation
const badInvalidation = () => {
  queryClient.invalidateQueries(); // Invalidates EVERYTHING!
};
```

### **Pattern 4: Error Recovery & User Experience**
**Rule**: Provide meaningful error states without breaking user workflows.

```typescript
// ✅ CORRECT: Comprehensive error handling
const useCart = () => {
  const { data: user } = useCurrentUser();
  
  // Enhanced authentication guard
  if (!user?.id) {
    const authError = createCartError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view your cart'
    );
    
    return {
      data: { items: [], total: 0 }, // Provide empty cart, don't break UI
      isLoading: false,
      error: authError,
      isError: true,
      refetch: () => Promise.resolve({ data: { items: [], total: 0 } } as any),
    };
  }

  return useQuery({
    queryKey: cartKeys.all(user.id),
    queryFn: cartService.getCart,
    // ... cache options
  });
};
```

---

## 🔑 **Query Key Factory Patterns**

### **Critical Discovery: Dual Systems Problem** ⚠️ URGENT
**Audit Finding**: Multiple hooks are creating **local duplicate query key systems** instead of using the centralized factory, causing cache invalidation inconsistencies and developer confusion.

### **Pattern 1: Consistent Factory Usage**
**Rule**: Always use centralized query key factories. Never create local duplicates.

```typescript
// ✅ CORRECT: Centralized factory usage
import { cartKeys, productKeys, orderKeys, authKeys } from '../utils/queryKeyFactory';

// In hooks:
const useCart = (userId: string) => {
  return useQuery({
    queryKey: cartKeys.all(userId),
    queryFn: cartService.getCart,
  });
};

const useProducts = () => {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: productService.getProducts,
  });
};

// ❌ CRITICAL ANTI-PATTERN: Local duplicate factory
export const localProductKeys = {
  all: ['products'] as const,
  lists: () => [...localProductKeys.all, 'list'] as const,
  search: (query: string) => ['products', 'search', query] as const,
};

// This creates dual systems! Found in:
// - useProducts.ts (products hook)
// - useAuth.ts (auth hook) 
// - Multiple service files
```

### **Pattern 2: Service Layer Factory Integration**
**Rule**: Services should use factories for cache invalidation, not manual key construction.

```typescript
// ✅ CORRECT: Service using factory for invalidation
import { cartKeys, productKeys, orderKeys } from '../utils/queryKeyFactory';

export const realtimeService = {
  handleCartUpdate: async (userId: string) => {
    // Use centralized factories
    await queryClient.invalidateQueries({ queryKey: cartKeys.all(userId) });
    await queryClient.invalidateQueries({ queryKey: productKeys.all() });
    await queryClient.invalidateQueries({ queryKey: orderKeys.lists(userId) });
  }
};

// ❌ WRONG: Manual key construction in services
const badInvalidation = async () => {
  await queryClient.invalidateQueries({ queryKey: ['userOrders'] });
  await queryClient.invalidateQueries({ queryKey: ['orders', 'user', userId] });
  await queryClient.invalidateQueries({ queryKey: ['products'] });
};
```

### **Pattern 3: Entity-Specific Factory Extensions**
**Rule**: Extend base factories with entity-specific methods for complex queries.

```typescript
// ✅ CORRECT: Extended factory for complex entity patterns
export const kioskKeys = {
  ...createQueryKeyFactory({ entity: 'kiosk', isolation: 'user-specific' }),
  
  // Entity-specific methods to replace manual spreading
  session: (sessionId: string, userId?: string) => 
    [...kioskKeys.details(userId), 'session', sessionId],
  
  sessionTransactions: (sessionId: string, userId?: string) => 
    [...kioskKeys.details(userId), 'session', sessionId, 'transactions'],
  
  sessionCustomer: (sessionId: string, userId?: string) => 
    [...kioskKeys.details(userId), 'session', sessionId, 'customer'],
  
  staffSessions: (staffId: string, userId?: string) => 
    [...kioskKeys.lists(userId), 'staff', staffId, 'sessions'],
  
  staffPins: (staffId: string, userId?: string) => 
    [...kioskKeys.lists(userId), 'staff', staffId, 'pins'],
  
  sessionsFiltered: (filters: any, userId?: string) => 
    [...kioskKeys.lists(userId), 'sessions', filters],
};

// Usage:
queryKey: kioskKeys.sessionTransactions(sessionId, user?.id)

// ❌ WRONG: Manual key spreading everywhere
queryKey: [...kioskKeys.details(user?.id), 'session', sessionId, 'transactions']
```

### **Pattern 4: Factory Adoption Scorecard**
Based on audit findings, current adoption rates:

| Entity | Factory Usage | Issues Found |
|--------|---------------|--------------|
| **Cart** | ✅ 95% | Excellent adoption |
| **Orders** | ✅ 90% | Good usage |
| **Products** | ⚠️ 50% | **Dual systems problem** |
| **Auth** | ❌ 10% | **Complete bypass** |
| **Kiosk** | ⚠️ 70% | Manual spreading |
| **Stock** | ✅ 85% | Mostly consistent |

### **Best Practice Guidelines**
1. **Eliminate Dual Systems**: Always use centralized factories instead of creating local duplicates
2. **Service Layer Consistency**: Services should use factories for cache invalidation operations
3. **Entity-Specific Extensions**: Prefer extending factories with entity-specific methods over manual key construction
4. **Factory Adoption**: Maintain consistent factory usage patterns across all entities

---

## 🗃️ **Database Query Patterns**

### **Pattern 1: Direct Supabase with Validation**
**Rule**: Use direct Supabase queries with proper validation pipelines.

```typescript
// ✅ CORRECT: Direct query + validation pipeline
export const getCart = async (): Promise<CartState> => {
  // Step 1: Direct Supabase query (fast, indexed)
  const { data: rawCartItems, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', user.id)  // Indexed field
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Step 2: Fetch related data (separate query for resilience)
  const productIds = rawCartItems.map(item => item.product_id);
  const { data: rawProducts } = await supabase
    .from('products')
    .select(/* specific fields */)
    .in('id', productIds)    // Indexed field
    .eq('is_available', true); // Indexed field

  // Step 3: Individual validation with skip-on-error
  const validProducts = rawProducts.map(raw => {
    try {
      return ProductSchema.parse(raw);
    } catch (error) {
      ValidationMonitor.recordValidationError(/* ... */);
      return null;
    }
  }).filter(Boolean);

  return transformToCartState(rawCartItems, validProducts);
};

// ❌ WRONG: Complex JOIN that breaks error handling
const badQuery = async () => {
  const { data } = await supabase
    .from('cart_items')
    .select(`*, products!inner (*)`) // If any product fails, entire cart fails
    .eq('user_id', user.id);
  
  return data; // No individual validation possible
};
```

### **Pattern 2: Atomic Operations with Broadcasting**
**Rule**: Use atomic database operations with real-time synchronization.

```typescript
// ✅ CORRECT: Atomic operation + broadcast
export const addItem = async (product: Product, quantity: number) => {
  try {
    // Step 1: Atomic database operation
    const { error } = await supabase.rpc('upsert_cart_item', {
      input_user_id: user.id,
      input_product_id: product.id,
      input_quantity_to_add: quantity
    });

    if (error) throw error;

    // Step 2: Broadcast for real-time sync (non-blocking)
    try {
      await cartBroadcast.send('cart-item-added', {
        productId: product.id,
        quantity,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    } catch (broadcastError) {
      // Don't fail the operation if broadcast fails
      console.warn('Failed to broadcast cart update:', broadcastError);
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      message: 'Failed to add item to cart. Please try again.' 
    };
  }
};
```

### **Pattern 3: Real-time Stock Validation**
**Rule**: Always validate stock in real-time before operations.

```typescript
// ✅ CORRECT: Real-time stock check with graceful handling
const validateStock = async (productId: string, requestedQuantity: number) => {
  // Get current stock (real-time)
  const { data: stockData, error } = await supabase
    .from('products')
    .select('stock_quantity, is_pre_order, min_pre_order_quantity, max_pre_order_quantity')
    .eq('id', productId)
    .eq('is_available', true)
    .single();

  if (error || !stockData) {
    return {
      valid: false,
      message: 'Product is no longer available'
    };
  }

  // Get current cart quantity (with error handling)
  let currentCartQuantity = 0;
  try {
    const { data: cartData } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle(); // Use maybeSingle() to avoid errors on no rows

    currentCartQuantity = cartData?.quantity || 0;
  } catch (error) {
    console.warn('Error fetching cart quantity, defaulting to 0:', error);
    currentCartQuantity = 0; // Fail-safe
  }

  const totalRequestedQuantity = currentCartQuantity + requestedQuantity;

  // Stock validation logic...
  if (stockData.is_pre_order) {
    // Pre-order validation
    const minPreOrder = stockData.min_pre_order_quantity || 1;
    const maxPreOrder = stockData.max_pre_order_quantity || 999;
    
    if (totalRequestedQuantity < minPreOrder) {
      return {
        valid: false,
        message: `Minimum pre-order quantity is ${minPreOrder}`
      };
    }
    // ... more validation
  }

  return { valid: true };
};
```

---

## 📊 **Monitoring & Observability Patterns**

### **Pattern 1: Comprehensive ValidationMonitor Usage**
**Rule**: Monitor both successes and failures for production insights.

```typescript
// ✅ CORRECT: Complete monitoring integration
export class ValidationMonitor {
  // Track validation failures
  static recordValidationError(details: {
    context: string;
    errorMessage: string;
    errorCode: string;
    validationPattern?: string;
  }) {
    console.warn(`⚠️ Validation error in ${details.context}:`, details);
    // Could send to analytics service
  }

  // Track calculation mismatches
  static recordCalculationMismatch(details: {
    type: string;
    expected: number;
    actual: number;
    tolerance: number;
    orderId?: string;
  }) {
    console.warn(`💰 Calculation mismatch (${details.type}):`, details);
    // Critical for financial operations
  }

  // Track successful patterns (positive monitoring)
  static recordPatternSuccess(details: {
    service: string;
    pattern: string;
    operation: string;
    performanceMs?: number;
  }) {
    console.log(`✅ Pattern success: ${details.service}.${details.operation}`);
    // Track what's working well
  }
}

// Usage throughout services:
try {
  const result = await ProductSchema.parse(rawProduct);
  
  ValidationMonitor.recordPatternSuccess({
    service: 'ProductService',
    pattern: 'transformation_schema',
    operation: 'productValidation'
  });
  
  return result;
} catch (error) {
  ValidationMonitor.recordValidationError({
    context: 'ProductService.getProducts',
    errorMessage: error.message,
    errorCode: 'PRODUCT_SCHEMA_VALIDATION_FAILED',
    validationPattern: 'transformation_schema'
  });
  
  throw error;
}
```

### **Pattern 2: Production Calculation Validation**
**Rule**: Auto-correct calculation mismatches while monitoring them.

```typescript
// ✅ CORRECT: Auto-correct with monitoring
const validateCartTotal = (cart: CartState): CartState => {
  const calculatedTotal = calculateTotal(cart.items);
  const tolerance = 0.01;
  const difference = Math.abs(cart.total - calculatedTotal);
  
  if (difference > tolerance) {
    // Monitor the mismatch
    ValidationMonitor.recordCalculationMismatch({
      type: 'cart_total',
      expected: calculatedTotal,
      actual: cart.total,
      difference,
      tolerance,
      cartId: 'user-cart'
    });
    
    // Auto-correct for user experience
    return {
      ...cart,
      total: calculatedTotal
    };
  }
  
  return cart;
};
```

---

## 🛡️ **Security Patterns**

### **Pattern 1: User Data Isolation**
**Rule**: Never mix user data, always validate user ownership.

```typescript
// ✅ CORRECT: Proper user isolation
export const getUserOrders = async (userId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.id !== userId) {
    throw new Error('Unauthorized access');
  }

  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id); // Always filter by authenticated user
    
  return data;
};

// ❌ WRONG: No user validation
const badGetOrders = async (userId: string) => {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId); // Trusts the parameter!
    
  return data;
};
```

### **Pattern 2: Cryptographic Channel Security**
**Rule**: Use HMAC-based channel names for real-time features.

```typescript
// ✅ CORRECT: Cryptographically secure channels
export class SecureChannelNameGenerator {
  private static readonly CHANNEL_SECRET = process.env.EXPO_PUBLIC_CHANNEL_SECRET;
  
  static generateSecureChannelName(entity: EntityType, target: BroadcastTarget, userId?: string): string {
    const baseData = `myfarmstand-secure-channel-${entity}-${target}`;
    
    switch (target) {
      case 'user-specific':
        if (!userId) throw new Error('userId required for user-specific channel');
        const userHash = CryptoJS.HmacSHA256(`${baseData}-${userId}`, this.CHANNEL_SECRET).toString();
        return `sec-${entity}-${userHash.substring(0, 16)}`;
        
      case 'global':
        const globalHash = CryptoJS.HmacSHA256(`${baseData}-global`, this.CHANNEL_SECRET).toString();
        return `sec-${entity}-global-${globalHash.substring(0, 12)}`;
    }
  }
}
```

---

## 🎨 **User Experience Patterns**

### **Pattern 1: Graceful Degradation**
**Rule**: Never break the user's workflow due to backend issues.

```typescript
// ✅ CORRECT: Graceful degradation
export const getCart = async (): Promise<CartState> => {
  try {
    const cart = await fetchCartFromServer();
    return cart;
  } catch (error) {
    console.error('Failed to load cart from server:', error);
    
    // Return empty cart instead of crashing
    return { 
      items: [], 
      total: 0,
      _error: 'Failed to load cart. Please try again.'
    };
  }
};

// In React components:
const { data: cart } = useCart();

// UI gracefully handles empty cart
return (
  <div>
    {cart._error && <ErrorBanner message={cart._error} />}
    {cart.items.length === 0 ? (
      <EmptyCartView />
    ) : (
      <CartItemsList items={cart.items} />
    )}
  </div>
);
```

### **Pattern 2: User-Friendly Error Messages**
**Rule**: Provide actionable error messages that users can understand.

```typescript
// ✅ CORRECT: User-friendly error handling
const createCartError = (
  code: CartError['code'],
  technicalMessage: string,
  userMessage: string,
  metadata?: Partial<CartError>
): CartError => ({
  code,
  message: technicalMessage,      // For developers/logs
  userMessage,                    // For users
  ...metadata,
});

// Usage:
if (stockData.stock_quantity < requestedQuantity) {
  return {
    success: false,
    error: createCartError(
      'INSUFFICIENT_STOCK',
      `Requested ${requestedQuantity}, available ${stockData.stock_quantity}`,
      `Only ${stockData.stock_quantity} items available. Please reduce the quantity.`,
      { productId: product.id, availableStock: stockData.stock_quantity }
    )
  };
}
```

---

## 📈 **Performance Patterns**

### **Pattern 1: Performance Within Architectural Constraints**
**Rule**: Optimize within established patterns, never at their expense.

```typescript
// ✅ CORRECT: Pattern-compliant optimization
export const useProducts = () => {
  const queryClient = useQueryClient();
  
  const result = useQuery({
    queryKey: productKeys.all(),
    queryFn: async () => {
      const products = await getProducts();
      
      // Smart prefetching without breaking patterns
      if (!queryClient.getQueryData(categoryKeys.all())) {
        queryClient.prefetchQuery({
          queryKey: categoryKeys.all(),
          queryFn: getCategories,
          staleTime: 10 * 60 * 1000
        });
      }
      
      return products;
    },
    // ... existing cache configuration maintained
  });
  
  return result;
};

// ❌ WRONG: Breaking patterns for performance
const badOptimization = async () => {
  // Don't use JOIN queries that break individual validation
  const { data } = await supabase
    .from('cart_items')
    .select(`*, products!inner (*)`)
    .eq('user_id', user.id);
  
  // This breaks individual product validation and error handling
  return data;
};
```

### **Pattern 2: Parallel Processing with Error Isolation**
**Rule**: Use parallel operations while maintaining error boundaries.

```typescript
// ✅ CORRECT: Parallel processing with individual error handling
const loadCartProducts = async (productIds: string[]): Promise<Product[]> => {
  const productPromises = productIds.map(async (id) => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_available', true)
        .single();
        
      return ProductSchema.parse(data);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'CartService.loadCartProducts',
        errorMessage: error.message,
        errorCode: 'PRODUCT_LOAD_FAILED'
      });
      return null; // Individual failure doesn't break the batch
    }
  });
  
  const results = await Promise.allSettled(productPromises);
  return results
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter(Boolean);
};
```

---

## 🔧 **Development & Testing Patterns**

### **Pattern 1: Comprehensive TypeScript Integration**
**Rule**: Leverage TypeScript's strengths throughout the codebase.

```typescript
// ✅ CORRECT: Strong typing throughout
interface CartOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: CartError;
  data?: T;
}

type CartQueryFn = () => Promise<CartState>;
type AddItemMutationFn = (params: AddItemParams) => Promise<CartOperationResult>;

// Typed error creation
const createCartError = (
  code: CartError['code'],
  message: string,
  userMessage: string,
  metadata?: Partial<CartError>
): CartError => ({ /* ... */ });

// No any types except where absolutely necessary
const processUnknownData = (data: unknown): ProcessedData | null => {
  try {
    return DataSchema.parse(data);
  } catch (error) {
    return null;
  }
};
```

### **Pattern 2: Testing Strategy Alignment**
**Rule**: Tests should validate patterns, not circumvent them.

```typescript
// ✅ CORRECT: Test the actual patterns
describe('CartService', () => {
  it('should handle invalid products gracefully', async () => {
    // Mock one invalid product in a batch
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { id: 'valid-1', name: 'Valid Product', price: 10 },
              { id: 'invalid-1', name: '', price: -5 }, // Invalid data
              { id: 'valid-2', name: 'Another Valid Product', price: 20 }
            ],
            error: null
          })
        })
      })
    });

    const cart = await cartService.getCart();
    
    // Should return valid products and skip invalid ones
    expect(cart.items).toHaveLength(2);
    expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
      context: 'CartService.getCart.productValidation',
      errorCode: 'PRODUCT_SCHEMA_VALIDATION_FAILED'
    });
  });
});
```

---

## 🎯 **Implementation Checklist**

When implementing new features, ensure you follow these patterns:

### **✅ Service Layer Checklist**
- [ ] Direct Supabase queries with proper indexing
- [ ] Individual validation with skip-on-error processing
- [ ] Proper user authentication and data isolation
- [ ] ValidationMonitor integration for both success and failure cases
- [ ] User-friendly error messages with technical details for debugging
- [ ] Atomic operations with non-blocking real-time broadcasting
- [ ] TypeScript interfaces throughout (no `any` types)

### **✅ Schema Layer Checklist**  
- [ ] Database-first validation (handle nullable fields)
- [ ] Single validation pass with transformation
- [ ] No business logic in validation rules
- [ ] Proper error handling with meaningful messages
- [ ] Transform schemas for DB → App format conversion

### **✅ Hook Layer Checklist**
- [ ] **CRITICAL**: Use centralized query key factory (never create local duplicates)
- [ ] User-isolated query keys with fallback strategies
- [ ] Context-appropriate cache settings (staleTime, gcTime)
- [ ] Comprehensive error handling with graceful degradation
- [ ] Smart invalidation strategies (don't over-invalidate)
- [ ] TypeScript interfaces for all mutation and query functions

### **✅ Security Checklist**
- [ ] User data isolation (never trust parameters)
- [ ] Cryptographic channel security for real-time features
- [ ] Proper authentication checks before operations
- [ ] No sensitive data in logs or console outputs

---

## 🏁 **Conclusion**

These patterns represent **battle-tested architectural decisions** that prioritize:

1. **Production Resilience** - Systems that degrade gracefully
2. **User Experience** - Never break the user's workflow
3. **Developer Experience** - Clear patterns that are easy to follow
4. **Type Safety** - Leverage TypeScript's strengths
5. **Observability** - Monitor everything for production insights

**Remember**: These patterns exist because they solve real problems. Don't optimize them away for marginal performance gains. Instead, optimize **within** the patterns to maintain the architectural integrity while improving performance.

---

**This document should be the primary reference** for all future feature development. When in doubt, follow these established patterns rather than creating new ones.

**Last Updated**: 2025-08-19  
**Next Review**: Quarterly or when major architectural changes are proposed