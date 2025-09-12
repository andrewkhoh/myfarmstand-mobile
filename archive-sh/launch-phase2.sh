#!/bin/bash

# Phase 2 Inventory Operations Launch Script
# Following Phase 1 patterns and authentication guidelines

set -e

echo "🚀 TDD Phase 2: Inventory Operations - Multi-Agent System"
echo "========================================================"

# Configuration
BASE_DIR=$(pwd)
PROJECT_NAME="tdd-phase-2"
COMMUNICATION_VOLUME="${BASE_DIR}/docker/volumes/communication"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Phase 2 agents
PHASE2_AGENTS=(
    "inventory-schema"
    "inventory-services"  
    "inventory-hooks"
    "inventory-screens"
    "inventory-integration"
)

# Step 1: Setup communication volumes
echo -e "${BLUE}📁 Setting up communication structure...${NC}"
mkdir -p "${COMMUNICATION_VOLUME}"/{logs,status,handoffs,blockers,progress,feedback,test-results,restart_counters}

# Initialize status files
echo -e "${BLUE}📝 Initializing status files...${NC}"
for agent in "${PHASE2_AGENTS[@]}"; do
    cat > "${COMMUNICATION_VOLUME}/status/${agent}.json" <<EOF
{
  "agent": "${agent}",
  "status": "pending",
  "phase": "Phase 2",
  "cycles": 0,
  "maxRestarts": 5,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "filesModified": [],
  "testsPass": 0,
  "testsFail": 0,
  "testPassRate": 0,
  "errors": [],
  "workSummary": null
}
EOF
done

# Step 2: Setup git worktrees
echo -e "${BLUE}🌳 Setting up git worktrees...${NC}"

for agent in "${PHASE2_AGENTS[@]}"; do
    WORKSPACE="${PROJECT_NAME}-${agent}"
    BRANCH="${PROJECT_NAME}-${agent}"
    WORKTREE_PATH="docker/volumes/${WORKSPACE}"
    
    # Check if worktree already exists
    if [ -d "$WORKTREE_PATH/.git" ]; then
        echo -e "${GREEN}  ℹ️  Worktree already exists for ${agent}, keeping it${NC}"
        continue
    fi
    
    # Remove broken worktree reference if present
    git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
    
    # Check if branch already exists
    if git show-ref --verify --quiet refs/heads/$BRANCH; then
        echo -e "${GREEN}  ℹ️  Branch $BRANCH exists, creating worktree with existing branch${NC}"
        git worktree add "$WORKTREE_PATH" "$BRANCH"
    else
        echo -e "${GREEN}  ✅ Creating new branch and worktree for ${agent}${NC}"
        git worktree add "$WORKTREE_PATH" -b "$BRANCH" HEAD
    fi
    
    # Ensure npm dependencies are installed
    cd "$WORKTREE_PATH"
    echo "  Installing dependencies for ${agent}..."
    npm ci || npm install
    
    cd "$BASE_DIR"
done

# Step 3: Check for Claude authentication
echo -e "${BLUE}🔐 Checking Claude authentication...${NC}"
if [ -f ~/.claude/.claude.json ]; then
    echo -e "${GREEN}✅ Claude authentication found${NC}"
else
    echo -e "${YELLOW}⚠️  Claude authentication not found${NC}"
    echo "  You may need to authenticate. Options:"
    echo "  1. Run 'claude login' on your host machine"
    echo "  2. Or authenticate in a container: docker exec -it inventory-schema-agent claude login"
fi

# Step 4: Launch with docker-compose
echo -e "${BLUE}🐳 Launching Phase 2 agents...${NC}"

# Stop any existing Phase 2 containers
docker-compose -f docker/docker-compose-phase2.yml down 2>/dev/null || true

# Start all Phase 2 agents
docker-compose -f docker/docker-compose-phase2.yml up -d

# Wait for containers to initialize
echo -e "${BLUE}⏳ Waiting for containers to initialize...${NC}"
sleep 10

# Step 5: Verify agents are running
echo -e "${BLUE}🔍 Verifying agent status...${NC}"
for agent in "${PHASE2_AGENTS[@]}"; do
    if docker ps | grep -q "${agent}-agent"; then
        echo -e "${GREEN}  ✅ ${agent}-agent is running${NC}"
    else
        echo -e "${RED}  ❌ ${agent}-agent is not running${NC}"
    fi
done

# Step 6: Display monitoring information
echo ""
echo -e "${GREEN}✅ Phase 2 Inventory Operations launched!${NC}"
echo ""
echo "📊 Monitoring Dashboard: http://localhost:3002"
echo ""
echo "📝 Useful commands:"
echo "  - View status: cat docker/volumes/communication/status/*.json | jq"
echo "  - View logs: docker logs [agent-name]-agent"
echo "  - View progress: tail -f docker/volumes/communication/progress/*.md"
echo "  - Check tests: tail -f docker/volumes/communication/test-results/*.txt"
echo ""
echo "🔐 If authentication needed:"
echo "  docker exec -it inventory-schema-agent claude login"
echo ""
echo "🛑 To stop all agents:"
echo "  docker-compose -f docker/docker-compose-phase2.yml down"
echo ""
echo "📈 Self-improvement cycles:"
echo "  Each agent will run up to 5 cycles to:"
echo "  1. Run tests to identify failures"
echo "  2. Implement required functionality"
echo "  3. Verify tests pass (≥85% target)"
echo "  4. Commit on milestones"
echo "  5. Hand off to next layer"
echo ""
echo "Following patterns from:"
echo "  - docs/architectural-patterns-and-best-practices.md"
echo "  - docs/agent-prompt-guidelines.md"
echo "  - SimplifiedSupabaseMock for services"
echo "  - Centralized query keys for hooks"