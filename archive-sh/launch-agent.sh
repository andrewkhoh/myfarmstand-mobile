#!/bin/bash

# Agent launcher helper
AGENT_NAME=$1
COMM_DIR="../tdd-completion-communication"

if [ -z "$AGENT_NAME" ]; then
  echo "Usage: ./launch-agent.sh [agent-name]"
  echo "Available agents:"
  echo "  - marketing-ui"
  echo "  - campaign-bundle-ui"
  echo "  - executive-dashboard"
  echo "  - executive-analytics"
  echo "  - test-infrastructure"
  echo "  - integration"
  echo "  - production"
  exit 1
fi

echo "Launching $AGENT_NAME agent..."
echo "Workspace: ../tdd-completion-$AGENT_NAME"
echo "Communication: $COMM_DIR"
echo ""
echo "Remember TDD cycle: RED → GREEN → REFACTOR → AUDIT"
echo "Check $COMM_DIR/task-board.md for your tasks"
echo "Update progress to $COMM_DIR/progress/$AGENT_NAME.md"
