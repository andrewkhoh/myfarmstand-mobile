#!/bin/bash

# Phase 2 Inventory - Simple Launch using Phase 1 infrastructure

set -e

echo "🚀 Phase 2 Inventory Operations - Simple Launch"
echo "=============================================="

PHASE2_AGENTS=(
    "inventory-schema"
    "inventory-services"  
    "inventory-hooks"
    "inventory-screens"
    "inventory-integration"
)

BASE_DIR=$(pwd)
WORKTREE_BASE="${BASE_DIR}/../phase2-inventory"
COMMUNICATION_VOLUME="${BASE_DIR}/docker/volumes/communication"

# Setup communication directories
echo "📁 Setting up communication..."
mkdir -p "${COMMUNICATION_VOLUME}"/{logs,status,handoffs,blockers,progress,feedback,test-results,restart_counters}

# Initialize status files
for agent in "${PHASE2_AGENTS[@]}"; do
    cat > "${COMMUNICATION_VOLUME}/status/${agent}.json" <<EOF
{
  "agent": "${agent}",
  "status": "pending",
  "phase": "Phase 2",
  "cycles": 0,
  "maxRestarts": 5,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
done

# Setup worktrees
echo "🌳 Setting up worktrees..."
mkdir -p "${WORKTREE_BASE}"

for agent in "${PHASE2_AGENTS[@]}"; do
    worktree_path="${WORKTREE_BASE}/${agent}"
    if [ -d "$worktree_path" ]; then
        git worktree remove "$worktree_path" --force 2>/dev/null || true
    fi
    git worktree add "$worktree_path" HEAD
    cd "$worktree_path"
    git checkout -b "phase2-inv-${agent}" 2>/dev/null || git checkout "phase2-inv-${agent}"
    cd "$BASE_DIR"
done

# Use the existing Phase 1 agent image
echo "🐳 Using existing agent image..."
AGENT_IMAGE="agent:latest"

# Check if image exists, if not build it
if ! docker image inspect $AGENT_IMAGE >/dev/null 2>&1; then
    echo "Building agent image..."
    docker build -f docker/agents/Dockerfile -t $AGENT_IMAGE docker/agents/
fi

# Launch agents using Phase 1 infrastructure
echo "🤖 Launching agents..."

for agent in "${PHASE2_AGENTS[@]}"; do
    echo "  Starting ${agent}..."
    
    # Stop existing if running
    docker rm -f "phase2-${agent}" 2>/dev/null || true
    
    # Run with Phase 1 enhanced entrypoint
    docker run -d \
        --name "phase2-${agent}" \
        --network agent-network \
        -v "${WORKTREE_BASE}/${agent}:/workspace" \
        -v "${COMMUNICATION_VOLUME}:/shared" \
        -v "${BASE_DIR}/docker/agents/prompts:/prompts:ro" \
        -v "${BASE_DIR}/docker/agents/phase2-entrypoint-enhanced.sh:/usr/local/bin/phase2-entrypoint.sh:ro" \
        -e AGENT_NAME="${agent}" \
        -e MAX_RESTARTS=5 \
        -e AGENT_TYPE="phase2" \
        -e PHASE="Phase 2 - Inventory" \
        --entrypoint "/usr/local/bin/phase2-entrypoint.sh" \
        $AGENT_IMAGE
    
    echo "  ✅ ${agent} started"
    sleep 2
done

echo ""
echo "✅ Phase 2 agents launched!"
echo ""
echo "📊 Monitor status:"
echo "  cat docker/volumes/communication/status/*.json | jq"
echo ""
echo "📝 View progress:"
echo "  tail -f docker/volumes/communication/progress/*.md"
echo ""
echo "🛑 To stop:"
echo "  for agent in ${PHASE2_AGENTS[@]}; do docker stop phase2-\$agent; done"