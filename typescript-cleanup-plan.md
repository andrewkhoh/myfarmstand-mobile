# TypeScript Cleanup Plan - MyFarmstand Mobile
## 555 Errors → Zero Errors (Safe, Systematic Approach)

### **Overview**
- **Total Errors**: 555
- **Strategy**: Fix from lowest-risk to highest-risk
- **Testing**: Test after each group completion
- **Safety**: No functional changes, only type fixes

## **Phase 1: ZERO RISK - File Exclusions (Est. -50 errors)**
### **Task 1.1: ARCHIVE Directory Cleanup**
- **Risk**: 💚 ZERO - Old/unused files
- **Files**: `src/ARCHIVE/*.ts`
- **Action**: Exclude from tsconfig or delete
- **Test**: `npm run typecheck` should show ~50 fewer errors

### **Task 1.2: Broken Test Files**
- **Risk**: 💚 ZERO - Test-only files
- **Files**: Syntax-broken test files
- **Action**: Exclude from tsconfig or fix syntax
- **Test**: Typecheck reduction

## **Phase 2: LOW RISK - Pattern Fixes (Est. -100 errors)**
### **Task 2.1: Validation Pattern Types**
- **Risk**: 💚 LOW - Similar to services we already fixed
- **Files**: Components/utils with validation patterns
- **Errors**: `"session_persistence"` → correct enum values
- **Test**: Services still work, no functionality change

### **Task 2.2: Theme/Color Properties**
- **Risk**: 💚 LOW - Just missing color definitions  
- **Files**: `src/components/PaymentMethodCard.tsx`
- **Errors**: `Property 'blue' does not exist on type`
- **Test**: Visual components still render

### **Task 2.3: Style Array Type Fixes**
- **Risk**: 💚 LOW - Style type casting
- **Files**: Components with style arrays
- **Errors**: `Type 'X[]' is not assignable to type 'ViewStyle'`
- **Test**: Components still render correctly

## **Phase 3: MEDIUM RISK - Infrastructure Fixes (Est. -150 errors)**
### **Task 3.1: Query Key Factory Properties**
- **Risk**: 🟡 MEDIUM - Query invalidation could be affected
- **Files**: `src/hooks/__tests__/useKiosk.test.tsx`
- **Errors**: `Property 'sessions' does not exist on type`
- **Test**: Run hook tests, ensure caching works

### **Task 3.2: Context Export Fixes**
- **Risk**: 🟡 MEDIUM - Missing exports
- **Files**: `src/contexts/KioskContext.tsx`, `src/contexts/index.ts`
- **Errors**: `has no exported member 'withKioskContext'`
- **Test**: Context providers still work

### **Task 3.3: Test Mock Type Alignment**
- **Risk**: 🟡 MEDIUM - Test coverage could be affected
- **Files**: Hook test files with type mismatches
- **Errors**: Mock responses don't match expected types
- **Test**: `npm run test:hooks` should pass

## **Phase 4: HIGHER RISK - Component Functionality (Est. -200 errors)**
### **Task 4.1: Payment Component Type Fixes**
- **Risk**: 🟠 HIGHER - Payment flow critical
- **Files**: `src/components/PaymentForm.tsx`, `PaymentSummary.tsx`
- **Errors**: Mutation result types, autoComplete values
- **Test**: Manual payment flow testing required

### **Task 4.2: Kiosk Component Fixes**
- **Risk**: 🟠 HIGHER - Kiosk functionality critical
- **Files**: `src/components/KioskStaffAuth.tsx`
- **Errors**: TextInput ref types, context passing
- **Test**: Manual kiosk flow testing required

## **Phase 5: HIGHEST RISK - Core Hook Logic (Est. -55 errors)**
### **Task 5.1: Auth Hook Type Fixes**
- **Risk**: 🔴 HIGHEST - Authentication critical
- **Files**: `src/hooks/__tests__/useAuth.race.test.tsx`
- **Errors**: LoginResponse, RegisterResponse type mismatches
- **Test**: Full auth flow testing required

### **Task 5.2: Cart/Realtime Hook Fixes**  
- **Risk**: 🔴 HIGHEST - Core shopping functionality
- **Files**: Hook files with functional type errors
- **Errors**: Core functionality type mismatches
- **Test**: Full shopping flow testing required

## **Execution Plan**

### **Phase 1 Execution:**
1. Run `npm run typecheck 2>&1 | wc -l` (baseline: 555)
2. Fix ARCHIVE exclusions
3. Fix broken test file exclusions  
4. Run `npm run typecheck 2>&1 | wc -l` (target: ~450)
5. **STOP & VALIDATE**: Services still work

### **Phase 2 Execution:**
1. Fix validation patterns (similar to services)
2. Fix theme properties (add missing colors)
3. Fix style array types (cast properly)
4. Run `npm run typecheck 2>&1 | wc -l` (target: ~300)
5. **STOP & VALIDATE**: App still renders

### **Phase 3 Execution:**
1. Fix query key factory properties
2. Fix context exports
3. Fix test mock types
4. Run `npm run typecheck 2>&1 | wc -l` (target: ~150)
5. **STOP & VALIDATE**: Run `npm run test:hooks`

### **Phase 4 Execution:**
1. Fix payment component types
2. Fix kiosk component types
3. Run `npm run typecheck 2>&1 | wc -l` (target: ~50)
4. **STOP & VALIDATE**: Manual testing of payment/kiosk flows

### **Phase 5 Execution:**
1. Fix auth hook types
2. Fix core hook types  
3. Run `npm run typecheck 2>&1 | wc -l` (target: 0)
4. **STOP & VALIDATE**: Full integration testing

## **Safety Protocols**

### **Before Each Phase:**
- Commit current state: `git add . && git commit -m "Phase X start"`
- Run baseline tests: `npm run test:services`
- Note current error count

### **After Each Task:**
- Run typecheck: `npm run typecheck 2>&1 | wc -l`
- Verify error reduction
- Test affected functionality
- If errors increase, revert and reassess

### **After Each Phase:**
- Run comprehensive tests
- Manual testing of affected features
- Git tag: `git tag phase-X-complete`
- Document any issues found

## **Rollback Plan**
If any phase breaks functionality:
1. `git reset --hard phase-X-start` (revert to start of phase)
2. Reassess problematic changes
3. Create smaller, more targeted fixes
4. Re-test before proceeding

## **Success Criteria**
- ✅ `npm run typecheck` returns 0 errors
- ✅ All services continue working (no regressions)
- ✅ All critical user flows work (auth, cart, payment, kiosk)
- ✅ Test suites continue passing
- ✅ No functional changes to app behavior

## **Estimated Timeline**
- **Phase 1**: 30 minutes
- **Phase 2**: 1-2 hours  
- **Phase 3**: 2-3 hours
- **Phase 4**: 3-4 hours (includes testing)
- **Phase 5**: 2-3 hours (includes extensive testing)
- **Total**: 8-12 hours over multiple sessions

This plan ensures we maintain stability while systematically eliminating all TypeScript errors.