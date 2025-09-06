#!/bin/bash

# Multi-Agent Setup Script
# Generated from generic template

set -e

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="marketing_operations"               # Project identifier
PROJECT_PREFIX="tdd_phase_3"           # Project prefix for namespacing
PROJECT_DESCRIPTION="TDD Phase 3: Marketing Operations with Content Workflows" # Project description
MAX_RESTARTS=2          # Maximum restart cycles
TARGET_PASS_RATE=85  # Target test pass rate percentage
PROJECT_AGENTS=("marketing-schema-tests"
    "marketing-service-tests"
    "marketing-hooks-tests"
    "marketing-screens-tests"
    "marketing-components-tests"
    "marketing-integration-tests"
    "marketing-schema-impl"
    "marketing-service-impl"
    "marketing-hooks-impl"
    "marketing-components-impl"
    "marketing-screens-impl"
    "marketing-integration-impl"
    "marketing-refactor"
    "marketing-audit"
    "marketing-integration-final")              # List of agents
# =============================================================================

# Local configuration
BASE_DIR=$(pwd)
COMMUNICATION_VOLUME="${BASE_DIR}/docker/volumes/communication"

echo "🚀 ${PROJECT_DESCRIPTION} - Multi-Agent Setup"
echo "============================================================"

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

# Create unified workspace for all agents
echo -e "${BLUE}🌳 Setting up unified workspace for ${PROJECT_NAME}...${NC}"

WORKSPACE="${PROJECT_PREFIX}-workspace"
BRANCH="${PROJECT_PREFIX}-main"
WORKTREE_PATH="docker/volumes/${WORKSPACE}"

# Check if worktree already exists
if [ -d "$WORKTREE_PATH/.git" ]; then
    echo -e "${GREEN}  ℹ️  Unified workspace already exists, keeping it${NC}"
else
    # Remove broken worktree reference if present
    git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
    
    # Check if branch already exists
    if git show-ref --verify --quiet refs/heads/$BRANCH; then
        echo -e "${GREEN}  ℹ️  Branch $BRANCH exists, creating worktree with existing branch${NC}"
        git worktree add "$WORKTREE_PATH" "$BRANCH"
    else
        echo -e "${GREEN}  ✅ Creating new branch and worktree for unified workspace${NC}"
        git worktree add "$WORKTREE_PATH" -b "$BRANCH" HEAD
    fi
fi

# Ensure npm dependencies are installed in unified workspace
cd "$WORKTREE_PATH"
echo -e "${BLUE}📦 Installing dependencies in unified workspace...${NC}"
npm ci || npm install

cd "$BASE_DIR"

echo -e "${GREEN}✅ Unified workspace ready at: ${WORKTREE_PATH}${NC}"

# Create Docker network if it doesn't exist
echo -e "${BLUE}🌐 Creating Docker network...${NC}"
docker network create ${PROJECT_PREFIX}-network 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ ${PROJECT_NAME} setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Agent prompts are in: docker/agents/prompts/"
echo "  2. Launch with: docker-compose -f docker/projects/${PROJECT_PREFIX}/docker-compose.yml up -d"
echo "  3. Monitor at: http://localhost:3003"
echo ""
echo "🎯 Agents will run ${MAX_RESTARTS} self-improvement cycles to achieve ${TARGET_PASS_RATE}% test pass rate"
echo ""
echo "🛑 To stop all agents:"
echo "  ./docker/projects/${PROJECT_PREFIX}/stop.sh"