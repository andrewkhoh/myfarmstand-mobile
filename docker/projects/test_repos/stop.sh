#!/bin/bash

# Multi-Agent Stop Script
# Generated from generic template

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="Test Individual Repos"               # Project identifier
PROJECT_PREFIX="test_repos"           # Project prefix for namespacing
PROJECT_DESCRIPTION="Testing individual git repositories approach" # Project description
PROJECT_AGENTS=("test-agent-1"
    "test-agent-2")              # List of agents
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