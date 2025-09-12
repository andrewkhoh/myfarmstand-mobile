#!/bin/bash
# One-command launch for Phase 1 Containerized Multi-Agent Workflow

set -euo pipefail

PROJECT_NAME="phase1-role-foundation"
MAIN_REPO="/Users/andrewkhoh/Documents/myfarmstand-mobile"
BASE_BRANCH="main"

echo "🚀 Launching Phase 1 Multi-Agent Workflow (Single Command)"
echo "==========================================================="
echo ""

# Step 1: Environment Setup
echo "📁 Step 1: Setting up environment..."
echo "─────────────────────────────────────"

# Create directory structure
mkdir -p docker/{agents,monitoring,volumes/communication/{progress,blockers,handoffs,contracts,snapshots}}
mkdir -p scripts docker/agents/prompts

echo "  ✅ Created Docker directory structure"

# Define Phase 1 agent configuration
# Using space-separated list instead of associative array for compatibility
AGENTS="role-services role-hooks role-navigation role-screens permission-ui integration"
AGENT_TYPES="foundation foundation foundation extension extension integration"

# Create git worktrees for each agent
echo ""
echo "🌳 Setting up git worktrees for Phase 1 agents..."
for agent in $AGENTS; do
    WORKSPACE="${PROJECT_NAME}-${agent}"
    BRANCH="${PROJECT_NAME}-${agent}"
    WORKTREE_PATH="docker/volumes/${WORKSPACE}"
    
    # Check if worktree already exists
    if [ -d "$WORKTREE_PATH/.git" ]; then
        echo "  ℹ️  Worktree already exists for ${agent}, keeping it"
        continue
    fi
    
    # Remove broken worktree reference if present
    git worktree remove $WORKTREE_PATH --force 2>/dev/null || true
    
    # Check if branch already exists
    if git show-ref --verify --quiet refs/heads/$BRANCH; then
        echo "  ℹ️  Branch $BRANCH exists, creating worktree with existing branch"
        cd $MAIN_REPO
        git worktree add $WORKTREE_PATH $BRANCH
    else
        echo "  ✅ Creating new branch and worktree for ${agent}"
        cd $MAIN_REPO
        git worktree add $WORKTREE_PATH -b $BRANCH $BASE_BRANCH
    fi
    
    echo "  ✅ Workspace ready for ${agent}"
done

cd $MAIN_REPO

# Step 2: Prepare prompts and scripts
echo ""
echo "📝 Step 2: Preparing agent prompts..."
echo "─────────────────────────────────────"

# Check for DEBUG mode
if [[ "${DEBUG:-}" == "true" ]]; then
    echo "  🔍 DEBUG MODE ENABLED - Using safe debugging prompts"
    echo "  ⚠️  Agents will only analyze and report, not modify code"
    
    # Create safe debug prompts for all agents
    mkdir -p docker/agents/prompts
    for agent in $AGENTS; do
        cat > "docker/agents/prompts/${agent}-agent.md" << 'EOF'
# DEBUG MODE - Safe Analysis Only

## 🔍 This is a DEBUG prompt for testing the multi-agent infrastructure

You are running in DEBUG mode. Your task is to:

1. **Analyze the current codebase structure**
   - List the main directories
   - Count TypeScript/JavaScript files
   - Identify test files

2. **Report your findings**
   - Write a summary to `/shared/progress/${AGENT_NAME}.md`
   - Create a status update in `/shared/status/${AGENT_NAME}.json`

3. **DO NOT modify any code files**
   - Only read and analyze
   - Only write to /shared/ directory
   - This is for testing the infrastructure

4. **Test the logging system**
   - Log your progress every 30 seconds
   - Update your heartbeat
   - Test the monitoring pipeline

## Example safe operations:
```bash
# Count files
find . -name "*.ts" -o -name "*.tsx" | wc -l

# Analyze structure  
ls -la src/

# Write progress
echo "$(date): Analyzed codebase structure" >> /shared/progress/${AGENT_NAME}.md

# Update status
echo '{"status":"analyzing","progress":50}' > /shared/status/${AGENT_NAME}.json
```

Remember: This is DEBUG mode. Do NOT modify any source code.
Your purpose is to verify the multi-agent infrastructure is working.

After 5 minutes, write "DEBUG TEST COMPLETE" to your progress file and exit.
EOF
        echo "  ✅ Created debug prompt for ${agent}"
    done
    
elif [ -f "scripts/generate-phase1-prompts.sh" ]; then
    # Normal mode - generate real prompts
    chmod +x scripts/generate-phase1-prompts.sh
    echo "  🔄 Generating agent prompts for Phase 1 implementation..."
    
    # Run the prompt generator
    if ./scripts/generate-phase1-prompts.sh; then
        echo "  ✅ Agent prompts generated successfully"
    else
        echo "  ⚠️  Prompt generation had warnings but continued"
    fi
    
    # Verify prompts were created
    if [ -f "docker/agents/prompts/role-services-agent.md" ]; then
        echo "  ✅ Verified: Prompts are ready"
    else
        echo "  ❌ ERROR: Prompts were not created properly"
        exit 1
    fi
else
    echo "  ❌ ERROR: Prompt generation script not found"
    echo "     Expected: scripts/generate-phase1-prompts.sh"
    exit 1
fi

# Step 3: Initialize communication hub
echo ""
echo "📋 Step 3: Initializing communication hub..."
echo "─────────────────────────────────────────────"

COMM_DIR="docker/volumes/communication"

cat > ${COMM_DIR}/task-board.md << 'EOF'
# 📋 Phase 1 Containerized Task Board

Last Updated: $(date)

## 🎯 Phase 1 Scope: Role-Based Foundation

### Foundation Agents (Parallel Execution)
- [ ] Role Services - Container: role-services-agent
  - RolePermissionService, UserRoleService
  - Schema contracts and validation
  - 20+ service tests

- [ ] Role Hooks - Container: role-hooks-agent
  - useUserRole, useRolePermissions
  - Query key integration
  - 15+ hook tests

- [ ] Role Navigation - Container: role-navigation-agent
  - Dynamic navigation based on roles
  - Route guards and menu generation
  - 15+ navigation tests

### Extension Agents (Depends on Foundation)
- [ ] Role Screens - Container: role-screens-agent
  - RoleDashboard, RoleSelection screens
  - PermissionManagement interface
  - 20+ screen tests

- [ ] Permission UI - Container: permission-ui-agent
  - Permission gates and indicators
  - Access control UI components
  - 10+ UI component tests

### Integration & Cleanup
- [ ] Integration Agent - Container: integration-agent
  - End-to-end integration testing
  - Cross-agent validation
  - Final Phase 1 verification

## 🎯 Success Criteria
- 60+ tests minimum across all agents
- 100% architectural pattern compliance
- Role-based authentication working end-to-end
- Permission system functional across modules

## 🔒 Safety Status
- Blast Radius: ✅ Contained to containers
- Data Preservation: ✅ Volume mounts active
- Recovery Ready: ✅ Snapshots available
- Pattern Compliance: ✅ SimplifiedSupabaseMock enforced
EOF

echo "  ✅ Communication hub initialized"

# Step 4: Build and launch containers
echo ""
echo "🐳 Step 4: Building and launching containers..."
echo "───────────────────────────────────────────────"

# Detect docker compose command (docker-compose vs docker compose)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Error: Docker Compose is not installed!"
    echo "Please install Docker Desktop or Docker Compose standalone."
    echo "See: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "  ✅ Using Docker Compose command: $DOCKER_COMPOSE"

cd docker

# Check for --fresh flag or existing containers
if [[ "${1:-}" == "--fresh" ]] || [[ "${FRESH_START:-}" == "true" ]]; then
    echo "  🔄 Fresh start requested - stopping existing containers..."
    $DOCKER_COMPOSE -f docker-compose-phase1.yml down --timeout 30
    echo "  ✅ Existing containers removed"
else
    # Check if containers are already running
    RUNNING_CONTAINERS=$($DOCKER_COMPOSE -f docker-compose-phase1.yml ps -q 2>/dev/null | wc -l)
    if [ "$RUNNING_CONTAINERS" -gt 0 ]; then
        echo "  ℹ️  Found $RUNNING_CONTAINERS running containers"
        echo "  Choose an option:"
        echo "    1) Keep existing containers (update only if changed)"
        echo "    2) Recreate all containers (fresh start)"
        echo "    3) Stop and exit"
        read -p "  Enter choice [1-3]: " -n 1 -r CHOICE
        echo ""
        
        case "$CHOICE" in
            2)
                echo "  🔄 Stopping existing containers..."
                $DOCKER_COMPOSE -f docker-compose-phase1.yml down --timeout 30
                echo "  ✅ Existing containers removed"
                ;;
            3)
                echo "  ⛔ Exiting without changes"
                exit 0
                ;;
            *)
                echo "  ✅ Keeping existing containers"
                ;;
        esac
    fi
fi

# Build containers
echo "  🏗️  Building container images..."
if [[ "${FRESH_START:-}" == "true" ]]; then
    echo "  🔄 Fresh build requested - rebuilding without cache..."
    $DOCKER_COMPOSE -f docker-compose-phase1.yml build --no-cache
else
    $DOCKER_COMPOSE -f docker-compose-phase1.yml build
fi

# Start all containers (will recreate if needed)
echo "  🚀 Starting all agent containers..."
$DOCKER_COMPOSE -f docker-compose-phase1.yml up -d

# Wait for containers to initialize
echo "  ⏳ Waiting for containers to initialize (30 seconds)..."
sleep 30

# Check container status
echo ""
echo "  📊 Container Status:"
$DOCKER_COMPOSE -f docker-compose-phase1.yml ps

cd ..

# Step 4.5: Container startup info
echo ""
echo "ℹ️  Container Startup Mode:"
echo "───────────────────────────────────────────────────────────────"
echo "  Containers will auto-detect Claude Code availability:"
echo "  • If claude-code is installed → Run with real CLI"
echo "  • If not installed → Fall back to mock mode"
echo "  • Extension agents wait for real completion markers from foundation agents"

# Step 5: Start enhanced monitoring (backgrounded)
echo ""
echo "📊 Step 5: Starting enhanced monitoring systems..."
echo "────────────────────────────────────────────"

# Create necessary directories for monitoring
mkdir -p ${COMM_DIR}/{logs,status,alerts}

# Copy enhanced entrypoint to agents directory
if [ -f "docker/agents/entrypoint-enhanced.sh" ]; then
    echo "  ✅ Using enhanced entrypoint with progress capture"
    chmod +x docker/agents/entrypoint-enhanced.sh
fi

# Make monitoring scripts executable
chmod +x scripts/monitor-live-dashboard.sh 2>/dev/null || true
chmod +x scripts/monitor-alerts.sh 2>/dev/null || true
chmod +x scripts/aggregate-status.js 2>/dev/null || true

# Start live monitoring dashboard
if [ -f "scripts/monitor-live-dashboard.sh" ]; then
    scripts/monitor-live-dashboard.sh &
    MONITOR_PID=$!
    echo "  ✅ Live dashboard started (PID: $MONITOR_PID)"
else
    # Fallback to simple monitoring
    scripts/monitor-phase1-progress.sh &
    MONITOR_PID=$!
    echo "  ✅ Basic monitoring started (PID: $MONITOR_PID)"
fi

# Start alert monitoring
if [ -f "scripts/monitor-alerts.sh" ]; then
    scripts/monitor-alerts.sh &
    ALERT_PID=$!
    echo "  ✅ Alert system started (PID: $ALERT_PID)"
fi

# Start JSON status aggregator (if Node.js available)
if command -v node &> /dev/null && [ -f "scripts/aggregate-status.js" ]; then
    node scripts/aggregate-status.js &
    AGGREGATOR_PID=$!
    echo "  ✅ Status aggregator started (PID: $AGGREGATOR_PID)"
fi

echo "  ✅ Monitoring dashboard started (PID: $MONITOR_PID)"

# Step 6: Display final information
echo ""
echo "✅ Phase 1 Multi-Agent Workflow Successfully Launched!"
echo "══════════════════════════════════════════════════════"
echo ""
echo "🐳 Container Status:"
echo "  • 6 agent containers running with dangerous permissions"
echo "  • 1 monitoring container for orchestration"
echo "  • All prompts automatically injected"
echo ""
echo "📊 Enhanced Monitoring:"
echo "  • Live Dashboard: Running in terminal (updates every 10s)"
echo "  • Web Dashboard: http://localhost:3001"
echo "  • JSON Status: docker/volumes/communication/aggregate-status.json"
echo "  • Progress Files: docker/volumes/communication/progress/*.md"
echo "  • Agent Logs: docker/volumes/communication/logs/*.log"
echo "  • Alerts: docker/volumes/communication/alerts.log"
echo ""
echo "🔧 Management Commands:"
echo "  • View all logs: $DOCKER_COMPOSE -f docker/docker-compose-phase1.yml logs -f"
echo "  • View agent log: docker logs -f [agent-name]-agent"
echo "  • Check status: $DOCKER_COMPOSE -f docker/docker-compose-phase1.yml ps"
echo "  • View alerts: tail -f docker/volumes/communication/alerts.log"
echo "  • Stop all: ./scripts/stop-phase1-workflow.sh"
echo "  • Stop + backup: ./scripts/stop-phase1-workflow.sh --backup"
echo "  • Emergency restart: docker restart [agent-name]-agent"
echo ""
echo "📋 Agent Containers:"
if [[ "${DEBUG:-}" == "true" ]]; then
    echo "  🔍 DEBUG MODE - Agents will only analyze, not modify code"
    echo ""
fi
echo "  1. role-services-agent (Foundation)"
echo "  2. role-hooks-agent (Foundation)"
echo "  3. role-navigation-agent (Foundation)"
echo "  4. role-screens-agent (Extension - Waits for foundation)"
echo "  5. permission-ui-agent (Extension - Waits for foundation)"
echo "  6. integration-agent (Integration - Waits for all agents)"
echo ""
echo "⚠️  IMPORTANT:"
echo "  • Agents are using SimplifiedSupabaseMock pattern (enforced)"
echo "  • Real React Query for hooks (no mocking)"
echo "  • Architectural patterns from docs/architectural-patterns-and-best-practices.md"
echo "  • Foundation agents run in parallel"
echo "  • Extension agents wait for foundation completion"
echo "  • Integration agent validates everything at the end"
echo ""

# Optional: Wait for completion
if [[ "${1:-}" == "--wait" ]]; then
    echo "⏳ Waiting for workflow completion..."
    
    while [ ! -f "docker/volumes/communication/handoffs/phase1-complete.md" ]; do
        sleep 60
        echo "  Still waiting... ($(date '+%H:%M:%S'))"
    done
    
    echo "✅ Phase 1 workflow completed!"
    
    # Cleanup background process
    kill $MONITOR_PID 2>/dev/null || true
else
    echo "💡 Tip: Run with --wait flag to wait for completion"
    echo "   Example: ./launch-phase1-workflow.sh --wait"
fi

echo ""
echo "🎯 Agents are now working autonomously on Phase 1 implementation!"