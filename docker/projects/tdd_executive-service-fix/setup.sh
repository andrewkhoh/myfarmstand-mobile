#!/bin/bash

# Multi-Agent Setup Script with Unified Git Worktree
# All agents work sequentially in the SAME worktree for proper integration

set -e

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="executive_service_complete"               # Project identifier
PROJECT_PREFIX="tdd_executive-service-fix"           # Project prefix for namespacing
PROJECT_DESCRIPTION="TDD Executive Service: Complete fixes for 100% test pass rate" # Project description
MAX_RESTARTS=10          # Maximum restart cycles
TARGET_PASS_RATE=100  # Target test pass rate percentage
PROJECT_AGENTS=("executive-complete")              # List of agents
# =============================================================================

# Local configuration
BASE_DIR=$(cd ../../.. && pwd)  # Navigate to main repository root
COMMUNICATION_VOLUME="${BASE_DIR}/docker/volumes/communication"
UNIFIED_WORKSPACE="${BASE_DIR}/docker/volumes/${PROJECT_PREFIX}-workspace"  # Single shared workspace

echo "🚀 ${PROJECT_DESCRIPTION} - Multi-Agent Setup (Unified Worktree Mode)"
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

# Create SINGLE unified git worktree for ALL agents
echo -e "${BLUE}🌳 Creating unified git worktree for ${PROJECT_NAME} agents...${NC}"

BRANCH="${PROJECT_PREFIX}-unified"

# Remove any existing worktree
if [ -d "$UNIFIED_WORKSPACE" ]; then
    echo -e "${YELLOW}  ⚠️ Removing existing unified worktree${NC}"
    git worktree remove "$UNIFIED_WORKSPACE" --force 2>/dev/null || rm -rf "$UNIFIED_WORKSPACE"
fi

# Remove branch if it exists
git branch -D "$BRANCH" 2>/dev/null || true

# Create single worktree that all agents will use
echo -e "${GREEN}  ✅ Creating unified git worktree${NC}"
git worktree add -b "$BRANCH" "$UNIFIED_WORKSPACE" main

# Navigate to the worktree
cd "$UNIFIED_WORKSPACE"

# Create git discipline guard file
cat > .git-discipline-guard <<EOF
# GIT DISCIPLINE GUARD - UNIFIED WORKSPACE
# This is a SHARED git worktree used by ALL agents sequentially.
# NEVER run 'git init' here!
# The git history is connected to the main repository.
# 
# Agents working here (in sequence):
$(for agent in "${PROJECT_AGENTS[@]}"; do echo "  - $agent"; done)
#
# Branch: $BRANCH
# Created: $(date)
# Mode: UNIFIED (all agents share this workspace)
EOF

# Create agent sequence file for tracking
cat > .agent-sequence <<EOF
# Agent Execution Sequence
# Agents must complete in this order:
$(i=1; for agent in "${PROJECT_AGENTS[@]}"; do echo "$i. $agent"; ((i++)); done)

# Current Status:
# Updated by agents as they complete
EOF

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo -e "  📦 Installing dependencies in unified workspace..."
    npm ci --silent 2>/dev/null || npm install --silent 2>/dev/null || echo "  ⚠️ npm install failed (may be ok)"
fi

cd "$BASE_DIR"

echo -e "${GREEN}  ✅ Unified worktree ready: ${UNIFIED_WORKSPACE}${NC}"
echo -e "     Branch: ${BRANCH}"
echo -e "     Status: Connected to main repository"
echo -e "     Mode: Sequential agents sharing same workspace"

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
echo "📋 Configuration:"
echo "  Mode: UNIFIED WORKSPACE"
echo "  Workspace: ${UNIFIED_WORKSPACE}"
echo "  Branch: ${BRANCH}"
echo "  Agents: ${#PROJECT_AGENTS[@]} (running sequentially)"
echo ""
echo "📋 Next steps:"
echo "  1. Agent prompts are in: docker/agents/prompts/"
echo "  2. Launch with: docker-compose -f docker/projects/${PROJECT_NAME}/docker-compose.yml up -d"
echo "  3. Monitor at: http://localhost:3008"
echo ""
echo "🎯 Agents will run ${MAX_RESTARTS} self-improvement cycles to achieve ${TARGET_PASS_RATE}% test pass rate"
echo ""
echo "🌳 Unified Git Worktree:"
echo "  Location: docker/volumes/${PROJECT_PREFIX}-workspace"
echo "  Branch: ${BRANCH}"
echo "  Shared by: ALL agents (sequentially)"
echo ""
echo "📝 Agent Sequence:"
i=1
for agent in "${PROJECT_AGENTS[@]}"; do
    echo "  $i. $agent"
    ((i++))
done
echo ""
echo "⚠️ IMPORTANT: All agents work in the SAME worktree sequentially."
echo "   Each agent builds on the previous agent's work."
echo "   They will NOT run 'git init' and will maintain proper git history."
echo ""
echo "🛑 To stop all agents:"
echo "  ./docker/projects/${PROJECT_NAME}/stop.sh"
echo ""
echo "🧹 To clean up worktree after completion:"
echo "  git worktree remove docker/volumes/${PROJECT_PREFIX}-workspace --force"
echo ""
echo "📊 To check current agent progress:"
echo "  cat docker/volumes/communication/handoffs/*.md"