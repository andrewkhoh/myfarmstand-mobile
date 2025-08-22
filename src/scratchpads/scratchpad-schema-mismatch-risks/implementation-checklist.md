# Schema Mismatch Implementation Checklist

## CRITICAL - DO FIRST (Production Blockers)

### ✅ Database Tables - URGENT
- [ ] **Create missing error recovery tables**
  - `error_recovery_logs` 
  - `error_recovery_results`
  - `critical_errors`
- [ ] **Create missing logging tables**
  - `stock_restoration_logs`
  - `no_show_processing_logs`
- [ ] **Resolve table naming inconsistencies**
  - Standardize singular vs plural naming
  - Update service references to match actual schema

### ✅ Payment Processing - CRITICAL
- [ ] **Disable simulated payment processing immediately**
  - Add safeguard to prevent "paid" orders without real payment
  - Add prominent warning in order submission
- [ ] **Implement real payment integration**
  - Choose payment processor (Stripe/Square)
  - Add proper payment validation
  - Implement error handling and rollback

### ✅ Type Safety - HIGH PRIORITY
- [ ] **Replace critical `any` types** (20+ instances)
  - `src/services/realtimeService.ts` - 4 instances of `(payload: any)`
  - `src/services/productService.ts` - 4 instances of `.map((prod: any)`
  - `src/services/orderService.ts` - `ordersData.map((orderData: any)`
  - `src/hooks/useCart.ts` - `onError: (error: any, variables: any, context: any)`

## HIGH PRIORITY - Schema Validation

### ✅ Runtime Validation Framework
- [ ] **Install schema validation library**
  ```bash
  npm install zod @types/zod
  ```
- [ ] **Create validation schemas for core entities**
  - Order schema
  - Product schema  
  - User schema
  - Cart schema
- [ ] **Add validation at service boundaries**
  - API request/response validation
  - Database read/write validation

### ✅ Enhanced Testing
- [ ] **Add integration tests**
  - Test against real database schema
  - Validate type safety in tests
  - Test schema constraints
- [ ] **Create schema validation tests**
  - Test data structure compliance
  - Test field naming consistency
  - Test nullable/required field handling

## MEDIUM PRIORITY - Consistency

### ✅ Field Naming Standardization
- [ ] **Audit field naming inconsistencies**
  - Database uses snake_case (`stock_quantity`, `category_id`)
  - Types have camelCase legacy mappings (`stock`, `categoryId`)
- [ ] **Standardize on single naming convention**
  - Prefer snake_case to match database
  - Remove legacy camelCase mappings
  - Update all service calls

### ✅ Type Generation
- [ ] **Generate strict TypeScript types from database schema**
- [ ] **Remove manual type definitions where possible**
- [ ] **Add automated type generation to CI/CD**

## LOW PRIORITY - Monitoring

### ✅ Schema Drift Detection
- [ ] **Add CI/CD schema validation**
- [ ] **Implement automated schema sync checks**
- [ ] **Create schema change alerts**

### ✅ Production Monitoring
- [ ] **Add runtime schema validation monitoring**
- [ ] **Create schema mismatch alerts**
- [ ] **Implement schema health dashboard**

## Quick Commands for Implementation

### Database Setup
```bash
# Create migration for missing tables
npm run db:create-migration missing-tables

# Apply migrations
npm run db:migrate

# Verify tables exist
npm run db:verify-schema
```

### Type Safety
```bash
# Find all any types
grep -r ": any" src/ --include="*.ts" --include="*.tsx"

# Enable strict TypeScript
# Add to tsconfig.json: "strict": true, "noImplicitAny": true

# Run type checking
npm run typecheck
```

### Validation Setup
```bash
# Install validation library
npm install zod

# Generate types from schema
npm run generate-types

# Add validation tests
npm run test:validation
```

## Files to Modify (Priority Order)

### CRITICAL
1. `src/services/orderService.ts` - Fix payment processing simulation
2. Database migration files - Create missing tables
3. `src/services/errorRecoveryService.ts` - Fix table references
4. `src/services/stockRestorationService.ts` - Fix table references
5. `src/services/noShowHandlingService.ts` - Fix table references

### HIGH PRIORITY  
6. `src/services/realtimeService.ts` - Replace `any` types
7. `src/services/productService.ts` - Replace `any` types
8. `src/hooks/useCart.ts` - Fix error handler types
9. `src/types/index.ts` - Add proper interfaces

### MEDIUM PRIORITY
10. Service test files - Add integration tests
11. `src/utils/typeMappers.ts` - Add validation
12. CI/CD configuration - Add schema checks

## Success Criteria

### Week 1 (Critical Issues)
- [ ] All missing database tables created and tested
- [ ] Payment processing secured (disabled or implemented)
- [ ] Critical `any` types replaced with proper interfaces
- [ ] No schema-related crashes in development

### Week 2 (Validation Framework)
- [ ] Runtime validation implemented for core entities
- [ ] Integration tests passing with real database
- [ ] Type safety above 95%
- [ ] Schema drift detection active

### Week 3 (Production Ready)
- [ ] All schema mismatches resolved
- [ ] Comprehensive test coverage
- [ ] CI/CD schema validation enabled
- [ ] Production monitoring in place

## Emergency Contacts & Resources

### Database Schema
- Current schema: `src/types/database.generated.ts`
- Generated: 2025-08-16T00:36:47.233Z
- Project: okqjoyfnfpafjmeszygi

### Critical Service Files
- Order service: `src/services/orderService.ts:161` (payment TODO)
- Error recovery: `src/services/errorRecoveryService.ts` (missing tables)
- Stock restoration: `src/services/stockRestorationService.ts` (missing tables)

### Testing Infrastructure
- Service tests: `src/services/__tests__/`
- Race condition tests: Working well, use as model
- Test configs: `jest.config.hooks.race.js`, `jest.config.services.js`

---
**REMEMBER:** The payment processing simulation is a CRITICAL security vulnerability - do not deploy to production without fixing this issue first.