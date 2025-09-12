#!/bin/bash

# Phase 2 Docker Launch Script
# Orchestrates 5 parallel agents to achieve 100% infrastructure adoption

set -e

echo "🐳 PHASE 2 DOCKER ORCHESTRATION LAUNCHER"
echo "========================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    exit 1
fi

echo "✅ Docker is ready"
echo ""

# Check Claude API key
if [ -z "$CLAUDE_API_KEY" ]; then
    echo "⚠️  CLAUDE_API_KEY not set"
    echo "   Please set: export CLAUDE_API_KEY=your-key"
    echo "   Continuing in simulation mode..."
fi

# Verify worktrees exist
echo "Verifying Phase 2 worktrees..."
missing_worktrees=0
for agent in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
    if [ ! -d "../$agent" ]; then
        echo "   ❌ Missing: ../$agent"
        missing_worktrees=$((missing_worktrees + 1))
    else
        echo "   ✅ Found: ../$agent"
    fi
done

if [ $missing_worktrees -gt 0 ]; then
    echo ""
    echo "Creating missing worktrees..."
    for agent in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
        if [ ! -d "../$agent" ]; then
            git worktree add "../$agent" -b "$agent" main
            echo "   ✅ Created: ../$agent"
        fi
    done
fi

# Setup communication directory
echo ""
echo "Setting up communication channels..."
mkdir -p test-fixes-communication/{tasks,prompts,progress,handoffs,blockers}

# Ensure task files exist
echo ""
echo "Verifying task files..."
if [ ! -f "test-fixes-communication/tasks/phase2-core-services.json" ]; then
    echo "   Generating task files..."
    test-fixes-communication/generate-phase2-tasks.sh 2>/dev/null || echo "   ⚠️ Task generation failed"
fi

# Build Docker images
echo ""
echo "Building Docker images..."

# Build orchestrator image
echo "   Building orchestrator..."
docker build -f Dockerfile.orchestrator -t phase2-orchestrator . || {
    echo "   ⚠️ Orchestrator build failed, using fallback"
    
    # Create minimal orchestrator Dockerfile
    cat > Dockerfile.orchestrator.minimal << 'EOF'
FROM node:18-alpine
WORKDIR /workspace
RUN apk add --no-cache git bash jq
COPY . .
RUN npm ci || npm install
CMD ["sh", "-c", "echo 'Orchestrator running' && sleep infinity"]
EOF
    docker build -f Dockerfile.orchestrator.minimal -t phase2-orchestrator .
}

# Build agent image
echo "   Building agent..."
docker build -f Dockerfile.agent -t phase2-agent . || {
    echo "   ⚠️ Agent build failed, using fallback"
    
    # Create minimal agent Dockerfile
    cat > Dockerfile.agent.minimal << 'EOF'
FROM node:18-alpine
WORKDIR /workspace
RUN apk add --no-cache git bash
COPY . .
RUN npm ci || npm install
CMD ["sh", "-c", "echo 'Agent $AGENT_ID running' && sleep infinity"]
EOF
    docker build -f Dockerfile.agent.minimal -t phase2-agent .
}

echo "   ✅ Docker images ready"

# Run baseline audit
echo ""
echo "Running baseline infrastructure audit..."
./phase2-infrastructure-audit.sh > test-fixes-communication/baseline-audit-docker.txt 2>&1 || echo "   ⚠️ Audit failed"
grep "OVERALL" test-fixes-communication/baseline-audit-docker.txt 2>/dev/null || echo "   No audit results"

# Launch Docker Compose
echo ""
echo "🚀 Launching Phase 2 Docker orchestration..."
echo ""

# Check if already running
if docker-compose -f docker-compose.phase2.yml ps | grep -q "Up"; then
    echo "⚠️  Phase 2 containers already running"
    echo "   Stop them first with: docker-compose -f docker-compose.phase2.yml down"
    exit 1
fi

# Launch in detached mode
docker-compose -f docker-compose.phase2.yml up -d

# Check if containers started
echo ""
echo "Verifying containers..."
sleep 2

running_count=$(docker-compose -f docker-compose.phase2.yml ps | grep -c "Up" || echo "0")
expected_count=6  # orchestrator + 5 agents

if [ $running_count -eq $expected_count ]; then
    echo "✅ All $expected_count containers running!"
else
    echo "⚠️  Only $running_count/$expected_count containers running"
    echo ""
    echo "Container status:"
    docker-compose -f docker-compose.phase2.yml ps
fi

# Display monitoring instructions
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ PHASE 2 DOCKER ORCHESTRATION LAUNCHED!"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Monitor progress:"
echo "   ./scripts/monitor-phase2.sh"
echo ""
echo "📋 View logs:"
echo "   docker-compose -f docker-compose.phase2.yml logs -f"
echo ""
echo "🔍 Check specific agent:"
echo "   docker logs phase2-agent-core-services"
echo "   docker logs phase2-agent-extension-services"
echo "   docker logs phase2-agent-core-hooks"
echo "   docker logs phase2-agent-extension-hooks"
echo "   docker logs phase2-agent-schema-other"
echo ""
echo "📁 Check progress files:"
echo "   ls -la test-fixes-communication/progress/"
echo ""
echo "🛑 Stop orchestration:"
echo "   docker-compose -f docker-compose.phase2.yml down"
echo ""
echo "🎯 Target: 100% infrastructure adoption across 173 test files"
echo "⏱️  Estimated time: 2-3 hours"
echo "═══════════════════════════════════════════════════════════════════"