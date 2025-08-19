# Schema Change Impact Audit Strategy

## Date: 2025-08-19

## Overview
Systematic audit to identify all issues caused by Zod Transform Pattern implementation that changed Product/Category data structures.

## What Changed in Our Schemas

### CategorySchema Changes
```typescript
// Before: Expected camelCase, failed on snake_case
category = {
  isActive: boolean,
  createdAt: string,
  updatedAt: string
}

// After: Accepts snake_case, transforms to camelCase
category = {
  // Input (DB): is_available, created_at, updated_at
  // Output (App): isActive + is_available, createdAt + created_at, etc.
}
```

### ProductSchema Changes  
```typescript
// Before: Separate validation + manual field mapping
product.category = undefined | string | Category

// After: Atomic transform with populated category
product.category = Category object {id, name, isActive, createdAt, ...}
product.categories = undefined (DB field, not in final output)
```

## Audit Strategy

### 1. Identify High-Risk Patterns
- **Category object comparisons**: `product.category === string`
- **Direct field access**: `category.isActive` vs `category.is_available`
- **Array access**: `product.categories[0]` vs `product.category`
- **Type assumptions**: Code assuming category is string/ID

### 2. Search Patterns by File Type

#### Components & Screens
- Look for category display logic
- Check product detail rendering
- Find filtering/sorting operations
- Review form submissions

#### Hooks & Services  
- Check data transformation logic
- Review API response processing
- Look for field mapping operations
- Find validation logic

#### Utils & Types
- Check helper functions
- Review type definitions
- Look for legacy field access

### 3. Systematic Search Queries

#### Direct Property Access
- `\.category\.` - Direct category property access
- `\.categories\.` - Categories array access (now removed)
- `\.isActive` - camelCase field access
- `\.is_available` - snake_case field access

#### Comparison Operations
- `=== selectedCategory` - String comparisons
- `== product.category` - Equality checks
- `!== 'all'` - Category filtering

#### Field Mapping
- `mapProductFromDB` - Now redundant
- `categoryId` - Legacy field access
- `getProductCategory` - Category helper functions

## Implementation Plan

### Phase 1: Discovery
1. Run comprehensive file searches
2. Identify all affected files
3. Categorize by risk level
4. Create issue priority matrix

### Phase 2: Analysis  
1. Examine each identified file
2. Determine specific failure modes
3. Plan fix approach
4. Estimate impact scope

### Phase 3: Systematic Fixing
1. Fix high-risk issues first
2. Validate each fix with tests
3. Document changes made
4. Verify no regressions

### Phase 4: Validation
1. Run comprehensive tests
2. Manual UX testing
3. Performance verification
4. Documentation updates

## Risk Categories

### 🔴 HIGH RISK - Immediate Failures
- Category filtering/sorting (like ShopScreen)
- Product detail displays
- Form submissions with category data
- API calls expecting old format

### 🟡 MEDIUM RISK - Potential Issues
- Display components with conditional logic
- Helper functions with field access
- Type assertions on changed structures
- Legacy compatibility code

### 🟢 LOW RISK - Likely OK
- Components using only unchanged fields (name, price, etc.)
- Read-only displays of basic product info
- Static content not using categories

## Expected Issues Based on Changes

### 1. Category Display Issues
- Components expecting `category.isActive` but getting `category.is_available`
- Category name display logic
- Category selection components

### 2. Product Detail Issues  
- Category information rendering
- Product availability checks
- Related products by category

### 3. Form/Input Issues
- Category selection dropdowns
- Product creation/editing forms
- Validation logic on submissions

### 4. Data Processing Issues
- Filtering algorithms
- Sorting implementations
- Search functionality
- Data transformation utils

## Tools for Audit

### 1. Code Search Patterns
```bash
# Find category property access
grep -r "\.category\." src/ --include="*.ts" --include="*.tsx"

# Find legacy field access  
grep -r "\.isActive\|\.createdAt\|\.updatedAt" src/ --include="*.ts" --include="*.tsx"

# Find comparison operations
grep -r "=== selectedCategory\|== category" src/ --include="*.ts" --include="*.tsx"
```

### 2. TypeScript Diagnostics
- Check for type errors after schema changes
- Look for any type assertions that might be wrong
- Review import statements for changed types

### 3. Runtime Testing
- Test critical user flows
- Check category filtering across all screens
- Validate product detail displays
- Test cart/order flows

## Success Criteria

### ✅ Audit Complete When:
1. All high-risk issues identified and fixed
2. Comprehensive test coverage for fixes
3. No TypeScript errors related to schema changes  
4. All user flows working correctly
5. Performance maintained or improved

### ✅ Quality Gates:
1. Each fix validated with specific test
2. No regressions in existing functionality
3. Consistent data structure usage across codebase
4. Clear documentation of changes made

---

*This audit strategy ensures systematic identification and resolution of all schema-related issues.*