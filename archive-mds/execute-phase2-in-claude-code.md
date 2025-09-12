# Phase 2 Execution: Using Claude Code Directly (No API Key Needed!)

## 🎯 You're Already IN Claude Code!

Since you're using Claude Code directly, we don't need the SDK or API keys. You can execute Phase 2 right here!

## 📋 Execution Strategy

### Option 1: Sequential Execution (Recommended)
Execute each agent's tasks one by one in this Claude Code session:

```bash
# Agent 1: Core Services (8 files)
cd ../phase2-core-services
# Apply patterns to service tests

# Agent 2: Extension Services (6 files)  
cd ../phase2-extension-services
# Apply patterns to extension service tests

# Agent 3: Core Hooks (2 files)
cd ../phase2-core-hooks
# Apply patterns to core hook tests

# Agent 4: Extension Hooks (11 files)
cd ../phase2-extension-hooks
# Apply patterns to extension hook tests

# Agent 5: Schema/Other (6 files)
cd ../phase2-schema-other
# Apply patterns to schema and other tests
```

### Option 2: Parallel Execution with Multiple Claude Code Sessions
Open 5 Claude Code windows/tabs, each handling one agent's worktree.

## 🚀 Let's Start Phase 2 Execution NOW!

I can begin fixing the test files immediately. Here's the order I recommend:

### Priority 1: Extension Hooks (CRITICAL - 0% defensive imports)
**11 files** that completely lack defensive imports:
- `../phase2-extension-hooks`
- Will add defensive imports, React Query mocks, Query Key Factory

### Priority 2: Core Services (HIGH - 50% mocks missing)
**8 files** needing SimplifiedSupabaseMock:
- `../phase2-core-services`
- Will add mocks and factory patterns

### Priority 3: Extension Services (MEDIUM)
**6 files** needing infrastructure:
- `../phase2-extension-services`

### Priority 4: Core Hooks (LOW - mostly complete)
**2 files** needing minor fixes:
- `../phase2-core-hooks`

### Priority 5: Schema/Other (AUDIT FIRST)
**6+ files** needing assessment:
- `../phase2-schema-other`

## 📝 Ready Prompts for Each Agent

### Agent 1: Core Services
```
Fix these 8 service test files to use SimplifiedSupabaseMock and Factory patterns:
- src/services/__tests__/authService.test.ts
- src/services/__tests__/cartService.test.ts
- src/services/__tests__/errorRecoveryService.test.ts
- src/services/__tests__/kioskOrderIntegration.test.ts
- src/services/__tests__/noShowHandlingService.test.ts
- src/services/__tests__/notificationService.test.ts
- src/services/__tests__/orderService.test.ts
- src/services/__tests__/paymentService.test.ts

Follow patterns from src/test/service-test-pattern (REFERENCE).md
```

### Agent 2: Extension Services
```
Fix these 6 extension service test files:
- src/services/executive/__tests__/phase4ComplianceAudit.test.ts
- src/services/executive/__tests__/predictiveAnalyticsService.test.ts
- src/services/executive/__tests__/strategicReportingService.golden.test.ts
- src/services/marketing/__tests__/campaignManagementIntegration.test.ts
- src/services/marketing/__tests__/contentWorkflowIntegration.test.ts
- src/services/role-based/__tests__/rolePermissionService.test.ts

Apply SimplifiedSupabaseMock and Factory patterns from src/test/service-test-pattern (REFERENCE).md
```

### Agent 3: Core Hooks
```
Fix these 2 hook test files:
- src/hooks/__tests__/useKiosk.test.tsx
- src/hooks/__tests__/simple.test.ts

Add React Query mocks and broadcast factory from src/test/hook-test-pattern-guide (REFERENCE).md
```

### Agent 4: Extension Hooks (MOST CRITICAL!)
```
Fix these 11 extension hook test files that need defensive imports:
- src/hooks/inventory/__tests__/useBulkOperations.test.tsx
- src/hooks/inventory/__tests__/useInventoryDashboard.test.tsx
- src/hooks/inventory/__tests__/useInventoryItems.test.tsx
- src/hooks/inventory/__tests__/useInventoryOperations.test.tsx
- src/hooks/inventory/__tests__/useStockMovements.test.tsx
- src/hooks/role-based/__tests__/rolePermission.integration.test.tsx
- src/hooks/role-based/__tests__/useNavigationPermissions.test.tsx
- src/hooks/role-based/__tests__/useRoleMenu.test.tsx
- src/hooks/role-based/__tests__/useRoleNavigation.test.tsx
- src/hooks/role-based/__tests__/useUserRole.test.tsx
- src/hooks/marketing/__tests__/campaignManagementIntegration.test.tsx

Add defensive imports, React Query mocks, Query Key Factory from src/test/hook-test-pattern-guide (REFERENCE).md
```

### Agent 5: Schema/Other
```
Audit and fix schema test files in:
- src/schemas/__tests__/
- src/schemas/__contracts__/

Apply patterns from src/test/schema-test-pattern (REFERENCE).md
```

## 🎬 Start Execution?

**I'm ready to begin Phase 2 RIGHT NOW in this Claude Code session!**

Should I:
1. **Start with the most critical** (Extension Hooks - 11 files)?
2. **Go in priority order** (Extension Hooks → Core Services → etc.)?
3. **Let you choose** which agent to run first?

Just say "Start Agent X" and I'll begin fixing those files immediately using the reference patterns!