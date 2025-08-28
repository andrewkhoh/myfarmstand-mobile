#!/bin/bash
# Semi-manual authentication and automated agent launch
# Human interaction required only for browser-based OAuth login

set -euo pipefail

echo "🚀 Claude Multi-Agent Authentication & Launch"
echo "============================================="
echo ""
echo "Human interaction needed: Browser login for each agent (once)"
echo "After auth, everything runs automatically with DEBUG prompts"
echo ""

# Configuration
AGENTS=(
    "role-services"
    "role-hooks"
    "role-navigation"
    "role-screens"
    "permission-ui"
    "integration"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop existing containers
stop_existing() {
    echo "📦 Stopping existing agent containers..."
    for agent in "${AGENTS[@]}"; do
        docker stop "${agent}-agent" 2>/dev/null || true
    done
    echo "  ✅ Containers stopped"
    echo ""
}

# Function to create auth container for an agent
create_auth_container() {
    local agent=$1
    local container="${agent}-auth"
    
    echo -e "${YELLOW}Creating auth container for ${agent}...${NC}"
    
    # Remove if exists
    docker rm -f "$container" 2>/dev/null || true
    
    # Create container with sleep to keep it alive
    docker run -d \
        --name "$container" \
        --entrypoint sleep \
        -v "/Users/andrewkhoh/Documents/myfarmstand-mobile/docker/volumes/phase1-role-foundation-${agent}:/workspace:rw" \
        -v "/Users/andrewkhoh/Documents/myfarmstand-mobile/docker/volumes/communication:/shared:rw" \
        -v "/Users/andrewkhoh/Documents/myfarmstand-mobile/docker/agents/prompts:/prompts:ro" \
        -e "AGENT_NAME=${agent}" \
        -e "CLAUDE_CONFIG_DIR=/home/agent/.claude" \
        docker-role-services-agent \
        7200  # Keep alive for 2 hours
    
    echo -e "  ${GREEN}✓${NC} Container ${container} created"
}

# Function to authenticate a container
authenticate_container() {
    local agent=$1
    local container="${agent}-auth"
    
    echo -e "\n${YELLOW}═══════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Authenticating ${agent}${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}\n"
    
    # Get auth URL from claude login (needs pseudo-TTY)
    echo "Starting authentication process..."
    echo ""
    echo "IMPORTANT: The login command will show you a URL to authenticate."
    echo "Copy that URL and open it in your browser."
    echo ""
    
    # Try to get URL with pseudo-TTY allocation
    docker exec -t "$container" claude login &
    LOGIN_PID=$!
    
    echo ""
    echo "Waiting for login URL to appear (check above)..."
    sleep 3
    
    # Kill the background process after getting URL
    kill $LOGIN_PID 2>/dev/null || true
    
    echo ""
    echo "Please paste the authentication URL here (or press Enter to skip):"
    read -r AUTH_URL
    
    if [ -z "$AUTH_URL" ]; then
        echo -e "${RED}❌ Could not get auth URL for ${agent}${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Authentication URL:${NC}"
    echo "$AUTH_URL"
    echo ""
    
    # Open in browser
    if command -v open &> /dev/null; then
        open "$AUTH_URL"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$AUTH_URL"
    fi
    
    echo -e "${YELLOW}Please complete login in your browser for ${agent}${NC}"
    echo "Press Enter when done..."
    read -r
    
    # Test authentication
    echo -n "Testing authentication... "
    if docker exec "$container" sh -c 'echo "test" | claude --dangerously-skip-permissions -p "Say yes" 2>&1' | grep -qi "yes"; then
        echo -e "${GREEN}✓ Authenticated${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        return 1
    fi
}

# Function to inject prompt and launch agent
launch_authenticated_agent() {
    local agent=$1
    local container="${agent}-auth"
    
    echo -e "\n${YELLOW}Launching ${agent} with DEBUG prompt...${NC}"
    
    # Create the DEBUG prompt file in container
    docker exec "$container" sh -c "cat > /tmp/agent-prompt.md << 'EOF'
# DEBUG MODE - Safe Analysis Only

## Agent: ${agent}

You are running in DEBUG mode. Your task is to:

1. **Analyze the current codebase structure**
   - List the main directories in /workspace
   - Count TypeScript/JavaScript files
   - Identify test files

2. **Report your findings**
   - Write a summary to \`/shared/progress/${agent}.md\`
   - Create a status update in \`/shared/status/${agent}.json\`

3. **DO NOT modify any code files**
   - Only read and analyze
   - Only write to /shared/ directory
   - This is for testing the infrastructure

4. **Test the logging system**
   - Log your progress every 30 seconds
   - Update your heartbeat
   - Test the monitoring pipeline

After analyzing, write 'DEBUG TEST COMPLETE' to your progress file.
EOF"

    # Run Claude with the prompt
    echo "Running Claude with DEBUG prompt..."
    docker exec -d "$container" sh -c "
        while true; do
            echo '🚀 Starting Claude with DEBUG prompt...'
            claude --dangerously-skip-permissions -p \"\$(cat /tmp/agent-prompt.md)\" 2>&1 | tee -a /shared/logs/${agent}.log
            echo 'Claude exited, restarting in 30 seconds...'
            sleep 30
        done
    "
    
    echo -e "  ${GREEN}✓${NC} Agent ${agent} launched with DEBUG prompt"
}

# Main execution
echo "🔄 Step 1: Stopping existing containers"
stop_existing

echo "🔄 Step 2: Creating auth containers"
for agent in "${AGENTS[@]}"; do
    create_auth_container "$agent"
done

echo ""
echo "🔐 Step 3: Authenticating each agent"
echo "You'll need to login ${#AGENTS[@]} times (once per agent)"
echo ""

AUTH_SUCCESS=()
AUTH_FAILED=()

for agent in "${AGENTS[@]}"; do
    if authenticate_container "$agent"; then
        AUTH_SUCCESS+=("$agent")
    else
        AUTH_FAILED+=("$agent")
        echo -e "${YELLOW}Skipping ${agent} due to auth failure${NC}"
    fi
done

echo ""
echo "🚀 Step 4: Launching authenticated agents"
for agent in "${AUTH_SUCCESS[@]}"; do
    launch_authenticated_agent "$agent"
done

# Summary
echo ""
echo "═══════════════════════════════════════════"
echo "📊 Summary"
echo "═══════════════════════════════════════════"
echo -e "${GREEN}✓ Authenticated & Launched:${NC} ${#AUTH_SUCCESS[@]} agents"
if [ ${#AUTH_SUCCESS[@]} -gt 0 ]; then
    echo "  Agents: ${AUTH_SUCCESS[*]}"
fi

if [ ${#AUTH_FAILED[@]} -gt 0 ]; then
    echo -e "${RED}✗ Failed:${NC} ${#AUTH_FAILED[@]} agents"
    echo "  Agents: ${AUTH_FAILED[*]}"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Monitor agent logs:"
echo "   tail -f docker/volumes/communication/logs/*.log"
echo ""
echo "2. Check progress:"
echo "   ls -la docker/volumes/communication/progress/"
echo ""
echo "3. View agent output:"
for agent in "${AUTH_SUCCESS[@]}"; do
    echo "   docker logs ${agent}-auth"
done

echo ""
echo "✅ Agents are running with DEBUG prompts!"
echo "They will analyze the codebase and report findings to /shared/"