# Inventory Test Fix Analysis

## Current State Comparison

### Docker Volume Tests (Working)
- **Pass Rate**: 91.8% (112/122 tests)
- **Services**: 32/32 tests passing (100%)
- **Configuration**: Uses `ts-jest` preset
- **Test Pattern**: Direct import of `SimplifiedSupabaseMock`

### Main Branch Tests (Failing)
- **Pass Rate**: 26.7% (87/326 tests)
- **Services**: 22/35 tests passing (62.9%)
- **Configuration**: Uses `babel-jest`
- **Test Pattern**: Mocking entire supabase module

## Root Cause Analysis

### 1. **Critical Configuration Differences**

#### Docker Volume (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',              // ✅ Uses ts-jest
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',       // ✅ TypeScript transformation
  },
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  clearMocks: true,
}
```

#### Main Branch (`jest.config.inventory.services.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'  // ❌ Uses babel-jest
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/serviceSetup.ts'],
  // Complex module mappings for React Native
}
```

### 2. **Test Implementation Differences**

#### Docker Volume Pattern (Working)
```typescript
// Direct import of mock
import { SimplifiedSupabaseMock } from '../../../test/serviceSetup';
import { InventoryService } from '../inventoryService';

describe('InventoryService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: InventoryService;
  
  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
    service = new InventoryService(mockSupabase.client);
  });
```

#### Main Branch Pattern (Failing)
```typescript
// Complex module mocking
jest.mock("../../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: { ... }
  };
});

import { InventoryService } from '../inventoryService';
// Service uses global singleton, not injected dependency
```

### 3. **Key Issues Identified**

1. **TypeScript Compilation**: 
   - Docker volume uses `ts-jest` for proper TypeScript handling
   - Main branch uses `babel-jest` which doesn't handle TS types properly

2. **Mock Strategy**:
   - Docker volume: Clean dependency injection pattern
   - Main branch: Complex module mocking with require statements

3. **Service Instantiation**:
   - Docker volume: Creates service instance with mock client
   - Main branch: Uses static service methods or singleton pattern

4. **Test File Differences**:
   - Docker volume: 821 lines, comprehensive tests
   - Main branch: 337 lines, simplified/incomplete tests

5. **ValidationMonitor Expectations**:
   - Docker volume: Expects `service` property
   - Main branch: Expects `context` property

## Fix Strategy

### Phase 1: Configuration Fixes (Immediate)

1. **Install ts-jest**
   ```bash
   npm install --save-dev ts-jest @types/jest
   ```

2. **Create TypeScript-specific Jest config**
   ```javascript
   // jest.config.inventory.ts.js
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     roots: ['<rootDir>/src'],
     testMatch: [
       '<rootDir>/src/services/inventory/__tests__/**/*.test.ts'
     ],
     transform: {
       '^.+\\.ts$': 'ts-jest',
     },
     clearMocks: true,
   };
   ```

### Phase 2: Test File Updates (Critical)

1. **Copy test files from docker volume**
   - Replace simplified test files with complete versions
   - Maintains exact test expectations

2. **Update mock patterns**
   - Use direct import instead of jest.mock()
   - Implement dependency injection pattern

### Phase 3: Service Pattern Alignment

1. **Update service to accept injected client**
   ```typescript
   export class InventoryService {
     constructor(private supabaseClient: SupabaseClient) {}
     // ... methods use this.supabaseClient
   }
   ```

2. **Or keep singleton but fix mock setup**
   - Ensure mock is properly initialized before service uses it

## Recommended Task List (Priority Order)

### 🔴 Critical (Day 1 - Morning)
1. [ ] Install `ts-jest` package
2. [ ] Create new `jest.config.inventory.ts.js` with ts-jest preset
3. [ ] Copy `SimplifiedSupabaseMock` from docker volume to `src/test/serviceSetup.ts`
4. [ ] Update npm script to use new config: `"test:inventory:ts": "jest --config=jest.config.inventory.ts.js"`

### 🟡 Important (Day 1 - Afternoon)
5. [ ] Copy test files from docker volumes (maintain exact test cases)
   - `docker/volumes/tdd_phase_2-inventory-services/src/services/inventory/__tests__/*.ts`
6. [ ] Update ValidationMonitor mock expectations (`service` vs `context`)
7. [ ] Ensure all test data matches expected formats

### 🟢 Enhancements (Day 2)
8. [ ] Add coverage reporting
9. [ ] Set up watch mode for development
10. [ ] Document the testing pattern for other services

## Validation Steps

After each phase:
1. Run `npm run test:inventory:ts`
2. Compare pass rates with docker volume baseline (91.8%)
3. Fix any remaining failures individually

## Expected Outcome

- **Target**: Match docker volume pass rate of 91.8%
- **Services**: 32/32 tests passing
- **Configuration**: Proper TypeScript support with ts-jest
- **Pattern**: Clean dependency injection and mocking

## Quick Commands

```bash
# Install dependencies
npm install --save-dev ts-jest @types/jest

# Run with new config
npm run test:inventory:ts

# Watch mode
npm run test:inventory:ts -- --watch

# Coverage
npm run test:inventory:ts -- --coverage
```

## Risk Mitigation

1. **Backup current tests** before replacing
2. **Test incrementally** - one file at a time
3. **Maintain both configs** during transition
4. **Document changes** for team awareness

---

*Analysis Date: 2025-09-12*
*Docker Volume Baseline: 91.8% pass rate*
*Current Main Branch: 26.7% pass rate*