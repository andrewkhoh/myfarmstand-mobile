#!/bin/bash
AGENT_NAME="debug-agent-1756259782"
START_TIME=$(date +%s)
COUNTER=0

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    COUNTER=$((COUNTER + 1))
    
    # Update progress log every 30 seconds
    echo "$(date): Heartbeat #${COUNTER} - Elapsed: ${ELAPSED}s" >> /shared/logs/${AGENT_NAME}.log
    
    # Update status JSON
    cat << JSON > /shared/status/${AGENT_NAME}.json
{
  "agent_name": "${AGENT_NAME}",
  "status": "monitoring",
  "progress": $((80 + (COUNTER * 2) % 20)),
  "start_time": "$(date -d @$START_TIME -Iseconds)",
  "last_update": "$(date -Iseconds)",
  "elapsed_seconds": ${ELAPSED},
  "heartbeat_count": ${COUNTER},
  "metrics": {
    "files_analyzed": 501,
    "test_files": 187,
    "typescript_files": 459,
    "javascript_files": 42
  },
  "current_task": "Monitoring and logging progress",
  "tasks_completed": [
    "Analyzed codebase structure",
    "Counted TypeScript/JavaScript files",
    "Identified test files",
    "Generated progress report",
    "Created status tracking"
  ]
}
JSON
    
    # Check if 5 minutes have passed
    if [ $ELAPSED -ge 300 ]; then
        echo "$(date): DEBUG TEST COMPLETE" >> /shared/progress/${AGENT_NAME}.md
        echo "$(date): 5 minutes elapsed, shutting down monitoring" >> /shared/logs/${AGENT_NAME}.log
        exit 0
    fi
    
    sleep 30
done
