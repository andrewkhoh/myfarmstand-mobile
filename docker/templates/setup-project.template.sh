#!/bin/bash

# Multi-Agent Setup Script
# Generated from generic template

set -e

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="{{PROJECT_NAME}}"               # Project identifier
PROJECT_PREFIX="{{PROJECT_PREFIX}}"           # Project prefix for namespacing
PROJECT_DESCRIPTION="{{PROJECT_DESCRIPTION}}" # Project description
MAX_RESTARTS={{MAX_RESTARTS_VALUE}}          # Maximum restart cycles
TARGET_PASS_RATE={{TARGET_PASS_RATE_VALUE}}  # Target test pass rate percentage
PROJECT_AGENTS=({{AGENT_LIST}})              # List of agents
# =============================================================================

# Local configuration
BASE_DIR=$(pwd)
COMMUNICATION_VOLUME="${BASE_DIR}/docker/volumes/communication"

echo "🚀 ${PROJECT_DESCRIPTION} - Multi-Agent Setup"
echo "{{PROJECT_SEPARATOR}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create communication volume structure
echo -e "${BLUE}📁 Setting up communication volume...${NC}"
mkdir -p "${COMMUNICATION_VOLUME}/logs"
mkdir -p "${COMMUNICATION_VOLUME}/status"
mkdir -p "${COMMUNICATION_VOLUME}/handoffs"
mkdir -p "${COMMUNICATION_VOLUME}/blockers"
mkdir -p "${COMMUNICATION_VOLUME}/progress"
mkdir -p "${COMMUNICATION_VOLUME}/feedback"
mkdir -p "${COMMUNICATION_VOLUME}/test-results"
mkdir -p "${COMMUNICATION_VOLUME}/restart_counters"

# Initialize status files for each agent
echo -e "${BLUE}📝 Initializing agent status files...${NC}"
for agent in "${PROJECT_AGENTS[@]}"; do
    cat > "${COMMUNICATION_VOLUME}/status/${agent}.json" <<EOF
{
  "agent": "${agent}",
  "status": "pending",
  "project": "${PROJECT_NAME}",
  "cycles": 0,
  "maxRestarts": ${MAX_RESTARTS},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lastUpdate": null,
  "filesModified": [],
  "testsPass": 0,
  "testsFail": 0,
  "testPassRate": 0,
  "targetPassRate": ${TARGET_PASS_RATE},
  "errors": [],
  "lastTool": null,
  "workSummary": null
}
EOF
done

# Create git worktrees for each agent
echo -e "${BLUE}🌳 Creating git worktrees for ${PROJECT_NAME} agents...${NC}"

for agent in "${PROJECT_AGENTS[@]}"; do
    WORKSPACE="${PROJECT_PREFIX}-${agent}"
    BRANCH="${PROJECT_PREFIX}-${agent}"
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

# Create Docker network if it doesn't exist
echo -e "${BLUE}🌐 Creating Docker network...${NC}"
docker network create ${PROJECT_PREFIX}-network 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ ${PROJECT_NAME} setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Agent prompts are in: docker/agents/prompts/"
echo "  2. Launch with: docker-compose -f docker/projects/${PROJECT_PREFIX}/docker-compose.yml up -d"
echo "  3. Monitor at: http://localhost:{{MONITORING_PORT_VALUE}}"
echo ""
echo "🎯 Agents will run ${MAX_RESTARTS} self-improvement cycles to achieve ${TARGET_PASS_RATE}% test pass rate"
echo ""
echo "🛑 To stop all agents:"
echo "  ./docker/projects/${PROJECT_PREFIX}/stop.sh"