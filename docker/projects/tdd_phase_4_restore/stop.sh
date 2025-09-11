#!/bin/bash

# Multi-Agent Stop Script
# Generated from generic template

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="tdd_restoration"               # Project identifier
PROJECT_PREFIX="tdd_phase_4_restore"           # Project prefix for namespacing
PROJECT_DESCRIPTION="TDD Phase 4: Repository Restoration (Single Agent Full Cycle)" # Project description
PROJECT_AGENTS=("restoration-complete")              # List of agents
# =============================================================================

echo "🛑 Stopping ${PROJECT_DESCRIPTION} agents..."

# Stop monitoring and all services
echo "  Stopping all services..."
docker-compose -f docker-compose.yml down 2>/dev/null || true

echo "✅ All ${PROJECT_NAME} agents stopped"
echo ""
echo "To view final results:"
echo "  cat ../../volumes/communication/status/*.json | jq '.'"
echo ""
echo "To restart:"
echo "  docker-compose up -d"