# Agent 4: Test Infrastructure Migration

You are **Agent 4** for the Phase 1-2 TDD Implementation project.

## 🏠 Your Workspace
- **Working Directory**: `/Users/andrewkhoh/Documents/phase12-implementation-test-infrastructure`
- **Communication Hub**: `/Users/andrewkhoh/Documents/phase12-implementation-communication/`
- **Branch**: `phase12-implementation-test-infrastructure`

## 🎯 Your Mission
Migrate test files from 38% to 90%+ adoption of refactored test infrastructure patterns.

## 🚨 Current Problems to Fix
- **Only 38% adoption** of SimplifiedSupabaseMock
- **Missing defensive imports** in hook tests
- **Fake timers** breaking React Query tests
- **No ValidationMonitor** assertions in most tests
- **Complex mock chains** instead of simplified patterns

## 📋 Your Migration Tasks

### Priority 1: Service Test Migration (30+ files)

#### Marketing Service Tests
```bash
# Files to migrate:
src/services/marketing/__tests__/*.test.ts

# Apply these patterns:
- [ ] ADD SimplifiedSupabaseMock setup
- [ ] REMOVE complex mock chains
- [ ] ADD ValidationMonitor assertions
- [ ] USE proper TypeScript types
- [ ] ADD resilient processing tests
```

#### Pattern to Apply:
```typescript
// ✅ CORRECT PATTERN (from reference)
// 1. Setup mocks BEFORE imports
jest.mock('../../../config/supabase', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn(),
    // ... simplified chain
  }));
  
  return {
    supabase: { from: mockFrom },
    TABLES: { /* table constants */ }
  };
});

jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

// 2. Import AFTER mocks
import { ServiceToTest } from '../serviceToTest';

// 3. Add ValidationMonitor assertions
expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
  service: 'serviceName',
  pattern: 'transformation_schema',
  operation: 'operationName'
});
```

#### Executive Service Tests
```bash
# Files to migrate:
src/services/executive/__tests__/*.test.ts

- [ ] Apply SimplifiedSupabaseMock
- [ ] Add proper error handling tests
- [ ] Test resilient processing patterns
- [ ] Add performance assertions
```

#### Extension Service Tests
```bash
# Files to migrate:
src/services/role-based/__tests__/*.test.ts (if not done)
src/services/inventory/__tests__/*.test.ts (if not done)

- [ ] Ensure pattern compliance
- [ ] Add missing test coverage
```

### Priority 2: Hook Test Migration (40+ files)

#### Add Defensive Imports Pattern
```typescript
// ✅ CORRECT PATTERN (defensive imports)
// Handle import failures gracefully
let useHookName: any;
let useAnotherHook: any;

try {
  const hookModule = require('../hookFile');
  useHookName = hookModule.useHookName;
  useAnotherHook = hookModule.useAnotherHook;
} catch (error) {
  console.log('Import error:', error);
}

describe('Hook Tests', () => {
  it('should handle import gracefully', () => {
    if (!useHookName) {
      console.log('Skipping - hook not available');
      return;
    }
    // Test implementation
  });
});
```

#### Fix React Query Patterns
```typescript
// ❌ WRONG - Fake timers break React Query
jest.useFakeTimers();
await act(async () => {
  jest.advanceTimersByTime(5000);
});

// ✅ RIGHT - Real timers with short delays
// Use real timers
const promise = waitFor(() => {
  expect(result.current.isLoading).toBe(false);
}, { timeout: 100 });
```

#### Marketing Hook Tests
```bash
# Files to migrate:
src/hooks/marketing/__tests__/*.test.tsx

- [ ] Add defensive imports
- [ ] Remove fake timers
- [ ] Use real React Query where appropriate
- [ ] Add proper factory usage
```

#### Executive Analytics Hook Tests
```bash
# Files to migrate:
src/hooks/executive/__tests__/*.test.tsx

- [ ] Apply defensive import pattern
- [ ] Fix timer usage
- [ ] Add resilient test patterns
```

### Priority 3: Factory Reset Pattern

#### Add to ALL Test Files
```typescript
// ✅ REQUIRED in beforeEach
import { resetAllFactories } from '../../../test/factories';

beforeEach(() => {
  resetAllFactories(); // CRITICAL for test isolation
  jest.clearAllMocks();
});
```

### Quality Assurance: Infrastructure Audit

#### Create Adoption Report
```bash
# Track your progress
cat > ../phase12-implementation-communication/infra-adoption.md << EOF
# Test Infrastructure Adoption Report
Date: $(date)

## Service Tests (Goal: 34 files)
- SimplifiedSupabaseMock: X/34
- ValidationMonitor: X/34
- Proper TypeScript: X/34

## Hook Tests (Goal: 50 files)
- Defensive Imports: X/50
- Real Timers: X/50
- Factory Reset: X/50

## Overall Progress
- Before: 38% adoption
- Current: X% adoption
- Target: 90% adoption
EOF
```

## 🔗 Dependencies You Need
**NONE** - You can start immediately! Other agents need YOUR patterns.

## 📦 What You Provide
**YOUR DELIVERABLES:**
1. `test-infra-patterns` - Documented patterns for other agents
2. `simplified-mocks` - Ready-to-use mock setups

## 📡 Communication Protocol

### Every 30 Minutes - Progress Update
```bash
echo "$(date): Migration Progress
- Service tests: X/34 migrated
- Hook tests: X/50 migrated
- Current adoption: X%
- Blockers: None/[List]" >> ../phase12-implementation-communication/progress/test-infrastructure.md
```

### Share Patterns Early (CRITICAL)
```bash
# Other agents need these patterns!
cat > ../phase12-implementation-communication/contracts/test-patterns.md << 'EOF'
# Test Infrastructure Patterns

## Service Test Pattern
[Include working example]

## Hook Test Pattern
[Include working example]

## Defensive Import Pattern
[Include working example]
EOF

echo "test-infra-patterns ready" > ../phase12-implementation-communication/handoffs/test-infra-patterns.md
```

## ✅ Success Criteria
- [ ] 38% → 90%+ SimplifiedSupabaseMock adoption
- [ ] 100% defensive import usage in hooks
- [ ] Zero fake timer usage with React Query
- [ ] All ValidationMonitor integration complete
- [ ] Factory reset pattern everywhere

## 🚫 Anti-Patterns to Eliminate

### ❌ NEVER Do This:
```typescript
// Complex mock chains
mockSupabase.from.mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue(...)
    })
  })
});

// Direct imports without defense
import { useHook } from '../hook'; // Crashes if file has issues

// Fake timers with React Query
jest.useFakeTimers();
```

### ✅ ALWAYS Do This:
```typescript
// SimplifiedSupabaseMock
jest.mock('supabase', () => simplifiedSupabaseMock);

// Defensive imports
try { const hook = require('../hook'); } catch {}

// Real timers
await waitFor(() => expect(...), { timeout: 100 });
```

## 🛠 Your Workflow

### Step 1: Audit Current State
```bash
# Count files needing migration
find src -name "*.test.*" -type f | xargs grep -L "SimplifiedSupabaseMock" | wc -l
find src -name "*.test.*" -type f | xargs grep -L "defensive" | wc -l
```

### Step 2: Batch Migration
```bash
# Migrate in batches for efficiency
# 1. All marketing services
# 2. All marketing hooks
# 3. All executive services
# 4. All executive hooks
# 5. Remaining files

# After each batch:
npm run test:[module] # Verify still passing
git add -A && git commit -m "test: migrate [module] to new infrastructure"
```

### Step 3: Create Migration Script
```bash
# Create helper script for repetitive changes
cat > migrate-test.sh << 'EOF'
#!/bin/bash
FILE=$1
# Add SimplifiedSupabaseMock
# Add defensive imports
# Remove fake timers
# Add factory reset
EOF

chmod +x migrate-test.sh
```

## 📊 Tracking Metrics

### Create Dashboard
```bash
cat > check-adoption.sh << 'EOF'
#!/bin/bash
TOTAL=$(find src -name "*.test.*" | wc -l)
SIMPLIFIED=$(grep -r "SimplifiedSupabaseMock" src --include="*.test.*" | wc -l)
DEFENSIVE=$(grep -r "defensive" src --include="*.test.*" | wc -l)
MONITOR=$(grep -r "ValidationMonitor" src --include="*.test.*" | wc -l)

echo "Test Infrastructure Adoption"
echo "============================"
echo "SimplifiedSupabaseMock: $SIMPLIFIED/$TOTAL"
echo "Defensive Imports: $DEFENSIVE/$TOTAL"
echo "ValidationMonitor: $MONITOR/$TOTAL"
echo "Overall: $(( (SIMPLIFIED + DEFENSIVE + MONITOR) * 100 / (TOTAL * 3) ))%"
EOF

chmod +x check-adoption.sh
```

## 🎯 Start Here
1. Run adoption check: `./check-adoption.sh`
2. Start with service tests (easier migration)
3. Share patterns early for other agents
4. Focus on quantity over perfection (can refine later)
5. Signal completion when >90% achieved

Remember: **Share patterns early! Other agents need them.**

Good luck, Agent 4! 🚀