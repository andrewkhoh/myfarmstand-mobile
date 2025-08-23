# Test Setup Consolidation Plan

## Goal: Reduce from 14 setup files to 2-3 core files

## Proposed Architecture

### 1. `base-setup.ts` - Core Test Setup
**Purpose**: Shared mocks for all test types

**Contents**:
```typescript
// Core React Native mocks
export const reactNativeMocks = {
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 812 })) },
  StyleSheet: { create: (styles: any) => styles },
  // ... other RN components
};

// AsyncStorage mock
export const asyncStorageMock = require('@react-native-async-storage/async-storage/jest/async-storage-mock');

// React Navigation mocks
export const navigationMocks = {
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
};

// DateTimePicker mock
export const dateTimePickerMock = /* implementation */;

// Broadcast factory mocks
export const broadcastMocks = {
  cartBroadcast: { send: jest.fn().mockResolvedValue(undefined) },
  orderBroadcast: { /* ... */ },
  productBroadcast: { /* ... */ },
};

// Apply all base mocks
export function applyBaseMocks() {
  jest.mock('react-native', () => reactNativeMocks);
  jest.mock('@react-native-async-storage/async-storage', () => asyncStorageMock);
  jest.mock('@react-navigation/native', () => navigationMocks);
  jest.mock('@react-native-community/datetimepicker', () => dateTimePickerMock);
  jest.mock('../utils/broadcastFactory', () => broadcastMocks);
}
```

### 2. `test-setup.ts` - Main Test Entry Point
**Purpose**: Configurable setup for different test scenarios

**Contents**:
```typescript
import { applyBaseMocks } from './base-setup';

export enum TestMode {
  DEFAULT = 'default',           // React Query mocked
  RACE_CONDITION = 'race',       // React Query real
  SERVICE = 'service',           // Service layer focus
  REAL_DB = 'realdb',           // Real database
  E2E = 'e2e',                  // End-to-end
  INTEGRATION = 'integration',   // Integration tests
  PERFORMANCE = 'performance',   // Performance tests
  SECURITY = 'security',        // Security tests
}

export function setupTests(mode: TestMode = TestMode.DEFAULT) {
  // Always apply base mocks
  applyBaseMocks();
  
  switch(mode) {
    case TestMode.RACE_CONDITION:
      // Don't mock React Query
      setupRaceConditionEnvironment();
      break;
      
    case TestMode.SERVICE:
      mockSupabase();
      mockTypeMappers();
      break;
      
    case TestMode.REAL_DB:
      // Don't mock Supabase
      loadEnvironmentVariables();
      break;
      
    case TestMode.E2E:
      mockMonitoringServices();
      setupE2EUtilities();
      break;
      
    case TestMode.INTEGRATION:
      mockMonitoringServices();
      setupIntegrationUtilities();
      break;
      
    case TestMode.PERFORMANCE:
      mockPerformanceMonitoring();
      setupPerformanceUtilities();
      break;
      
    case TestMode.SECURITY:
      mockSecurityAuditing();
      setupSecurityUtilities();
      break;
      
    default:
      // Standard mocks including React Query
      mockReactQuery();
      mockSupabase();
      break;
  }
  
  // Common cleanup
  setupGlobalCleanup();
}
```

### 3. `test-utilities.ts` - Shared Test Utilities
**Purpose**: Reusable test utilities and helpers

**Contents**:
```typescript
// E2E utilities
export const e2eTestUtils = {
  createMockUserSession: (role: string) => { /* ... */ },
  simulateUserJourney: (journey: string) => { /* ... */ },
  validateSystemState: () => { /* ... */ },
};

// Integration utilities
export const integrationTestUtils = {
  setupService: (serviceName: string) => { /* ... */ },
  mockServiceResponse: (service: string, method: string, response: any) => { /* ... */ },
  validateServiceIntegration: (services: string[]) => { /* ... */ },
};

// Performance utilities
export const performanceTestUtils = {
  measureExecutionTime: async (fn: () => any) => { /* ... */ },
  measureMemoryUsage: () => { /* ... */ },
  createLargeDataset: (size: number) => { /* ... */ },
};

// Security utilities
export const securityTestUtils = {
  createMockUser: (role: string) => { /* ... */ },
  simulateAttack: (type: string) => { /* ... */ },
  validateSecurityResponse: (response: any) => { /* ... */ },
};

// Navigation utilities
export const navigationTestUtils = {
  createMockNavigation: () => { /* ... */ },
  createMockRoute: (name: string, params: any) => { /* ... */ },
};
```

## Migration Strategy

### Phase 1: Create New Core Files (Week 1)
1. Create `base-setup.ts` with all shared mocks
2. Create `test-setup.ts` with configurable modes
3. Create `test-utilities.ts` with shared utilities

### Phase 2: Update Jest Configs (Week 1)
Update each jest.config.*.js to use new setup:
```javascript
module.exports = {
  // ...
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  globals: {
    TEST_MODE: 'service' // or 'race', 'e2e', etc.
  }
};
```

### Phase 3: Gradual Migration (Week 2)
1. Start with least-used setup files
2. Update test imports one at a time
3. Verify tests still pass after each change

### Phase 4: Remove Old Files (Week 2)
1. Delete deprecated setup files
2. Update documentation
3. Final verification of all tests

## Benefits

### Immediate Benefits
- **80% reduction in duplication** (from 14 files to 2-3)
- **Single source of truth** for each mock
- **Easier maintenance** - update mocks in one place

### Long-term Benefits
- **Faster test execution** - less duplicate code to parse
- **Easier onboarding** - clearer test structure
- **Better consistency** - same mocks used everywhere
- **Simpler debugging** - centralized mock configuration

## Risk Mitigation

### Risks
1. **Breaking existing tests** during migration
2. **Merge conflicts** with other agents' work
3. **Different test requirements** not being met

### Mitigation Strategies
1. **Incremental migration** - one test suite at a time
2. **Parallel old/new support** - keep old files during transition
3. **Comprehensive testing** - verify each migrated suite
4. **Communication** - coordinate with other agents

## Success Metrics
- ✅ Reduce setup files from 14 to 2-3
- ✅ All tests still passing
- ✅ No performance regression
- ✅ Cleaner codebase structure
- ✅ Easier to add new test types

## Timeline
- **Day 1-2**: Create new core files
- **Day 3-4**: Update Jest configurations
- **Day 5-7**: Migrate existing tests
- **Day 8**: Cleanup and verification

---
*Plan created by Cleanup Agent*