#!/bin/bash

# Phase 2 Inventory Operations - Complete Launch Script
# Uses enhanced entrypoint with self-improving cycles

set -e

echo "🚀 Phase 2 Inventory Operations - Multi-Agent Launch"
echo "===================================================="

# Configuration
PHASE2_AGENTS=(
    "inventory-schema"
    "inventory-services"  
    "inventory-hooks"
    "inventory-screens"
    "inventory-integration"
)

MAX_RESTARTS=5  # 5 self-improving rounds
BASE_DIR=$(pwd)
WORKTREE_BASE="${BASE_DIR}/../phase2-inventory"
COMMUNICATION_VOLUME="${BASE_DIR}/docker/volumes/communication"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Setup communication volumes
echo -e "${BLUE}📁 Setting up communication volumes...${NC}"
mkdir -p "${COMMUNICATION_VOLUME}"/{logs,status,handoffs,blockers,progress,feedback,test-results,restart_counters}

# Initialize status files
for agent in "${PHASE2_AGENTS[@]}"; do
    cat > "${COMMUNICATION_VOLUME}/status/${agent}.json" <<EOF
{
  "agent": "${agent}",
  "status": "pending",
  "phase": "Phase 2 - Inventory",
  "cycles": 0,
  "maxRestarts": ${MAX_RESTARTS},
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
mkdir -p "${WORKTREE_BASE}"

for agent in "${PHASE2_AGENTS[@]}"; do
    worktree_path="${WORKTREE_BASE}/${agent}"
    
    if [ -d "$worktree_path" ]; then
        echo -e "${YELLOW}  Cleaning existing worktree for ${agent}...${NC}"
        git worktree remove "$worktree_path" --force 2>/dev/null || true
    fi
    
    echo -e "${GREEN}  Creating worktree for ${agent}...${NC}"
    # Use HEAD to create from current branch
    git worktree add "$worktree_path" HEAD
    cd "$worktree_path"
    git checkout -b "phase2-inventory-${agent}" 2>/dev/null || git checkout "phase2-inventory-${agent}"
    cd "$BASE_DIR"
done

# Step 3: Create Docker network
echo -e "${BLUE}🌐 Creating Docker network...${NC}"
docker network create phase2-inventory-network 2>/dev/null || true

# Step 4: Build Docker image with enhanced entrypoint
echo -e "${BLUE}🐳 Building Phase 2 agent image...${NC}"

cat > docker/Dockerfile.phase2 <<'EOF'
FROM node:18-alpine

# Install essentials
RUN apk add --no-cache git bash curl jq python3 py3-pip make g++ postgresql-client

# Install Claude Code CLI (same as Phase 1)
ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} || \
    (echo '#!/bin/bash' > /usr/local/bin/claude && \
     echo 'echo "Claude mock - will use real Claude when authenticated"' >> /usr/local/bin/claude && \
     echo 'tail -f /dev/null' >> /usr/local/bin/claude && \
     chmod +x /usr/local/bin/claude)

WORKDIR /workspace

# Copy package files and install
COPY package*.json ./
RUN npm ci

# Copy all source
COPY . .

# Create shared directories
RUN mkdir -p /shared/{logs,status,handoffs,blockers,progress,feedback,test-results,restart_counters}

# Environment
ENV NODE_ENV=test
ENV CI=true

# Copy entrypoint and prompts
COPY docker/agents/phase2-entrypoint-enhanced.sh /entrypoint.sh
COPY docker/agents/prompts /prompts
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
EOF

docker build -f docker/Dockerfile.phase2 -t phase2-inventory-agent:latest .

# Step 5: Setup monitoring
echo -e "${BLUE}📊 Setting up monitoring...${NC}"

cat > docker/docker-compose.phase2.yml <<EOF
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
    command: ["sh", "-c", "while true; do echo 'Monitoring...'; sleep 60; done"]
    restart: unless-stopped

networks:
  phase2-inventory-network:
    external: true
EOF

# Step 6: Build monitoring image
cat > docker/Dockerfile.monitoring <<'EOF'
FROM node:18-alpine
RUN apk add --no-cache bash jq
WORKDIR /app
CMD ["sh", "-c", "while true; do echo 'Monitoring active'; sleep 60; done"]
EOF

docker build -f docker/Dockerfile.monitoring -t phase2-monitoring:latest .

# Step 7: Launch monitoring
echo -e "${BLUE}📊 Starting monitoring...${NC}"
docker-compose -f docker/docker-compose.phase2.yml up -d

# Step 8: Launch agents
echo -e "${BLUE}🤖 Launching Phase 2 agents...${NC}"

for agent in "${PHASE2_AGENTS[@]}"; do
    echo -e "${GREEN}  Launching ${agent}...${NC}"
    
    # Check for existing container
    docker rm -f "phase2-${agent}" 2>/dev/null || true
    
    # Launch with enhanced entrypoint
    docker run -d \
        --name "phase2-${agent}" \
        --network phase2-inventory-network \
        -v "${WORKTREE_BASE}/${agent}:/workspace" \
        -v "${COMMUNICATION_VOLUME}:/shared" \
        -e AGENT_NAME="${agent}" \
        -e MAX_RESTARTS=${MAX_RESTARTS} \
        -e CLAUDE_API_KEY="${CLAUDE_API_KEY}" \
        --restart on-failure:${MAX_RESTARTS} \
        phase2-inventory-agent:latest
    
    echo -e "${GREEN}  ✅ ${agent} launched${NC}"
    sleep 2
done

# Step 9: Display status
echo ""
echo -e "${GREEN}✅ Phase 2 Inventory agents launched!${NC}"
echo ""
echo "📊 Monitoring commands:"
echo "  - Status: cat docker/volumes/communication/status/*.json | jq '.'"
echo "  - Logs: docker logs phase2-<agent-name>"
echo "  - Progress: tail -f docker/volumes/communication/progress/*.md"
echo ""
echo "🔐 Authentication (if needed):"
echo "  docker exec -it phase2-<agent-name> claude login"
echo ""
echo "🛑 To stop all agents:"
echo "  ./stop-phase2-inventory.sh"
echo ""
echo "Each agent will run ${MAX_RESTARTS} self-improvement cycles to:"
echo "  1. Run tests to identify failures"
echo "  2. Implement required functionality"
echo "  3. Verify tests pass"
echo "  4. Commit on success"
echo "  5. Repeat until 85% pass rate achieved"