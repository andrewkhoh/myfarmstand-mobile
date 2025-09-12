#!/bin/bash
# Manual authentication helper for Claude agents

echo "🔐 Manual Claude Authentication Helper"
echo "======================================"
echo ""

AGENTS=(
    "role-services"
    "role-hooks" 
    "role-navigation"
    "role-screens"
    "permission-ui"
    "integration"
)

# Step 1: Create stable containers
echo "📦 Creating stable containers for authentication..."
echo ""

for agent in "${AGENTS[@]}"; do
    container="${agent}-auth"
    
    # Remove existing
    docker rm -f "$container" 2>/dev/null || true
    
    # Create new container with sleep
    docker run -d \
        --name "$container" \
        --entrypoint sleep \
        -v "/Users/andrewkhoh/Documents/myfarmstand-mobile/docker/volumes/phase1-role-foundation-${agent}:/workspace:rw" \
        -v "/Users/andrewkhoh/Documents/myfarmstand-mobile/docker/volumes/communication:/shared:rw" \
        -e "AGENT_NAME=${agent}" \
        -e "CLAUDE_CONFIG_DIR=/home/agent/.claude" \
        docker-role-services-agent \
        7200
    
    echo "✅ Created ${container}"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Manual Authentication Instructions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For EACH container, run these commands in separate terminal windows:"
echo ""

for agent in "${AGENTS[@]}"; do
    echo "Container: ${agent}-auth"
    echo "  1. docker exec -it ${agent}-auth /bin/bash"
    echo "  2. claude login"
    echo "  3. Open the URL in your browser and complete login"
    echo "  4. Exit the container with 'exit'"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After authenticating all containers, press Enter to test..."
read -r

echo ""
echo "🧪 Testing authentication..."
echo ""

SUCCESS=0
FAILED=0

for agent in "${AGENTS[@]}"; do
    container="${agent}-auth"
    echo -n "Testing ${agent}... "
    
    if docker exec "$container" sh -c 'echo "test" | claude --dangerously-skip-permissions -p "Say hello" 2>&1' | grep -qi "hello"; then
        echo "✅ Authenticated"
        ((SUCCESS++))
        
        # Launch with DEBUG prompt
        echo "  Launching with DEBUG prompt..."
        docker exec -d "$container" sh -c "
            cat > /tmp/debug.md << 'EOF'
# DEBUG MODE - Agent: ${agent}

Analyze the /workspace directory and report findings to /shared/progress/${agent}.md
Do not modify any code files.
EOF
            
            while true; do
                claude --dangerously-skip-permissions -p \"\$(cat /tmp/debug.md)\" 2>&1 | tee -a /shared/logs/${agent}.log
                sleep 60
            done
        "
    else
        echo "❌ Not authenticated"
        ((FAILED++))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  ✅ Authenticated: $SUCCESS agents"
echo "  ❌ Failed: $FAILED agents"
echo ""

if [ $SUCCESS -gt 0 ]; then
    echo "Authenticated agents are now running with DEBUG prompts!"
    echo ""
    echo "Monitor logs:"
    echo "  tail -f docker/volumes/communication/logs/*.log"
    echo ""
    echo "Check progress:"
    echo "  ls -la docker/volumes/communication/progress/"
fi