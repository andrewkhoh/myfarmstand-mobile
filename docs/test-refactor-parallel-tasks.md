# Test Refactor - Parallel Agent Task List

## 🎯 Mission
Transform 545+ test files from health score 4/100 to 75/100 through parallel agent execution.

## 👥 Agent Team Structure

### Agent Roles
1. **Factory Agent** - Creates test data factories
2. **Mock Agent** - Simplifies mock infrastructure  
3. **Migration Agent** - Converts existing tests
4. **Schema Agent** - Adds validation contracts
5. **Cleanup Agent** - Removes duplicate code
6. **Integration Agent** - Merges branch tests

## 📋 Parallel Task Breakdown

### 🔴 IMMEDIATE TASKS (Can Start NOW - All Agents)

#### Factory Agent Tasks
```bash
# PRIORITY: Create all entity factories (can work independently)
□ Create OrderFactory (src/test/factories/order.factory.ts)
□ Create UserFactory (src/test/factories/user.factory.ts)
□ Create CartFactory (src/test/factories/cart.factory.ts)
□ Create CategoryFactory (src/test/factories/category.factory.ts)
□ Create PaymentFactory (src/test/factories/payment.factory.ts)
□ Create InventoryFactory (src/test/factories/inventory.factory.ts)
□ Create MarketingFactory (src/test/factories/marketing.factory.ts)
□ Create ExecutiveFactory (src/test/factories/executive.factory.ts)
□ Create base SchemaFactory class
□ Create factory index file with exports
```

#### Mock Agent Tasks
```bash
# PRIORITY: Simplify all mock infrastructure
□ Complete SimplifiedSupabaseMock implementation
□ Create SimplifiedAuthMock (replace complex auth chains)
□ Create SimplifiedStorageMock (replace storage chains)
□ Create SimplifiedBroadcastMock (replace broadcast chains)
□ Create SimplifiedRealtimeMock (replace channel mocks)
□ Create mock configuration system
□ Document mock usage patterns
```

#### Schema Agent Tasks
```bash
# PRIORITY: Add contract validation to all schemas
□ Audit all existing schemas for completeness
□ Create hook.contracts.ts for hook validation
□ Create screen.contracts.ts for UI validation
□ Create api.contracts.ts for API validation
□ Add validation pipelines to all services
□ Create schema test utilities
□ Document schema validation patterns
```

### 🟡 PHASE 1 TASKS (After Foundation - Day 2-3)

#### Migration Agent Tasks - Service Layer
```bash
# Migrate high-value services first
□ Migrate authService.test.ts (security critical)
□ Migrate orderService.test.ts (business critical)
□ Migrate paymentService.test.ts (financial critical)
□ Migrate cartService.test.ts (already has race tests)
□ Migrate productService.test.ts (high usage)
□ Migrate inventoryService tests (phase-2)
□ Migrate marketingService tests (phase-3)
□ Migrate executiveService tests (phase-4)
```

#### Migration Agent Tasks - Hook Layer
```bash
# Migrate hooks with their service dependencies
□ Migrate useAuth hooks and tests
□ Migrate useCart hooks and tests
□ Migrate useOrders hooks and tests
□ Migrate useProducts hooks and tests
□ Migrate usePayment hooks and tests
□ Migrate useInventory hooks (phase-2)
□ Migrate useMarketing hooks (phase-3)
□ Migrate useExecutive hooks (phase-4)
```

#### Cleanup Agent Tasks
```bash
# Remove redundant code while others migrate
□ Identify duplicate test patterns across files
□ Extract common test utilities
□ Consolidate mock setups
□ Remove unused test helpers
□ Standardize test descriptions
□ Fix test file naming conventions
```

### 🟢 PHASE 2 TASKS (Integration - Day 4-5)

#### Integration Agent Tasks - Branch Merging
```bash
# Merge feature branch tests
□ Analyze phase-1-extension unique tests
□ Migrate navigationSetup.ts patterns
□ Analyze phase-2-extension inventory tests
□ Migrate inventory-specific patterns
□ Analyze phase-3-marketing tests
□ Migrate marketing integration patterns
□ Resolve test conflicts between branches
□ Create unified test registry
```

#### Migration Agent Tasks - Complex Tests
```bash
# Handle special test cases
□ Migrate race condition tests (preserve real React Query)
□ Migrate integration tests
□ Migrate e2e tests
□ Migrate performance tests
□ Migrate security tests
□ Migrate realdb tests
```

### 🔵 PHASE 3 TASKS (Validation - Day 6-7)

#### All Agents - Quality Assurance
```bash
□ Run full test suite with new patterns
□ Compare coverage before/after
□ Benchmark test execution time
□ Validate schema contract coverage
□ Check for missing test scenarios
□ Document migration issues
□ Create migration report
```

## 📊 Task Dependencies & Coordination

### Critical Path (Must Complete in Order)
1. Factory Agent creates base `SchemaFactory` class → All other factories depend on this
2. Mock Agent creates `SimplifiedSupabaseMock` → Migration Agent needs this
3. Schema Agent creates contract validators → Migration Agent uses these

### Parallel Execution Groups

#### Group A (Can work simultaneously)
- Factory Agent: All entity factories
- Mock Agent: All mock simplifications
- Schema Agent: All contract validators
- Cleanup Agent: Code analysis and extraction

#### Group B (After Group A completes)
- Migration Agent: Service tests
- Migration Agent: Hook tests
- Integration Agent: Branch analysis

#### Group C (After Group B completes)
- All Agents: Integration testing
- All Agents: Performance validation
- All Agents: Documentation

## 🎯 Success Metrics Per Agent

### Factory Agent
- [ ] 10+ factories created
- [ ] 100% schema validation
- [ ] <50 lines per factory
- [ ] Zero type errors

### Mock Agent
- [ ] 5+ simplified mocks
- [ ] 80% code reduction
- [ ] No chain methods
- [ ] Data-driven approach

### Migration Agent
- [ ] 100+ tests migrated
- [ ] All tests passing
- [ ] 50% less code
- [ ] Contract validation added

### Schema Agent
- [ ] 100% schema coverage
- [ ] All contracts defined
- [ ] Validation utilities created
- [ ] Zero runtime errors

### Cleanup Agent
- [ ] 11→2 setup files
- [ ] 50% duplicate removal
- [ ] Consistent patterns
- [ ] Clear documentation

### Integration Agent
- [ ] All branches merged
- [ ] Zero conflicts
- [ ] Unified patterns
- [ ] Complete coverage

## 🚀 Quick Start Commands

### For Factory Agent
```bash
# Start with base factory
npx tsx scripts/generate-factory.ts base

# Generate entity factories
npx tsx scripts/generate-factory.ts order user cart category
```

### For Mock Agent
```bash
# Test simplified mocks
npm run test:mocks

# Validate mock behavior
npx tsx src/test/mocks/__tests__/mock-validation.test.ts
```

### For Migration Agent
```bash
# Dry run migration
npx tsx scripts/migrate-tests.ts --dry-run

# Migrate specific file
npx tsx scripts/migrate-tests.ts src/services/__tests__/authService.test.ts

# Batch migrate directory
npx tsx scripts/migrate-tests.ts --dir=src/services
```

### For Schema Agent
```bash
# Validate schema coverage
npx tsx scripts/schema-coverage.ts

# Generate contract tests
npx tsx scripts/generate-contracts.ts
```

### For Cleanup Agent
```bash
# Find duplicates
npx tsx scripts/find-duplicate-patterns.ts

# Analyze setup files
npx tsx scripts/analyze-setup-files.ts
```

### For Integration Agent
```bash
# Compare branches
npx tsx scripts/compare-branch-tests.ts

# Merge test patterns
npx tsx scripts/merge-test-patterns.ts
```

## 📈 Progress Tracking

### Daily Standup Questions
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers or dependencies?

### Health Check Command
```bash
# Run every day to track progress
npx tsx src/test/__meta__/test-health-check.ts
```

### Target Metrics by Day
- Day 1: Health Score 4 → 15 (Foundation laid)
- Day 2: Health Score 15 → 30 (Factories active)
- Day 3: Health Score 30 → 45 (Services migrated)
- Day 4: Health Score 45 → 60 (Hooks migrated)
- Day 5: Health Score 60 → 70 (Branches merged)
- Day 6: Health Score 70 → 75 (Cleanup complete)
- Day 7: Health Score 75+ (Mission accomplished)

## ⚠️ Coordination Points

### Critical Sync Points
1. **Day 1 EOD**: All agents sync on foundation completion
2. **Day 3 Noon**: Migration agents coordinate on patterns
3. **Day 5 Morning**: Integration agent takes lead for merging
4. **Day 6 EOD**: All agents validate final state

### Communication Channels
- **Blocker Alert**: Immediate notification if blocked
- **Pattern Change**: Notify all if pattern needs adjustment
- **Success Share**: Share successful migrations for learning

## 🏁 Definition of Done

### Per Task
- [ ] Code written and committed
- [ ] Tests passing
- [ ] Schema validated
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Peer reviewed (if possible)

### Overall Mission
- [ ] Health Score ≥ 75
- [ ] All tests passing
- [ ] <10 minute execution
- [ ] 2 setup files max
- [ ] 100% schema validation
- [ ] Documentation complete

## 🔥 Start Now!

Each agent should:
1. Pick tasks from their IMMEDIATE TASKS section
2. Create a branch: `test-refactor-[agent-name]-[task]`
3. Work in parallel with other agents
4. Sync at coordination points
5. Celebrate at Health Score 75! 🎉