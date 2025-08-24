#!/bin/bash

# Auto-monitoring script for test fix agents
# Refreshes every 30 seconds, press Ctrl+C to stop

echo "🔄 Starting auto-monitor (refresh every 30s, Ctrl+C to stop)"
sleep 2

while true; do
    clear
    ./monitor-test-fix-agents.sh
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Auto-refreshing in 30 seconds... (Ctrl+C to stop)"
    sleep 30
done