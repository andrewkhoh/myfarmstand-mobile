#!/bin/bash
# Emergency recovery for Phase 1 agents

set -euo pipefail

AGENT_NAME="${1:-}"
RECOVERY_TYPE="${2:-restart}" # restart, restore, rebuild

if [ -z "$AGENT_NAME" ]; then
    echo "❌ Usage: $0 <agent-name> [restart|restore|rebuild]"
    echo ""
    echo "Available agents:"
    echo "  • role-services"
    echo "  • role-hooks"
    echo "  • role-navigation"
    echo "  • role-screens"
    echo "  • permission-ui"
    echo "  • integration"
    exit 1
fi

echo "🚨 Emergency Recovery for $AGENT_NAME"
echo "Recovery Type: $RECOVERY_TYPE"
echo "═══════════════════════════════════════"
echo ""

case $RECOVERY_TYPE in
    "restart")
        echo "🔄 Restarting container..."
        cd docker
        docker-compose -f docker-compose-phase1.yml restart "${AGENT_NAME}-agent"
        cd ..
        
        # Log restart in progress file
        echo "$(date): Emergency restart performed" >> \
            "docker/volumes/communication/progress/${AGENT_NAME}.md"
        
        echo "✅ Container restarted"
        ;;
        
    "restore")
        echo "📸 Finding latest snapshot..."
        SNAPSHOT_DIR=$(find docker/volumes/snapshots -name "${AGENT_NAME}-*" -type d 2>/dev/null | sort -r | head -n1)
        
        if [ -z "$SNAPSHOT_DIR" ]; then
            echo "❌ No snapshots found for $AGENT_NAME"
            echo "Creating emergency snapshot first..."
            
            # Create snapshot
            SNAPSHOT_DIR="docker/volumes/snapshots/${AGENT_NAME}-$(date +%Y%m%d-%H%M%S)"
            mkdir -p "$SNAPSHOT_DIR"
            cp -r "docker/volumes/phase1-role-foundation-${AGENT_NAME}" "$SNAPSHOT_DIR/workspace"
            cp "docker/volumes/communication/progress/${AGENT_NAME}.md" "$SNAPSHOT_DIR/progress.md" 2>/dev/null || true
            
            echo "📸 Snapshot created: $SNAPSHOT_DIR"
        fi
        
        echo "🔄 Restoring from $SNAPSHOT_DIR..."
        
        # Stop container
        cd docker
        docker-compose -f docker-compose-phase1.yml stop "${AGENT_NAME}-agent"
        cd ..
        
        # Restore workspace
        rm -rf "docker/volumes/phase1-role-foundation-${AGENT_NAME}"
        cp -r "$SNAPSHOT_DIR/workspace" "docker/volumes/phase1-role-foundation-${AGENT_NAME}"
        
        # Restore progress
        if [ -f "$SNAPSHOT_DIR/progress.md" ]; then
            cp "$SNAPSHOT_DIR/progress.md" "docker/volumes/communication/progress/${AGENT_NAME}.md"
        fi
        
        # Restart container
        cd docker
        docker-compose -f docker-compose-phase1.yml start "${AGENT_NAME}-agent"
        cd ..
        
        echo "✅ Restored from snapshot and restarted"
        ;;
        
    "rebuild")
        echo "🏗️ Rebuilding container from scratch..."
        
        # Create backup first
        echo "📸 Creating backup..."
        BACKUP_DIR="docker/volumes/snapshots/${AGENT_NAME}-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r "docker/volumes/phase1-role-foundation-${AGENT_NAME}" "$BACKUP_DIR/workspace" 2>/dev/null || true
        cp "docker/volumes/communication/progress/${AGENT_NAME}.md" "$BACKUP_DIR/progress.md" 2>/dev/null || true
        echo "  Backup saved to: $BACKUP_DIR"
        
        # Stop and remove container
        cd docker
        docker-compose -f docker-compose-phase1.yml stop "${AGENT_NAME}-agent"
        docker-compose -f docker-compose-phase1.yml rm -f "${AGENT_NAME}-agent"
        
        # Rebuild and restart
        docker-compose -f docker-compose-phase1.yml build "${AGENT_NAME}-agent"
        docker-compose -f docker-compose-phase1.yml up -d "${AGENT_NAME}-agent"
        cd ..
        
        echo "✅ Container rebuilt and restarted"
        ;;
        
    *)
        echo "❌ Unknown recovery type: $RECOVERY_TYPE"
        echo "Options: restart, restore, rebuild"
        exit 1
        ;;
esac

echo ""
echo "📊 Current Container Status:"
echo "────────────────────────────"
cd docker
docker-compose -f docker-compose-phase1.yml ps "${AGENT_NAME}-agent"
cd ..

echo ""
echo "📄 Latest Progress Entry:"
echo "─────────────────────────"
if [ -f "docker/volumes/communication/progress/${AGENT_NAME}.md" ]; then
    tail -3 "docker/volumes/communication/progress/${AGENT_NAME}.md"
else
    echo "No progress file found"
fi

echo ""
echo "✅ Recovery complete!"
echo ""
echo "💡 Next steps:"
echo "  • Monitor logs: docker logs -f ${AGENT_NAME}-agent"
echo "  • Check progress: tail -f docker/volumes/communication/progress/${AGENT_NAME}.md"
echo "  • View all status: docker-compose -f docker/docker-compose-phase1.yml ps"