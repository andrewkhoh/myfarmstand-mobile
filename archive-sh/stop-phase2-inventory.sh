#!/bin/bash

# Stop Phase 2 Inventory agents

PHASE2_AGENTS=(
    "inventory-schema"
    "inventory-services"  
    "inventory-hooks"
    "inventory-screens"
    "inventory-integration"
)

echo "🛑 Stopping TDD Phase 2 inventory agents..."

# Stop monitoring
echo "  Stopping monitoring..."
docker-compose -f docker/docker-compose-phase2.yml down 2>/dev/null || true

# Stop all agents
for agent in "${PHASE2_AGENTS[@]}"; do
    echo "  Stopping ${agent}..."
    docker stop "tdd-phase-2-${agent}" 2>/dev/null || true
    docker rm "tdd-phase-2-${agent}" 2>/dev/null || true
done

echo "✅ All TDD Phase 2 agents stopped"
echo ""
echo "To view final results:"
echo "  cat docker/volumes/communication/status/*.json | jq '.'"