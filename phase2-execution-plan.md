# Phase 2 Execution Plan: Infrastructure Adoption
## Audit-Fix-Audit-Fix Cycles

## 📊 Current Infrastructure Gaps (Audit #1 Results)

### Critical Findings
- **Overall Adoption**: Only 38% (17/44 files)
- **Service Tests**: 80% adoption (4 files need fixes)
- **Hook Tests**: 0% defensive imports, 0% React Query mocks (23 files need fixes) 🚨
- **Schema Tests**: Audit shows 0 files (need to check why)

### Priority Matrix
| Priority | Category | Gap | Files to Fix |
|----------|----------|-----|--------------|
| **P0 CRITICAL** | Hooks | No defensive imports | 23 files |
| **P0 CRITICAL** | Hooks | No React Query mocks | 23 files |
| **P1 HIGH** | Services | No SimplifiedSupabaseMock | 4 files |
| **P2 MEDIUM** | Services | Missing factories/reset | 3-4 files |
| **P3 LOW** | Hooks | Missing wrapper | 3 files |

## 🔄 Cycle 1: Critical Hook Infrastructure (1 hour)

### Agent 1: Hook Infrastructure Emergency
**Files to Fix**: All 23 hook test files
**Pattern to Apply**:
```typescript
// Add to EVERY hook test file:

// 1. Defensive imports (TOP OF FILE)
let useHookName: any;
try {
  const module = require('../hookFile');
  useHookName = module.useHookName;
} catch (error) {
  console.log('Hook not available:', error);
}

// 2. React Query mock (BEFORE other imports)
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
  })),
}));
```

**Specific Files**:
- Executive hooks (8 files): All need defensive + RQ mocks
- Inventory hooks (5 files): All need defensive + RQ mocks  
- Marketing hooks (5 files): All need defensive + RQ mocks
- Role-based hooks (5 files): All need defensive + RQ mocks

### Agent 2: Service Infrastructure Completion
**Files to Fix**: 4 service test files
```
- phase4ComplianceAudit.test.ts
- predictiveAnalyticsService.test.ts
- strategicReportingService.golden.test.ts
- rolePermissionService.test.ts
```

**Pattern to Apply**:
```typescript
// Replace manual mocks with:
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  return {
    supabase: new SimplifiedSupabaseMock().createClient(),
    TABLES: require('../../config/supabase').TABLES
  };
});

// Add factories and reset
import { createUser, createOrder, resetAllFactories } from '../../test/factories';

beforeEach(() => {
  resetAllFactories();
  jest.clearAllMocks();
});
```

## 🔄 Cycle 2: Validation Audit (30 minutes)

### Re-run Infrastructure Audit
```bash
./phase2-infrastructure-audit.sh > audit-cycle2.txt
```

### Expected Results After Cycle 1
- **Service Tests**: 100% adoption (21/21 files)
- **Hook Tests**: 100% defensive imports, 100% RQ mocks
- **Overall**: Should jump from 38% to 95%+

## 🔄 Cycle 3: Schema & Remaining Fixes (30 minutes)

### Check Schema Tests
Need to investigate why audit shows 0 schema files. Run:
```bash
find src/schemas -name "*.test.ts" -o -name "*.test.tsx" | wc -l
```

### Fix Any Remaining Gaps
Based on Cycle 2 audit results

## 🔄 Cycle 4: Final Validation (30 minutes)

### Comprehensive Validation
1. Run final infrastructure audit
2. Verify 100% adoption
3. Document any legitimate exceptions
4. Create infrastructure compliance report

## 🤖 Multi-Agent Task Division

### Agent A: "Hook Infrastructure Specialist"
**Scope**: 23 hook test files
**Focus**: Defensive imports + React Query mocks
**Time**: 45 minutes
**Success**: All hooks use infrastructure patterns

### Agent B: "Service Infrastructure Specialist"  
**Scope**: 4 service test files
**Focus**: SimplifiedSupabaseMock adoption
**Time**: 15 minutes
**Success**: All services use infrastructure

### Agent C: "Validation Specialist"
**Scope**: Run audits and verify fixes
**Focus**: Ensure patterns correctly applied
**Time**: Continuous monitoring
**Success**: 100% infrastructure adoption

## 📋 Quick Reference Fixes

### For Executive/Inventory/Marketing Hooks
```typescript
// File: useBusinessMetrics.test.tsx (EXAMPLE)
// ADD at top:
let useBusinessMetrics: any;
let useSimpleBusinessMetrics: any;

try {
  const module = require('../useBusinessMetrics');
  useBusinessMetrics = module.useBusinessMetrics;
  useSimpleBusinessMetrics = module.useSimpleBusinessMetrics;
} catch (error) {
  console.log('Hook not available:', error);
}

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));
```

### For Service Tests Missing Infrastructure
```typescript
// File: predictiveAnalyticsService.test.ts (EXAMPLE)
// REPLACE manual mock with:
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  
  // Configure for this service's needs
  mockInstance.setMockData('predictive_forecasts', [
    { id: 'forecast-1', model_accuracy: 0.87 }
  ]);
  
  return {
    supabase: mockInstance.createClient(),
    TABLES: { PREDICTIVE_FORECASTS: 'predictive_forecasts' }
  };
});
```

## 📊 Success Metrics

### Infrastructure Adoption (Primary)
- **Target**: 100% of test files using golden patterns
- **Current**: 38% (17/44 files)
- **Gap**: 62% (27 files need fixes)

### Pattern Compliance (Secondary)
- All hooks have defensive imports
- All hooks have React Query mocks
- All services use SimplifiedSupabaseMock
- All tests use factories where applicable

### Documentation (Tertiary)
- Tests marked `.skip` for incomplete features
- Clear comments on why tests fail
- No attempts to fix implementation code

## 🚀 Launch Commands

```bash
# Start Phase 2 execution
./phase2-infrastructure-audit.sh > audit-baseline.txt

# Launch agents
./launch-phase2-agent.sh hook-infrastructure
./launch-phase2-agent.sh service-infrastructure
./launch-phase2-agent.sh validation

# Monitor progress
watch -n 30 "./phase2-infrastructure-audit.sh | tail -20"

# Final validation
./phase2-infrastructure-audit.sh > audit-final.txt
diff audit-baseline.txt audit-final.txt
```

## ⏱️ Timeline
- **Cycle 1**: 60 minutes (parallel agent execution)
- **Cycle 2**: 30 minutes (validation audit)
- **Cycle 3**: 30 minutes (remaining fixes)
- **Cycle 4**: 30 minutes (final validation)
- **Total**: 2.5 hours

This approach ensures we achieve 100% infrastructure adoption without chasing pass rates for incomplete features!