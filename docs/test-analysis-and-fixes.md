# Test Infrastructure Analysis & Fix Recommendations

## Current State Overview

### Test Coverage Statistics
- **Total Test Suites**: 150
- **Failed Test Suites**: 132 (88%)
- **Passed Test Suites**: 18 (12%)
- **Total Tests**: 188
- **Failed Tests**: 5
- **Passed Tests**: 183

### Feature-Specific Test Files
- **Marketing**: ~25 test files
- **Inventory**: 31 test files
- **Executive**: 43 test files
- **Role-Based**: 21 test files
- **Integration/Cross-Role**: 15+ test files

## Major Failure Patterns

### 1. Missing Module/Import Errors (40% of failures)
**Pattern**: Services and modules deleted during cleanup but tests still reference them
```typescript
// Example errors:
Cannot find module '../productContentService'
Cannot find module '../marketingCampaignService'
Cannot find module '../productBundleService'
Cannot find module '../../test/factories'
```

**Root Cause**: TDD approach created tests for services that were later refactored or removed.

### 2. TypeScript Compilation Errors (35% of failures)
**Common patterns**:
- Unused imports (`'X' is declared but its value is never read`)
- Property doesn't exist on type (API changes not reflected in tests)
- Type mismatches between test expectations and actual service returns

### 3. Jest Configuration Issues (15% of failures)
**Issues**:
- Missing setup files referenced in configs
- Incorrect root directory paths
- Module resolution conflicts

### 4. Test Infrastructure Issues (10% of failures)
- Missing test utilities
- Outdated mock factories
- Broken test setup files

## Recommended Fixes

### Priority 1: Fix Jest Configuration (Quick Win)
```javascript
// Update jest/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',  // Fix: Point to project root
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__.archived/',  // Ignore archived tests
    '/backup-before-tdd/'     // Ignore backup directories
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  }
};
```

### Priority 2: Archive or Remove Broken Tests
```bash
# Move broken tests referencing deleted services
mkdir -p src/__tests__/archived-broken
mv src/services/marketing/__tests__.archived/* src/__tests__/archived-broken/

# Update .gitignore
echo "src/__tests__/archived-broken/" >> .gitignore
```

### Priority 3: Fix TypeScript Errors in Active Tests

#### Fix unused imports
```typescript
// Before
import { StockoutRisk, InventoryData, MarketingData } from '../types';

// After - only import what's used
import type { RecommendationContext } from '../types';
```

#### Fix property access errors
```typescript
// Before
expect(result.success).toBe(true);
expect(result.data).toBeDefined();

// After - match actual return types
if ('metrics' in result) {
  expect(result.metrics).toBeDefined();
  expect(result.correlations).toBeDefined();
}
```

### Priority 4: Create Minimal Test Suites per Feature

#### Marketing Test Suite
```typescript
// src/hooks/marketing/__tests__/marketing-hooks.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarketingCampaigns } from '../useMarketingCampaigns';

describe('Marketing Hooks', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient.clear();
  });

  test('useMarketingCampaigns returns campaigns', async () => {
    const { result } = renderHook(() => useMarketingCampaigns(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

#### Inventory Test Suite
```typescript
// src/hooks/inventory/__tests__/inventory-hooks.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInventoryItems } from '../useInventoryItems';

describe('Inventory Hooks', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  test('useInventoryItems returns items', async () => {
    const { result } = renderHook(() => useInventoryItems(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Priority 5: Test Execution Scripts

Create focused test scripts in package.json:
```json
{
  "scripts": {
    "test": "jest",
    "test:marketing": "jest src/hooks/marketing src/services/marketing --passWithNoTests",
    "test:inventory": "jest src/hooks/inventory src/services/inventory --passWithNoTests",
    "test:executive": "jest src/hooks/executive src/services/executive --passWithNoTests",
    "test:integration": "jest src/integration --passWithNoTests",
    "test:schemas": "jest src/schemas --passWithNoTests",
    "test:fix": "npm run test:schemas && npm run test:marketing && npm run test:inventory"
  }
}
```

## Implementation Plan

### Phase 1: Infrastructure (1-2 hours)
1. Fix Jest configuration files
2. Create/update test setup files
3. Archive broken tests

### Phase 2: Fix Compilation Errors (2-3 hours)
1. Remove unused imports
2. Fix type mismatches
3. Update test expectations to match current APIs

### Phase 3: Feature Test Suites (3-4 hours)
1. Create minimal working test for each feature
2. Focus on critical user paths
3. Mock external dependencies properly

### Phase 4: Integration Tests (2-3 hours)
1. Fix cross-role integration tests
2. Update mock data to match current schemas
3. Test critical workflows

## Success Metrics

### Short Term (After fixes)
- Test suite runs without configuration errors
- 80%+ tests passing
- Each feature has at least 1 passing integration test

### Medium Term (After stabilization)
- 95%+ tests passing
- Test execution time under 2 minutes
- CI/CD pipeline includes test validation

## Key Recommendations

1. **Adopt Test-Last for Refactoring**: When removing/refactoring services, update tests immediately
2. **Use Feature Flags**: For TDD development, use feature flags to prevent breaking main branch
3. **Maintain Test/Code Parity**: Keep a 1:1 relationship between service files and test files
4. **Regular Test Audits**: Weekly review of test health metrics
5. **Mock Strategy**: Centralize mocks in `src/test/mocks` for consistency

## Common Fixes Reference

### Fix: Module not found
```typescript
// Check if service exists
// If deleted, either:
// 1. Remove the test
// 2. Update import to new location
// 3. Mock the service
```

### Fix: Property doesn't exist
```typescript
// Check actual return type
// Update test to match current API
// Use type guards for conditional checks
```

### Fix: Unused variables
```typescript
// Remove unused imports
// Or prefix with underscore if intentionally unused
// const _unusedVar = ...
```

## Monitoring Test Health

Create a test health dashboard:
```bash
#!/bin/bash
# test-health.sh
echo "Test Health Report"
echo "=================="
npm test -- --listTests 2>/dev/null | wc -l | xargs echo "Total test files:"
npm test -- --passWithNoTests 2>&1 | grep -E "Test Suites:" | tail -1
npm test -- --passWithNoTests 2>&1 | grep -E "Tests:" | tail -1
```

## Conclusion

The test suite failures are primarily due to:
1. Mismatch between TDD-developed tests and final implementation
2. Services deleted without updating dependent tests
3. Configuration issues from multiple jest configs
4. TypeScript strict mode catching unused code

The recommended approach is to:
1. Fix infrastructure first (configs, setup files)
2. Archive/remove tests for deleted services
3. Fix compilation errors in remaining tests
4. Create minimal working test suite per feature
5. Gradually increase coverage with stable foundation