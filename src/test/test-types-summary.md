# Test Types Summary - MyFarmstand Mobile
**Last Updated**: January 23, 2025  
**Generated for**: Test Infrastructure Documentation

---

## 📊 Overview

This document provides a comprehensive summary of all test types available in the MyFarmstand Mobile codebase, their configurations, commands, and current pass rates following the recent test infrastructure refactoring.

---

## 🧪 Test Types Available

### **1. Unit Tests**

#### **Service Tests**
- **Config**: `jest.config.services.js`
- **Location**: `src/services/__tests__/`
- **Setup**: `src/test/test-setup.ts` with `TEST_MODE: 'service'`
- **Pass Rate**: ~60-70%
- **Commands**:
  ```bash
  npm run test:services         # Run all service tests
  npm run test:services:watch   # Watch mode
  ```
- **Purpose**: Test service layer business logic with mocked dependencies

#### **Hook Tests (Regular)**
- **Config**: `jest.config.hooks.regular.js`
- **Location**: `src/hooks/__tests__/`
- **Setup**: `src/test/test-setup.ts` with `TEST_MODE: 'hook'`
- **Pass Rate**: ~10-20%
- **Commands**:
  ```bash
  npm run test:hooks         # Run regular hook tests
  npm run test:hooks:watch   # Watch mode
  ```
- **Purpose**: Test React hooks with mocked React Query

#### **Schema Tests**
- **Config**: Default `jest.config.js`
- **Location**: `src/schemas/__tests__/`
- **Setup**: Standard test setup
- **Pass Rate**: **94.4%** ✅ (Best performing)
- **Commands**:
  ```bash
  npm test src/schemas/      # Run schema tests
  ```
- **Purpose**: Validate Zod schemas for data transformation and validation

---

### **2. Race Condition Tests** 🏁

#### **Hook Race Condition Tests**
- **Config**: `jest.config.hooks.race.js`
- **Location**: `src/hooks/__tests__/*.race.test.tsx`
- **Setup**: `src/test/test-setup.ts` with `TEST_MODE: 'race'`
- **Pass Rate**: 100% for useCart race tests
- **Timeout**: 20000ms (20 seconds)
- **Strategy**: Real timers with short delays (50-100ms)
- **Commands**:
  ```bash
  # All race condition tests
  npm run test:hooks:race        # All race tests
  npm run test:hooks:race:watch  # Watch mode
  
  # Individual race tests
  npm run test:race:cart         # Cart race conditions
  npm run test:race:orders       # Orders race conditions
  npm run test:race:auth         # Auth race conditions
  npm run test:race:products     # Products race conditions
  npm run test:race:realtime     # Realtime race conditions
  npm run test:race:stock        # Stock validation race
  npm run test:race:notifications # Notification race
  npm run test:race:pickup       # Pickup rescheduling race
  npm run test:race:payment      # Payment race conditions
  
  # Combined core tests
  npm run test:race:core         # All core race tests
  ```
- **Purpose**: Test concurrent operations and race conditions with real React Query

---

### **3. Integration Tests** 🔗

#### **Role-Based Integration**
- **Config**: `jest.config.integration.role.js`
- **Location**: Various integration test directories
- **Commands**:
  ```bash
  npm run test:integration:role      # Role-based integration
  npm run test:all:role              # All role tests (nav + screens + integration)
  ```

#### **E2E Tests**
- **Config**: `jest.config.e2e.js`
- **Location**: End-to-end test suites
- **Commands**:
  ```bash
  npm run test:integration:e2e       # End-to-end tests
  ```

#### **Analytics Integration**
- **Config**: `jest.config.integration.js`
- **Commands**:
  ```bash
  npm run test:integration:analytics # Analytics integration
  ```

#### **Payment Integration**
- **Location**: `src/__tests__/payment-integration.test.ts`
- **Commands**:
  ```bash
  npm run test:payment       # Payment integration tests
  npm run test:payment:watch # Watch mode
  ```

---

### **4. Specialized Tests** 🎯

#### **Performance Tests**
- **Config**: `jest.config.performance.js`
- **Location**: `src/__tests__/performance/`
- **Commands**:
  ```bash
  npm run test:performance          # All performance tests
  npm run test:performance:queries  # Query performance
  npm run test:performance:frontend # Frontend performance
  npm run performance:benchmark     # Alias for performance tests
  ```
- **Purpose**: Benchmark query performance and frontend rendering

#### **Security Tests**
- **Config**: `jest.config.security.js`
- **Location**: `src/__tests__/security/`
- **Commands**:
  ```bash
  npm run test:security              # All security tests
  npm run test:security:audit        # Security audit
  npm run test:security:permissions  # Permission boundaries
  npm run security:audit             # Alias for security tests
  ```
- **Purpose**: Validate security boundaries and permission systems

#### **Navigation Tests**
- **Config**: `jest.config.navigation.js`
- **Commands**:
  ```bash
  npm run test:navigation       # Navigation tests
  npm run test:navigation:watch # Watch mode
  ```
- **Purpose**: Test navigation flows and routing

#### **Real Database Tests**
- **Config**: `jest.config.realdb.js`
- **Environment**: `TEST_TYPE=realdb`
- **Commands**:
  ```bash
  npm run test:realdb       # Real database tests
  npm run test:realdb:watch # Watch mode
  ```
- **Purpose**: Test against actual database connections

#### **Component Tests**
- **Config**: `jest.config.components.js`
- **Commands**:
  ```bash
  npm run test:components:role # Role-based component tests
  ```

#### **Screen Tests**
- **Config**: `jest.config.screens.js`
- **Commands**:
  ```bash
  npm run test:screens:role    # Role-based screen tests
  npm run test:checkout         # Checkout screen
  npm run test:confirmation     # Order confirmation screen
  ```

---

### **5. Contract & Validation Tests** 📝

#### **TypeScript Contract Tests**
- **Purpose**: Compile-time type validation
- **Commands**:
  ```bash
  npm run test:contracts        # Single contract test
  npm run test:contracts:watch  # Watch mode
  npm run test:contracts:all    # All contract tests
  ```

#### **Schema Validation**
- **Purpose**: Runtime schema pattern validation
- **Commands**:
  ```bash
  npm run lint:schemas          # Schema pattern validation
  npm run lint:schemas:verbose  # Verbose output
  npm run schema:check          # Alias for validate:all
  ```

#### **Combined Validation**
- **Commands**:
  ```bash
  npm run validate:all          # Contracts + Schema linting
  npm run validate:all:verbose  # Verbose validation
  npm run validate:pre-commit   # Pre-commit validation
  npm run validate:debug        # Debug validation
  npm run validate:admin        # Admin contract validation
  ```

---

### **6. Combined Test Suites** 🚀

```bash
# Core test suites
npm test                    # Run all tests (default jest)
npm run test:all           # Services + Hooks + Payment
npm run test:all:role      # Navigation + Screens + Integration (role-based)

# Production readiness
npm run test:production    # Performance + Security + E2E

# Development
npm run test:watch         # General watch mode
npm run test:coverage      # Coverage report
```

---

### **7. Development & Utility Commands** 🛠

#### **Linting & Type Checking**
```bash
npm run lint              # ESLint
npm run typecheck         # TypeScript checking
```

#### **Database Safety**
```bash
npm run db:safety         # Check database safety
npm run db:archive        # Archive database
npm run db:scan           # Scan database
npm run sync-schema       # Sync Supabase schema
```

#### **Build Validation**
```bash
npm run prebuild:validate    # Pre-build validation
npm run prebuild:production  # Production pre-build
```

#### **Secrets Management**
```bash
npm run secrets:validate     # Validate secrets
npm run secrets:audit        # Audit secrets
npm run secrets:bundle-scan  # Scan bundle for secrets
```

#### **Automation**
```bash
npm run audit-and-fix        # Automated audit and fix
npm run audit-services       # Audit services
npm run validate-schemas     # Validate schemas
npm run generate-fixes       # Generate pattern fixes
npm run apply-fixes          # Apply fixes
npm run generate-tests       # Generate tests
npm run quick-audit          # Quick audit
npm run full-automation      # Full automation workflow
```

---

## 📈 Test Infrastructure Performance Summary

| Test Type | Config File | Pass Rate | Status | Notes |
|-----------|------------|-----------|--------|-------|
| **Schema** | `jest.config.js` | **94.4%** | ✅ Excellent | Best performing, refactored |
| **Services** | `jest.config.services.js` | ~60-70% | ⚠️ Needs Work | Mock-based setup issues |
| **Hooks (Regular)** | `jest.config.hooks.regular.js` | ~10-20% | ❌ Critical | React Query integration issues |
| **Hooks (Race)** | `jest.config.hooks.race.js` | 100% (useCart) | ✅ Excellent | Real React Query working |
| **Performance** | `jest.config.performance.js` | N/A | 📊 Metrics | Benchmark tests |
| **Security** | `jest.config.security.js` | N/A | 🔒 Validation | Security checks |
| **Integration** | `jest.config.integration.js` | N/A | 🔗 E2E | Cross-system tests |
| **Real DB** | `jest.config.realdb.js` | N/A | 🗄️ Database | Actual DB connections |

---

## 🔑 Key Configuration Files

### **Test Setup Files**
- `src/test/test-setup.ts` - Main test setup with TEST_MODE support
- `src/test/base-setup.ts` - Base configuration
- `src/test/serviceSetup.ts` - Service-specific mocks
- `src/test/race-condition-setup.ts` - Real React Query setup

### **Pattern Documentation**
- `src/test/schema-test-pattern.md` - Schema testing patterns
- `src/test/service-test-pattern.md` - Service testing patterns
- `src/test/hook-test-pattern.md` - Hook testing patterns

### **Factory Files**
- `src/test/factories/` - Test data factories
- `src/test/contracts/` - Contract test definitions
- `src/test/mocks/` - Mock implementations

---

## 🎯 Recommendations

1. **Priority Fixes**:
   - Fix hook tests (10-20% pass rate is critical)
   - Improve service tests (60-70% needs improvement)
   - Maintain schema test quality (94.4% is excellent)

2. **Best Practices**:
   - Use race condition tests for concurrency validation
   - Run `validate:pre-commit` before commits
   - Use appropriate TEST_MODE for each test type

3. **Testing Strategy**:
   - Unit tests for isolated logic (services, schemas)
   - Race tests for concurrent operations
   - Integration tests for cross-system flows
   - Performance/Security for production readiness

---

## 📅 Maintenance Notes

- **Last Infrastructure Refactor**: January 2025
- **Schema Test Improvements**: January 23, 2025 (91.6% → 94.4%)
- **Race Condition Tests**: 100% success rate achieved for useCart

This document should be updated when:
- New test types are added
- Test configurations change
- Pass rates significantly improve/degrade
- New test patterns are established

---

*Generated by Claude Code for MyFarmstand Mobile test infrastructure documentation*