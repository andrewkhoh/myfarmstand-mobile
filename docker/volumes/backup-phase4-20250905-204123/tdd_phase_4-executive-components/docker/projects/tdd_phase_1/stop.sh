#!/bin/bash

# Multi-Agent Stop Script
# Generated from generic template

# =============================================================================
# EXTERNAL CONFIGURATION (populated by template substitution)
# =============================================================================
PROJECT_NAME="role_based_complete"               # Project identifier
PROJECT_PREFIX="tdd_phase_1"           # Project prefix for namespacing
PROJECT_DESCRIPTION="TDD Phase 1: Role-Based System Complete (Single Agent Full Cycle)" # Project description
PROJECT_AGENTS=("role-complete")              # List of agents
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