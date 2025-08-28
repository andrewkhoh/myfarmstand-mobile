#!/bin/bash
# Agent container entrypoint with automatic prompt loading

set -euo pipefail

echo "🐳 Starting Agent Container: $AGENT_NAME"
echo "   Type: $AGENT_TYPE"
echo "   Phase: $PHASE"

# Create progress file
mkdir -p /shared/progress /shared/handoffs /shared/blockers
echo "# $AGENT_NAME Progress Log" > "/shared/progress/$AGENT_NAME.md"
echo "Started: $(date)" >> "/shared/progress/$AGENT_NAME.md"
echo "Container Type: $AGENT_TYPE" >> "/shared/progress/$AGENT_NAME.md"
echo "" >> "/shared/progress/$AGENT_NAME.md"

# Log initial status
echo "$(date): Container started, initializing..." >> "/shared/progress/$AGENT_NAME.md"

# If this is just a shell session, keep it alive
if [ "$#" -eq 0 ]; then
    echo "🔧 Agent container ready for Claude Code connection"
    echo "   Workspace: /workspace"
    echo "   Communication: /shared"
    echo "   Prompt: ${AGENT_PROMPT_FILE:-Not specified}"
    
    # Keep container alive
    tail -f /dev/null
else
    # Execute provided command (Claude Code with dangerous permissions)
    echo "🚀 Executing command: $@"
    exec "$@"
fi