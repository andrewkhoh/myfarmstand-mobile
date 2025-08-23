# Test Refactor - Agent Task Assignments

## 🚨 CRITICAL: Start These Tasks IMMEDIATELY (All Can Run in Parallel)

### 🏭 FACTORY AGENT
**Branch**: `test-refactor-factories`
**Priority**: Create test data factories with schema validation

```bash
# YOUR TASKS (Start Now!)
1. Create OrderFactory with schema validation
2. Create UserFactory with auth roles support  
3. Create CartFactory with item validation
4. Create CategoryFactory with hierarchy
5. Create PaymentFactory with transaction states
6. Create base SchemaFactory class for inheritance
7. Create factories/index.ts with all exports
```

**First Action**:
```bash
git checkout -b test-refactor-factories
# Start with OrderFactory since it's most complex
```

---

### 🎭 MOCK AGENT  
**Branch**: `test-refactor-mocks`
**Priority**: Replace complex chain mocking

```bash
# YOUR TASKS (Start Now!)
1. Finish SimplifiedSupabaseMock (add update/delete/upsert)
2. Create SimplifiedAuthMock without chains
3. Create SimplifiedStorageMock for file operations
4. Create SimplifiedBroadcastMock for real-time
5. Create mock preset configurations
6. Write mock validation tests
```

**First Action**:
```bash
git checkout -b test-refactor-mocks
# Complete SimplifiedSupabaseMock first - others depend on it
```

---

### 📐 SCHEMA AGENT
**Branch**: `test-refactor-schemas`  
**Priority**: Add contract validation everywhere

```bash
# YOUR TASKS (Start Now!)
1. Audit ALL schemas for missing validations
2. Create comprehensive hook.contracts.ts
3. Add service input validation contracts
4. Create runtime validation middleware
5. Add schema compatibility tests
6. Document validation patterns
```

**First Action**:
```bash
git checkout -b test-refactor-schemas
# Start with service contract audit - find gaps
```

---

### 🔄 MIGRATION AGENT 1 (Services)
**Branch**: `test-refactor-migrate-services`
**Priority**: Migrate critical service tests

```bash
# YOUR TASKS (Start After Factory Agent)
1. Migrate authService.test.ts (CRITICAL - security)
2. Migrate orderService.test.ts (CRITICAL - business)
3. Migrate paymentService.test.ts (CRITICAL - financial)
4. Migrate cartService.test.ts (has race conditions)
5. Track migration patterns for documentation
```

**First Action**:
```bash
git checkout -b test-refactor-migrate-services
# Wait for Factory Agent's base work, then start with authService
```

---

### 🔄 MIGRATION AGENT 2 (Hooks)
**Branch**: `test-refactor-migrate-hooks`
**Priority**: Migrate hook tests with React Query

```bash
# YOUR TASKS (Start After Mock Agent)
1. Migrate useAuth hooks (all variants)
2. Migrate useCart hooks (preserve race tests!)
3. Migrate useOrders hooks
4. Migrate useProducts hooks
5. Document React Query patterns
```

**First Action**:
```bash
git checkout -b test-refactor-migrate-hooks  
# Wait for Mock Agent's work, then start with useAuth
```

---

### 🧹 CLEANUP AGENT
**Branch**: `test-refactor-cleanup`
**Priority**: Remove duplication NOW

```bash
# YOUR TASKS (Start Now!)
1. Map all 11 setup files and their usage
2. Identify duplicate test patterns (91 found!)
3. Create shared test utilities
4. Consolidate jest configs (10+ files!)
5. Remove dead test code
6. Standardize test naming
```

**First Action**:
```bash
git checkout -b test-refactor-cleanup
# Start mapping setup files - critical for others
```

---

### 🔀 INTEGRATION AGENT
**Branch**: `test-refactor-integration`
**Priority**: Prepare branch merging strategy

```bash
# YOUR TASKS (Start Now - Analysis Phase)
1. Analyze phase-1-extension tests (141 files)
2. Analyze phase-2-extension tests (136 files)  
3. Analyze phase-3-marketing tests (130 files)
4. Create conflict resolution strategy
5. Plan unified test structure
```

**First Action**:
```bash
git checkout -b test-refactor-integration
# Start analyzing branch differences NOW
```

---

## 📊 Task Tracker Dashboard

### Immediate Blockers to Resolve
```yaml
Factory Agent:
  - BLOCKER: None - Can start immediately
  - OUTPUT: Other agents need factories by Day 2

Mock Agent:
  - BLOCKER: None - Can start immediately  
  - OUTPUT: Migration agents need mocks by Day 2

Schema Agent:
  - BLOCKER: None - Can start immediately
  - OUTPUT: Migration agents need contracts by Day 2

Cleanup Agent:
  - BLOCKER: None - Can start immediately
  - OUTPUT: Setup file map needed by Day 1 EOD

Integration Agent:
  - BLOCKER: None - Start analysis immediately
  - OUTPUT: Merge strategy needed by Day 3
```

### Day 1 Success Criteria (Today!)
- [ ] Factory Agent: Base SchemaFactory + 2 entity factories
- [ ] Mock Agent: SimplifiedSupabaseMock complete
- [ ] Schema Agent: Service contract audit complete
- [ ] Cleanup Agent: Setup file mapping complete
- [ ] Integration Agent: Branch analysis complete
- [ ] Migration Agents: Environment ready

### Coordination Schedule
```
Day 1 - 4:00 PM: Foundation Sync
  - Factory Agent: Show base factory pattern
  - Mock Agent: Demo simplified mocking
  - All: Agree on patterns

Day 2 - 10:00 AM: Migration Kickoff
  - Migration Agents: Start with examples
  - Factory/Mock Agents: Support as needed

Day 3 - 2:00 PM: Progress Check
  - All Agents: Share progress
  - Identify and resolve blockers

Day 4 - 10:00 AM: Integration Start
  - Integration Agent: Lead branch merging
  - All: Support conflict resolution
```

## 🚀 Quick Reference

### Test Health Check (Run Hourly!)
```bash
npx tsx src/test/__meta__/test-health-check.ts
```

### Current Baseline
- Health Score: 4/100
- Setup Files: 11
- Mock Complexity: 612
- Schema Validation: 16%

### Target by Agent
- Factory Agent: +15 points (schema validation)
- Mock Agent: +20 points (complexity reduction)
- Schema Agent: +15 points (validation coverage)
- Migration Agents: +20 points (pattern consistency)
- Cleanup Agent: +10 points (setup consolidation)
- Integration Agent: +15 points (branch unity)

### Communication
```bash
# Post blockers immediately
echo "BLOCKED: [Agent] - [Issue]" >> blockers.log

# Share wins
echo "SUCCESS: [Agent] - [Achievement]" >> wins.log

# Track progress
echo "PROGRESS: [Agent] - [Metric]" >> progress.log
```

## 🎯 Remember the Mission

Transform our test suite from:
- **FROM**: Health Score 4/100, 11 setups, 612 complexity
- **TO**: Health Score 75/100, 2 setups, <50 complexity

Every task you complete directly improves our codebase health!

---

**START NOW! Pick your agent role and begin your first task!**