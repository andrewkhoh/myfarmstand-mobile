#!/bin/bash
# Stop Phase 1 Multi-Agent Workflow

set -euo pipefail

echo "🛑 Stopping Phase 1 Multi-Agent Workflow..."
echo "==========================================="
echo ""

# Step 1: Stop docker containers
echo "📦 Stopping Docker containers..."
cd docker
docker-compose -f docker-compose-phase1.yml down
cd ..

echo "  ✅ All containers stopped"

# Step 2: Kill background monitoring processes
echo ""
echo "🔍 Stopping monitoring processes..."
pkill -f "monitor-phase1-progress.sh" 2>/dev/null || echo "  ℹ️  No monitoring process found"

echo "  ✅ Monitoring stopped"

# Step 3: Optional backup
if [[ "${1:-}" == "--backup" ]]; then
    echo ""
    echo "📸 Creating backup..."
    BACKUP_DIR="backups/phase1-$(date +%Y%m%d-%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # Backup communication hub
    cp -r docker/volumes/communication $BACKUP_DIR/
    echo "  ✅ Communication hub backed up"
    
    # Backup agent workspaces
    for workspace in docker/volumes/phase1-role-foundation-*; do
        if [ -d "$workspace" ]; then
            AGENT_NAME=$(basename "$workspace" | sed 's/phase1-role-foundation-//')
            echo "  Backing up $AGENT_NAME workspace..."
            cp -r "$workspace" "$BACKUP_DIR/"
        fi
    done
    
    echo "  ✅ Backup created: $BACKUP_DIR"
fi

# Step 4: Show final status
echo ""
echo "📊 Final Status:"
echo "───────────────"

# Count completed agents
COMPLETED_COUNT=0
TOTAL_AGENTS=6

for agent in role-services role-hooks role-navigation role-screens permission-ui integration; do
    if [ -f "docker/volumes/communication/handoffs/${agent}-complete.md" ]; then
        COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
        echo "  ✅ $agent - Completed"
    else
        echo "  ⏸️  $agent - Incomplete"
    fi
done

echo ""
echo "Progress: $COMPLETED_COUNT/$TOTAL_AGENTS agents completed"

# Step 5: Cleanup options
echo ""
echo "🧹 Cleanup Options:"
echo "──────────────────"
echo "  • Remove worktrees: git worktree prune"
echo "  • Remove branches: git branch -D phase1-role-foundation-*"
echo "  • Clean volumes: rm -rf docker/volumes/"
echo "  • Full reset: ./scripts/clean-phase1.sh"

echo ""
echo "✅ Phase 1 workflow stopped successfully!"

# Optional cleanup
if [[ "${2:-}" == "--clean" ]]; then
    echo ""
    echo "🧹 Performing cleanup..."
    
    # Remove git worktrees
    git worktree prune
    echo "  ✅ Git worktrees pruned"
    
    # Remove branches
    for branch in $(git branch | grep phase1-role-foundation); do
        git branch -D "$branch" 2>/dev/null || true
    done
    echo "  ✅ Git branches removed"
    
    echo ""
    echo "✅ Cleanup complete!"
fi