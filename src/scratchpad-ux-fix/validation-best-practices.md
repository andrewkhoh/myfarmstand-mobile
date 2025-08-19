# Validation Best Practices - Lessons Learned
**Date**: 2025-08-19  
**Priority**: 📚 **ARCHITECTURE GUIDELINES**  
**Status**: ✅ **BEST PRACTICE GUIDE**

## 🎯 **Core Validation Principles**

### **1. One Schema, One Validation Pass**
**Principle**: Each piece of data should be validated exactly once at the appropriate boundary.

```typescript
// ❌ ANTI-PATTERN: Double validation
const validated1 = DbSchema.parse(rawData);      // First validation
const validated2 = AppSchema.parse(validated1);   // Second validation (problematic)

// ✅ CORRECT: Single validation + transformation  
const result = TransformSchema.parse(rawData);    // Single step: validate + transform
```

### **2. Database-First Validation**
**Principle**: Always validate against database reality, not application assumptions.

```typescript
// ❌ WRONG: Assuming fields are always present
min_pre_order_quantity: z.number().min(0).optional().default(1)

// ✅ CORRECT: Handle database nulls explicitly
min_pre_order_quantity: z.number().min(0).nullable().optional() // Database allows null
```

### **3. Don't Validate to Make Validation Pass**
**Principle**: Validate to ensure data quality, not to force validation success.

```typescript
// ❌ ANTI-PATTERN: Fabricating data to pass validation
order_items: requestItems.map((item, index) => ({
  id: `fabricated-${index}`,        // ❌ Made-up data
  created_at: new Date().toISOString() // ❌ Fake timestamp
}))

// ✅ CORRECT: Skip validation if data is already validated elsewhere
order_items: z.array(z.any()).optional() // RPC function already validated these
```

## 📋 **Validation Strategy by Context**

### **Input Validation (Boundary Entry)**
**When**: Data coming from external sources (user input, API requests)  
**Purpose**: Ensure data meets business rules before processing  
**Schema Type**: Strict validation with business logic

```typescript
// Example: Order submission input
export const CreateOrderRequestSchema = z.object({
  customerInfo: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email required'),
    phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Valid phone number required')
  }),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().min(1).max(100, 'Max 100 items per product')
  })).min(1, 'Order must contain at least one item'),
  fulfillmentType: z.enum(['pickup', 'delivery'])
});
```

### **Database Schema Validation (Data Integrity)**
**When**: Validating raw database responses  
**Purpose**: Ensure database data matches expected structure  
**Schema Type**: Permissive validation matching database constraints

```typescript
// Example: Product from database
export const DbProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),      // Database allows null
  price: z.number().min(0),
  stock_quantity: z.number().nullable(),              // Database allows null
  is_pre_order: z.boolean().nullable().optional(),   // Database allows null
  created_at: z.string().nullable().optional(),      // Database allows null
  updated_at: z.string().nullable().optional()       // Database allows null
});
```

### **Output Validation (Application Layer)**
**When**: Transforming validated data for application use  
**Purpose**: Provide clean, typed data to application logic  
**Schema Type**: Transform validation with defaults and field mapping

```typescript
// Example: Transform to application format
export const ProductSchema = DbProductSchema.transform(data => ({
  id: data.id,
  name: data.name.trim(),
  description: data.description || 'No description available',
  price: data.price,
  stockQuantity: data.stock_quantity ?? 0,
  isPreOrder: data.is_pre_order ?? false,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || ''
}));
```

### **Skip Validation (Already Validated Data)**
**When**: Data has already been validated by another system  
**Purpose**: Avoid double validation while maintaining type safety  
**Schema Type**: Permissive passthrough validation

```typescript
// Example: Order items already validated by RPC function
export const OrderSchema = z.object({
  id: z.string().min(1),
  customer_name: z.string().min(1),
  // ... other fields that need validation
  order_items: z.array(z.any()).optional() // Skip - RPC already validated
});
```

## 🔧 **Common Patterns & Solutions**

### **Pattern 1: Nullable Database Fields**
**Problem**: Database allows `NULL`, schema expects values  
**Solution**: Add `.nullable().optional()` to match database reality

```typescript
// Database: `field_name: string | null`
// Schema should be:
field_name: z.string().nullable().optional()

// In transform, provide defaults:
.transform(data => ({
  fieldName: data.field_name || 'default value'
}))
```

### **Pattern 2: Field Name Mapping**
**Problem**: Database uses `snake_case`, app uses `camelCase`  
**Solution**: Transform in schema, don't map manually

```typescript
// ❌ WRONG: Manual mapping in service
const product = {
  stockQuantity: rawData.stock_quantity,
  isPreOrder: rawData.is_pre_order
};

// ✅ CORRECT: Transform in schema
export const ProductSchema = DbProductSchema.transform(data => ({
  stockQuantity: data.stock_quantity,
  isPreOrder: data.is_pre_order
}));
```

### **Pattern 3: Complex Data Structures**
**Problem**: Nested objects with different validation needs  
**Solution**: Validate at appropriate level, skip where already validated

```typescript
// Example: Order with items
export const OrderSchema = z.object({
  // Validate order summary fields
  id: z.string().min(1),
  total: z.number().min(0),
  
  // Skip validating items if they're from validated source
  items: z.array(z.any()).optional(),
  
  // Or validate if items come from user input
  newItems: z.array(OrderItemInputSchema).optional()
});
```

## 🚨 **Anti-Patterns to Avoid**

### **Anti-Pattern 1: Double Validation**
```typescript
// ❌ DON'T DO THIS
const dbResult = await DefensiveDatabase.fetchWithValidation(query, DbSchema);
const appResult = AppSchema.parse(dbResult); // Second validation!
```

**Why it's bad**: Performance overhead, can cause false validation failures, complexity

### **Anti-Pattern 2: Data Fabrication**
```typescript
// ❌ DON'T DO THIS
const fakeData = {
  id: `generated-${Date.now()}`,     // Making up IDs
  created_at: new Date().toISOString() // Fake timestamps
};
```

**Why it's bad**: Data integrity issues, debugging confusion, not reflecting reality

### **Anti-Pattern 3: Overly Strict Schemas**
```typescript
// ❌ DON'T DO THIS
const DatabaseSchema = z.object({
  optional_field: z.string().min(1) // Required in schema but nullable in DB
});
```

**Why it's bad**: Runtime failures when database has valid null values

### **Anti-Pattern 4: Schema Validation in Wrong Layer**
```typescript
// ❌ DON'T DO THIS
// Using database schema for user input
const userInput = DbProductSchema.parse(formData); // Wrong schema type

// Using app schema for database data
const dbData = AppProductSchema.parse(rawDbData);   // Wrong schema type
```

## 📊 **Decision Tree: Which Validation Approach?**

```
Data Source?
├── User Input/API Request
│   └── Use Input Validation Schema (strict business rules)
├── Database Response
│   ├── Need to transform for app use?
│   │   ├── Yes → Use Transform Schema (DbSchema + transform)
│   │   └── No → Use Database Schema (nullable fields)
│   └── Already validated elsewhere?
│       └── Yes → Skip validation (z.any() or minimal schema)
└── Third-party API
    └── Use External API Schema (defensive, handle unexpected fields)
```

## 🛠 **Implementation Guidelines**

### **Schema Naming Convention**
```typescript
CreateOrderRequestSchema    // Input validation
DbOrderSchema              // Database format validation  
OrderSchema                // App format (transform)
OrderSummarySchema         // Subset for specific use cases
```

### **File Organization**
```
src/schemas/
├── input/           # User input validation schemas
├── database/        # Database format schemas  
├── transform/       # Transform schemas (DB → App)
└── external/        # Third-party API schemas
```

### **Validation Error Handling**
```typescript
const validateWithContext = (data: unknown, schema: ZodSchema, context: string) => {
  try {
    return schema.parse(data);
  } catch (error) {
    ValidationMonitor.recordValidationError({
      context,
      errorCode: 'VALIDATION_FAILED',
      errorMessage: error.message
    });
    throw new Error(`Validation failed in ${context}: ${error.message}`);
  }
};
```

## 🎯 **Success Metrics**

### **Validation Health Indicators**
- ✅ **< 1% validation error rate** in production
- ✅ **Zero data fabrication** in validation layer
- ✅ **Single validation pass** per data flow
- ✅ **Database-schema alignment** (no nullable field mismatches)

### **Code Quality Indicators**
- ✅ **Clear separation** of input/database/transform schemas
- ✅ **No manual field mapping** outside of transform schemas
- ✅ **Defensive database patterns** where appropriate
- ✅ **Comprehensive error monitoring** with ValidationMonitor

## 📚 **Real Examples from Our Fixes**

### **Example 1: Cart Stock Validation (Fixed Correctly)**
```typescript
// ✅ BEFORE FIX: Mismatched database reality
min_pre_order_quantity: z.number().min(0).optional().default(1)

// ✅ AFTER FIX: Matches database nullable fields
min_pre_order_quantity: z.number().min(0).nullable().optional()
```

### **Example 2: Product Service (Fixed Correctly)**
```typescript
// ❌ BEFORE FIX: Double validation
const productData = await DefensiveDatabase.fetchWithValidation(query, DbSchema);
const product = ProductSchema.parse(productData); // Double validation!

// ✅ AFTER FIX: Single validation + transform
const { data: rawData } = await supabase.from('products').select('*');
const product = ProductSchema.parse(rawData); // Single validation
```

### **Example 3: Order Service (Fixed Correctly)**
```typescript
// ❌ BEFORE FIX: Data fabrication
order_items: items.map(item => ({
  id: `fabricated-${index}`,        // Made-up data
  created_at: new Date().toISOString()
}))

// ✅ AFTER FIX: Skip unnecessary validation
order_items: z.array(z.any()).optional() // RPC already validated
```

---

**Status**: ✅ **COMPREHENSIVE VALIDATION BEST PRACTICES ESTABLISHED**  
**Outcome**: **Clear guidelines for preventing validation anti-patterns**  
**Impact**: **Robust, maintainable validation architecture**