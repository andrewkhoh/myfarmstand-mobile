#!/bin/bash

# Launch script for test fix agents
# Usage: ./launch-test-fix-agent.sh <agent-number>

AGENT_NUMBER=$1
PROJECT_NAME="test-fixes"
COMM_DIR="../${PROJECT_NAME}-communication"

if [ -z "$AGENT_NUMBER" ]; then
  echo "Usage: ./launch-test-fix-agent.sh <agent-number>"
  echo "Agent numbers:"
  echo "  1 - Critical Hooks"
  echo "  2 - Service Suites"
  echo "  3 - Core Hooks"
  echo "  4 - Schema Fixes"
  echo "  5 - Quality Assurance"
  exit 1
fi

case $AGENT_NUMBER in
  1)
    AGENT_NAME="critical-hooks"
    PROMPT_FILE="agent-prompts/test-fix-agent-1-critical-hooks.md"
    ;;
  2)
    AGENT_NAME="service-suites"
    PROMPT_FILE="agent-prompts/test-fix-agent-2-service-suites.md"
    ;;
  3)
    AGENT_NAME="core-hooks"
    PROMPT_FILE="agent-prompts/test-fix-agent-3-core-hooks.md"
    ;;
  4)
    AGENT_NAME="schema-fixes"
    PROMPT_FILE="agent-prompts/test-fix-agent-4-schema-fixes.md"
    ;;
  5)
    AGENT_NAME="quality-assurance"
    PROMPT_FILE="agent-prompts/test-fix-agent-5-quality-assurance.md"
    ;;
  *)
    echo "Invalid agent number. Use 1-5."
    exit 1
    ;;
esac

WORKSPACE="../${PROJECT_NAME}-${AGENT_NAME}"

echo "🚀 Launching Agent $AGENT_NUMBER: $AGENT_NAME"
echo "📁 Workspace: $WORKSPACE"
echo "📋 Prompt: $PROMPT_FILE"
echo ""

# Check workspace exists
if [ ! -d "$WORKSPACE" ]; then
  echo "❌ Workspace not found. Run setup-test-fix-agents.sh first."
  exit 1
fi

# Check prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
  echo "❌ Prompt file not found: $PROMPT_FILE"
  exit 1
fi

# Display prompt
echo "=== AGENT PROMPT ==="
cat "$PROMPT_FILE"
echo ""
echo "===================="
echo ""

# Create initial progress entry
echo "$(date): Agent $AGENT_NAME started" >> ${COMM_DIR}/progress/${AGENT_NAME}.md
echo "$(date): Agent $AGENT_NAME launched" >> ${COMM_DIR}/sync-log.md

# Instructions for the user
echo "📌 Instructions for launching this agent in Claude:"
echo ""
echo "1. Copy the prompt above"
echo "2. Start a new Claude conversation"
echo "3. Paste the prompt"
echo "4. Add: 'cd $WORKSPACE' as first command"
echo "5. Let the agent begin work"
echo ""
echo "📊 Monitor progress at:"
echo "   ${COMM_DIR}/progress/${AGENT_NAME}.md"
echo ""
echo "🔄 Check for blockers at:"
echo "   ${COMM_DIR}/blockers/"
echo ""

# For Agent 5 (QA), show dependency status
if [ "$AGENT_NUMBER" = "5" ]; then
  echo "⏳ Agent 5 (QA) Dependencies:"
  echo "   Waiting for completion signals from:"
  for agent in critical-hooks service-suites core-hooks schema-fixes; do
    if [ -f "${COMM_DIR}/handoffs/${agent}-ready.md" ]; then
      echo "   ✅ $agent - READY"
    else
      echo "   ⏳ $agent - IN PROGRESS"
    fi
  done
  echo ""
fi

echo "✅ Agent $AGENT_NAME ready to launch!"