#!/bin/bash

# Multi-Agent Setup Script with Git Worktrees
# Generated from worktree template for proper git history preservation

set -e

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="{{PROJECT_NAME}}"               # Project identifier
PROJECT_PREFIX="{{PROJECT_PREFIX}}"           # Project prefix for namespacing
PROJECT_DESCRIPTION="{{PROJECT_DESCRIPTION}}" # Project description
MAX_RESTARTS={{MAX_RESTARTS}}          # Maximum restart cycles
TARGET_PASS_RATE={{TARGET_PASS_RATE}}  # Target test pass rate percentage
PROJECT_AGENTS=({{PROJECT_AGENTS}})              # List of agents
# =============================================================================

# Local configuration
BASE_DIR=$(cd ../../.. && pwd)  # Navigate to main repository root
COMMUNICATION_VOLUME="${BASE_DIR}/docker/volumes/communication"

echo "🚀 ${PROJECT_DESCRIPTION} - Multi-Agent Setup (Worktree Mode)"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verify we're in a git repository
if [ ! -d "$BASE_DIR/.git" ]; then
    echo -e "${RED}❌ ERROR: Not in a git repository. Cannot create worktrees.${NC}"
    exit 1
fi

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
mkdir -p "${COMMUNICATION_VOLUME}/artifacts"  # For artifact sharing between agents

# Initialize status files for each agent
echo -e "${BLUE}📝 Initializing agent status files...${NC}"
for agent in "${PROJECT_AGENTS[@]}"; do
    cat > "${COMMUNICATION_VOLUME}/status/${agent}.json" <<EOF
{
  "agent": "${agent}",
  "status": "pending",
  "startTime": "$(date -Iseconds)",
  "restartCycle": 0,
  "maxRestarts": ${MAX_RESTARTS},
  "testsPass": 0,
  "testsFail": 0,
  "testPassRate": 0,
  "targetPassRate": ${TARGET_PASS_RATE}
}
EOF
done

# Create git worktrees for each agent
echo -e "${BLUE}🌳 Creating git worktrees for ${PROJECT_NAME} agents...${NC}"

for agent in "${PROJECT_AGENTS[@]}"; do
    REPO_PATH="${BASE_DIR}/docker/volumes/${PROJECT_PREFIX}-${agent}"
    BRANCH="${PROJECT_PREFIX}-${agent}"
    
    # Remove any existing worktree
    if [ -d "$REPO_PATH" ]; then
        echo -e "${YELLOW}  ⚠️ Removing existing worktree for ${agent}${NC}"
        git worktree remove "$REPO_PATH" --force 2>/dev/null || rm -rf "$REPO_PATH"
    fi
    
    # Remove branch if it exists
    git branch -D "$BRANCH" 2>/dev/null || true
    
    # Create new worktree with new branch
    echo -e "${GREEN}  ✅ Creating git worktree for ${agent}${NC}"
    git worktree add -b "$BRANCH" "$REPO_PATH" main
    
    # Navigate to the worktree
    PREV_DIR=$(pwd)
    cd "$REPO_PATH"
    
    # Create git discipline guard file
    cat > .git-discipline-guard <<EOF
# GIT DISCIPLINE GUARD
# This is a git worktree. NEVER run 'git init' here!
# The git history is connected to the main repository.
# Use 'git status', 'git add', 'git commit' normally.
# Branch: $BRANCH
# Created: $(date)
EOF
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        echo -e "  📦 Installing dependencies for ${agent}..."
        npm ci --silent 2>/dev/null || npm install --silent 2>/dev/null || echo "  ⚠️ npm install failed (may be ok)"
    fi
    
    cd "$PREV_DIR"
    
    echo -e "${GREEN}  ✅ Worktree ready: ${REPO_PATH}${NC}"
    echo -e "     Branch: ${BRANCH}"
    echo -e "     Status: Connected to main repository"
done

# Create docker network if it doesn't exist
NETWORK_NAME="${PROJECT_PREFIX}-network"
if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo -e "${BLUE}🌐 Creating Docker network...${NC}"
    docker network create "$NETWORK_NAME"
else
    echo -e "${YELLOW}🌐 Docker network already exists: $NETWORK_NAME${NC}"
fi

echo ""
echo -e "${GREEN}✅ ${PROJECT_NAME} setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Agent prompts are in: docker/agents/prompts/"
echo "  2. Launch with: docker-compose -f docker/projects/${PROJECT_NAME}/docker-compose.yml up -d"
echo "  3. Monitor at: http://localhost:{{MONITORING_PORT}}"
echo ""
echo "🎯 Agents will run ${MAX_RESTARTS} self-improvement cycles to achieve ${TARGET_PASS_RATE}% test pass rate"
echo ""
echo "🌳 Git Worktrees Created:"
for agent in "${PROJECT_AGENTS[@]}"; do
    echo "  - ${PROJECT_PREFIX}-${agent}: docker/volumes/${PROJECT_PREFIX}-${agent}"
done
echo ""
echo "⚠️ IMPORTANT: Agents are configured to work in git worktrees."
echo "   They will NOT run 'git init' and will maintain proper git history."
echo ""
echo "🛑 To stop all agents:"
echo "  ./docker/projects/${PROJECT_NAME}/stop.sh"
echo ""
echo "🧹 To clean up worktrees after completion:"
echo "  for agent in ${PROJECT_AGENTS[@]}; do"
echo "    git worktree remove docker/volumes/${PROJECT_PREFIX}-\$agent --force"
echo "  done"