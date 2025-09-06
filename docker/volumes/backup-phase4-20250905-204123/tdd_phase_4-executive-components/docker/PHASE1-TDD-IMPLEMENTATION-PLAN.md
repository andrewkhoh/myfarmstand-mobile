# Phase 1 Role-Based System - TDD Implementation Plan

## 🔴 TDD Philosophy: RED → GREEN → REFACTOR → AUDIT

Following the strict TDD approach from Phase 3:
1. **Write tests FIRST** (RED phase - tests fail)
2. **Implement minimal code** to make tests pass (GREEN phase)
3. **Optimize and refactor** (REFACTOR phase)
4. **Validate compliance** (AUDIT phase)

## 🎯 Implementation Strategy

Given the 0% pass rate and critical gaps, we'll use a **FRESH START TDD APPROACH** with multi-agent workflow.

### Why Fresh Start?
- Current implementation has fundamental TypeScript errors
- Services in wrong locations
- No architectural pattern compliance
- Easier to rebuild correctly than fix 50+ compilation errors

## 📊 TDD Target Metrics

| Component | Tests to Write | Current Passing | Target |
|-----------|---------------|-----------------|--------|
| Schemas | 37 | 0 | 37 |
| Services | 47 | 0 | 47 |
| Hooks | 60 | 0 | 60 |
| Screens | 80 | 0 | 80 |
| Components | 40 | 0 | 40 |
| Navigation | 25 | 0 | 25 |
| Integration | 45 | 0 | 45 |
| **TOTAL** | **334** | **0** | **334** |

## 🐳 Multi-Agent TDD Workflow

### Agent Architecture (Following Phase 3B Pattern)

Using combined test-writing and implementation per agent (Phase 2 architecture):

1. **Foundation Agent** (role-schema)
   - Write schema tests → Implement schemas → Pass tests
   - Deliverables: 37 passing tests

2. **Service Agent** (role-services)
   - Write service tests → Implement services → Pass tests
   - Depends on: role-schema
   - Deliverables: 47 passing tests

3. **Hook Agent** (role-hooks)
   - Write hook tests → Implement hooks → Pass tests
   - Depends on: role-services
   - Deliverables: 60 passing tests

4. **Navigation Agent** (role-navigation)
   - Write navigation tests → Implement navigation → Pass tests
   - Depends on: role-hooks
   - Deliverables: 25 passing tests

5. **Screen Agent** (role-screens)
   - Write screen tests → Implement screens → Pass tests
   - Depends on: role-hooks, role-navigation
   - Deliverables: 80 passing tests

6. **Component Agent** (role-components)
   - Write component tests → Implement components → Pass tests
   - Depends on: role-hooks
   - Deliverables: 40 passing tests

7. **Integration Agent** (role-integration)
   - Write integration tests → Fix integration issues → Pass tests
   - Depends on: ALL agents
   - Deliverables: 45 passing tests

## 📋 Detailed Agent Task Breakdown

### Agent 1: Foundation (role-schema)
**RED Phase (Day 1)**
```typescript
// Write 37 tests first
- [ ] rolePermission.contracts.test.ts (15 tests)
  - Database alignment tests
  - Transformation tests
  - Null handling tests
  - Permission validation tests
- [ ] navigationSchemas.contracts.test.ts (12 tests)
  - Menu item validation
  - Route permission tests
  - Deep link validation
- [ ] roleTypes.contracts.test.ts (10 tests)
  - Role enum validation
  - Permission mapping tests
```

**GREEN Phase (Day 1)**
```typescript
// Implement to pass tests
- [ ] Fix rolePermission.schemas.ts
  - Add proper index signatures
  - Fix transformation schemas
  - Add return type annotations
- [ ] Create navigationSchemas.ts
  - Menu item schemas
  - Route permission schemas
- [ ] Create roleTypes.ts
  - Role enums and constants
```

### Agent 2: Service (role-services)
**RED Phase (Day 2)**
```typescript
// Write 47 tests first
- [ ] rolePermissionService.test.ts (20 tests)
  - CRUD operations
  - Permission checking
  - Resilient processing
  - Error handling
- [ ] roleNavigationService.test.ts (15 tests)
  - Menu generation
  - Route validation
  - Permission guards
- [ ] roleQueryService.test.ts (12 tests)
  - Query key management
  - Cache invalidation
```

**GREEN Phase (Day 2)**
```typescript
// Implement to pass tests
- [ ] Create src/services/role-based/rolePermissionService.ts
  - Move from wrong location
  - Add ValidationMonitor
  - Implement resilient processing
- [ ] Create src/services/role-based/roleNavigationService.ts
  - New implementation
  - Permission-based routing
- [ ] Create src/services/role-based/roleQueryService.ts
  - Centralized query management
```

### Agent 3: Hooks (role-hooks)
**RED Phase (Day 3)**
```typescript
// Write 60 tests first
- [ ] useUserRole.test.tsx (15 tests)
- [ ] useRolePermissions.test.tsx (15 tests)
- [ ] useRoleNavigation.test.tsx (10 tests)
- [ ] useRoleMenu.test.tsx (10 tests)
- [ ] useNavigationPermissions.test.tsx (10 tests)
```

**GREEN Phase (Day 3)**
```typescript
// Implement with centralized query keys
- [ ] Fix all hooks to use roleKeys factory
- [ ] Add proper error handling
- [ ] Implement optimistic updates
```

### Agent 4: Navigation (role-navigation)
**RED Phase (Day 4)**
```typescript
// Write 25 tests first
- [ ] RoleBasedStackNavigator.test.tsx (15 tests)
- [ ] NavigationGuards.test.tsx (10 tests)
```

**GREEN Phase (Day 4)**
```typescript
// Implement navigation infrastructure
- [ ] Create RoleBasedStackNavigator.tsx
- [ ] Implement permission guards
- [ ] Add deep linking support
```

### Agent 5: Screens (role-screens)
**RED Phase (Day 5-6)**
```typescript
// Write 80 tests first
- [ ] RoleDashboard.test.tsx (25 tests)
- [ ] RoleSelectionScreen.test.tsx (20 tests)
- [ ] PermissionManagementScreen.test.tsx (25 tests)
- [ ] RoleSettings.test.tsx (10 tests)
```

**GREEN Phase (Day 5-6)**
```typescript
// Fix existing screens
- [ ] Integrate with fixed hooks
- [ ] Add loading/error states
- [ ] Implement accessibility
```

### Agent 6: Components (role-components)
**RED Phase (Day 7)**
```typescript
// Write 40 tests first
- [ ] PermissionGate.test.tsx (10 tests)
- [ ] RoleIndicator.test.tsx (10 tests)
- [ ] AccessControlButton.test.tsx (10 tests)
- [ ] RoleBasedVisibility.test.tsx (10 tests)
```

**GREEN Phase (Day 7)**
```typescript
// Fix existing components
- [ ] Add TypeScript strict types
- [ ] Implement proper props validation
```

### Agent 7: Integration (role-integration)
**RED Phase (Day 8)**
```typescript
// Write 45 integration tests
- [ ] End-to-end role flow (25 tests)
- [ ] Cross-feature integration (20 tests)
```

**GREEN Phase (Day 8)**
```typescript
// Fix integration issues
- [ ] Ensure all layers work together
- [ ] Fix any remaining issues
```

## 🚀 Implementation Timeline

### Week 1: Foundation & Services
- **Day 1**: Schema agent (37 tests)
- **Day 2**: Service agent (47 tests)
- **Day 3**: Hooks agent (60 tests)
- **Day 4**: Navigation agent (25 tests)

### Week 2: UI & Integration
- **Day 5-6**: Screen agent (80 tests)
- **Day 7**: Component agent (40 tests)
- **Day 8**: Integration agent (45 tests)
- **Day 9**: REFACTOR phase
- **Day 10**: AUDIT phase

## 📝 Agent Prompt Templates

### Schema Agent Prompt
```markdown
You are implementing Phase 1 Role-Based schemas using TDD.

CRITICAL REQUIREMENTS:
1. Write ALL tests first (RED phase)
2. Tests must fail initially
3. Then implement minimal code to pass (GREEN phase)
4. Follow patterns from docs/architectural-patterns-and-best-practices.md
5. Use Zod validation patterns exactly as specified
6. Include ValidationMonitor integration

Your tasks:
1. Write 37 schema contract tests
2. Fix TypeScript compilation errors
3. Implement transformation schemas with return types
4. Ensure 100% pattern compliance

Test files to create:
- src/schemas/role-based/__contracts__/rolePermission.contracts.test.ts
- src/schemas/role-based/__contracts__/navigationSchemas.contracts.test.ts
- src/schemas/role-based/__contracts__/roleTypes.contracts.test.ts

Success criteria:
- All 37 tests pass
- Zero TypeScript errors
- Pattern compliance validated
```

### Service Agent Prompt
```markdown
You are implementing Phase 1 Role-Based services using TDD.

CRITICAL REQUIREMENTS:
1. Services MUST be in src/services/role-based/
2. Use resilient item processing pattern
3. Integrate ValidationMonitor for all operations
4. Follow direct Supabase pattern
5. Write tests FIRST

Your tasks:
1. Write 47 service tests
2. Move existing services to correct location
3. Create RoleNavigationService
4. Implement resilient processing

Dependencies:
- Schema agent must complete first
- Import schemas from src/schemas/role-based/

Success criteria:
- All 47 tests pass
- Services in correct location
- ValidationMonitor integrated
- Pattern compliance 100%
```

## 🎯 Success Metrics

### Phase Completion Criteria

**RED Phase Success**
- [ ] All 334 tests written
- [ ] All tests failing (expected)
- [ ] TypeScript compiles
- [ ] Test infrastructure ready

**GREEN Phase Success**
- [ ] All 334 tests passing
- [ ] Zero TypeScript errors
- [ ] All files in correct locations
- [ ] Pattern compliance verified

**REFACTOR Phase Success**
- [ ] Performance optimized
- [ ] Code quality improved
- [ ] No test regressions

**AUDIT Phase Success**
- [ ] 100% pattern compliance
- [ ] >90% code coverage
- [ ] Documentation complete
- [ ] Ready for production

## 🔧 Pre-Implementation Setup

Before launching agents, ensure:

1. **Create missing Jest configs**
```bash
cp jest.config.hooks.js jest.config.screens.js
cp jest.config.hooks.js jest.config.navigation.js
cp jest.config.integration.js jest.config.integration.role.js
```

2. **Create test data factories**
```typescript
// src/test/factories/role.factory.ts
export const createMockRole = () => {...}
export const createMockPermission = () => {...}
```

3. **Setup centralized query key factory**
```typescript
// src/hooks/queryKeys/roleKeys.ts
export const roleKeys = {
  all: () => ['roles'] as const,
  userRoles: () => [...roleKeys.all(), 'user'] as const,
  // ... etc
}
```

4. **Create ValidationMonitor stub**
```typescript
// src/services/monitoring/ValidationMonitor.ts
export class ValidationMonitor {
  static recordPatternSuccess() {}
  static recordValidationError() {}
}
```

## ⚡ Quick Start Commands

```bash
# 1. Setup infrastructure
npm run setup:phase1-tdd

# 2. Launch multi-agent workflow
docker-compose -f docker-compose-phase1-tdd.yml up

# 3. Monitor progress
watch "docker-compose -f docker-compose-phase1-tdd.yml ps"

# 4. View test results
docker-compose -f docker-compose-phase1-tdd.yml logs -f

# 5. Check overall progress
npm run test:phase1:all -- --listTests | wc -l
```

## 📊 Progress Tracking

| Agent | Tests Written | Tests Passing | Status |
|-------|--------------|---------------|---------|
| role-schema | 0/37 | 0/37 | Not Started |
| role-services | 0/47 | 0/47 | Not Started |
| role-hooks | 0/60 | 0/60 | Not Started |
| role-navigation | 0/25 | 0/25 | Not Started |
| role-screens | 0/80 | 0/80 | Not Started |
| role-components | 0/40 | 0/40 | Not Started |
| role-integration | 0/45 | 0/45 | Not Started |
| **TOTAL** | **0/334** | **0/334** | **0%** |

## ⚠️ Critical Rules

1. **NO implementation without failing tests**
2. **Each agent must reach 100% pass rate before next agent starts**
3. **Pattern compliance is mandatory**
4. **Services MUST be in role-based subdirectory**
5. **Use centralized query keys - NO dual systems**
6. **ValidationMonitor in every service operation**
7. **Resilient processing for batch operations**
8. **TypeScript strict mode - no 'any' types**

This TDD approach ensures Phase 1 is rebuilt correctly from the ground up with 100% test coverage and pattern compliance.