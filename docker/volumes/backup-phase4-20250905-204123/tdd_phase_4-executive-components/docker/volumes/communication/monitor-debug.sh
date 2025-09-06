#!/bin/bash
AGENT_NAME="debug-agent-1756259635"
START_TIME=$(date +%s)
END_TIME=$((START_TIME + 300))  # 5 minutes

echo "Starting debug monitoring for $AGENT_NAME"

while [ $(date +%s) -lt $END_TIME ]; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    PROGRESS=$((ELAPSED * 100 / 300))
    
    # Update heartbeat
    echo "$(date): Heartbeat - Progress: ${PROGRESS}%" >> /shared/progress/${AGENT_NAME}.md
    
    # Update status JSON
    cat > /shared/status/${AGENT_NAME}.json << JSON
{
  "agent_name": "${AGENT_NAME}",
  "status": "monitoring",
  "progress": ${PROGRESS},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "elapsed_seconds": ${ELAPSED},
  "remaining_seconds": $((300 - ELAPSED)),
  "last_heartbeat": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "message": "Debug test in progress - monitoring infrastructure"
}
JSON
    
    sleep 30
done

# Final status
echo "" >> /shared/progress/${AGENT_NAME}.md
echo "---" >> /shared/progress/${AGENT_NAME}.md
echo "## DEBUG TEST COMPLETE" >> /shared/progress/${AGENT_NAME}.md
echo "Timestamp: $(date)" >> /shared/progress/${AGENT_NAME}.md
echo "Infrastructure test successful!" >> /shared/progress/${AGENT_NAME}.md

cat > /shared/status/${AGENT_NAME}.json << JSON
{
  "agent_name": "${AGENT_NAME}",
  "status": "completed",
  "progress": 100,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "message": "DEBUG TEST COMPLETE - Infrastructure verified"
}
JSON

echo "Debug monitoring complete for $AGENT_NAME"
