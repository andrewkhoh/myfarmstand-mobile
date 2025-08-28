#!/bin/bash
# Kill all Phase 1 monitoring and containers

echo "🛑 Stopping all Phase 1 processes and containers..."

# Kill monitoring processes
echo "Killing monitoring processes..."
pkill -f "monitor-live-dashboard" || true
pkill -f "monitor-alerts" || true
pkill -f "aggregate-status" || true
pkill -f "monitor-phase1" || true

# Stop Docker containers
echo "Stopping Docker containers..."
cd /Users/andrewkhoh/Documents/myfarmstand-mobile/docker
docker-compose -f docker-compose-phase1.yml down --timeout 30 2>/dev/null || \
docker compose -f docker-compose-phase1.yml down --timeout 30 2>/dev/null || true

# Additional cleanup
docker stop $(docker ps -q --filter "name=role-") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=permission-") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=integration-") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=phase1-") 2>/dev/null || true

echo "✅ All Phase 1 processes and containers stopped"