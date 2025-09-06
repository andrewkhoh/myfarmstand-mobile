#!/bin/bash

AGENT_NAME="debug-agent-1756259626"
START_TIME=$(date +%s)
END_TIME=$((START_TIME + 300))  # 5 minutes from now

echo "Starting logging test for agent: $AGENT_NAME"
echo "Test duration: 5 minutes"
echo "Updates every 30 seconds"

while [ $(date +%s) -lt $END_TIME ]; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    PROGRESS=$((ELAPSED * 100 / 300))
    
    # Update heartbeat
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Heartbeat: Agent active, elapsed ${ELAPSED}s" >> /shared/progress/${AGENT_NAME}.md
    
    # Update status JSON
    cat > /shared/status/${AGENT_NAME}.json << EOF
{
  "agent_name": "${AGENT_NAME}",
  "status": "monitoring",
  "progress": ${PROGRESS},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "heartbeat": {
    "last_update": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "uptime_seconds": ${ELAPSED},
    "remaining_seconds": $((300 - ELAPSED))
  },
  "metrics": {
    "files_analyzed": 501,
    "typescript_files": 459,
    "javascript_files": 42,
    "test_files": 187,
    "test_directories": 18
  },
  "current_task": "Monitoring infrastructure test",
  "test_phase": "active_monitoring"
}
EOF
    
    echo "Update ${ELAPSED}s - Progress: ${PROGRESS}%"
    
    # Wait 30 seconds before next update
    sleep 30
done

# Final update
echo "" >> /shared/progress/${AGENT_NAME}.md
echo "---" >> /shared/progress/${AGENT_NAME}.md
echo "" >> /shared/progress/${AGENT_NAME}.md
echo "## DEBUG TEST COMPLETE" >> /shared/progress/${AGENT_NAME}.md
echo "Test completed at: $(date '+%Y-%m-%d %H:%M:%S')" >> /shared/progress/${AGENT_NAME}.md
echo "Total duration: 300 seconds" >> /shared/progress/${AGENT_NAME}.md

# Final status
cat > /shared/status/${AGENT_NAME}.json << EOF
{
  "agent_name": "${AGENT_NAME}",
  "status": "completed",
  "progress": 100,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_result": "SUCCESS",
  "message": "DEBUG TEST COMPLETE"
}
EOF

echo "DEBUG TEST COMPLETE"