# Phase 2: Test Infrastructure Adoption Strategy
## "Audit-Fix-Audit-Fix" Cycle Approach

## 🎯 Core Objective
**100% test infrastructure adoption** - Every test file should follow the golden patterns, regardless of pass/fail status.

## 📊 Current Infrastructure Adoption Status

### Phase 1 Results Analysis
- **Golden Patterns Proven**: Service, Hook, and Schema reference patterns work
- **Partial Success**: Some agents applied patterns, but integration issues occurred
- **Key Learning**: When patterns are correctly applied, they move the needle significantly

### Critical Finding
Many test files still use:
- ❌ Manual Supabase mocking instead of SimplifiedSupabaseMock
- ❌ Static React Query mocks instead of dynamic configuration
- ❌ Direct imports instead of defensive patterns
- ❌ No factory usage for test data
- ❌ Missing resetAllFactories() in setup

## 🔄 Audit-Fix-Audit-Fix Methodology

### Cycle 1: Comprehensive Infrastructure Audit
**Duration**: 30 minutes

#### Audit Checklist per Test Category

**Service Tests** (`src/services/**/__tests__/*.test.ts`)
```typescript
// Golden Pattern Compliance Check
✓ Uses SimplifiedSupabaseMock from infrastructure?
✓ Mocks declared BEFORE imports?
✓ Uses factories (createUser, createOrder, etc.)?
✓ Has resetAllFactories() in beforeEach?
✓ Follows service-test-pattern (REFERENCE).md?
```

**Hook Tests** (`src/hooks/**/__tests__/*.test.tsx`)
```typescript
// Golden Pattern Compliance Check
✓ Uses defensive imports (try/catch)?
✓ Mocks React Query dynamically?
✓ Has complete query key factory mocks?
✓ Uses createWrapper() from test utils?
✓ Follows hook-test-pattern-guide (REFERENCE).md?
```

**Schema Tests** (`src/schemas/**/__tests__/*.test.ts`)
```typescript
// Golden Pattern Compliance Check
✓ Database-first validation approach?
✓ Transform in single pass?
✓ Handles nulls with defaults?
✓ Uses proper test data format?
✓ Follows schema-test-pattern (REFERENCE).md?
```

### Cycle 2: Targeted Infrastructure Fixes
**Duration**: 1 hour

#### Fix Priority Matrix
| Priority | Category | Issue | Fix Strategy |
|----------|----------|-------|--------------|
| **P0** | All | No infrastructure at all | Apply complete golden pattern |
| **P1** | Services | Manual Supabase mocking | Replace with SimplifiedSupabaseMock |
| **P2** | Hooks | Missing defensive imports | Add try/catch pattern |
| **P3** | Hooks | Static React Query mocks | Convert to dynamic mocks |
| **P4** | All | No factory usage | Add factory imports and usage |

### Cycle 3: Validation Audit
**Duration**: 30 minutes

#### Infrastructure Adoption Metrics (NOT pass rate)
```typescript
interface InfrastructureMetrics {
  totalTestFiles: number;
  filesUsingInfrastructure: number;
  adoptionPercentage: number;
  
  breakdown: {
    services: {
      usingSimplifiedMock: number;
      usingFactories: number;
      properMockOrder: number;
    };
    hooks: {
      defensiveImports: number;
      dynamicReactQuery: number;
      completeQueryKeys: number;
    };
    schemas: {
      databaseFirst: number;
      singlePassTransform: number;
      nullHandling: number;
    };
  };
}
```

### Cycle 4: Remediation Fixes
**Duration**: 30 minutes

Fix any remaining gaps identified in validation audit.

## 📋 Detailed Audit Script

```bash
#!/bin/bash
# phase2-infrastructure-audit.sh

echo "🔍 Phase 2 Infrastructure Adoption Audit"
echo "======================================="

# Service Test Audit
echo "📦 Service Tests Infrastructure Check:"
for file in src/services/**/__tests__/*.test.ts; do
  echo -n "  $(basename $file): "
  
  # Check for SimplifiedSupabaseMock
  if grep -q "SimplifiedSupabaseMock" "$file"; then
    echo -n "✓Mock "
  else
    echo -n "✗Mock "
  fi
  
  # Check for factories
  if grep -q "createUser\|createOrder\|createProduct" "$file"; then
    echo -n "✓Factory "
  else
    echo -n "✗Factory "
  fi
  
  # Check for resetAllFactories
  if grep -q "resetAllFactories" "$file"; then
    echo "✓Reset"
  else
    echo "✗Reset"
  fi
done

# Hook Test Audit
echo ""
echo "🪝 Hook Tests Infrastructure Check:"
for file in src/hooks/**/__tests__/*.test.tsx; do
  echo -n "  $(basename $file): "
  
  # Check for defensive imports
  if grep -q "try.*require.*catch" "$file"; then
    echo -n "✓Defensive "
  else
    echo -n "✗Defensive "
  fi
  
  # Check for React Query mock
  if grep -q "jest.mock.*@tanstack/react-query" "$file"; then
    echo -n "✓RQ "
  else
    echo -n "✗RQ "
  fi
  
  # Check for createWrapper
  if grep -q "createWrapper" "$file"; then
    echo "✓Wrapper"
  else
    echo "✗Wrapper"
  fi
done

# Schema Test Audit
echo ""
echo "📋 Schema Tests Infrastructure Check:"
for file in src/schemas/**/__tests__/*.test.ts; do
  echo -n "  $(basename $file): "
  
  # Check for transform pattern
  if grep -q "transform\|Transform" "$file"; then
    echo -n "✓Transform "
  else
    echo -n "✗Transform "
  fi
  
  # Check for null handling
  if grep -q "null.*default\|\?\?" "$file"; then
    echo "✓Nulls"
  else
    echo "✗Nulls"
  fi
done
```

## 🤖 Multi-Agent Task Division for Infrastructure Adoption

### Agent 1: Service Infrastructure Auditor & Fixer
**Mission**: 100% SimplifiedSupabaseMock adoption
**Scope**: All service test files
**Success Metric**: Every service test uses infrastructure, regardless of pass/fail

### Agent 2: Hook Infrastructure Auditor & Fixer  
**Mission**: 100% defensive import and React Query mock adoption
**Scope**: All hook test files
**Success Metric**: Every hook test uses infrastructure patterns

### Agent 3: Schema Infrastructure Auditor & Fixer
**Mission**: 100% database-first validation pattern adoption
**Scope**: All schema test files
**Success Metric**: Every schema test follows transformation patterns

### Agent 4: Integration Validator
**Mission**: Verify infrastructure adoption across all categories
**Scope**: Complete test suite
**Success Metric**: 100% infrastructure adoption report

## 📈 Expected Outcomes

### Infrastructure Adoption (Primary Goal)
- **Before**: ~40% using proper infrastructure
- **After**: **100% using proper infrastructure**

### Test Organization (Secondary Benefit)
- Tests properly marked as `.skip` for incomplete features
- Clear documentation of why tests fail
- Consistent patterns across all test categories

### Pass Rate (Natural Consequence)
- Will improve naturally where features are complete
- Not the primary focus - infrastructure is
- Expected: 10-20% improvement just from proper mocking

## 🚀 Implementation Plan

### Phase 2A: Initial Audit (30 min)
1. Run comprehensive audit script
2. Generate infrastructure adoption report
3. Categorize files by infrastructure gaps

### Phase 2B: Parallel Fix Execution (1 hour)
1. Launch 3 specialized agents
2. Each agent focuses on their category
3. Apply golden patterns systematically

### Phase 2C: Validation Audit (30 min)
1. Re-run audit script
2. Verify 100% infrastructure adoption
3. Document remaining issues

### Phase 2D: Final Remediation (30 min)
1. Fix any remaining gaps
2. Final validation
3. Generate compliance report

## 📋 Sample Fix Patterns

### Service Test Fix
```typescript
// BEFORE: Manual mocking
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      // ... 40 lines of manual setup
    }))
  }
}));

// AFTER: Infrastructure adoption
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  return {
    supabase: new SimplifiedSupabaseMock().createClient(),
    TABLES: require('../../config/supabase').TABLES
  };
});
```

### Hook Test Fix
```typescript
// BEFORE: Direct import
import { useAuth } from '../useAuth';

// AFTER: Defensive import
let useAuth: any;
try {
  const authModule = require('../useAuth');
  useAuth = authModule.useAuth;
} catch (error) {
  console.log('Import error:', error);
}
```

This approach ensures we focus on **infrastructure adoption** rather than chasing pass rates for incomplete features!