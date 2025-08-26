# Agent 1: Phase 1 Navigation & Role UI Implementation

You are **Agent 1** for the Phase 1-2 TDD Implementation project.

## 🏠 Your Workspace
- **Working Directory**: `/Users/andrewkhoh/Documents/phase12-implementation-phase1-navigation-ui`
- **Communication Hub**: `/Users/andrewkhoh/Documents/phase12-implementation-communication/`
- **Branch**: `phase12-implementation-phase1-navigation-ui`

## 🎯 Your Mission
Build missing Phase 1 Extension UI components following TDD RED→GREEN→REFACTOR methodology.

## 📋 Your TDD Implementation Tasks

### Day 1: Navigation Infrastructure (RED → GREEN → REFACTOR)

#### Task 1.E1.2: Write Navigation Tests FIRST (RED Phase)
```bash
# Create these test files FIRST before implementation
- [ ] Create src/navigation/__tests__/RoleBasedStackNavigator.test.tsx (15+ tests)
- [ ] Test dynamic menu generation based on user role
- [ ] Test navigation permission enforcement
- [ ] Test role switching navigation updates
- [ ] Test deep-linking with role permissions
```

#### Task 1.E1.4: Implement Navigation (GREEN Phase)
```bash
# Only after tests are RED, implement:
- [ ] Create src/navigation/RoleBasedStackNavigator.tsx
- [ ] Implement dynamic screen registration based on permissions
- [ ] Add role context provider for navigation
- [ ] Implement permission-aware screen components
- [ ] Add navigation guards for protected routes
```

#### Task 1.E1.5: Implement Role Navigation Service
```bash
- [ ] Create src/services/role-based/roleNavigationService.ts
- [ ] Implement menu generation logic with permissions
- [ ] Add navigation permission validation
- [ ] Integrate ValidationMonitor for tracking
```

### Day 2: Role Dashboard Screens (RED → GREEN → REFACTOR)

#### Task 1.E2.2: Write Screen Tests FIRST (RED Phase)
```bash
# Create these test files FIRST
- [ ] Create src/screens/role-based/__tests__/RoleDashboard.test.tsx (20+ tests)
- [ ] Create src/screens/role-based/__tests__/RoleSelectionScreen.test.tsx (12+ tests)
- [ ] Create src/screens/role-based/__tests__/PermissionManagementScreen.test.tsx (15+ tests)
```

#### Task 1.E2.5-7: Implement Screens (GREEN Phase)
```bash
# Only after tests are RED, implement:
- [ ] Create src/screens/role-based/RoleDashboard.tsx
- [ ] Create src/screens/role-based/RoleSelectionScreen.tsx
- [ ] Create src/screens/role-based/PermissionManagementScreen.tsx
- [ ] Integrate with useUserRole() hook
- [ ] Add real-time updates via useRealtime()
- [ ] Implement error boundaries and loading states
```

## 🔗 Dependencies You Need
**WAIT FOR THESE HANDOFFS:**
1. `query-keys-ready` from Agent 3 (Query Key Migration)
2. `test-infra-patterns` from Agent 4 (Test Infrastructure)
3. `navigation-schemas` from Agent 5 (Schema Contracts)

## 📦 What You Provide
**YOUR DELIVERABLES:**
1. `navigation-components` - RoleBasedStackNavigator and related
2. `role-screens` - All role management UI screens

## 📡 Communication Protocol

### Every 30 Minutes - Progress Update
```bash
echo "$(date): [Your Status Here]" >> ../phase12-implementation-communication/progress/phase1-navigation-ui.md
```

### Check for Dependencies (Hourly)
```bash
ls -la ../phase12-implementation-communication/handoffs/
# Look for: query-keys-ready.md, test-infra-patterns.md, navigation-schemas.md
```

### Report Blockers (When Needed)
```bash
cat > ../phase12-implementation-communication/blockers/CRITICAL-navigation-ui-$(date +%s).md << EOF
# CRITICAL BLOCKER
**Agent**: phase1-navigation-ui
**Issue**: [Describe the issue]
**Impact**: Cannot proceed with [specific task]
**Needs From**: [Which agent/resource]
EOF
```

### Signal Completion
```bash
# When navigation components ready:
echo "navigation-components ready" > ../phase12-implementation-communication/handoffs/navigation-components.md

# When screens ready:
echo "role-screens ready" > ../phase12-implementation-communication/handoffs/role-screens.md
```

## ✅ Success Criteria
- [ ] 72+ tests written and passing
- [ ] All components use centralized query keys (NO local keys!)
- [ ] ValidationMonitor integrated throughout
- [ ] Real-time updates working
- [ ] Performance <200ms for all queries
- [ ] All TDD cycles complete (RED→GREEN→REFACTOR)

## 🚦 Quality Checklist
- [ ] No dual query key systems
- [ ] Defensive imports in all test files
- [ ] SimplifiedSupabaseMock pattern used
- [ ] Proper TypeScript typing throughout
- [ ] Error boundaries implemented
- [ ] Loading states handled gracefully

## 🛠 Your Workflow

### Step 1: Check Dependencies
```bash
# First, check if your dependencies are ready
ls -la ../phase12-implementation-communication/handoffs/
```

### Step 2: Start TDD Cycle
```bash
# 1. Write failing tests (RED)
npm run test:navigation -- --watch

# 2. Implement minimum code (GREEN)
# Write just enough to pass

# 3. Refactor (REFACTOR)
# Optimize and apply patterns

# 4. Commit on GREEN
git add -A && git commit -m "feat(phase1): navigation tests passing - TDD GREEN"
```

### Step 3: Update Progress
```bash
# Update your progress file
echo "## $(date '+%Y-%m-%d %H:%M')
- ✅ Completed: RoleBasedStackNavigator tests (15/15)
- 🔄 In Progress: Implementing navigator component
- ⏳ Next: Role dashboard screens
Tests: 15/72 passing" >> ../phase12-implementation-communication/progress/phase1-navigation-ui.md
```

## 📊 Monitoring
Check the task board regularly:
```bash
cat ../phase12-implementation-communication/task-board.md
```

## 🎯 Start Here
1. Check communication hub: `ls -la ../phase12-implementation-communication/`
2. Review task board: `cat ../phase12-implementation-communication/task-board.md`
3. Check for ready dependencies in handoffs/
4. Begin with navigation tests (RED phase)

Remember: **Write tests FIRST, then implement!** Follow TDD strictly.

Good luck, Agent 1! 🚀