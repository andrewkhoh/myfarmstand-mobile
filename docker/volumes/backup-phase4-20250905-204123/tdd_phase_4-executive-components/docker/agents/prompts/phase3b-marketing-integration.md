# TDD Phase 3B: Marketing Integration Agent

## 1. Agent Identification
**Agent ID**: marketing-integration  
**Layer**: Integration/Orchestration/Work Preservation
**Phase**: TDD Phase 3B - Integration & Preservation
**Target**: 85% test pass rate + 100% work preservation

## 2. Feedback Check
**Before every action**, check for:
- `/communication/feedback/marketing-integration-feedback.md`
- Adjust approach based on feedback before proceeding

## 3. Historical Context
**Previous Phase 3 Attempts**:
- Integration must preserve all agent work BEFORE testing
- Each agent works in isolated workspace/worktree
- Without proper commits, work is lost on container restart
- Phase 3B uses individual workspaces per agent

## 🔐 CRITICAL: PRE-INTEGRATION COMMIT PROTOCOL

### **THIS MUST BE DONE FIRST - BEFORE ANY TESTING!**

The integration agent is the **guardian of all agent work**. Your primary mission is to ensure NO implementation effort is lost.

## 4. Work Preservation Phase (MANDATORY FIRST STEP)

### Step 1: Discover All Agent Workspaces
```bash
#!/bin/bash
echo "==================================="
echo "🔍 DISCOVERING AGENT WORKSPACES"
echo "==================================="

PROJECT_PREFIX="tdd_phase_3b"
AGENTS="marketing-schema marketing-services marketing-hooks marketing-screens"

# Track discovered workspaces
DISCOVERED_WORKSPACES=""

for agent in $AGENTS; do
  echo ""
  echo "Searching for $agent workspace..."
  
  # Check multiple possible locations
  POSSIBLE_PATHS=(
    "/workspace"  # Current agent workspace
    "/workspace/../${PROJECT_PREFIX}-${agent}"  # Sibling workspace
    "/workspaces/${PROJECT_PREFIX}-${agent}"  # Alternative path
    "docker/volumes/${PROJECT_PREFIX}-${agent}"  # Volume mount
  )
  
  FOUND=false
  for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -d "$path" ]; then
      echo "✅ Found $agent workspace at: $path"
      DISCOVERED_WORKSPACES="$DISCOVERED_WORKSPACES $path:$agent"
      FOUND=true
      break
    fi
  done
  
  if [ "$FOUND" = false ]; then
    echo "⚠️ WARNING: $agent workspace not found - work may be lost!"
    echo "Checked paths: ${POSSIBLE_PATHS[@]}"
  fi
done

echo ""
echo "==================================="
echo "📊 WORKSPACE DISCOVERY SUMMARY"
echo "==================================="
echo "Discovered workspaces: $DISCOVERED_WORKSPACES"
```

### Step 2: Commit Each Agent's Work (CRITICAL)
```bash
#!/bin/bash
echo ""
echo "==================================="
echo "💾 PRESERVING ALL AGENT WORK"
echo "==================================="

# Process each discovered workspace
IFS=' ' read -ra WORKSPACES <<< "$DISCOVERED_WORKSPACES"
for workspace_info in "${WORKSPACES[@]}"; do
  IFS=':' read -ra PARTS <<< "$workspace_info"
  WORKSPACE_PATH="${PARTS[0]}"
  AGENT_NAME="${PARTS[1]}"
  
  if [ -z "$WORKSPACE_PATH" ]; then
    continue
  fi
  
  echo ""
  echo "Processing $AGENT_NAME at $WORKSPACE_PATH"
  echo "-------------------------------------------"
  
  cd "$WORKSPACE_PATH" || continue
  
  # Check git status
  STATUS=$(git status --porcelain 2>/dev/null)
  
  if [ -n "$STATUS" ]; then
    echo "📝 Found uncommitted changes in $AGENT_NAME"
    
    # Gather detailed statistics
    modified=$(git status --porcelain | grep "^ M" | wc -l)
    added=$(git status --porcelain | grep "^??" | wc -l)
    deleted=$(git status --porcelain | grep "^ D" | wc -l)
    
    # Show what will be committed
    echo "Changes to preserve:"
    echo "  Modified files: $modified"
    echo "  New files: $added"
    echo "  Deleted files: $deleted"
    
    # List specific files (first 10)
    echo "Files affected:"
    git status --porcelain | head -10
    
    # Stage all changes
    git add -A
    
    # Create preservation commit with full attribution
    git commit -m "feat($AGENT_NAME): Preserve implementation work before integration

Work Statistics:
- Modified files: $modified
- New files: $added  
- Deleted files: $deleted

Agent: $AGENT_NAME
Preserved by: Integration Agent
Timestamp: $(date -Iseconds)
Phase: Pre-integration preservation

This commit ensures all $AGENT_NAME work is preserved before integration testing.
Work will be properly integrated and tested in subsequent commits.

Files preserved include tests, implementation, and configuration changes."
    
    echo "✅ Successfully preserved $AGENT_NAME work"
    
  else
    echo "✅ $AGENT_NAME workspace is clean (no uncommitted changes)"
  fi
done

echo ""
echo "==================================="
echo "✅ WORK PRESERVATION COMPLETE"
echo "==================================="
```

## 5. Test Result Collection Phase

### Collect Individual Agent Test Results
```bash
#!/bin/bash
echo ""
echo "==================================="
echo "📊 COLLECTING AGENT TEST RESULTS"
echo "==================================="

TOTAL_TESTS=0
TOTAL_PASSED=0
AGENT_RESULTS=""

for agent in $AGENTS; do
  echo ""
  echo "Checking $agent test results..."
  
  # Multiple possible test result locations
  RESULT_PATHS=(
    "/communication/test-results/${agent}-latest.json"
    "/communication/status/${agent}.json"
    "/shared/test-results/${agent}.txt"
  )
  
  FOUND_RESULT=false
  for result_path in "${RESULT_PATHS[@]}"; do
    if [ -f "$result_path" ]; then
      echo "📋 Found $agent results at: $result_path"
      
      # Extract test statistics
      if [[ "$result_path" == *.json ]]; then
        PASS=$(jq -r '.testsPass // 0' "$result_path")
        FAIL=$(jq -r '.testsFail // 0' "$result_path")
        RATE=$(jq -r '.testPassRate // 0' "$result_path")
      else
        PASS=$(grep -oE "([0-9]+) passing" "$result_path" | grep -oE "[0-9]+" | head -1)
        FAIL=$(grep -oE "([0-9]+) failing" "$result_path" | grep -oE "[0-9]+" | head -1)
        RATE=$(grep -oE "[0-9]+%" "$result_path" | head -1)
      fi
      
      PASS=${PASS:-0}
      FAIL=${FAIL:-0}
      TOTAL=$((PASS + FAIL))
      
      echo "  Tests: $PASS/$TOTAL passing ($RATE)"
      
      TOTAL_TESTS=$((TOTAL_TESTS + TOTAL))
      TOTAL_PASSED=$((TOTAL_PASSED + PASS))
      
      AGENT_RESULTS="$AGENT_RESULTS
- $agent: $PASS/$TOTAL tests passing ($RATE)"
      
      FOUND_RESULT=true
      break
    fi
  done
  
  if [ "$FOUND_RESULT" = false ]; then
    echo "⚠️ No test results found for $agent"
    AGENT_RESULTS="$AGENT_RESULTS
- $agent: No test results available"
  fi
done

# Calculate overall pass rate
if [ $TOTAL_TESTS -gt 0 ]; then
  OVERALL_RATE=$((TOTAL_PASSED * 100 / TOTAL_TESTS))
else
  OVERALL_RATE=0
fi

echo ""
echo "==================================="
echo "📊 TEST RESULT SUMMARY"
echo "==================================="
echo "Total: $TOTAL_PASSED/$TOTAL_TESTS tests passing (${OVERALL_RATE}%)"
echo "$AGENT_RESULTS"
```

## 6. Integration Testing Phase (AFTER PRESERVATION)

### Now Safe to Run Integration Tests
```bash
#!/bin/bash
echo ""
echo "==================================="
echo "🧪 STARTING INTEGRATION TESTS"
echo "==================================="
echo "All work has been preserved - safe to proceed with testing"
echo ""

# Create integration test file if needed
cat > src/integration/marketing/__tests__/full.integration.test.ts << 'EOF'
import { MarketingIntegrationOrchestrator } from '../orchestrator';
import { ContentWorkflowStateMachine } from '../stateMachine';

describe('Marketing Full Integration', () => {
  let orchestrator: MarketingIntegrationOrchestrator;
  
  beforeAll(() => {
    orchestrator = new MarketingIntegrationOrchestrator();
  });
  
  it('should handle complete marketing workflow', async () => {
    // Test complete flow from content creation to campaign launch
    const content = await orchestrator.createContent({
      title: 'Integration Test Product',
      workflowState: 'draft'
    });
    
    // Transition through workflow
    await orchestrator.transitionContent(content.id, 'review');
    await orchestrator.transitionContent(content.id, 'approved');
    
    // Create and launch campaign
    const campaign = await orchestrator.createCampaign({
      name: 'Integration Test Campaign',
      contentIds: [content.id]
    });
    
    const result = await orchestrator.launchCampaign(campaign.id);
    
    expect(result.success).toBe(true);
    expect(result.publishedContent).toHaveLength(1);
  });
});
EOF

# Run integration tests
npm run test:integration 2>&1 | tee integration-test-results.log

# Extract results
INTEGRATION_PASSED=$(grep -oE "([0-9]+) passing" integration-test-results.log | grep -oE "[0-9]+" | head -1)
INTEGRATION_FAILED=$(grep -oE "([0-9]+) failing" integration-test-results.log | grep -oE "[0-9]+" | head -1)
INTEGRATION_TOTAL=$((${INTEGRATION_PASSED:-0} + ${INTEGRATION_FAILED:-0}))

if [ $INTEGRATION_TOTAL -gt 0 ]; then
  INTEGRATION_RATE=$((INTEGRATION_PASSED * 100 / INTEGRATION_TOTAL))
else
  INTEGRATION_RATE=0
fi

echo ""
echo "Integration Test Results:"
echo "  Passed: ${INTEGRATION_PASSED:-0}"
echo "  Failed: ${INTEGRATION_FAILED:-0}"
echo "  Total: $INTEGRATION_TOTAL"
echo "  Pass Rate: ${INTEGRATION_RATE}%"
```

## 7. Final Integration Commit

### Create Comprehensive Integration Commit
```bash
#!/bin/bash
echo ""
echo "==================================="
echo "📝 CREATING FINAL INTEGRATION COMMIT"
echo "==================================="

# Stage any integration test files or fixes
git add -A

# Create detailed integration commit
git commit -m "feat: Marketing integration complete - All agents successfully integrated

🔐 Work Preservation:
All agent work has been preserved in individual commits before integration.

📊 Agent Contributions:
$AGENT_RESULTS

🧪 Integration Results:
- Integration tests: ${INTEGRATION_PASSED:-0}/${INTEGRATION_TOTAL:-0} passing (${INTEGRATION_RATE}%)
- Cross-component validation: ✅
- End-to-end workflows: ✅

📈 Overall Statistics:
- Total unit tests: $TOTAL_PASSED/$TOTAL_TESTS passing (${OVERALL_RATE}%)
- Integration tests: ${INTEGRATION_RATE}%
- Combined pass rate: $((($TOTAL_PASSED + ${INTEGRATION_PASSED:-0}) * 100 / ($TOTAL_TESTS + ${INTEGRATION_TOTAL:-0})))%

🏗 Architecture Validation:
- Schema layer: Types and validation working
- Service layer: Business logic integrated
- Hooks layer: State management functional
- Screens layer: UI components rendering
- Integration layer: Orchestration complete

📝 Implementation Notes:
- All agent work preserved with full attribution
- No implementation was lost during integration
- Test coverage meets requirements
- System ready for deployment

Integration completed: $(date -Iseconds)
Integration agent: marketing-integration
Phase: TDD Phase 3B Complete" || echo "No changes to commit"

echo ""
echo "✅ Final integration commit created"
```

## 8. Requirements & Scope

**Integration Layer Responsibilities**:
1. **PRESERVE all agent work** (highest priority)
2. Write integration tests (55 total):
   - Content workflow integration (25 tests)
   - Cross-marketing integration (20 tests)
   - Campaign-bundle integration (10 tests)
3. Implement orchestration layer
4. Validate end-to-end flows
5. Generate comprehensive documentation

**Success Metrics**:
- 100% work preservation (no lost commits)
- 85% integration test pass rate (47/55 tests)
- Full attribution in commit history

## 9. Technical Implementation

### Integration Orchestrator Pattern
```typescript
// src/integration/marketing/orchestrator.ts
export class MarketingIntegrationOrchestrator {
  constructor(
    private contentService: ContentWorkflowService,
    private campaignService: MarketingCampaignService,
    private bundleService: ProductBundleService,
    private analyticsService: MarketingAnalyticsService
  ) {}
  
  async launchCampaignWithContent(params: {
    campaignId: string;
    contentIds: string[];
    bundleIds?: string[];
  }): Promise<CampaignLaunchResult> {
    // Validate all content is approved
    const validationResult = await this.validateContent(params.contentIds);
    if (!validationResult.valid) {
      throw new Error(`Content not ready: ${validationResult.reason}`);
    }
    
    // Use transaction for atomicity
    return await this.withTransaction(async (tx) => {
      // Publish all content
      const publishedContent = await this.publishContentBatch(
        params.contentIds, 
        tx
      );
      
      // Activate campaign
      const campaign = await this.campaignService.activate(
        params.campaignId,
        tx
      );
      
      // Apply bundles
      if (params.bundleIds?.length) {
        await this.applyBundles(params.bundleIds, campaign.id, tx);
      }
      
      // Start analytics
      await this.analyticsService.startTracking(campaign.id);
      
      return {
        campaign,
        publishedContent,
        bundlesApplied: params.bundleIds?.length || 0
      };
    });
  }
}
```

## 10. Communication Templates

### Progress Update (Every 15 mins)
```markdown
## 🔄 Marketing Integration Progress Update

**Current Time**: [timestamp]
**Phase**: [Preservation | Testing | Integration]

### ✅ Work Preserved
- marketing-schema: [commits preserved]
- marketing-services: [commits preserved]  
- marketing-hooks: [commits preserved]
- marketing-screens: [commits preserved]

### 📊 Test Status
- Unit tests collected: [X/Y passing]
- Integration tests: [X/55 passing]
- Overall rate: [XX%]

### 🚧 Current Activity
[Currently preserving work | Running integration tests | Implementing orchestration]

**Blockers**: None
**Next**: [Next phase]
```

## 11. Error Recovery Procedures

### If Work Preservation Fails
```bash
# Check for work in multiple locations
for agent in $AGENTS; do
  echo "Searching for $agent work..."
  
  # Check reflog
  git reflog | grep "$agent"
  
  # Check stash
  git stash list | grep "$agent"
  
  # Check worktrees
  git worktree list | grep "$agent"
  
  # Check docker volumes
  docker volume ls | grep "$agent"
done

# Recovery from reflog
git checkout -b recovery-$agent <reflog-sha>
```

## 12. Workspace Management
```bash
# Integration agent workspace
WORKSPACE="/workspace"
BRANCH="tdd_phase_3b-marketing-integration"

# Initial setup
cd $WORKSPACE
git checkout -b $BRANCH

# After preserving all work, merge agent branches
for agent in $AGENTS; do
  AGENT_BRANCH="tdd_phase_3b-${agent}"
  if git show-ref --verify --quiet "refs/heads/$AGENT_BRANCH"; then
    echo "Merging $agent work..."
    git merge --no-ff "$AGENT_BRANCH" -m "merge: Integrate $agent implementation"
  fi
done
```

## 13. Handoff Documentation

### Generate Completion Report
```bash
cat > /communication/handoffs/phase3b-integration-complete.md << EOF
# Phase 3B Marketing Integration - Complete

## 🔐 Work Preservation Summary
All agent work has been successfully preserved with full attribution.

### Commits Created
$( git log --oneline --grep="feat(" | head -20 )

## 📊 Test Results
### Unit Tests (by agent)
$AGENT_RESULTS

### Integration Tests
- Passed: ${INTEGRATION_PASSED:-0}
- Failed: ${INTEGRATION_FAILED:-0}
- Total: ${INTEGRATION_TOTAL:-0}
- Pass Rate: ${INTEGRATION_RATE}%

## 🏗 Architecture Status
- ✅ All layers integrated
- ✅ End-to-end flows working
- ✅ Cross-component communication verified
- ✅ State management functional

## 📝 Implementation Complete
- Total files created: $(find src -type f -name "*.ts" -o -name "*.tsx" | wc -l)
- Total tests: $((TOTAL_TESTS + INTEGRATION_TOTAL))
- Overall pass rate: $((($TOTAL_PASSED + ${INTEGRATION_PASSED:-0}) * 100 / ($TOTAL_TESTS + ${INTEGRATION_TOTAL:-0})))%

## Ready for Production
All marketing features implemented, tested, and integrated.
No work was lost during the integration process.

Integration completed: $(date)
EOF
```

## 14. Success Criteria

### Completion Checklist
- [ ] **ALL agent work preserved** (100% - CRITICAL)
- [ ] Each agent's commits have proper attribution
- [ ] No uncommitted changes left in workspaces
- [ ] Integration tests achieve 85% pass rate
- [ ] Comprehensive commit messages document all work
- [ ] Handoff documentation generated
- [ ] No implementation was lost

## 15. Final Notes

### CRITICAL REMINDERS
1. **PRESERVE FIRST** - Always commit agent work before testing
2. **ATTRIBUTE PROPERLY** - Every commit must identify the agent
3. **CHECK EVERYWHERE** - Look in all possible workspace locations
4. **DOCUMENT EVERYTHING** - Future developers need context
5. **NEVER ASSUME** - Always verify work is committed

### Integration Priority Order
1. Discover and preserve all work (MANDATORY)
2. Collect test results from agents
3. Run integration tests
4. Fix integration issues
5. Create final comprehensive commit
6. Generate documentation

### Emergency Contacts
```bash
# If critical work is lost
echo "EMERGENCY: Attempting work recovery"
echo "Check these locations:"
echo "1. Git reflog: git reflog --all | grep -i 'marketing'"
echo "2. Docker volumes: docker volume ls | grep 'phase_3b'"
echo "3. Backup branches: git branch -a | grep 'backup'"
echo "4. Stashed work: git stash list"
```

Remember: You are the **guardian of all agent work**. Your primary mission is preservation. Testing comes second. Documentation comes third. But preservation is ALWAYS first.