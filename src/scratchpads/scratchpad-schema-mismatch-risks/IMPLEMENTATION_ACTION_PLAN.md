# Schema Mismatch Implementation Action Plan

**Date:** 2025-08-17  
**Status:** READY TO EXECUTE  
**Sprint Duration:** 14 days

## Quick Reference Commands

### Emergency Mode (Execute Immediately)
```bash
# 1. Disable payments - Deploy this first
git checkout -b hotfix/disable-payments
# Edit orderService.ts line 161
git commit -m "HOTFIX: Disable online payments for security"
git push origin hotfix/disable-payments

# 2. Database migrations
npm run db:create-migration missing-tables
# Apply generated scripts
npm run db:migrate

# 3. Validation tests
npm run test:services
npm run test:hooks:race
npm run typecheck
```

## Daily Action Items

### DAY 1 - EMERGENCY FIXES
**Priority:** CRITICAL PRODUCTION BLOCKERS

#### Morning (0-4 hours)
- [ ] **IMMEDIATE:** Disable online payment processing
  - Edit `src/services/orderService.ts:161`
  - Replace simulation with error throw
  - Add safety validation
  - Deploy hotfix to production

#### Afternoon (4-8 hours)  
- [ ] **HIGH:** Create missing database tables
  - Write migration for `error_recovery_results`
  - Write migration for `critical_errors`
  - Write migration for `stock_restoration_logs`
  - Write migration for `no_show_processing_logs`
  - Test migrations on development database

### DAY 2 - SCHEMA STANDARDIZATION
**Priority:** FIX NAMING MISMATCHES

#### Morning (0-4 hours)
- [ ] **HIGH:** Fix table naming references
  - Update `errorRecoveryService.ts` to use `error_recovery_log` (singular)
  - Update `stockRestorationService.ts` table references
  - Update `noShowHandlingService.ts` table references
  - Test all service functions

#### Afternoon (4-8 hours)
- [ ] **MEDIUM:** TypeScript compilation fixes
  - Fix syntax errors in `useAuth.race.test.ts:68`
  - Fix syntax errors in `useRealtime.race.test.ts:65`
  - Run full TypeScript compilation
  - Verify all tests pass

### DAY 3 - VALIDATION SETUP
**Priority:** INSTALL VALIDATION FRAMEWORK

#### Morning (0-4 hours)
- [ ] **HIGH:** Install and configure Zod
  ```bash
  npm install zod @types/zod
  ```
  - Create `src/schemas/` directory
  - Set up base validation utilities
  - Create initial schema files

#### Afternoon (4-8 hours)
- [ ] **HIGH:** Create core validation schemas
  - Product schema with all fields
  - Order schema with status enums
  - Cart schema validation
  - User schema validation

### DAY 4-5 - REPLACE ANY TYPES
**Priority:** TYPE SAFETY CRITICAL PATHS

#### productService.ts Fixes
- [ ] Replace `(cat: any)` with `CategoryRow` type
- [ ] Replace `(prod: any)` with `ProductRow` type  
- [ ] Add proper database row typing
- [ ] Test product service functions

#### realtimeService.ts Fixes
- [ ] Replace `(payload: any)` with proper WebSocket types
- [ ] Add subscription payload validation
- [ ] Define broadcast message schemas
- [ ] Test real-time functionality

#### orderService.ts Fixes
- [ ] Replace `(orderData: any)` with `OrderRow` type
- [ ] Add order validation at boundaries
- [ ] Test order processing flows
- [ ] Verify payment integration points

### DAY 6-7 - INTEGRATION TESTING
**Priority:** VALIDATE SCHEMA COMPLIANCE

#### Integration Test Suite
- [ ] Create schema validation test suite
- [ ] Test service layer against real database
- [ ] Validate type safety in production scenarios
- [ ] Add test for missing table scenarios

#### End-to-End Validation
- [ ] Test complete order flow with validation
- [ ] Test error recovery scenarios
- [ ] Test real-time updates with validation
- [ ] Verify cart operations with schemas

### DAY 8-10 - MONITORING SETUP
**Priority:** PREVENT FUTURE DRIFT

#### CI/CD Integration
- [ ] Add schema validation to GitHub Actions
- [ ] Set up pre-commit hooks for type checking
- [ ] Configure automated schema sync checks
- [ ] Add build failure on validation errors

#### Monitoring Infrastructure  
- [ ] Add runtime validation error logging
- [ ] Set up schema mismatch alerts
- [ ] Create schema health dashboard
- [ ] Configure error recovery monitoring

### DAY 11-14 - PRODUCTION READINESS
**Priority:** COMPLETE ROLLOUT

#### Production Deployment
- [ ] Enable payment processing with real integration
- [ ] Deploy all schema fixes to production
- [ ] Monitor error rates and performance
- [ ] Validate production schema compliance

#### Documentation & Handoff
- [ ] Document schema standards
- [ ] Create troubleshooting guide
- [ ] Train team on validation patterns
- [ ] Set up regular schema audits

## Files to Modify (By Priority)

### CRITICAL (Days 1-2)
1. `src/services/orderService.ts:161` - Payment processing
2. Database migration files - Missing tables
3. `src/services/errorRecoveryService.ts:494,530,564` - Table references
4. `src/services/stockRestorationService.ts:192,251` - Table references
5. `src/services/noShowHandlingService.ts:340,380` - Table references

### HIGH PRIORITY (Days 3-5)
6. `src/services/productService.ts:39,141,210,317,366` - Any types
7. `src/services/realtimeService.ts:254,266,277,288` - Any types
8. `src/hooks/useCart.ts` - Error handler types
9. `src/types/index.ts` - Add proper interfaces
10. `src/schemas/` - New validation schemas

### MEDIUM PRIORITY (Days 6-8)
11. `src/hooks/__tests__/useAuth.race.test.ts:68` - Syntax error
12. `src/hooks/__tests__/useRealtime.race.test.ts:65` - Syntax error
13. Test files - Add integration tests
14. `tsconfig.json` - Enable strict mode

### LOW PRIORITY (Days 9-14)
15. CI/CD configuration files
16. Monitoring setup
17. Documentation files
18. Training materials

## Risk Mitigation During Implementation

### Rollback Triggers
- Any test failure rate > 5%
- Production error rate increase > 10%
- Payment processing failures
- Database migration failures

### Safety Measures
- Deploy changes to staging first
- Run comprehensive test suites
- Monitor error logs continuously
- Keep feature flags for quick rollback

### Communication Plan
- Daily standup updates on progress
- Immediate escalation for blockers
- Team notification before each deployment
- Post-implementation review meeting

## Success Validation

### Week 1 Checklist
- [ ] No simulated payment processing
- [ ] All database tables exist and accessible
- [ ] Zero TypeScript compilation errors
- [ ] All services use correct table names
- [ ] Test suites passing at 100%

### Week 2 Checklist  
- [ ] Zod validation active on all core entities
- [ ] Zero `any` types in service layer
- [ ] Integration tests covering schema compliance
- [ ] CI/CD pipeline enforcing schema validation
- [ ] Production monitoring active

## Emergency Contacts

### Database Issues
- **Migration Rollback:** Keep all DOWN migration scripts ready
- **Table Access Issues:** Verify connection strings and permissions
- **Performance Issues:** Monitor query execution times

### Code Issues
- **Type Errors:** Gradual rollout with feature flags
- **Test Failures:** Isolate and fix service by service
- **Build Issues:** Maintain known-good commit checkpoints

### Production Issues
- **Payment Failures:** Immediate fallback to cash-only mode
- **Service Crashes:** Enable debug logging and error reporting
- **Performance Degradation:** Monitor database connection pools

## Quick Start Commands

### Setup Development Environment
```bash
# Clone and setup
git clone <repo>
cd myfarmstand-mobile
npm install

# Verify current state
npm run test:services
npm run test:hooks:race
npm run typecheck

# Check schema status
npm run sync-schema
```

### Daily Development Workflow
```bash
# Start day
git pull origin main
npm run typecheck
npm run test:services

# After changes
npm run typecheck
npm run test:services
npm run test:hooks:race

# Before commit
npm run schema:validate
git add . && git commit -m "Fix: schema mismatch issue"
```

### Production Deployment Checklist
- [ ] All tests passing
- [ ] Schema validation passing
- [ ] Type checking passing
- [ ] Migration scripts tested
- [ ] Rollback plan prepared
- [ ] Team notified
- [ ] Monitoring active

---

**Remember:** Start with payment processing security, then database tables, then type safety. Follow the phases sequentially for minimal risk.