# Validation Patterns Quick Reference

**⚡ Quick Guide** | **🎯 Always Use CartService as Reference** | **📋 Phase 1-4 Standards**

---

## 🚀 **TL;DR - Do This, Not That**

| ✅ **DO THIS (CartService Pattern)** | ❌ **DON'T DO THIS (Anti-Pattern)** |
|---------------------------------------|--------------------------------------|
| `await supabase.from('table').select()` | `await DatabaseHelpers.fetchFiltered()` |
| `if (!data) throw new Error()` | `await ServiceValidator.validateInput()` |
| `ProductSchema.parse(rawData)` | `const validateProduct = (data) => { ... }` |
| `ValidationMonitor.recordValidationError()` | Generic error handling |
| Business logic in services | Business logic in schemas |

---

## 📋 **5-Minute Implementation Checklist**

### **New Service Creation:**
```typescript
// 1. ✅ Imports (cartService pattern)
import { supabase } from '../config/supabase';
import { ValidationMonitor } from '../utils/validationMonitor';
import { YourSchema } from '../schemas/your.schema';

// 2. ✅ Direct Supabase query
const { data, error } = await supabase
  .from('your_table')
  .select('*')
  .eq('condition', value);

// 3. ✅ Simple error handling
if (error) {
  console.error('Database error:', error);
  throw new Error('Failed to fetch data');
}

// 4. ✅ Schema validation with monitoring
const validData = [];
for (const item of data || []) {
  try {
    const validItem = YourSchema.parse(item);
    validData.push(validItem);
  } catch (error) {
    ValidationMonitor.recordValidationError({
      context: 'YourService.methodName.validation',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'SCHEMA_VALIDATION_FAILED',
      validationPattern: 'transformation_schema'
    });
  }
}

// 5. ✅ Record success
ValidationMonitor.recordPatternSuccess({
  service: 'YourService',
  pattern: 'direct_supabase_query',
  operation: 'methodName'
});
```

---

## 🏆 **Copy-Paste Templates**

### **Database Query Template**
```typescript
// ✅ COPY THIS - Direct Supabase Pattern
const fetchYourData = async (filters: FilterType): Promise<YourType[]> => {
  const { data: rawData, error } = await supabase
    .from('your_table')
    .select('field1, field2, field3')
    .eq('filter_field', filters.value)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching your data:', error);
    throw new Error('Failed to fetch your data');
  }

  // Validate and transform
  const validData: YourType[] = [];
  for (const item of rawData || []) {
    try {
      const validItem = YourSchema.parse(item);
      validData.push(validItem);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'YourService.fetchYourData.validation',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'YOUR_DATA_VALIDATION_FAILED',
        validationPattern: 'transformation_schema'
      });
    }
  }

  return validData;
};
```

### **Input Validation Template**
```typescript
// ✅ COPY THIS - Simple Input Validation
const validateInput = (input: YourInputType): void => {
  if (!input.requiredField) {
    throw new Error('Required field is missing');
  }
  
  if (!input.arrayField || input.arrayField.length === 0) {
    throw new Error('Array field must contain at least one item');
  }
  
  if (input.conditionalField === 'special' && !input.dependentField) {
    throw new Error('Dependent field required when conditional field is special');
  }
};
```

### **Schema Template**
```typescript
// ✅ COPY THIS - Transformation Schema Pattern
const RawDbYourItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const DbYourItemTransformSchema = RawDbYourItemSchema.transform((data) => ({
  // App format
  id: data.id,
  name: data.name,
  createdAt: data.created_at || '',
  updatedAt: data.updated_at || '',
  
  // Keep raw data for internal operations
  _dbData: {
    id: data.id,
    created_at: data.created_at,
    updated_at: data.updated_at
  }
}));
```

---

## 🚨 **Anti-Pattern Detector**

**If you see ANY of these in code, fix immediately:**

```typescript
// ❌ NEVER IMPORT THESE
import { DatabaseHelpers } from '../utils/defensiveDatabase';
import { ServiceValidator, ValidationUtils } from '../utils/validationPipeline';

// ❌ NEVER USE THESE PATTERNS
await DatabaseHelpers.fetchFiltered(/* ... */);
await ServiceValidator.validateInput(/* ... */);
ValidationUtils.createSafeStringSchema(/* ... */);

// ❌ NEVER PUT BUSINESS LOGIC IN SCHEMAS
.refine((data) => {
  return data.price * data.quantity === data.total; // WRONG!
});

// ❌ NEVER CREATE MANUAL VALIDATION HELPERS
const validateSomething = (data: any) => {
  try {
    return SomeSchema.parse(data);
  } catch (error) {
    // Complex error handling...
  }
}; // Use direct schema calls instead!
```

---

## 🎯 **Common Patterns by Use Case**

### **Fetching Data**
```typescript
// ✅ Pattern: Direct Supabase → Schema Validation → Return
const getData = async () => {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw new Error('Database error');
  return data?.map(item => YourSchema.parse(item)) || [];
};
```

### **Creating Data**
```typescript
// ✅ Pattern: Simple Validation → Insert → Return
const createData = async (input: CreateInput) => {
  // Simple validation
  if (!input.name) throw new Error('Name required');
  
  // Insert
  const { data, error } = await supabase.from('table').insert(input).select();
  if (error) throw new Error('Insert failed');
  
  // Transform and return
  return YourSchema.parse(data[0]);
};
```

### **Complex Business Logic**
```typescript
// ✅ Pattern: Service-Layer Validation with Monitoring
const processComplexData = (data: YourType): YourType => {
  const calculated = complexCalculation(data);
  const difference = Math.abs(data.total - calculated);
  
  if (difference > TOLERANCE) {
    ValidationMonitor.recordCalculationMismatch({
      type: 'your_calculation',
      expected: calculated,
      actual: data.total,
      difference,
      tolerance: TOLERANCE
    });
    
    // Auto-correct and continue
    return { ...data, total: calculated };
  }
  
  return data;
};
```

---

## 🧪 **Testing Checklist**

### **Pattern Compliance Test Template**
```typescript
describe('YourService Pattern Compliance', () => {
  it('should not use anti-pattern imports', () => {
    const content = fs.readFileSync('path/to/yourService.ts', 'utf8');
    expect(content).not.toContain('DatabaseHelpers');
    expect(content).not.toContain('ServiceValidator');
    expect(content).toContain('await supabase');
  });
  
  it('should use enhanced monitoring', () => {
    // Test that ValidationMonitor is called appropriately
  });
});
```

---

## 🎯 **Performance Tips**

### **Optimization Patterns**
```typescript
// ✅ Batch operations when possible
const { data } = await supabase
  .from('table')
  .select('*')
  .in('id', arrayOfIds); // Better than multiple single queries

// ✅ Use specific selects
.select('id, name, price') // Better than .select('*')

// ✅ Add appropriate indexes for common queries
.eq('user_id', userId)     // Make sure user_id is indexed
.order('created_at', { ascending: false }); // created_at indexed
```

---

## 📞 **Need Help?**

### **Quick References:**
- **Gold Standard**: `src/services/cartService.ts` (copy this pattern!)
- **Full Documentation**: `src/docs/validation-patterns-standard.md`
- **Test Examples**: `src/schemas/__tests__/*.test.ts`

### **Common Questions:**
- **"Should I use DatabaseHelpers?"** → No, use direct Supabase
- **"Should I create validation helpers?"** → No, use direct schema calls
- **"Where do complex calculations go?"** → Service layer, not schemas
- **"How do I handle errors?"** → Use ValidationMonitor + simple error messages

### **Migration Priority:**
1. Remove DatabaseHelpers → Direct Supabase
2. Remove ServiceValidator → Simple validation
3. Move business logic from schemas → Services
4. Add enhanced monitoring

---

**💡 Remember: When in doubt, copy cartService patterns exactly!**

**⚡ Quick Test**: Does your code look like cartService? If not, refactor it!