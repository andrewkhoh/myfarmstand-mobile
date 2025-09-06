#!/bin/bash
# DEBUG monitoring script - runs for 5 minutes with 30-second updates

AGENT_NAME="debug_agent"
START_TIME=$(date +%s)
END_TIME=$((START_TIME + 300))  # 5 minutes
COUNTER=0

echo "$(date): DEBUG monitoring started" >> /shared/logs/${AGENT_NAME}.log

while [ $(date +%s) -lt $END_TIME ]; do
    COUNTER=$((COUNTER + 1))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    PROGRESS=$((ELAPSED * 100 / 300))
    
    # Update heartbeat
    echo "$(date): Heartbeat #${COUNTER} - ${ELAPSED}s elapsed" >> /shared/logs/${AGENT_NAME}.log
    
    # Update progress file
    echo "" >> /shared/progress/${AGENT_NAME}.md
    echo "## Update #${COUNTER} - $(date)" >> /shared/progress/${AGENT_NAME}.md
    echo "- Elapsed time: ${ELAPSED} seconds" >> /shared/progress/${AGENT_NAME}.md
    echo "- Progress: ${PROGRESS}%" >> /shared/progress/${AGENT_NAME}.md
    echo "- Status: Running infrastructure test" >> /shared/progress/${AGENT_NAME}.md
    
    # Update status JSON
    cat > /shared/status/${AGENT_NAME}.json << JSON
{
  "agent": "${AGENT_NAME}",
  "status": "running",
  "progress": ${PROGRESS},
  "start_time": "${START_TIME}",
  "last_update": "$(date -Iseconds)",
  "elapsed_seconds": ${ELAPSED},
  "heartbeat": ${COUNTER},
  "message": "DEBUG test running - ${ELAPSED}s of 300s"
}
JSON
    
    # Analyze random aspect of codebase for testing
    case $((COUNTER % 4)) in
        0) 
            FILE_COUNT=$(find /workspace/src/hooks -name "*.ts" -o -name "*.tsx" | wc -l)
            echo "- Analyzed hooks: ${FILE_COUNT} files" >> /shared/logs/${AGENT_NAME}.log
            ;;
        1)
            FILE_COUNT=$(find /workspace/src/services -name "*.ts" | wc -l)
            echo "- Analyzed services: ${FILE_COUNT} files" >> /shared/logs/${AGENT_NAME}.log
            ;;
        2)
            FILE_COUNT=$(find /workspace/src/components -name "*.tsx" | wc -l)
            echo "- Analyzed components: ${FILE_COUNT} files" >> /shared/logs/${AGENT_NAME}.log
            ;;
        3)
            FILE_COUNT=$(find /workspace/src/schemas -name "*.ts" | wc -l)
            echo "- Analyzed schemas: ${FILE_COUNT} files" >> /shared/logs/${AGENT_NAME}.log
            ;;
    esac
    
    sleep 30
done

# Final completion message
echo "" >> /shared/progress/${AGENT_NAME}.md
echo "## DEBUG TEST COMPLETE" >> /shared/progress/${AGENT_NAME}.md
echo "$(date): Test completed successfully after 5 minutes" >> /shared/progress/${AGENT_NAME}.md

cat > /shared/status/${AGENT_NAME}.json << JSON
{
  "agent": "${AGENT_NAME}",
  "status": "completed",
  "progress": 100,
  "start_time": "${START_TIME}",
  "last_update": "$(date -Iseconds)",
  "elapsed_seconds": 300,
  "message": "DEBUG TEST COMPLETE"
}
JSON

echo "$(date): DEBUG TEST COMPLETE" >> /shared/logs/${AGENT_NAME}.log
