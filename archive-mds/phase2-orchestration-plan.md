# Phase 2: 100% Infrastructure Adoption - Multi-Agent Orchestration Plan

## Mission: Achieve 100% Test Infrastructure Pattern Compliance

### Reference Patterns (CANONICAL)
- **Service Tests**: `src/test/service-test-pattern (REFERENCE).md`
- **Hook Tests**: `src/test/hook-test-pattern-guide (REFERENCE).md`
- **Schema Tests**: `src/test/schema-test-pattern (REFERENCE).md`

## Current Gaps to 100% Adoption

### 📦 Service Tests (33 files total)
- **Need SimplifiedSupabaseMock**: 10 files
- **Need Factory/Reset Pattern**: 11 files
- **Need Proper Mock Order**: ~15 files

### 🪝 Hook Tests (36 files total)
- **Need Defensive Imports**: 10 files
- **Need React Query Mocks**: 6 files
- **Need Broadcast Factory Mocks**: ~20 files
- **Need Query Key Factory**: ~15 files

### 📋 Schema Tests (11 files)
- **Need Audit**: All files
- **Need Transform Pattern**: Unknown
- **Need Null Handling**: Unknown

### 🧩 Other Tests (93 files)
- Components, Screens, Utils, Integration
- **Need Full Audit**: All files

## Total Scope: 173 Test Files

## Docker Container Architecture

```yaml
version: '3.8'

services:
  orchestrator:
    image: claude-code-orchestrator
    volumes:
      - ./:/workspace
      - ./test-fixes-communication:/communication
    environment:
      - MAIN_BRANCH=main
      - TARGET_ADOPTION=100
    command: npm run orchestrate

  agent-core-services:
    image: claude-code-agent
    volumes:
      - ../test-fixes-core-services:/workspace
      - ./test-fixes-communication:/communication
    environment:
      - AGENT_ID=core-services
      - TASK_TYPE=service-infrastructure
      - FILES_COUNT=14

  agent-extension-services:
    image: claude-code-agent
    volumes:
      - ../test-fixes-extension-services:/workspace
      - ./test-fixes-communication:/communication
    environment:
      - AGENT_ID=extension-services
      - TASK_TYPE=service-infrastructure
      - FILES_COUNT=19

  agent-core-hooks:
    image: claude-code-agent
    volumes:
      - ../test-fixes-core-hooks:/workspace
      - ./test-fixes-communication:/communication
    environment:
      - AGENT_ID=core-hooks
      - TASK_TYPE=hook-infrastructure
      - FILES_COUNT=13

  agent-extension-hooks:
    image: claude-code-agent
    volumes:
      - ../test-fixes-extension-hooks:/workspace
      - ./test-fixes-communication:/communication
    environment:
      - AGENT_ID=extension-hooks
      - TASK_TYPE=hook-infrastructure
      - FILES_COUNT=23

  agent-schema-other:
    image: claude-code-agent
    volumes:
      - ../test-fixes-schema-other:/workspace
      - ./test-fixes-communication:/communication
    environment:
      - AGENT_ID=schema-other
      - TASK_TYPE=mixed-infrastructure
      - FILES_COUNT=104
```

## Communication Protocol

```
/test-fixes-communication/
├── tasks/
│   ├── core-services.json
│   ├── extension-services.json
│   ├── core-hooks.json
│   ├── extension-hooks.json
│   └── schema-other.json
├── progress/
│   └── {agent-id}/
│       ├── current.md
│       ├── completed.json
│       └── metrics.json
├── handoffs/
│   └── {agent-id}/
│       ├── ready-to-merge.flag
│       └── changes.patch
└── blockers/
    └── {agent-id}/
        └── issue.md
```

## Task Distribution (5 Parallel Agents)

### Agent 1: Core Services (14 files)
```json
{
  "agent": "core-services",
  "priority": "CRITICAL",
  "tasks": [
    {
      "pattern": "SimplifiedSupabaseMock",
      "files": ["authService", "cartService", "orderService", "paymentService", "productService", "realtimeService", "notificationService"],
      "reference": "service-test-pattern (REFERENCE).md#L25-95"
    },
    {
      "pattern": "Factory/Reset",
      "files": ["ALL"],
      "reference": "service-test-pattern (REFERENCE).md#L150-160"
    }
  ]
}
```

### Agent 2: Extension Services (19 files)
```json
{
  "agent": "extension-services",
  "priority": "HIGH",
  "tasks": [
    {
      "pattern": "SimplifiedSupabaseMock",
      "files": ["predictiveAnalyticsService", "phase4ComplianceAudit", "strategicReportingService.golden"],
      "reference": "service-test-pattern (REFERENCE).md#L25-95"
    },
    {
      "pattern": "Factory/Reset",
      "files": ["inventoryService", "stockMovementService", "rolePermissionService"],
      "reference": "service-test-pattern (REFERENCE).md#L150-160"
    }
  ]
}
```

### Agent 3: Core Hooks (13 files)
```json
{
  "agent": "core-hooks",
  "priority": "HIGH",
  "tasks": [
    {
      "pattern": "React Query Mock",
      "files": ["useKiosk"],
      "reference": "hook-test-pattern-guide (REFERENCE).md#L51-66"
    },
    {
      "pattern": "Broadcast Factory",
      "files": ["ALL"],
      "reference": "hook-test-pattern-guide (REFERENCE).md#L44-48"
    }
  ]
}
```

### Agent 4: Extension Hooks (23 files)
```json
{
  "agent": "extension-hooks",
  "priority": "CRITICAL",
  "tasks": [
    {
      "pattern": "Defensive Imports",
      "files": ["inventory/*", "marketing/*", "role-based/*"],
      "reference": "hook-test-pattern-guide (REFERENCE).md#L73-83"
    },
    {
      "pattern": "React Query Mock",
      "files": ["role-based/*"],
      "reference": "hook-test-pattern-guide (REFERENCE).md#L51-66"
    },
    {
      "pattern": "Query Key Factory",
      "files": ["ALL"],
      "reference": "hook-test-pattern-guide (REFERENCE).md#L27-42"
    }
  ]
}
```

### Agent 5: Schema & Other Tests (104 files)
```json
{
  "agent": "schema-other",
  "priority": "MEDIUM",
  "tasks": [
    {
      "type": "audit",
      "directories": ["schemas/__tests__", "schemas/__contracts__", "components", "screens", "utils"],
      "action": "identify-patterns"
    },
    {
      "type": "fix",
      "pattern": "Transform/Validation",
      "reference": "schema-test-pattern (REFERENCE).md"
    }
  ]
}
```

## Claude Code SDK Orchestration Script

```typescript
// orchestrate.ts
import { ClaudeCodeSDK } from '@anthropic/claude-code-sdk';
import { GitWorktree } from './utils/git-worktree';
import { TaskDistributor } from './utils/task-distributor';
import { ProgressMonitor } from './utils/progress-monitor';

class TestInfrastructureOrchestrator {
  private agents: Map<string, ClaudeCodeSDK>;
  private worktrees: Map<string, GitWorktree>;
  
  async orchestrate() {
    // Phase 1: Setup
    await this.setupWorktrees();
    await this.distributeInitialTasks();
    
    // Phase 2: Parallel Execution
    const results = await Promise.allSettled([
      this.runAgent('core-services'),
      this.runAgent('extension-services'),
      this.runAgent('core-hooks'),
      this.runAgent('extension-hooks'),
      this.runAgent('schema-other')
    ]);
    
    // Phase 3: Verification
    await this.runVerification();
    
    // Phase 4: Integration
    await this.mergeSuccessfulChanges();
  }
  
  private async runAgent(agentId: string) {
    const agent = this.agents.get(agentId);
    const tasks = await this.loadTasks(agentId);
    
    for (const task of tasks) {
      await agent.execute(`
        Apply the ${task.pattern} pattern from ${task.reference}
        to files: ${task.files.join(', ')}
        
        Ensure 100% compliance with the reference pattern.
        Run tests after each fix to verify no regressions.
      `);
      
      await this.updateProgress(agentId, task);
    }
  }
}
```

## Execution Phases

### Phase 1: Audit & Setup (30 min)
1. Create git worktrees for each agent
2. Run comprehensive infrastructure audit
3. Generate specific task lists per agent
4. Setup communication channels

### Phase 2: Parallel Fix (2-3 hours)
1. Each agent works on assigned files
2. Apply patterns from REFERENCE docs
3. Test after each fix
4. Report progress in real-time

### Phase 3: Verification (30 min)
1. Run infrastructure audit per agent
2. Execute test suites
3. Measure adoption percentages
4. Identify any remaining gaps

### Phase 4: Integration (30 min)
1. Merge changes from worktrees
2. Run full test suite
3. Generate final report
4. Cleanup worktrees

## Success Metrics

### Must Achieve (100% Adoption)
- [ ] All service tests use SimplifiedSupabaseMock
- [ ] All service tests use Factory/Reset pattern
- [ ] All hook tests have defensive imports
- [ ] All hook tests have React Query mocks
- [ ] All hook tests have Query Key Factory mocks
- [ ] All hook tests have Broadcast Factory mocks
- [ ] All schema tests follow transform pattern

### Expected Outcomes
- **Infrastructure Adoption**: 38% → 100%
- **Test Pass Rate**: 62% → 75-85%
- **Test Suite Stability**: No crashes from missing mocks
- **Pattern Compliance**: 100% reference pattern adherence

## Monitoring Dashboard

```bash
#!/bin/bash
# monitor-dashboard.sh

while true; do
  clear
  echo "📊 PHASE 2 INFRASTRUCTURE ADOPTION DASHBOARD"
  echo "============================================"
  
  for agent in core-services extension-services core-hooks extension-hooks schema-other; do
    echo ""
    echo "Agent: $agent"
    echo "Progress: $(cat /communication/progress/$agent/metrics.json | jq -r '.completion')"
    echo "Files Fixed: $(cat /communication/progress/$agent/metrics.json | jq -r '.files_fixed')"
    echo "Current: $(cat /communication/progress/$agent/current.md | head -1)"
  done
  
  echo ""
  echo "Overall Infrastructure Adoption:"
  ./phase2-infrastructure-audit.sh | grep "OVERALL"
  
  sleep 10
done
```

## Risk Mitigation

### Potential Issues & Solutions
1. **Merge Conflicts**: Use atomic file-level changes
2. **Test Regressions**: Run tests after each fix
3. **Pattern Violations**: Strict adherence to REFERENCE docs
4. **Agent Coordination**: File-based locking mechanism
5. **Incomplete Fixes**: Verification phase before merge

## Launch Command

```bash
# Start orchestration
docker-compose -f phase2-orchestration.yml up -d

# Monitor progress
./monitor-dashboard.sh

# Check individual agent logs
docker logs -f phase2_agent-core-services_1
```

## Post-Execution

### Verification Checklist
- [ ] Run full infrastructure audit
- [ ] All files show 100% pattern compliance
- [ ] Test suite passes without mock errors
- [ ] No regression in existing pass rates
- [ ] Documentation updated with results

### Next Steps
1. If pass rate < 85%: Identify implementation issues
2. Create Phase 3 plan for implementation fixes
3. Document patterns that worked best
4. Update REFERENCE docs if needed

## Conclusion

This orchestration plan will achieve 100% infrastructure adoption across all 173 test files through parallel execution of 5 specialized agents, each following the canonical patterns from the REFERENCE documents.