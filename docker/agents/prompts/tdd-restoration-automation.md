# TDD Phase 4 Restoration Automation Prompt

## Mission: Complete TDD Phase 4 Repository Restoration to 100% Pass Rates

You are a specialized restoration agent tasked with completing the integration of TDD Phase 4 repositories into the main codebase. Previous integration work has been completed but gaps remain that prevent 100% test pass rates.

## Context: Current State Analysis

### ✅ Successfully Completed Integration
- **Executive Services**: Core business logic with ValidationMonitor pattern expansion
- **Decision Support**: AI-powered RecommendationEngine with multi-dimensional analysis
- **TypeScript Compilation**: Fixed malformed jest.mock() calls across 10 test files
- **Service Infrastructure**: Enhanced RolePermissionService with static methods

### ❌ Outstanding Restoration Requirements
Based on `docs/tdd-phase4-restoration-plan.md`, **636 TypeScript errors** remain across:

1. **Testing Infrastructure Gaps** (High Priority)
   - Missing specialized Jest configurations from TDD repos
   - Test setup files and mock harmonization
   - Race condition testing infrastructure

2. **Executive Components** (148 errors)
   - Hook implementations: useExecutiveAnalytics, useBusinessMetrics
   - Screen components: ExecutiveDashboard, AnalyticsScreen
   - Component library: Charts, KPIs, DataVisualization

3. **Cross-Role Integration** (284 errors) 
   - Staff-Executive workflow bridges
   - Permission boundary management
   - Role-based component rendering

4. **Schema Integration** (204 errors)
   - Database schema synchronization
   - Type generation and validation
   - Migration scripts and seed data

## Phase 1: Testing Infrastructure Restoration

### Step 1.1: Analyze Source Repository Testing Setup
```bash
# Discover specialized Jest configurations in TDD repos
find docker/volumes/tdd_phase_4* -name "jest.config*.js" -type f
find docker/volumes/tdd_phase_4* -name "*.setup.ts" -path "*/test/*" -type f
```

### Step 1.2: Port Missing Jest Configurations
**Target Files to Copy:**
- `jest.config.hooks.executive.js`
- `jest.config.components.executive.js` 
- `jest.config.screens.executive.js`
- `jest.config.cross-role.js`
- `src/test/executiveSetup.ts`
- `src/test/crossRoleSetup.ts`

**Integration Pattern:**
```typescript
// Copy specialized configs to main repo
// Update package.json test scripts
// Verify config compatibility with existing infrastructure
```

### Step 1.3: Mock Harmonization Strategy
**Critical Files:**
- Compare mock implementations between TDD repos and main repo
- Harmonize SimplifiedSupabaseMock vs existing mocks
- Ensure consistent mock data across all test suites

## Phase 2: Executive Components Restoration  

### Step 2.1: File Migration Priority Matrix
**Priority 1 (Core Hooks - 48 errors):**
- `src/hooks/executive/useExecutiveAnalytics.ts`
- `src/hooks/executive/useBusinessMetrics.ts`
- `src/hooks/executive/useDashboardData.ts`

**Priority 2 (Screen Components - 52 errors):**
- `src/screens/executive/ExecutiveDashboard.tsx`
- `src/screens/executive/AnalyticsScreen.tsx`
- `src/screens/executive/ReportsScreen.tsx`

**Priority 3 (UI Components - 48 errors):**
- `src/components/executive/Charts/`
- `src/components/executive/KPIs/`
- `src/components/executive/DataVisualization/`

### Step 2.2: Systematic Component Integration
```typescript
// For each component file:
// 1. Copy from TDD repo
// 2. Fix import paths to match main repo structure
// 3. Update ValidationMonitor pattern usage
// 4. Verify TypeScript compilation
// 5. Run component-specific tests
```

## Phase 3: Cross-Role Integration Restoration

### Step 3.1: Permission System Integration
**Key Areas:**
- Staff-Executive transition workflows
- Role-based component access control
- Permission boundary enforcement

### Step 3.2: Navigation Integration
**Files to Restore:**
- `src/navigation/ExecutiveNavigator.tsx`
- `src/navigation/CrossRoleNavigator.tsx`
- Navigation type definitions and route configuration

## Phase 4: Schema and Database Integration

### Step 4.1: Schema Synchronization
```sql
-- Copy schema files from TDD repos
-- Apply missing executive tables
-- Verify foreign key relationships
-- Update type generation
```

### Step 4.2: Migration Script Integration
**Pattern:**
- Copy migration files maintaining chronological order
- Test migrations against development database
- Verify schema changes don't break existing functionality

## Phase 5: Verification and Testing

### Step 5.1: Progressive Test Verification
**Testing Sequence:**
```bash
# Test individual restored components
npm run test:hooks:executive
npm run test:components:executive
npm run test:screens:executive
npm run test:cross-role

# Integration testing
npm run test:integration:executive
npm run test:e2e:executive
```

### Step 5.2: TypeScript Error Resolution
**Systematic Approach:**
```bash
# Check compilation status after each phase
npm run typecheck 2>&1 | grep "error TS" | wc -l

# Target: Reduce from 636 errors to 0
# Track progress: Phase 1 (-200), Phase 2 (-200), Phase 3 (-150), Phase 4 (-86)
```

## Phase 6: Performance and Quality Assurance

### Step 6.1: Test Coverage Verification
**Targets:**
- Executive hooks: >80% coverage
- Executive components: >75% coverage  
- Cross-role integration: >70% coverage
- Decision support: >85% coverage (already achieved)

### Step 6.2: Performance Testing
```bash
# Race condition tests
npm run test:hooks:race:executive

# Load testing for executive dashboard
npm run test:performance:dashboard
```

## Success Metrics

### ✅ Completion Criteria
- **TypeScript Errors**: 0 (down from 636)
- **Test Pass Rate**: 100% across all restored components
- **Coverage Thresholds**: Met for all new components
- **Integration Tests**: All cross-role workflows passing
- **Performance**: Dashboard loads <2s, all queries <500ms

### 📊 Progress Tracking
```bash
# Daily verification commands
npm run typecheck 2>&1 | grep "Found.*error" 
npm test 2>&1 | grep "Test Suites.*passed"
npm run test:coverage 2>&1 | grep "All files.*[8-9][0-9]%"
```

## Error Resolution Patterns

### Common TypeScript Errors and Fixes
1. **Import Path Errors**: Update relative paths for main repo structure
2. **Type Definition Mismatches**: Ensure type files are copied with components
3. **Mock Incompatibilities**: Harmonize mock implementations
4. **Circular Dependencies**: Use dynamic imports or restructure dependencies

### Jest Configuration Issues
1. **Path Mapping**: Update moduleNameMapper for main repo structure
2. **Setup Files**: Ensure all required setup files are copied and configured
3. **Transform Issues**: Verify babel-jest configuration compatibility

## Integration Safeguards

### Pre-Phase Verification
- Always verify source repository tests pass before copying files
- Create backup branches before major integration phases
- Test TypeScript compilation after each file group integration

### Rollback Strategy  
- Maintain detailed logs of all file changes
- Use git worktree for isolated integration work
- Atomic commits for each restored component group

## Final Integration Checklist

- [ ] All 636 TypeScript errors resolved
- [ ] Jest configurations successfully ported and working
- [ ] Executive components fully functional with tests passing
- [ ] Cross-role integration workflows operational
- [ ] Database schema synchronized and migrations applied
- [ ] Test coverage thresholds met across all components
- [ ] Performance benchmarks achieved
- [ ] Integration tests passing for all restored functionality
- [ ] Documentation updated to reflect completed integration

## Automation Framework

This prompt is designed for systematic execution by an integration agent. Each phase includes:
- Clear file targets and copy operations
- Verification steps with specific commands
- Error resolution guidance
- Progress tracking metrics
- Rollback procedures if needed

Execute phases sequentially, verifying success criteria before proceeding to the next phase. Maintain detailed logs for troubleshooting and progress reporting.