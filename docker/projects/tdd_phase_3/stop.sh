#!/bin/bash

# Multi-Agent Stop Script
# Generated from generic template

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="marketing_operations"               # Project identifier
PROJECT_PREFIX="tdd_phase_3"           # Project prefix for namespacing
PROJECT_DESCRIPTION="TDD Phase 3: Marketing Operations with Content Workflows" # Project description
PROJECT_AGENTS=("marketing-schema-tests"
    "marketing-service-tests"
    "marketing-hooks-tests"
    "marketing-screens-tests"
    "marketing-components-tests"
    "marketing-integration-tests"
    "marketing-schema-impl"
    "marketing-service-impl"
    "marketing-hooks-impl"
    "marketing-components-impl"
    "marketing-screens-impl"
    "marketing-integration-impl"
    "marketing-refactor"
    "marketing-audit"
    "marketing-integration-final")              # List of agents
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