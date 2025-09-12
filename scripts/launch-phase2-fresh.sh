#!/bin/bash

# Phase 2 Launch Script - Fresh start for 100% infrastructure adoption
# Uses new worktrees to avoid conflicts with Phase 1

echo "🚀 PHASE 2: 100% INFRASTRUCTURE ADOPTION LAUNCHER"
echo "================================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check for Docker (optional for now)
if command -v docker &> /dev/null; then
    echo "✓ Docker is installed (optional)"
else
    echo "⚠ Docker not found (continuing without containerization)"
fi

# Setup fresh worktrees for Phase 2
echo ""
echo "Setting up Phase 2 worktrees..."
if [ -f "./scripts/setup-phase2-worktrees.sh" ]; then
    chmod +x ./scripts/setup-phase2-worktrees.sh
    ./scripts/setup-phase2-worktrees.sh
else
    echo "❌ Worktree setup script not found!"
    exit 1
fi

# Create communication directory structure
echo ""
echo "Setting up communication channels..."
COMM_DIR="test-fixes-communication"
mkdir -p "$COMM_DIR"/{tasks,progress,handoffs,blockers}

# Phase 2 specific agents
agents=("phase2-core-services" "phase2-extension-services" "phase2-core-hooks" "phase2-extension-hooks" "phase2-schema-other")

for agent in "${agents[@]}"; do
    mkdir -p "$COMM_DIR/progress/$agent"
    mkdir -p "$COMM_DIR/handoffs/$agent"
    mkdir -p "$COMM_DIR/blockers/$agent"
done

# Generate task lists based on current gaps
echo ""
echo "Analyzing current infrastructure gaps..."

cat > "$COMM_DIR/generate-phase2-tasks.sh" << 'EOF'
#!/bin/bash

COMM_DIR="./test-fixes-communication"

# Core Services Task List
cat > "$COMM_DIR/tasks/phase2-core-services.json" << 'TASKS'
{
  "agent_id": "phase2-core-services",
  "reference": "src/test/service-test-pattern (REFERENCE).md",
  "files_to_fix": [
    "src/services/__tests__/authService.test.ts",
    "src/services/__tests__/cartService.test.ts",
    "src/services/__tests__/errorRecoveryService.test.ts",
    "src/services/__tests__/kioskOrderIntegration.test.ts",
    "src/services/__tests__/noShowHandlingService.test.ts",
    "src/services/__tests__/notificationService.test.ts",
    "src/services/__tests__/orderService.test.ts"
  ],
  "patterns_to_apply": [
    "SimplifiedSupabaseMock",
    "Factory/Reset pattern",
    "Proper mock order"
  ]
}
TASKS

# Extension Services Task List  
cat > "$COMM_DIR/tasks/phase2-extension-services.json" << 'TASKS'
{
  "agent_id": "phase2-extension-services",
  "reference": "src/test/service-test-pattern (REFERENCE).md",
  "files_to_fix": [
    "src/services/executive/__tests__/phase4ComplianceAudit.test.ts",
    "src/services/executive/__tests__/predictiveAnalyticsService.test.ts",
    "src/services/executive/__tests__/strategicReportingService.golden.test.ts",
    "src/services/marketing/__tests__/campaignManagementIntegration.test.ts",
    "src/services/role-based/__tests__/rolePermissionService.test.ts"
  ],
  "patterns_to_apply": [
    "SimplifiedSupabaseMock",
    "Factory/Reset pattern"
  ]
}
TASKS

# Core Hooks Task List
cat > "$COMM_DIR/tasks/phase2-core-hooks.json" << 'TASKS'
{
  "agent_id": "phase2-core-hooks",
  "reference": "src/test/hook-test-pattern-guide (REFERENCE).md",
  "files_to_fix": [
    "src/hooks/__tests__/useKiosk.test.tsx"
  ],
  "patterns_to_apply": [
    "React Query Mock",
    "Broadcast Factory Mock",
    "Query Key Factory Mock"
  ]
}
TASKS

# Extension Hooks Task List
cat > "$COMM_DIR/tasks/phase2-extension-hooks.json" << 'TASKS'
{
  "agent_id": "phase2-extension-hooks",
  "reference": "src/test/hook-test-pattern-guide (REFERENCE).md",
  "files_to_fix": [
    "src/hooks/inventory/__tests__/useBulkOperations.test.tsx",
    "src/hooks/inventory/__tests__/useInventoryDashboard.test.tsx",
    "src/hooks/inventory/__tests__/useInventoryItems.test.tsx",
    "src/hooks/inventory/__tests__/useInventoryOperations.test.tsx",
    "src/hooks/inventory/__tests__/useStockMovements.test.tsx",
    "src/hooks/role-based/__tests__/rolePermission.integration.test.tsx",
    "src/hooks/role-based/__tests__/useNavigationPermissions.test.tsx",
    "src/hooks/role-based/__tests__/useRoleMenu.test.tsx",
    "src/hooks/role-based/__tests__/useRoleNavigation.test.tsx",
    "src/hooks/role-based/__tests__/useUserRole.test.tsx"
  ],
  "patterns_to_apply": [
    "Defensive Imports",
    "React Query Mock",
    "Query Key Factory Mock",
    "Broadcast Factory Mock"
  ]
}
TASKS

# Schema and Other Tests Task List
cat > "$COMM_DIR/tasks/phase2-schema-other.json" << 'TASKS'
{
  "agent_id": "phase2-schema-other",
  "reference": "src/test/schema-test-pattern (REFERENCE).md",
  "directories_to_audit": [
    "src/schemas/__tests__",
    "src/schemas/__contracts__",
    "src/components/__tests__",
    "src/screens/__tests__",
    "src/utils/__tests__"
  ],
  "action": "audit_then_fix",
  "patterns_to_apply": [
    "Transform validation pattern",
    "Null handling pattern",
    "Database-first validation"
  ]
}
TASKS

echo "✅ Task files generated"
EOF

chmod +x "$COMM_DIR/generate-phase2-tasks.sh"
"$COMM_DIR/generate-phase2-tasks.sh"

# Run baseline audit
echo ""
echo "Running baseline infrastructure audit..."
if [ -f "./phase2-infrastructure-audit.sh" ]; then
    ./phase2-infrastructure-audit.sh > "$COMM_DIR/baseline-audit.txt" 2>&1
    echo "Baseline audit saved"
    
    # Extract key metrics
    grep -E "OVERALL|SimplifiedSupabaseMock:|Defensive Imports:|React Query Mocks:" "$COMM_DIR/baseline-audit.txt" | tail -5
fi

# Create agent execution placeholder scripts
echo ""
echo "Creating agent instructions..."

for agent in "${agents[@]}"; do
    cat > "../$agent/PHASE2-INSTRUCTIONS.md" << 'INSTRUCTIONS'
# Phase 2: Infrastructure Adoption Instructions

## Your Mission
Achieve 100% infrastructure pattern adoption for your assigned test files.

## Reference Patterns
Check the reference document specified in your task file for the CANONICAL patterns to follow.

## Key Requirements
1. **DO NOT** modify implementation code, only test files
2. **FOLLOW** reference patterns exactly as shown
3. **TEST** after each file fix to ensure no regressions
4. **REPORT** progress to communication directory

## Pattern Checklist

### For Service Tests
- [ ] SimplifiedSupabaseMock imported and used
- [ ] Factory imports and resetAllFactories in beforeEach
- [ ] Proper mock order (mocks before imports)
- [ ] All service methods mocked

### For Hook Tests  
- [ ] Defensive imports at top of file
- [ ] React Query mock before other mocks
- [ ] Query Key Factory mock with all methods
- [ ] Broadcast Factory mock if needed
- [ ] useCurrentUser mock if auth is used

### For Schema Tests
- [ ] Transform validation pattern
- [ ] Null handling for all fields
- [ ] Database-first validation approach

## Completion Criteria
- 100% of assigned files have all required patterns
- All tests in assigned files pass or fail due to implementation (not infrastructure)
- No mock-related errors in test output
INSTRUCTIONS
done

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ PHASE 2 SETUP COMPLETE!"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📁 Worktrees Ready:"
for agent in "${agents[@]}"; do
    if [ -d "../$agent" ]; then
        echo "   ✓ $agent"
    fi
done
echo ""
echo "📋 Task Assignments:"
for agent in "${agents[@]}"; do
    if [ -f "$COMM_DIR/tasks/$agent.json" ]; then
        file_count=$(grep -c '"src/' "$COMM_DIR/tasks/$agent.json" 2>/dev/null || echo "0")
        echo "   • $agent: $file_count files to fix"
    fi
done
echo ""
echo "📊 Current Infrastructure Adoption:"
grep "OVERALL" "$COMM_DIR/baseline-audit.txt" 2>/dev/null || echo "   Run audit to see current state"
echo ""
echo "🚀 Next Steps:"
echo "   1. Launch agents to work in parallel on their assigned files"
echo "   2. Each agent should follow patterns from *(REFERENCE).md files"
echo "   3. Monitor progress with: ./scripts/monitor-phase2.sh"
echo ""
echo "📝 Agent Working Directories:"
for agent in "${agents[@]}"; do
    echo "   cd ../$agent  # Work on $agent tasks"
done
echo "═══════════════════════════════════════════════════════════════════"