#!/bin/bash

# Phase 2 Launch Script using Real Claude Code SDK
# Orchestrates 5 parallel agents to achieve 100% infrastructure adoption

set -e

echo "🚀 PHASE 2 LAUNCHER WITH CLAUDE CODE SDK"
echo "========================================="
echo ""

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY is required"
    echo ""
    echo "Get your API key from: https://console.anthropic.com/"
    echo "Then set it: export ANTHROPIC_API_KEY='your-key-here'"
    exit 1
fi

echo "✅ API key is set"

# Check for Claude Code SDK
if ! npm list -g @anthropic-ai/claude-code &>/dev/null; then
    echo ""
    echo "📦 Installing Claude Code SDK..."
    npm install -g @anthropic-ai/claude-code
fi

echo "✅ Claude Code SDK is installed"

# Check TypeScript
if ! command -v tsx &>/dev/null; then
    echo ""
    echo "📦 Installing tsx..."
    npm install -g tsx
fi

echo "✅ TypeScript executor is ready"

# Verify worktrees
echo ""
echo "Checking Phase 2 worktrees..."
missing=0
for agent in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
    if [ ! -d "../$agent" ]; then
        echo "   ❌ Missing: ../$agent"
        missing=$((missing + 1))
    else
        echo "   ✅ Found: ../$agent"
    fi
done

if [ $missing -gt 0 ]; then
    echo ""
    echo "Creating missing worktrees..."
    for agent in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
        if [ ! -d "../$agent" ]; then
            git worktree add "../$agent" -b "$agent" main
            echo "   ✅ Created: ../$agent"
        fi
    done
fi

# Setup communication
echo ""
echo "Setting up communication channels..."
COMM_DIR="test-fixes-communication"
mkdir -p "$COMM_DIR"/{tasks,progress,handoffs,blockers}

# Verify task files
echo ""
echo "Verifying task files..."
task_count=0
for agent in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
    if [ -f "$COMM_DIR/tasks/$agent.json" ]; then
        files=$(grep -c '"src/' "$COMM_DIR/tasks/$agent.json" 2>/dev/null || echo "0")
        echo "   ✅ $agent: $files files"
        task_count=$((task_count + files))
    else
        echo "   ❌ Missing task file for $agent"
    fi
done
echo "   Total: $task_count files to fix"

# Run baseline audit
echo ""
echo "Running baseline audit..."
./phase2-infrastructure-audit.sh > "$COMM_DIR/baseline-sdk.txt" 2>&1 || true
grep "OVERALL" "$COMM_DIR/baseline-sdk.txt" 2>/dev/null || echo "   Audit failed"

# Launch method selection
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "How would you like to run the agents?"
echo ""
echo "1) Sequential (one at a time, easier to monitor)"
echo "2) Parallel (all at once, faster but harder to monitor)"
echo "3) Interactive (you run each agent manually)"
echo ""
read -p "Choose (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "🔄 Running agents sequentially..."
        echo ""
        
        for agent in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
            if [ -f "$COMM_DIR/tasks/$agent.json" ]; then
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "Starting: $agent"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                
                cd "../$agent"
                AGENT_ID="$agent" \
                COMM_DIR="../myfarmstand-mobile/$COMM_DIR" \
                tsx ../myfarmstand-mobile/scripts/phase2-sdk-agent.ts
                
                cd - > /dev/null
                echo "✅ $agent complete"
                echo ""
            fi
        done
        ;;
        
    2)
        echo ""
        echo "🚀 Launching all agents in parallel..."
        echo ""
        
        # Launch all agents in background
        pids=()
        for agent in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
            if [ -f "$COMM_DIR/tasks/$agent.json" ]; then
                echo "Launching: $agent"
                (
                    cd "../$agent"
                    AGENT_ID="$agent" \
                    COMM_DIR="../myfarmstand-mobile/$COMM_DIR" \
                    tsx ../myfarmstand-mobile/scripts/phase2-sdk-agent.ts \
                    > "../myfarmstand-mobile/$COMM_DIR/logs/$agent.log" 2>&1
                ) &
                pids+=($!)
            fi
        done
        
        echo ""
        echo "All agents launched. PIDs: ${pids[@]}"
        echo ""
        echo "Monitor with: ./scripts/monitor-phase2.sh"
        echo "View logs: tail -f $COMM_DIR/logs/*.log"
        echo ""
        echo "Waiting for completion..."
        
        # Wait for all to complete
        for pid in "${pids[@]}"; do
            wait $pid
        done
        
        echo "✅ All agents complete!"
        ;;
        
    3)
        echo ""
        echo "📝 Manual execution instructions:"
        echo ""
        echo "Open 5 terminal windows and run these commands:"
        echo ""
        
        for agent in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
            echo "Terminal for $agent:"
            echo "  cd ../$agent"
            echo "  export ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY'"
            echo "  AGENT_ID='$agent' COMM_DIR='../myfarmstand-mobile/$COMM_DIR' \\"
            echo "    tsx ../myfarmstand-mobile/scripts/phase2-sdk-agent.ts"
            echo ""
        done
        
        echo "Monitor progress in another terminal:"
        echo "  ./scripts/monitor-phase2.sh"
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Final audit
echo ""
echo "Running final audit..."
./phase2-infrastructure-audit.sh > "$COMM_DIR/final-sdk.txt" 2>&1 || true

echo ""
echo "Comparing results:"
echo "━━━━━━━━━━━━━━━━━"
echo -n "Before: "
grep "OVERALL" "$COMM_DIR/baseline-sdk.txt" 2>/dev/null || echo "unknown"
echo -n "After:  "
grep "OVERALL" "$COMM_DIR/final-sdk.txt" 2>/dev/null || echo "unknown"

echo ""
echo "✅ Phase 2 execution complete!"
echo ""
echo "Next steps:"
echo "1. Review changes in each worktree"
echo "2. Run tests: npm test"
echo "3. Merge to main if satisfied"