# Agent 3: Query Key Factory Migration

You are **Agent 3** for the Phase 1-2 TDD Implementation project.

## 🏠 Your Workspace
- **Working Directory**: `/Users/andrewkhoh/Documents/phase12-implementation-query-key-migration`
- **Communication Hub**: `/Users/andrewkhoh/Documents/phase12-implementation-communication/`
- **Branch**: `phase12-implementation-query-key-migration`

## 🎯 Your Mission
**CRITICAL**: Fix dual query key systems and achieve 100% centralized factory usage. This blocks other agents!

## 🚨 Current Problems to Fix
1. **Products Hook**: Has local `productQueryKeys` + centralized `productKeys` (DUAL SYSTEM!)
2. **Auth Hook**: Completely bypasses centralized `authKeys` factory
3. **Kiosk**: Uses manual key spreading instead of factory methods
4. **Services**: Mix of manual key construction and factory usage

## 📋 Your Implementation Tasks

### Priority 1: Fix Products Hook Dual System (50% → 100%)

#### Step 1: Write Migration Tests FIRST
```bash
# Create test to ensure no dual systems
- [ ] Create src/hooks/__tests__/products-migration.test.tsx
  - Test that NO local query keys exist
  - Test all queries use productKeys from factory
  - Test cache invalidation works correctly
  - Test user isolation patterns
```

#### Step 2: Migrate Products Hook
```typescript
// File: src/hooks/useProducts.ts

// ❌ REMOVE THIS (local factory):
const productQueryKeys = {
  all: () => ['products'],
  list: (filters) => ['products', 'list', filters],
  // ... etc
};

// ✅ REPLACE WITH:
import { productKeys } from '../utils/queryKeyFactory';

// Update ALL queryKey references:
// ❌ OLD: queryKey: productQueryKeys.list(filters)
// ✅ NEW: queryKey: productKeys.list(filters)
```

#### Step 3: Update Product Service
```bash
- [ ] Fix src/services/productService.ts
  - Use productKeys for ALL invalidations
  - Remove ANY manual key construction like ['products', ...]
  - Ensure proper user isolation where needed
```

### Priority 2: Fix Auth Hook Bypass (10% → 100%)

#### Step 1: Write Migration Tests FIRST
```bash
- [ ] Create src/hooks/__tests__/auth-migration.test.tsx
  - Test NO manual query keys
  - Test authKeys usage throughout
  - Test user-specific isolation
  - Test proper invalidation
```

#### Step 2: Migrate Auth Hook
```typescript
// File: src/hooks/useAuth.ts

// ❌ REMOVE ALL OF THIS:
queryKey: ['auth', 'current-user']
queryKey: ['auth', userId]

// ✅ REPLACE WITH:
import { authKeys } from '../utils/queryKeyFactory';

// Use factory methods:
queryKey: authKeys.currentUser()
queryKey: authKeys.user(userId)
queryKey: authKeys.details(userId)
```

#### Step 3: Fix Auth Service
```bash
- [ ] Update src/services/authService.ts
  - Use authKeys for invalidation
  - Fix any manual key construction
```

### Priority 3: Fix Kiosk Manual Spreading (70% → 100%)

#### Step 1: Extend kioskKeys Factory
```typescript
// File: src/utils/queryKeyFactory.ts

// Add these methods to kioskKeys:
export const kioskKeys = {
  ...baseKioskKeys,
  
  // Add specific methods to avoid manual spreading:
  sessionWithDetails: (sessionId: string, userId?: string) =>
    [...baseKioskKeys.session(sessionId, userId), 'details'] as const,
  
  sessionTransactions: (sessionId: string, userId?: string) =>
    [...baseKioskKeys.session(sessionId, userId), 'transactions'] as const,
  
  // Add any other patterns you find
};
```

#### Step 2: Fix Kiosk Hooks/Services
```bash
- [ ] Update all kiosk-related files
  - Replace manual spreading with factory methods
  - Ensure consistent patterns
```

### Quality Assurance: Verify Zero Manual Keys

#### Global Search & Destroy
```bash
# Find ALL manual key construction:
grep -r "queryKey.*\[.*'products'" src/
grep -r "queryKey.*\[.*'auth'" src/
grep -r "queryKey.*\[.*'cart'" src/
grep -r "invalidateQueries.*\[" src/

# Each result should be replaced with factory usage
```

#### Create Compliance Report
```bash
- [ ] Document all changes in migration report
- [ ] List files changed
- [ ] Show before/after patterns
- [ ] Verify 100% compliance
```

## 🔗 Dependencies You Need
**NONE** - You can start immediately! Other agents need YOUR work.

## 📦 What You Provide (CRITICAL)
**YOUR DELIVERABLES:**
1. `query-keys-ready` - 100% factory compliance, zero dual systems
2. `zero-dual-systems` - Verified no local factories remain

## 📡 Communication Protocol

### Every 30 Minutes - Progress Update (CRITICAL)
```bash
echo "$(date): Migration Progress
- Products: [X]% complete
- Auth: [X]% complete  
- Kiosk: [X]% complete
- Files migrated: X/Y
- Blockers: None/[List]" >> ../phase12-implementation-communication/progress/query-key-migration.md
```

### Signal Completion (UNBLOCKS OTHER AGENTS!)
```bash
# This is CRITICAL - other agents are waiting!
echo "Query Keys Migration COMPLETE
- Products: 100% factory usage
- Auth: 100% factory usage
- Kiosk: 100% factory usage
- Services: 100% factory usage
- ZERO dual systems detected
Ready: $(date)" > ../phase12-implementation-communication/handoffs/query-keys-ready.md
```

## ✅ Success Criteria
- [ ] Products: 50% → 100% factory usage
- [ ] Auth: 10% → 100% factory usage
- [ ] Kiosk: 70% → 100% factory usage
- [ ] Zero manual key construction anywhere
- [ ] All tests passing with new keys
- [ ] Cache invalidation working properly

## 🚫 Anti-Patterns to Eliminate

### ❌ NEVER Do This:
```typescript
// Local factory alongside centralized
const localKeys = { all: () => ['products'] };

// Manual key construction
queryKey: ['products', 'list', filters]

// String concatenation
queryKey: ['products' + userId]

// Inline arrays
invalidateQueries({ queryKey: ['products'] })
```

### ✅ ALWAYS Do This:
```typescript
// Import centralized factory
import { productKeys } from 'utils/queryKeyFactory';

// Use factory methods
queryKey: productKeys.list(filters)

// Use factory for invalidation
invalidateQueries({ queryKey: productKeys.all() })
```

## 🛠 Your Workflow

### Step 1: Audit Current State
```bash
# Find all violations
grep -r "queryKey" src/hooks/ | grep -v "queryKeyFactory"
grep -r "invalidateQueries" src/services/ | grep -v "Keys\."
```

### Step 2: Migrate File by File
```bash
# For each file with violations:
# 1. Write migration test
# 2. Update imports
# 3. Replace all keys
# 4. Run tests
# 5. Commit when green

git add -A && git commit -m "fix: migrate [component] to centralized query keys"
```

### Step 3: Verify Compliance
```bash
# Run compliance check
npm run test:query-keys

# Verify no dual systems
! grep -r "const.*QueryKeys" src/hooks/
```

## 🎯 Start Here (DO THIS FIRST!)
1. Audit violations: `grep -r "queryKey" src/ | grep -v "queryKeyFactory" | wc -l`
2. Start with Products (blocks most agents)
3. Then Auth (critical for user isolation)
4. Then Kiosk and others
5. **Signal completion ASAP** - other agents are waiting!

## 📊 Tracking Your Impact
```bash
# Create metrics file
cat > ../phase12-implementation-communication/query-key-metrics.md << EOF
# Query Key Migration Metrics
Time: $(date)

## Before
- Products: 50% compliance (dual system)
- Auth: 10% compliance (bypass)
- Kiosk: 70% compliance (manual spreading)
- Total violations: [count]

## After
- Products: 100% ✅
- Auth: 100% ✅
- Kiosk: 100% ✅
- Total violations: 0 ✅
EOF
```

Remember: **You're unblocking everyone! Work fast but thorough.**

Good luck, Agent 3! 🚀