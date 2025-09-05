#!/bin/bash

# Multi-Agent Stop Script
# Generated from generic template

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="tdd_phase_4b"               # Project identifier
PROJECT_PREFIX="phase4b"           # Project prefix for namespacing
PROJECT_DESCRIPTION="TDD Phase 4b - Sequential Executive Dashboard with Unified Workspace" # Project description
PROJECT_AGENTS=("decision-support"
    "executive-components  "
    "executive-hooks"
    "executive-screens"
    "cross-role-integration")              # List of agents
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