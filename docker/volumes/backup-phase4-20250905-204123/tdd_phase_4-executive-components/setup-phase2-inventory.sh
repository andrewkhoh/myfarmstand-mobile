#!/bin/bash

# Phase 2 Inventory Operations - Multi-Agent Setup
# Builds on Phase 1 role-based foundation with self-improving cycles

set -e

echo "🚀 TDD Phase 2: Inventory Operations - Multi-Agent Setup"
echo "======================================================"

# Configuration
PHASE2_AGENTS=(
    "inventory-schema"
    "inventory-services"  
    "inventory-hooks"
    "inventory-screens"
    "inventory-integration"
)

MAX_RESTARTS=5  # 5 self-improving rounds as requested
BASE_DIR=$(pwd)
WORKTREE_BASE="${BASE_DIR}/../tdd-phase-2"
COMMUNICATION_VOLUME="${BASE_DIR}/docker/volumes/communication"

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

# Initialize status files for each agent
echo -e "${BLUE}📝 Initializing agent status files...${NC}"
for agent in "${PHASE2_AGENTS[@]}"; do
    cat > "${COMMUNICATION_VOLUME}/status/${agent}.json" <<EOF
{
  "agent": "${agent}",
  "status": "pending",
  "cycles": 0,
  "maxRestarts": ${MAX_RESTARTS},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lastUpdate": null,
  "filesModified": [],
  "testsPass": 0,
  "errors": [],
  "lastTool": null,
  "workSummary": null
}
EOF
done

# Create worktrees for each agent
echo -e "${BLUE}🌳 Creating git worktrees for Phase 2 agents...${NC}"
mkdir -p "${WORKTREE_BASE}"

for agent in "${PHASE2_AGENTS[@]}"; do
    worktree_path="${WORKTREE_BASE}/${agent}"
    
    # Remove existing worktree if it exists
    if [ -d "$worktree_path" ]; then
        echo -e "${YELLOW}  Removing existing worktree for ${agent}...${NC}"
        git worktree remove "$worktree_path" --force 2>/dev/null || true
    fi
    
    # Create new worktree from main branch
    echo -e "${GREEN}  Creating worktree for ${agent}...${NC}"
    git worktree add "$worktree_path" main
    
    # Create a feature branch for the agent
    cd "$worktree_path"
    git checkout -b "tdd-phase-2-${agent}"
    cd "$BASE_DIR"
done

# Create Docker network if it doesn't exist
echo -e "${BLUE}🌐 Creating Docker network...${NC}"
docker network create tdd-phase-2-network 2>/dev/null || true

# Build base agent image using existing enhanced pattern
echo -e "${BLUE}🐳 Building Phase 2 agent Docker image...${NC}"
cat > "${BASE_DIR}/docker/agents/Dockerfile.phase2" <<'EOF'
FROM node:18-alpine

# Install essential tools
RUN apk add --no-cache \
    git \
    bash \
    curl \
    jq \
    python3 \
    py3-pip \
    make \
    g++ \
    postgresql-client

# Install Claude CLI
RUN npm install -g @anthropic-ai/claude-cli

# Set working directory
WORKDIR /workspace

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create directories for communication
RUN mkdir -p /shared/logs /shared/status /shared/handoffs /shared/blockers /shared/progress /shared/feedback /shared/test-results /shared/restart_counters

# Set environment variables
ENV NODE_ENV=test
ENV CI=true

# Copy enhanced entrypoint
COPY docker/agents/phase2-entrypoint-enhanced.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy prompts
COPY docker/agents/prompts /prompts

ENTRYPOINT ["/entrypoint.sh"]
EOF

# Enhanced entrypoint already created as phase2-entrypoint-enhanced.sh
echo -e "${BLUE}✅ Using enhanced entrypoint with self-improving cycles...${NC}"

# Skip the old entrypoint creation - use enhanced version
if false; then
cat > "${BASE_DIR}/docker/agents/phase2-entrypoint.sh" <<'EOF'
#!/bin/bash
set -e

# Agent configuration from environment
AGENT_NAME=${AGENT_NAME:-"unknown"}
MAX_RESTARTS=${MAX_RESTARTS:-5}
CLAUDE_API_KEY=${CLAUDE_API_KEY:-""}

echo "🤖 Phase 2 Agent: $AGENT_NAME starting..."
echo "📊 Max self-improvement cycles: $MAX_RESTARTS"

# Initialize cycle counter
CYCLE=0

# Main self-improving loop
while [ $CYCLE -lt $MAX_RESTARTS ]; do
    CYCLE=$((CYCLE + 1))
    echo "🔄 Starting cycle $CYCLE/$MAX_RESTARTS for $AGENT_NAME"
    
    # Update status
    jq --arg cycle "$CYCLE" --arg time "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)" \
        '.cycles = ($cycle | tonumber) | .lastUpdate = $time | .status = "running"' \
        /shared/status/${AGENT_NAME}.json > /tmp/status.json && mv /tmp/status.json /shared/status/${AGENT_NAME}.json
    
    # Read prompt for this agent
    PROMPT_FILE="/workspace/agent-prompts/phase2/${AGENT_NAME}.md"
    
    if [ ! -f "$PROMPT_FILE" ]; then
        echo "❌ Prompt file not found: $PROMPT_FILE"
        exit 1
    fi
    
    # Execute agent work using Claude
    echo "🎯 Executing $AGENT_NAME tasks (cycle $CYCLE)..."
    
    # Run tests to understand current state
    TEST_OUTPUT=""
    case "$AGENT_NAME" in
        "inventory-schema")
            TEST_OUTPUT=$(npm run test:schemas:inventory 2>&1 || true)
            ;;
        "inventory-services")
            TEST_OUTPUT=$(npm run test:services:inventory 2>&1 || true)
            ;;
        "inventory-hooks")
            TEST_OUTPUT=$(npm run test:hooks:inventory 2>&1 || true)
            ;;
        "inventory-screens")
            TEST_OUTPUT=$(npm run test:screens:inventory 2>&1 || true)
            ;;
        "inventory-integration")
            TEST_OUTPUT=$(npm run test:integration:inventory 2>&1 || true)
            ;;
    esac
    
    # Save test results
    echo "$TEST_OUTPUT" > /shared/test-results/${AGENT_NAME}-cycle${CYCLE}.txt
    
    # Extract test metrics
    TESTS_PASS=$(echo "$TEST_OUTPUT" | grep -E "Tests:.*passed" | sed -E 's/.*([0-9]+) passed.*/\1/' | tail -1 || echo "0")
    TESTS_FAIL=$(echo "$TEST_OUTPUT" | grep -E "Tests:.*failed" | sed -E 's/.*([0-9]+) failed.*/\1/' | tail -1 || echo "0")
    
    # Check if we've met success criteria
    if [ "$TESTS_FAIL" -eq "0" ] && [ "$TESTS_PASS" -gt "0" ]; then
        echo "✅ All tests passing for $AGENT_NAME! Work complete."
        jq --arg time "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)" --arg pass "$TESTS_PASS" \
            '.status = "completed" | .lastUpdate = $time | .testsPass = ($pass | tonumber) | .reason = "all_tests_passing"' \
            /shared/status/${AGENT_NAME}.json > /tmp/status.json && mv /tmp/status.json /shared/status/${AGENT_NAME}.json
        break
    fi
    
    # Use Claude to analyze and fix failing tests
    CLAUDE_PROMPT="You are working on $AGENT_NAME for Phase 2 inventory operations.
    
Current test results:
- Tests passing: $TESTS_PASS
- Tests failing: $TESTS_FAIL

Test output:
$TEST_OUTPUT

Your task: Analyze the failures and implement the required functionality to make tests pass.
Follow the architectural patterns from docs/architectural-patterns-and-best-practices.md
This is cycle $CYCLE of $MAX_RESTARTS.

$(cat $PROMPT_FILE)"
    
    # Run Claude with the prompt
    echo "$CLAUDE_PROMPT" | claude --dangerously-skip-permissions > /shared/logs/${AGENT_NAME}-cycle${CYCLE}.log 2>&1
    
    # Update status with cycle results
    jq --arg time "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)" --arg pass "$TESTS_PASS" --arg fail "$TESTS_FAIL" \
        '.lastUpdate = $time | .testsPass = ($pass | tonumber) | .errors = ["Tests failing: " + $fail]' \
        /shared/status/${AGENT_NAME}.json > /tmp/status.json && mv /tmp/status.json /shared/status/${AGENT_NAME}.json
    
    # Brief pause before next cycle
    sleep 10
done

# Final status update
if [ $CYCLE -eq $MAX_RESTARTS ]; then
    echo "⚠️ Max cycles reached for $AGENT_NAME"
    jq --arg time "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)" \
        '.status = "completed" | .reason = "max_cycles_reached" | .lastUpdate = $time' \
        /shared/status/${AGENT_NAME}.json > /tmp/status.json && mv /tmp/status.json /shared/status/${AGENT_NAME}.json
fi

echo "🏁 Agent $AGENT_NAME completed after $CYCLE cycles"

# Keep container running for debugging
tail -f /dev/null
EOF

chmod +x "${BASE_DIR}/docker/agents/phase2-entrypoint.sh"

# Build the Phase 2 agent image
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker build -f docker/agents/Dockerfile.phase2 -t phase2-inventory-agent:latest .

# Create monitoring container
echo -e "${BLUE}📊 Setting up monitoring container...${NC}"
cat > "${BASE_DIR}/docker/monitoring/docker-compose-phase2.yml" <<EOF
version: '3.8'

services:
  monitoring:
    image: phase2-monitoring:latest
    container_name: phase2-monitoring
    volumes:
      - ./volumes/communication:/communication:rw
      - ./monitoring:/app
    networks:
      - phase2-inventory-network
    environment:
      - NODE_ENV=production
    command: ["node", "dashboard.js"]
    restart: unless-stopped

networks:
  phase2-inventory-network:
    external: true
EOF

# Create agent launch script
echo -e "${BLUE}🚀 Creating agent launch script...${NC}"
cat > "${BASE_DIR}/launch-phase2-agents.sh" <<'EOF'
#!/bin/bash
set -e

PHASE2_AGENTS=(
    "inventory-schema"
    "inventory-services"  
    "inventory-hooks"
    "inventory-screens"
    "inventory-integration"
)

BASE_DIR=$(pwd)
WORKTREE_BASE="${BASE_DIR}/../tdd-phase-2"

echo "🚀 Launching Phase 2 Inventory Agents..."
echo "========================================"

# Launch monitoring first
echo "📊 Starting monitoring dashboard..."
docker-compose -f docker/monitoring/docker-compose-phase2.yml up -d

# Launch each agent
for agent in "${PHASE2_AGENTS[@]}"; do
    echo "🤖 Launching ${agent}..."
    
    docker run -d \
        --name "phase2-${agent}" \
        --network phase2-inventory-network \
        -v "${WORKTREE_BASE}/${agent}:/workspace" \
        -v "${BASE_DIR}/docker/volumes/communication:/shared" \
        -e AGENT_NAME="${agent}" \
        -e MAX_RESTARTS=5 \
        -e CLAUDE_API_KEY="${CLAUDE_API_KEY}" \
        phase2-inventory-agent:latest
    
    echo "  ✅ ${agent} launched"
    sleep 2
done

echo ""
echo "✅ All Phase 2 agents launched!"
echo "📊 Monitor progress at: docker logs phase2-monitoring -f"
echo "📁 Check status at: docker/volumes/communication/status/"
echo ""
echo "To stop all agents: ./stop-phase2-agents.sh"
EOF

chmod +x "${BASE_DIR}/launch-phase2-agents.sh"

# Create stop script
echo -e "${BLUE}🛑 Creating stop script...${NC}"
cat > "${BASE_DIR}/stop-phase2-agents.sh" <<'EOF'
#!/bin/bash

PHASE2_AGENTS=(
    "inventory-schema"
    "inventory-services"  
    "inventory-hooks"
    "inventory-screens"
    "inventory-integration"
)

echo "🛑 Stopping Phase 2 agents..."

# Stop monitoring
docker-compose -f docker/monitoring/docker-compose-phase2.yml down

# Stop all agents
for agent in "${PHASE2_AGENTS[@]}"; do
    docker stop "phase2-${agent}" 2>/dev/null || true
    docker rm "phase2-${agent}" 2>/dev/null || true
    echo "  ✅ ${agent} stopped"
done

echo "✅ All Phase 2 agents stopped"
EOF

chmod +x "${BASE_DIR}/stop-phase2-agents.sh"

echo ""
echo -e "${GREEN}✅ Phase 2 Inventory setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Create agent prompts in: agent-prompts/phase2/"
echo "  2. Set CLAUDE_API_KEY environment variable"
echo "  3. Run: ./launch-phase2-agents.sh"
echo ""
echo "🎯 Agents will run 5 self-improvement cycles to:"
echo "  - Implement inventory schemas with database contracts"
echo "  - Create inventory services with role integration"
echo "  - Build inventory hooks with React Query"
echo "  - Develop inventory screens with UI components"
echo "  - Integrate everything with real-time updates"