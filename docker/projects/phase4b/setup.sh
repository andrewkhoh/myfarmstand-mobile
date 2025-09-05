#!/bin/bash

# Multi-Agent Setup Script
# Generated from generic template

set -e

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="tdd_phase_4b"               # Project identifier
PROJECT_PREFIX="phase4b"           # Project prefix for namespacing
PROJECT_DESCRIPTION="TDD Phase 4b - Sequential Executive Dashboard with Unified Workspace" # Project description
MAX_RESTARTS=          # Maximum restart cycles
TARGET_PASS_RATE=  # Target test pass rate percentage
PROJECT_AGENTS=("decision-support"
    "executive-components  "
    "executive-hooks"
    "executive-screens"
    "cross-role-integration")              # List of agents
# =============================================================================

# Local configuration
BASE_DIR=$(cd ../../.. && pwd)  # Navigate to main repository root
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

# Create individual git repositories for each agent (Docker-safe approach)
echo -e "${BLUE}🌳 Creating individual git repositories for ${PROJECT_NAME} agents...${NC}"

for agent in "${PROJECT_AGENTS[@]}"; do
    WORKSPACE="${PROJECT_PREFIX}-${agent}"
    REPO_PATH="${BASE_DIR}/docker/volumes/${WORKSPACE}"  # Use absolute path
    
    # Check if repository already exists
    if [ -d "$REPO_PATH/.git" ]; then
        echo -e "${GREEN}  ℹ️  Repository already exists for ${agent}, keeping it${NC}"
        continue
    fi
    
    # Remove any existing directory
    rm -rf "$REPO_PATH"
    
    # Clone the current repository to create independent copy
    echo -e "${GREEN}  ✅ Creating independent repository for ${agent}${NC}"
    git clone "$BASE_DIR" "$REPO_PATH"
    
    # Navigate to the new repository (save current dir first)
    PREV_DIR=$(pwd)
    cd "$REPO_PATH"
    
    # Create and switch to agent-specific branch
    BRANCH="${PROJECT_PREFIX}-${agent}"
    if git show-ref --verify --quiet refs/heads/$BRANCH; then
        echo -e "  📋 Switching to existing branch $BRANCH"
        git checkout "$BRANCH"
    else
        echo -e "  🌿 Creating new branch $BRANCH"
        git checkout -b "$BRANCH"
    fi
    
    # Set up remote tracking for the main repository
    git remote rename origin upstream
    git remote add origin "$BASE_DIR"
    
    # Ensure npm dependencies are installed
    echo "  📦 Installing dependencies for ${agent}..."
    npm ci || npm install
    
    # Always return to previous directory, not BASE_DIR
    cd "$PREV_DIR"
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
echo "  3. Monitor at: http://localhost:"
echo ""
echo "🎯 Agents will run ${MAX_RESTARTS} self-improvement cycles to achieve ${TARGET_PASS_RATE}% test pass rate"
echo ""
echo "🛑 To stop all agents:"
echo "  ./docker/projects/${PROJECT_PREFIX}/stop.sh"