#!/bin/bash

# Fresh Start: Phase 1 Role-Based Foundation Implementation
# Following TDD approach from scratchpad task lists

set -e

echo "🚀 PHASE 1 FRESH START: Role-Based Foundation Implementation"
echo "============================================================="

# Phase 1 focuses on role-based foundation infrastructure
# Following src/scratchpads/scratchpad-product-management/PHASE_1_DETAILED_TASK_LIST.md

echo ""
echo "📋 Phase 1 Scope:"
echo "- Role-based authentication and permissions system" 
echo "- Core role services (inventory_staff, marketing_staff, executive, admin)"
echo "- Role-based navigation and UI components"
echo "- Permission-gated screen access"
echo ""

# Create git worktrees for parallel Phase 1 implementation
echo "🌳 Setting up git worktrees for Phase 1..."

# Phase 1 Core Implementation
git worktree add ../phase1-role-services main
git worktree add ../phase1-role-hooks main  
git worktree add ../phase1-role-navigation main

echo "  ✅ Created Phase 1 core worktrees"

# Phase 1 Extension Implementation  
git worktree add ../phase1-ext-role-screens main
git worktree add ../phase1-ext-permission-ui main
git worktree add ../phase1-ext-integration main

echo "  ✅ Created Phase 1 extension worktrees"

# Create communication directory
COMM_DIR="../phase1-implementation-communication"
mkdir -p "$COMM_DIR"/{progress,handoffs,blockers,status}

echo "  ✅ Created communication directory: $COMM_DIR"

echo ""
echo "🎯 Phase 1 Agents Setup:"
echo ""
echo "Agent 1: Role Services Implementation"  
echo "  Directory: ../phase1-role-services"
echo "  Scope: RolePermissionService, UserRoleService, schema contracts"
echo ""
echo "Agent 2: Role Hooks Implementation"
echo "  Directory: ../phase1-role-hooks"  
echo "  Scope: useUserRole, useRolePermissions, query key integration"
echo ""
echo "Agent 3: Role Navigation Implementation"
echo "  Directory: ../phase1-role-navigation"
echo "  Scope: Role-based navigation, route guards, menu generation"
echo ""
echo "Agent 4: Role Screens Implementation (Extension)"
echo "  Directory: ../phase1-ext-role-screens"
echo "  Scope: RoleDashboard, RoleSelection, PermissionManagement screens"
echo ""
echo "Agent 5: Permission UI Implementation (Extension)" 
echo "  Directory: ../phase1-ext-permission-ui"
echo "  Scope: Permission gates, role indicators, access control UI"
echo ""
echo "Agent 6: Integration & Testing (Extension)"
echo "  Directory: ../phase1-ext-integration"
echo "  Scope: End-to-end integration, cross-agent testing, validation"

echo ""
echo "📁 Communication Structure:"
echo "  Progress: $COMM_DIR/progress/"
echo "  Handoffs: $COMM_DIR/handoffs/"  
echo "  Blockers: $COMM_DIR/blockers/"
echo "  Status: $COMM_DIR/status/"

echo ""
echo "🧪 TDD Approach (Per Task List Requirements):"
echo "  1. RED: Write failing tests first"
echo "  2. GREEN: Implement minimal passing code"
echo "  3. REFACTOR: Improve code quality"  
echo "  4. AUDIT: Validate architectural compliance"

echo ""
echo "📋 Success Criteria (Phase 1):"
echo "  - 60+ tests minimum (schema, service, hook, integration)"
echo "  - 100% architectural pattern compliance"
echo "  - Role-based authentication working end-to-end"
echo "  - Permission system functional across all modules"
echo "  - Navigation adapts to user roles"
echo "  - Clean integration with existing core systems"

echo ""
echo "🔍 Monitoring:"
echo "  Run: ./monitor-phase1-agents.sh"
echo "  View: $COMM_DIR for real-time status"

echo ""
echo "✅ Phase 1 Fresh Start Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Generate agent prompts with task details"
echo "  2. Launch agents in parallel Claude Code tabs"  
echo "  3. Monitor progress and coordinate integration"
echo "  4. Validate Phase 1 completion before Phase 2"