# Schema Violation Prevention Guide

## 🎯 Purpose
This guide provides concrete examples of common schema violations and their prevention through automated enforcement. Each example shows the violation, the error it produces, and the correct implementation.

## 🚨 Common Violations & Prevention

### **Violation 1: Missing Required Fields**

#### ❌ VIOLATION EXAMPLE:
```typescript
// This will FAIL compilation
export const IncompleteProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Missing required 'description' field
  price: z.number(),
}).transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    // Missing description - TypeScript error!
    price: data.price,
    stock_quantity: null,
    category_id: '',
    is_available: true,
    created_at: '',
    updated_at: ''
  };
});
```

#### 🔴 ERROR PRODUCED:
```bash
$ npm run test:contracts
error TS2741: Property 'description' is missing in type '{ id: string; name: string; price: number; stock_quantity: null; category_id: string; is_available: true; created_at: string; updated_at: string; }' but required in type 'Product'.
```

#### ✅ CORRECT IMPLEMENTATION:
```typescript
export const CompleteProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(), // Include all required fields
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
    description: data.description, // All fields present
    price: data.price,
    category_id: data.category_id,
    stock_quantity: data.stock_quantity,
    is_available: data.is_available,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
});
```

---

### **Violation 2: Type Mismatches**

#### ❌ VIOLATION EXAMPLE:
```typescript
// This will FAIL compilation
export const WrongTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.string(), // Wrong: should be number
  is_available: z.string(), // Wrong: should be boolean
}).transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    description: 'default',
    price: data.price, // Type error: string vs number
    category_id: '',
    stock_quantity: null,
    is_available: data.is_available, // Type error: string vs boolean
    created_at: '',
    updated_at: '',
  };
});
```

#### 🔴 ERROR PRODUCED:
```bash
$ npm run test:contracts
error TS2322: Type 'string' is not assignable to type 'number'.
error TS2322: Type 'string' is not assignable to type 'boolean'.
```

#### ✅ CORRECT IMPLEMENTATION:
```typescript
export const CorrectTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(), // Correct type
  is_available: z.boolean(), // Correct type
}).transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    description: 'default',
    price: data.price, // Type matches
    category_id: '',
    stock_quantity: null,
    is_available: data.is_available, // Type matches
    created_at: '',
    updated_at: '',
  };
});
```

---

### **Violation 3: Service Field Selection Errors**

#### ❌ VIOLATION EXAMPLE:
```typescript
// This will be CAUGHT by pattern validator
export const getBrokenProduct = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price') // Wrong: 'category' doesn't exist
    .eq('id', id)
    .single();

  // Manual construction bypasses validation
  return {
    id: data.id,
    name: data.name,
    category_id: data.category, // Wrong field
    price: data.price,
  } as Product; // Dangerous type assertion
};
```

#### 🔴 ERROR PRODUCED:
```bash
$ npm run lint:schemas
⚠️ Field selection violation: using 'category' - should be 'category_id'
❌ Service bypasses schema validation - missing ProductSchema.parse()
```

#### ✅ CORRECT IMPLEMENTATION:
```typescript
export const getCorrectProduct = async (id: string): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, category_id, stock_quantity, is_available, created_at, updated_at')
    //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //     All field names from database.generated.ts
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch product: ${error.message}`);
  }

  // Always validate through schema
  return ProductSchema.parse(data);
};
```

---

### **Violation 4: Skipping Contract Tests**

#### ❌ VIOLATION EXAMPLE:
```typescript
// New schema without contract test
export const NewFeatureSchema = z.object({
  id: z.string(),
  feature_name: z.string(),
}).transform((data): NewFeature => {
  return {
    id: data.id,
    featureName: data.feature_name,
  };
});

// NO CONTRACT TEST = VIOLATION
```

#### 🔴 ERROR PRODUCED:
```bash
$ npm run validate:debug
❌ Schema 'NewFeatureSchema' missing contract test in schema-contracts.test.ts
```

#### ✅ CORRECT IMPLEMENTATION:
```typescript
// Schema definition
export const NewFeatureSchema = z.object({
  id: z.string(),
  feature_name: z.string(),
}).transform((data): NewFeature => {
  return {
    id: data.id,
    featureName: data.feature_name,
  };
});

// Required contract test in schema-contracts.test.ts
type NewFeatureContract = AssertExact<z.infer<typeof NewFeatureSchema>, NewFeature>;
```

---

### **Violation 5: Manual Type Assertions**

#### ❌ VIOLATION EXAMPLE:
```typescript
// Bypassing validation - DANGEROUS
export const dangerousGetUser = async (id: string) => {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  
  // No validation - dangerous!
  return data as User;
};

// Service without schema validation
export const unsafeService = async () => {
  const { data } = await supabase.from('users').select('*');
  
  // Manual construction - easy to miss fields
  return data.map(row => ({
    id: row.id,
    name: row.name,
    // Missing other fields...
  })) as User[];
};
```

#### 🔴 ERROR PRODUCED:
```bash
$ npm run lint:schemas
❌ Service bypasses validation - missing schema.parse()
❌ Manual type assertion detected - use schema validation instead
```

#### ✅ CORRECT IMPLEMENTATION:
```typescript
// Safe validation approach
export const safeGetUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  
  // Always validate
  return UserSchema.parse(data);
};

// Safe service with validation
export const safeService = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, phone, address, role, created_at, updated_at');

  if (error) throw new Error(error.message);
  
  // Validate each item
  return data.map(row => UserSchema.parse(row));
};
```

## 🛠 Troubleshooting Common Issues

### **Issue 1: Contract Compilation Fails**

**Symptom:**
```bash
$ npm run test:contracts
error TS2741: Property 'field_name' is missing
```

**Diagnosis:**
1. Schema transform doesn't include all interface fields
2. Field names don't match between schema and interface
3. Types don't align between schema and interface

**Solution Steps:**
1. Check the interface definition in `src/types/index.ts`
2. Compare with schema transform return object
3. Add missing fields to schema and transform
4. Ensure types match exactly

**Debug Command:**
```bash
npm run validate:debug
```

---

### **Issue 2: Pattern Validation Warns**

**Symptom:**
```bash
$ npm run lint:schemas
⚠️ Field selection violation: using 'category'
```

**Diagnosis:**
1. Service is selecting wrong database field name
2. Field doesn't exist in actual database schema

**Solution Steps:**
1. Check `database.generated.ts` for correct field names
2. Update service `.select()` statement
3. Use exact database column names

**Debug Command:**
```bash
npm run lint:schemas:verbose
```

---

### **Issue 3: TypeScript Shows No Errors But Validation Fails**

**Symptom:**
```bash
$ tsc --noEmit  # No errors
$ npm run test:contracts  # Fails
```

**Diagnosis:**
1. Different TypeScript configurations
2. Contract test file has stricter settings
3. Missing import or type definition

**Solution Steps:**
1. Check contract test file directly:
   ```bash
   npx tsc --noEmit src/schemas/__contracts__/schema-contracts.test.ts
   ```
2. Fix any imports or type issues
3. Ensure all schemas are included in contracts

---

### **Issue 4: Pre-Commit Hook Prevents Commit**

**Symptom:**
```bash
$ git commit -m "feature"
❌ Schema contracts failed - TypeScript compilation error
```

**Diagnosis:**
1. Schema violations exist in codebase
2. Contract tests are failing

**Solution Steps:**
1. Run validation locally:
   ```bash
   npm run validate:all
   ```
2. Fix any reported violations
3. Verify fix:
   ```bash
   npm run validate:pre-commit
   ```
4. Commit again

---

## 🔧 Debug Commands Reference

### **Quick Validation:**
```bash
npm run schema:check          # Fast check
npm run validate:all          # Standard validation
npm run validate:all:verbose  # Detailed output
```

### **Contract Testing:**
```bash
npm run test:contracts        # Main contract test
npm run test:contracts:all    # All contract files
npm run test:contracts:watch  # Watch mode
```

### **Pattern Validation:**
```bash
npm run lint:schemas          # Standard pattern check
npm run lint:schemas:verbose  # Detailed pattern analysis
```

### **Full Debug:**
```bash
npm run validate:debug        # Everything with verbose output
```

### **Pre-Commit Simulation:**
```bash
npm run validate:pre-commit   # Simulate pre-commit check
```

## ✅ Prevention Checklist

### **Before Writing New Schema:**
- [ ] Define TypeScript interface first
- [ ] Check `database.generated.ts` for field names
- [ ] Plan transform function structure
- [ ] Include all interface fields

### **While Writing Schema:**
- [ ] Use exact database column names
- [ ] Match types exactly with interface
- [ ] Include complete transform return
- [ ] Add contract test immediately

### **Before Committing:**
- [ ] Run `npm run validate:all`
- [ ] Fix any violations
- [ ] Test with `npm run validate:pre-commit`
- [ ] Verify TypeScript compilation

### **Service Layer Checklist:**
- [ ] Use exact field names from database
- [ ] Always validate with `Schema.parse()`
- [ ] Never use type assertions
- [ ] Handle errors properly

## 🎯 Success Criteria

**When everything works correctly:**
- ✅ `npm run validate:all` shows no errors/warnings
- ✅ Pre-commit hook passes
- ✅ GitHub Actions CI passes
- ✅ UI components receive validated data
- ✅ No runtime schema violations

**Result**: UI layer is completely protected from schema violations through automated enforcement at compile-time, commit-time, and service-time.