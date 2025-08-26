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
