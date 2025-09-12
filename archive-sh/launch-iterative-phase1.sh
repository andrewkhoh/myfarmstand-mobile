#!/bin/bash

# Phase 1 Iterative Multi-Round Launch Script
# Implements Option 2: Integration-driven feedback loops with max 3 rounds

set -e

# Configuration
MAX_ROUNDS=3
CURRENT_ROUND=1
BASE_DIR="/Users/andrewkhoh/Documents/myfarmstand-mobile"
DOCKER_DIR="$BASE_DIR/docker"
COMM_DIR="$DOCKER_DIR/volumes/communication"

echo "🚀 Starting Phase 1 Iterative Multi-Agent System"
echo "📋 Max rounds: $MAX_ROUNDS"
echo "📅 $(date)"

# Ensure communication directories exist
mkdir -p "$COMM_DIR/feedback" "$COMM_DIR/progress" "$COMM_DIR/logs" "$COMM_DIR/handoffs" "$COMM_DIR/blockers"

# Clear previous feedback
rm -f "$COMM_DIR/feedback"/*.md 2>/dev/null || true

# Function to check if all agents completed successfully
check_agents_success() {
    local success=true
    
    # Check for completion handoff files
    for agent in role-services role-hooks role-navigation role-screens permission-ui; do
        if [[ ! -f "$COMM_DIR/handoffs/$agent-complete.md" ]]; then
            echo "❌ $agent not complete"
            success=false
        fi
    done
    
    # Check for any critical feedback files
    if ls "$COMM_DIR/feedback"/*-fixes-needed.md >/dev/null 2>&1; then
        echo "⚠️ Critical fixes still needed"
        success=false
    fi
    
    if [[ "$success" == "true" ]]; then
        echo "✅ All agents successfully completed"
        return 0
    else
        return 1
    fi
}

# Function to launch worker agents
launch_worker_agents() {
    local round=$1
    echo ""
    echo "🔄 Round $round - Launching Worker Agents"
    
    # Launch all worker agents in parallel
    local agents=("role-services" "role-hooks" "role-navigation" "role-screens" "permission-ui")
    
    for agent in "${agents[@]}"; do
        echo "🚀 Launching $agent (Round $round)"
        
        # Create container with round-specific name
        docker run -d \
            --name "phase1-$agent-round$round" \
            --network phase1-network \
            -v "$DOCKER_DIR/volumes/phase1-role-foundation-$agent:/workspace" \
            -v "$COMM_DIR:/shared" \
            -v "$BASE_DIR:/app" \
            --env AGENT_NAME="$agent" \
            --env ROUND="$round" \
            phase1-agent:latest \
            claude code --dangerously-skip-permission-checks "/shared/agents/prompts/$agent-agent.md"
    done
    
    # Wait for all worker agents to complete
    echo "⏳ Waiting for all worker agents to complete..."
    
    while true; do
        local running_count=0
        for agent in "${agents[@]}"; do
            if docker ps --format "table {{.Names}}" | grep -q "phase1-$agent-round$round"; then
                running_count=$((running_count + 1))
            fi
        done
        
        if [[ $running_count -eq 0 ]]; then
            echo "✅ All worker agents completed Round $round"
            break
        fi
        
        echo "⏳ Still running: $running_count agents..."
        sleep 30
    done
    
    # Show completion status
    for agent in "${agents[@]}"; do
        local container_name="phase1-$agent-round$round"
        local exit_code=$(docker inspect "$container_name" --format='{{.State.ExitCode}}' 2>/dev/null || echo "unknown")
        echo "📊 $agent (Round $round): Exit code $exit_code"
        
        # Cleanup container
        docker rm "$container_name" >/dev/null 2>&1 || true
    done
}

# Function to launch integration agent
launch_integration_agent() {
    local round=$1
    echo ""
    echo "🔍 Round $round - Launching Integration Agent"
    
    # Launch integration agent
    docker run -d \
        --name "phase1-integration-round$round" \
        --network phase1-network \
        -v "$DOCKER_DIR/volumes/phase1-role-foundation-integration:/workspace" \
        -v "$COMM_DIR:/shared" \
        -v "$BASE_DIR:/app" \
        --env AGENT_NAME="integration" \
        --env ROUND="$round" \
        phase1-agent:latest \
        claude code --dangerously-skip-permission-checks "/shared/agents/prompts/integration-agent.md"
    
    # Wait for integration agent to complete
    echo "⏳ Waiting for integration agent to complete..."
    
    while docker ps --format "table {{.Names}}" | grep -q "phase1-integration-round$round"; do
        sleep 30
        echo "⏳ Integration agent still analyzing..."
    done
    
    local container_name="phase1-integration-round$round"
    local exit_code=$(docker inspect "$container_name" --format='{{.State.ExitCode}}' 2>/dev/null || echo "unknown")
    echo "📊 Integration (Round $round): Exit code $exit_code"
    
    # Show integration logs
    echo ""
    echo "📋 Integration Agent Summary:"
    docker logs "$container_name" | tail -20
    
    # Cleanup container
    docker rm "$container_name" >/dev/null 2>&1 || true
}

# Main iteration loop
while [[ $CURRENT_ROUND -le $MAX_ROUNDS ]]; do
    echo ""
    echo "======================================"
    echo "🔄 STARTING ROUND $CURRENT_ROUND of $MAX_ROUNDS"
    echo "======================================"
    
    # Launch worker agents for this round
    launch_worker_agents $CURRENT_ROUND
    
    # Launch integration agent to analyze and provide feedback
    launch_integration_agent $CURRENT_ROUND
    
    # Check if all agents completed successfully
    if check_agents_success; then
        echo ""
        echo "🎉 SUCCESS: All agents completed successfully!"
        echo "✅ Phase 1 Multi-Agent System completed in $CURRENT_ROUND rounds"
        
        # Show final summary
        echo ""
        echo "📊 Final Summary:"
        echo "- Rounds completed: $CURRENT_ROUND"
        echo "- Max rounds allowed: $MAX_ROUNDS"
        echo "- All agents: ✅ Complete"
        echo "- Critical issues: ✅ Resolved"
        
        break
    else
        if [[ $CURRENT_ROUND -eq $MAX_ROUNDS ]]; then
            echo ""
            echo "⚠️ MAXIMUM ROUNDS REACHED"
            echo "❌ Some agents did not complete successfully after $MAX_ROUNDS rounds"
            echo "🔍 Check feedback files in $COMM_DIR/feedback/ for remaining issues"
            
            # Show remaining issues
            echo ""
            echo "📋 Remaining Issues:"
            for feedback_file in "$COMM_DIR/feedback"/*-fixes-needed.md; do
                if [[ -f "$feedback_file" ]]; then
                    echo "🔴 $(basename "$feedback_file")"
                    echo "   $(head -3 "$feedback_file" | tail -1)"
                fi
            done
            
            break
        else
            echo ""
            echo "🔄 Issues found - preparing for Round $((CURRENT_ROUND + 1))"
            echo "📋 Feedback generated for agents to address in next round"
            
            # Show feedback summary
            echo ""
            echo "📋 Feedback Summary:"
            for feedback_file in "$COMM_DIR/feedback"/*.md; do
                if [[ -f "$feedback_file" ]]; then
                    echo "📝 $(basename "$feedback_file")"
                fi
            done
            
            CURRENT_ROUND=$((CURRENT_ROUND + 1))
            
            # Brief pause between rounds
            echo ""
            echo "⏳ Starting next round in 10 seconds..."
            sleep 10
        fi
    fi
done

echo ""
echo "🏁 Phase 1 Iterative Multi-Agent System completed"
echo "📅 $(date)"
echo "📁 Check results in: $COMM_DIR/"