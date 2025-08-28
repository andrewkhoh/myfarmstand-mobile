#!/bin/bash
# Clean relaunch script for Phase 1 agents with fresh experiment cycle

set -euo pipefail

# Configuration
MAX_RESTARTS=${MAX_RESTARTS:-3}  # Default to 3, but can be overridden

echo "🔄 Clean Relaunch of Phase 1 Multi-Agent Experiment"
echo "===================================================="
echo ""

cd /Users/andrewkhoh/Documents/myfarmstand-mobile/docker

# Step 1: Stop all containers
echo "1️⃣ Stopping existing containers..."
docker-compose -f docker-compose-phase1.yml down --timeout 30 || true
echo "   ✅ Containers stopped"
echo ""

# Step 2: Clear restart counters for fresh experiment
echo "2️⃣ Clearing restart counters..."
rm -rf volumes/communication/restart_counters/*
mkdir -p volumes/communication/restart_counters
echo "   ✅ Restart counters cleared (fresh experiment)"
echo ""

# Step 3: Clear status files for clean monitoring
echo "3️⃣ Clearing status files..."
rm -f volumes/communication/status/*.json
rm -f volumes/communication/status/*.json.tmp
mkdir -p volumes/communication/status
echo "   ✅ Status files cleared"
echo ""

# Step 4: Clear progress logs (optional - keeps history)
echo "4️⃣ Archiving progress logs..."
if [ -d volumes/communication/progress ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mkdir -p volumes/communication/archive
    tar -czf volumes/communication/archive/progress_${TIMESTAMP}.tar.gz -C volumes/communication progress 2>/dev/null || true
    rm -f volumes/communication/progress/*.md
    echo "   ✅ Progress logs archived to archive/progress_${TIMESTAMP}.tar.gz"
else
    mkdir -p volumes/communication/progress
    echo "   ✅ Progress directory ready"
fi
echo ""

# Step 5: Rebuild containers with latest entrypoint (includes heartbeat fix)
echo "5️⃣ Rebuilding containers with latest updates..."
docker-compose -f docker-compose-phase1.yml build --no-cache
echo "   ✅ Containers rebuilt"
echo ""

# Step 6: Start fresh experiment
echo "6️⃣ Starting fresh self-improvement experiment..."
MAX_RESTARTS=$MAX_RESTARTS docker-compose -f docker-compose-phase1.yml up -d
echo "   ✅ Containers started"
echo ""

# Step 7: Show status
echo "📊 Container Status:"
docker-compose -f docker-compose-phase1.yml ps
echo ""

echo "🎯 Experiment Configuration:"
echo "   • Max restart cycles: $MAX_RESTARTS"
echo "   • Heartbeat interval: 60 seconds"
echo "   • Monitoring dashboard: http://localhost:3001"
echo ""

echo "📝 Monitor progress with:"
echo "   • Dashboard: http://localhost:3001"
echo "   • Logs: docker-compose -f docker-compose-phase1.yml logs -f [agent-name]"
echo "   • Status API: curl http://localhost:3001/api/status | jq"
echo ""

echo "✨ Clean relaunch complete!"
echo "   Agents will run up to $MAX_RESTARTS self-improvement cycles."
echo ""
echo "💡 To use a different max cycles, run:"
echo "   MAX_RESTARTS=5 ./relaunch-clean.sh"