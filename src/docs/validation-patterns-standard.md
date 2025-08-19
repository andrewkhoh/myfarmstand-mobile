# Validation Patterns Standard

**Version**: 2.0  
**Date**: 2025-08-19  
**Status**: ✅ **PRODUCTION STANDARD**  
**Compliance Required**: All new services MUST follow these patterns

---

## 📋 **Executive Summary**

This document establishes the **official validation patterns** for MyFarmstand Mobile following a comprehensive audit and refactoring effort (Phases 1-4). These patterns ensure consistent, performant, and maintainable validation across all services.

**Key Principle**: **Single Source of Truth for Each Validation Concern**
- **Schemas**: Data structure and format validation only
- **Services**: Business logic validation and monitoring
- **Never**: Double validation or business logic in schemas

---

## 🏆 **Gold Standard Reference: CartService**

The `cartService` implementation serves as the **authoritative example** of correct validation patterns. All new services should follow this approach.

### **✅ Pattern Compliance Checklist**

Before implementing or modifying any service, verify:

- [ ] **No DatabaseHelpers/DefensiveDatabase usage** → Use direct Supabase queries
- [ ] **No ServiceValidator/ValidationUtils** → Use simple input validation  
- [ ] **No manual validation helper functions** → Use direct schema calls
- [ ] **No business logic in schemas** → Keep schemas for structure only
- [ ] **Single validation step per data flow** → Avoid double validation
- [ ] **Enhanced monitoring usage** → Track patterns and compliance

---

## 🎯 **Required Patterns by Category**

### **1. Database Query Pattern**

#### **✅ REQUIRED: Direct Supabase Queries**
```typescript
// ✅ CORRECT: Direct Supabase query (cartService pattern)
const { data: rawProducts, error } = await supabase
  .from('products')
  .select('id, name, price, stock_quantity')
  .in('id', productIds)
  .eq('is_available', true);

if (error) {
  console.error('Database query failed:', error);
  throw new Error('Failed to fetch products');
}
```

#### **❌ PROHIBITED: DatabaseHelpers/DefensiveDatabase**
```typescript
// ❌ WRONG: DefensiveDatabase anti-pattern
const products = await DatabaseHelpers.fetchFiltered(
  'products',
  'query-cache-key',
  ProductSchema,
  async () => supabase.from('products').select('*'),
  { maxErrorThreshold: 0.2 }
); // NEVER DO THIS
```

### **2. Schema Validation Pattern**

#### **✅ REQUIRED: Direct Schema Usage**
```typescript
// ✅ CORRECT: Direct schema validation with monitoring
const validProducts: Product[] = [];
for (const rawProduct of rawData || []) {
  try {
    const validProduct = ProductSchema.parse(rawProduct);
    validProducts.push(validProduct);
  } catch (error) {
    ValidationMonitor.recordValidationError({
      context: 'ServiceName.methodName.validation',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'SCHEMA_VALIDATION_FAILED',
      validationPattern: 'transformation_schema'
    });
    console.warn('Invalid data, skipping:', { error });
  }
}
```

#### **❌ PROHIBITED: Manual Validation Helpers**
```typescript
// ❌ WRONG: Manual validation helpers
const validateProduct = (data: any): Product => {
  try {
    return ProductSchema.parse(data);
  } catch (error) {
    // Complex error handling...
  }
}; // NEVER CREATE THESE
```

### **3. Input Validation Pattern**

#### **✅ REQUIRED: Simple Input Validation**
```typescript
// ✅ CORRECT: Simple, direct validation (cartService pattern)
if (!orderRequest.customerInfo || !orderRequest.customerInfo.name) {
  throw new Error('Customer information is required');
}

if (!orderRequest.items || orderRequest.items.length === 0) {
  throw new Error('Order must contain at least one item');
}

if (orderRequest.fulfillmentType === 'delivery' && !orderRequest.deliveryAddress) {
  throw new Error('Delivery address required for delivery orders');
}
```

#### **❌ PROHIBITED: Complex ValidationUtils**
```typescript
// ❌ WRONG: Complex validation pipeline
const schema = z.object({
  customerInfo: z.object({
    name: ValidationUtils.createSafeStringSchema(1, 100),
    email: ValidationUtils.createEmailSchema(),
    phone: ValidationUtils.createPhoneSchema()
  }),
  // ... complex nested validation
});
await ServiceValidator.validateInput(data, schema, 'context'); // NEVER DO THIS
```

### **4. Schema Design Pattern**

#### **✅ REQUIRED: Structure Validation Only**
```typescript
// ✅ CORRECT: Schemas validate structure and format only
export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  subtotal: z.number().min(0)
  // NO business logic calculations here
});
```

#### **✅ REQUIRED: Transformation Schemas**
```typescript
// ✅ CORRECT: Transformation schema (DB → App format)
export const DbCartItemTransformSchema = RawDbCartItemSchema.extend({
  product: z.any().optional()
}).transform((data) => ({
  product: data.product,
  quantity: data.quantity,
  _dbData: {
    id: data.id,
    user_id: data.user_id,
    product_id: data.product_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  }
}));
```

#### **❌ PROHIBITED: Business Logic in Schemas**
```typescript
// ❌ WRONG: Business logic calculations in schemas
export const OrderItemSchema = z.object({
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  subtotal: z.number().min(0)
}).refine((data) => {
  // NEVER PUT CALCULATIONS IN SCHEMAS
  const expectedSubtotal = data.price * data.quantity;
  return Math.abs(data.subtotal - expectedSubtotal) < 0.01;
}, {
  message: "Subtotal must equal price × quantity"
}); // NEVER DO THIS
```

### **5. Error Handling Pattern**

#### **✅ REQUIRED: Enhanced Monitoring**
```typescript
// ✅ CORRECT: Enhanced monitoring with pattern tracking
ValidationMonitor.recordValidationError({
  context: 'ServiceName.methodName.specificOperation',
  errorMessage: error instanceof Error ? error.message : 'Unknown error',
  errorCode: 'SPECIFIC_VALIDATION_FAILED',
  validationPattern: 'transformation_schema' // Track which pattern
});

// ✅ CORRECT: Record successful pattern usage
ValidationMonitor.recordPatternSuccess({
  service: 'ServiceName',
  pattern: 'direct_supabase_query',
  operation: 'methodName'
});
```

#### **❌ PROHIBITED: Generic Error Handling**
```typescript
// ❌ WRONG: Generic, uninformative error handling
try {
  // some validation
} catch (error) {
  console.log('Something went wrong'); // Too generic
  throw error; // No monitoring
}
```

### **6. Business Logic Validation Pattern**

#### **✅ REQUIRED: Service-Layer Business Validation**
```typescript
// ✅ CORRECT: Business logic validation in services
const validateOrderCalculations = (order: Order): Order => {
  const calculatedSubtotal = order.items.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0);
  
  const difference = Math.abs(order.subtotal - calculatedSubtotal);
  
  if (difference > 0.01) {
    ValidationMonitor.recordCalculationMismatch({
      type: 'order_subtotal',
      expected: calculatedSubtotal,
      actual: order.subtotal,
      difference,
      tolerance: 0.01,
      orderId: order.id
    });
    
    // Auto-correct and continue
    return { ...order, subtotal: calculatedSubtotal };
  }
  
  return order;
};
```

---

## 🔧 **Implementation Guidelines**

### **New Service Checklist**

When creating a new service:

1. **Start with cartService as template**
2. **Use direct Supabase queries only**
3. **Implement simple input validation** 
4. **Use transformation schemas for DB → App conversion**
5. **Add enhanced monitoring** for all validation steps
6. **Keep business logic in service layer**
7. **Test with pattern compliance tests**

### **Existing Service Migration**

When updating existing services:

1. **Remove DatabaseHelpers usage** → Replace with direct Supabase
2. **Remove ServiceValidator/ValidationUtils** → Replace with simple validation
3. **Remove manual validation helpers** → Use direct schema calls
4. **Add enhanced monitoring** to track migration success
5. **Run pattern compliance tests** to verify changes

### **Code Review Standards**

All PRs must pass these checks:

- [ ] **No anti-pattern imports** (DatabaseHelpers, ServiceValidator, etc.)
- [ ] **Direct Supabase usage** for all database operations
- [ ] **Simple validation patterns** following cartService approach
- [ ] **Enhanced monitoring** for validation events
- [ ] **No business logic in schemas** (only structure validation)
- [ ] **Pattern compliance tests** included if modifying validation logic

---

## 📊 **Monitoring and Compliance**

### **Pattern Success Metrics**

Track these positive indicators:

```typescript
// Record successful pattern adoption
ValidationMonitor.recordPatternSuccess({
  service: 'YourService',
  pattern: 'direct_supabase_query' | 'transformation_schema' | 'simple_input_validation' | 'direct_schema_validation',
  operation: 'methodName',
  performanceMs: executionTime
});
```

### **Compliance Issue Detection**

Monitor for anti-patterns:

```typescript
// Alert on compliance violations
ValidationMonitor.recordPatternComplianceIssue({
  service: 'ProblematicService',
  pattern: 'cartService',
  issue: 'Still using DatabaseHelpers',
  severity: 'error',
  recommendation: 'Migrate to direct Supabase queries'
});
```

### **Health Check Integration**

```typescript
// Monitor validation health
const healthStatus = ValidationMonitor.getHealthStatus();
if (healthStatus.status === 'critical') {
  // Alert development team
  console.error('Validation patterns compliance critical', healthStatus.issues);
}
```

---

## 🚨 **Anti-Pattern Detection**

### **Automated Checks**

These patterns will trigger alerts:

```typescript
// ❌ DETECTED ANTI-PATTERNS (will trigger monitoring alerts)
import { DatabaseHelpers } from '../utils/defensiveDatabase'; // ALERT
import { ServiceValidator } from '../utils/validationPipeline'; // ALERT

// ❌ Usage patterns that trigger alerts
await DatabaseHelpers.fetchFiltered(...); // COMPLIANCE ERROR
await ServiceValidator.validateInput(...); // COMPLIANCE ERROR

// ❌ Business logic in schemas
.refine((data) => {
  return data.price * data.quantity === data.total; // SCHEMA ANTI-PATTERN
});
```

### **Prevention Through Linting**

Consider adding ESLint rules:

```typescript
// Future: ESLint rules to prevent anti-patterns
"no-restricted-imports": [
  "error",
  {
    "paths": [
      {
        "name": "../utils/defensiveDatabase",
        "message": "Use direct Supabase queries instead"
      },
      {
        "name": "../utils/validationPipeline", 
        "message": "Use simple input validation instead"
      }
    ]
  }
]
```

---

## 📚 **Examples and References**

### **✅ Compliant Services (Reference Examples)**

1. **CartService** - `src/services/cartService.ts` 
   - **Perfect implementation** of all patterns
   - **Gold standard** for new services

2. **OrderService** - `src/services/orderService.ts` (post-Phase 2)
   - **Aligned with cartService** patterns
   - **Good example** of migration from anti-patterns

3. **ProductService** - `src/services/productService.ts`
   - **Excellent transformation schemas**
   - **Proper nullable field handling**

4. **AuthService** - `src/services/authService.ts`
   - **Clean input validation**
   - **Appropriate business rule validation**

### **🧪 Test Examples**

1. **Pattern Compliance Tests**:
   - `src/schemas/__tests__/order-service-pattern-alignment.test.ts`
   - `src/schemas/__tests__/order-schema-anti-pattern-fix.test.ts`
   
2. **Enhanced Monitoring Tests**:
   - `src/utils/__tests__/validation-monitoring-enhancements.test.ts`

3. **Schema Transformation Tests**:
   - `src/schemas/__tests__/cart-transform-pattern.test.ts`

---

## 🎯 **Success Metrics**

### **Target Compliance Levels**

- **95%+** compliance score across all services
- **Zero** business logic calculations in schema validation
- **100%** direct Supabase usage (no DatabaseHelpers)
- **100%** simple validation patterns (no ServiceValidator)
- **Single** validation step per data flow

### **Performance Benefits Expected**

- **Reduced validation overhead** from eliminating complex utilities
- **Faster debugging** with consistent patterns
- **Lower maintenance burden** from simplified code
- **Better error messages** from proper separation of concerns

---

## 📝 **Revision History**

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-08-19 | **Complete standard established** - Phases 1-4 implementation |
| 1.0 | 2025-08-19 | Initial documentation from cartService pattern |

---

**💡 Remember**: When in doubt, **follow the cartService pattern**. It represents the gold standard for validation implementation in this codebase.

**🚨 Critical**: Any deviation from these patterns must be approved through architecture review and include justification for the exception.

---

**Signed**: Validation Pattern Compliance Team  
**Next Review**: 2025-09-19 (Monthly compliance review)  
**Contact**: See team documentation for questions or clarifications