#!/bin/bash

# Phase 2 Worktree Setup - Creates fresh worktrees from latest main
# Or updates existing ones to ensure clean slate for 100% adoption

echo "🔧 PHASE 2 WORKTREE SETUP"
echo "========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Phase 2 agents and their corresponding Phase 1 worktrees (if any)
declare -A phase2_agents=(
    ["phase2-core-services"]="test-fixes-service-suites"
    ["phase2-extension-services"]="NONE"
    ["phase2-core-hooks"]="test-fixes-core-hooks"
    ["phase2-extension-hooks"]="test-fixes-critical-hooks"
    ["phase2-schema-other"]="test-fixes-schema-fixes"
)

# First, ensure we're on main and up to date
echo "Updating main branch..."
git checkout main
git pull origin main 2>/dev/null || echo "No remote to pull from"

# Get latest commit on main
MAIN_COMMIT=$(git rev-parse HEAD)
echo "Main branch at: $MAIN_COMMIT"
echo ""

# Setup each Phase 2 worktree
for phase2_agent in "${!phase2_agents[@]}"; do
    phase1_worktree="${phase2_agents[$phase2_agent]}"
    worktree_path="../$phase2_agent"
    
    echo -e "${YELLOW}Setting up: $phase2_agent${NC}"
    
    # Check if we should reuse Phase 1 worktree
    if [ "$phase1_worktree" != "NONE" ] && [ -d "../$phase1_worktree" ]; then
        echo "  Found Phase 1 worktree: $phase1_worktree"
        
        # Check if Phase 1 work was merged
        cd "../$phase1_worktree"
        phase1_commit=$(git rev-parse HEAD)
        
        # Check if this commit is in main's history
        if git merge-base --is-ancestor "$phase1_commit" "$MAIN_COMMIT" 2>/dev/null; then
            echo -e "  ${GREEN}✓ Phase 1 work already merged to main${NC}"
            
            # Reset to latest main for Phase 2
            git checkout main 2>/dev/null || git checkout -b main origin/main
            git reset --hard "$MAIN_COMMIT"
            echo -e "  ${GREEN}✓ Reset to latest main for Phase 2${NC}"
        else
            echo -e "  ${YELLOW}⚠ Phase 1 work not merged, preserving branch${NC}"
            # Keep the branch but create new Phase 2 worktree
            cd - > /dev/null
            
            # Create fresh Phase 2 worktree
            if [ -d "$worktree_path" ]; then
                echo "  Removing old Phase 2 worktree..."
                git worktree remove "$worktree_path" --force 2>/dev/null
            fi
            
            echo "  Creating fresh Phase 2 worktree..."
            git worktree add "$worktree_path" -b "$phase2_agent" main
            echo -e "  ${GREEN}✓ Created new worktree at $worktree_path${NC}"
        fi
        cd - > /dev/null
    else
        # No Phase 1 worktree, create fresh Phase 2
        if [ -d "$worktree_path" ]; then
            echo "  Removing existing worktree..."
            git worktree remove "$worktree_path" --force 2>/dev/null
        fi
        
        echo "  Creating fresh Phase 2 worktree..."
        git worktree add "$worktree_path" -b "$phase2_agent" main
        echo -e "  ${GREEN}✓ Created new worktree at $worktree_path${NC}"
    fi
    
    # Verify worktree is ready
    if [ -d "$worktree_path" ]; then
        cd "$worktree_path"
        current_branch=$(git branch --show-current)
        current_commit=$(git rev-parse HEAD)
        echo "  Branch: $current_branch"
        echo "  Commit: $current_commit"
        
        # Ensure npm dependencies are installed
        if [ -f "package.json" ]; then
            echo "  Installing dependencies..."
            npm install --silent 2>/dev/null
            echo -e "  ${GREEN}✓ Dependencies installed${NC}"
        fi
        cd - > /dev/null
    fi
    echo ""
done

echo -e "${GREEN}✅ Phase 2 worktrees are ready!${NC}"
echo ""
echo "Summary of Phase 2 worktrees:"
echo "────────────────────────────"

for phase2_agent in "${!phase2_agents[@]}"; do
    worktree_path="../$phase2_agent"
    if [ -d "$worktree_path" ]; then
        cd "$worktree_path"
        branch=$(git branch --show-current)
        commit=$(git rev-parse --short HEAD)
        echo -e "  ${GREEN}✓${NC} $phase2_agent ($branch @ $commit)"
        cd - > /dev/null
    else
        echo -e "  ${RED}✗${NC} $phase2_agent (not created)"
    fi
done

echo ""
echo "Next steps:"
echo "1. Run: ./scripts/phase2-task-generator.sh"
echo "2. Run: ./scripts/launch-phase2.sh"
echo "3. Monitor: ./scripts/monitor-phase2.sh"