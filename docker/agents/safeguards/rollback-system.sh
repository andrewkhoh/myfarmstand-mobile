#!/bin/bash
# Comprehensive Rollback and Recovery System
# Provides multiple levels of rollback for integration agent mistakes

set -e

# Configuration
WORKSPACE="/workspace"
SNAPSHOTS_DIR="/shared/snapshots"
BACKUPS_DIR="/shared/backups"
ROLLBACK_LOG="/shared/rollback/rollback-operations.log"

# Create necessary directories
mkdir -p "$SNAPSHOTS_DIR" "$BACKUPS_DIR" "/shared/rollback"

echo "🔄 ROLLBACK & RECOVERY SYSTEM"
echo "============================="

# Rollback Level 1: Git-based rollback (safest)
rollback_git() {
    local target_commit="$1"
    local reason="$2"
    
    echo "🔄 GIT ROLLBACK - Level 1"
    echo "========================"
    echo "Target commit: $target_commit"
    echo "Reason: $reason"
    echo ""
    
    cd "$WORKSPACE"
    
    # Verify target commit exists
    if ! git cat-file -e "$target_commit" 2>/dev/null; then
        echo "❌ ERROR: Commit $target_commit does not exist"
        return 1
    fi
    
    # Show what will be rolled back
    echo "📊 Changes to be rolled back:"
    git diff "$target_commit"..HEAD --name-only | head -20
    echo ""
    
    # Create recovery point before rollback
    RECOVERY_TAG="recovery-before-rollback-$(date +%Y%m%d-%H%M%S)"
    git tag -a "$RECOVERY_TAG" -m "Recovery point before rollback: $reason"
    echo "✅ Recovery tag created: $RECOVERY_TAG"
    
    # Perform rollback
    echo "🔄 Performing git rollback..."
    if git reset --hard "$target_commit"; then
        echo "✅ Git rollback successful"
        
        # Log the rollback
        cat >> "$ROLLBACK_LOG" << EOF
[$(date -Iseconds)] GIT ROLLBACK
Target: $target_commit
Reason: $reason
Recovery Tag: $RECOVERY_TAG
Status: SUCCESS
Files Affected: $(git diff "$target_commit"..HEAD~1 --name-only | wc -l)
EOF
        return 0
    else
        echo "❌ Git rollback failed"
        return 1
    fi
}

# Rollback Level 2: Snapshot-based rollback
rollback_snapshot() {
    local snapshot_name="$1"
    local reason="$2"
    
    echo "📸 SNAPSHOT ROLLBACK - Level 2"
    echo "=============================="
    echo "Snapshot: $snapshot_name"  
    echo "Reason: $reason"
    echo ""
    
    local snapshot_path="$SNAPSHOTS_DIR/$snapshot_name"
    
    if [ ! -d "$snapshot_path" ]; then
        echo "❌ ERROR: Snapshot $snapshot_name not found"
        return 1
    fi
    
    cd "$WORKSPACE"
    
    # Create backup of current state first
    BACKUP_NAME="pre-rollback-$(date +%Y%m%d-%H%M%S)"
    echo "💾 Creating backup: $BACKUP_NAME"
    mkdir -p "$BACKUPS_DIR/$BACKUP_NAME"
    
    # Backup critical files
    cp -r src "$BACKUPS_DIR/$BACKUP_NAME/" 2>/dev/null || true
    cp package.json "$BACKUPS_DIR/$BACKUP_NAME/" 2>/dev/null || true
    cp tsconfig.json "$BACKUPS_DIR/$BACKUP_NAME/" 2>/dev/null || true
    git status --porcelain > "$BACKUPS_DIR/$BACKUP_NAME/git-status.txt"
    
    # Restore from snapshot
    echo "🔄 Restoring from snapshot..."
    
    # Restore package.json
    if [ -f "$snapshot_path/package.json" ]; then
        cp "$snapshot_path/package.json" package.json
        echo "  ✅ Restored package.json"
    fi
    
    # Restore config files
    if [ -f "$snapshot_path/tsconfig.json" ]; then
        cp "$snapshot_path/tsconfig.json" tsconfig.json  
        echo "  ✅ Restored tsconfig.json"
    fi
    
    # Git rollback to snapshot state
    if [ -f "$snapshot_path/git-status.txt" ] && [ -f "$snapshot_path/recent-commits.txt" ]; then
        SNAPSHOT_COMMIT=$(head -1 "$snapshot_path/recent-commits.txt" | cut -d' ' -f1)
        if [ -n "$SNAPSHOT_COMMIT" ]; then
            git reset --hard "$SNAPSHOT_COMMIT" 2>/dev/null || echo "  ⚠️ Could not reset to snapshot commit"
        fi
    fi
    
    echo "✅ Snapshot rollback completed"
    
    # Log the rollback
    cat >> "$ROLLBACK_LOG" << EOF
[$(date -Iseconds)] SNAPSHOT ROLLBACK
Snapshot: $snapshot_name
Reason: $reason
Backup Created: $BACKUP_NAME
Status: SUCCESS
EOF
    
    return 0
}

# Rollback Level 3: Selective file rollback
rollback_files() {
    local files_list="$1"
    local reason="$2"
    
    echo "📄 SELECTIVE FILE ROLLBACK - Level 3"
    echo "===================================="
    echo "Files: $files_list"
    echo "Reason: $reason"
    echo ""
    
    cd "$WORKSPACE"
    
    # Create backup first
    BACKUP_NAME="selective-rollback-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUPS_DIR/$BACKUP_NAME"
    
    echo "💾 Backing up files before rollback..."
    echo "$files_list" | while read -r file; do
        if [ -f "$file" ]; then
            mkdir -p "$BACKUPS_DIR/$BACKUP_NAME/$(dirname "$file")"
            cp "$file" "$BACKUPS_DIR/$BACKUP_NAME/$file"
            echo "  💾 Backed up: $file"
        fi
    done
    
    # Rollback specific files to HEAD~1
    echo "🔄 Rolling back files..."
    echo "$files_list" | while read -r file; do
        if git checkout HEAD~1 -- "$file" 2>/dev/null; then
            echo "  ✅ Rolled back: $file"
        else
            echo "  ❌ Failed to rollback: $file"
        fi
    done
    
    # Log the rollback
    cat >> "$ROLLBACK_LOG" << EOF
[$(date -Iseconds)] SELECTIVE FILE ROLLBACK
Files: $(echo "$files_list" | tr '\n' ', ')
Reason: $reason
Backup: $BACKUP_NAME
Status: COMPLETED
EOF
    
    return 0
}

# Emergency full rollback (nuclear option)
emergency_rollback() {
    local reason="$1"
    
    echo "🚨 EMERGENCY FULL ROLLBACK - Level 4"
    echo "===================================="
    echo "Reason: $reason"
    echo ""
    
    cd "$WORKSPACE"
    
    # Find the last known good state (before any integration work)
    LAST_GOOD_COMMIT=$(git log --oneline | grep -v "integrate\|integration\|cycle" | head -1 | cut -d' ' -f1)
    
    if [ -z "$LAST_GOOD_COMMIT" ]; then
        echo "❌ ERROR: Could not find last known good commit"
        return 1
    fi
    
    echo "📊 Emergency rollback to: $LAST_GOOD_COMMIT"
    git log --oneline -1 "$LAST_GOOD_COMMIT"
    echo ""
    
    # Create emergency backup
    EMERGENCY_BACKUP="emergency-$(date +%Y%m%d-%H%M%S)"
    echo "💾 Creating emergency backup: $EMERGENCY_BACKUP"
    
    mkdir -p "$BACKUPS_DIR/$EMERGENCY_BACKUP"
    cp -r src "$BACKUPS_DIR/$EMERGENCY_BACKUP/" 2>/dev/null || true
    cp -r docker/volumes/tdd_phase_4-* "$BACKUPS_DIR/$EMERGENCY_BACKUP/" 2>/dev/null || true
    cp package*.json "$BACKUPS_DIR/$EMERGENCY_BACKUP/" 2>/dev/null || true
    git log --oneline -20 > "$BACKUPS_DIR/$EMERGENCY_BACKUP/recent-commits.txt"
    git status --porcelain > "$BACKUPS_DIR/$EMERGENCY_BACKUP/git-status.txt"
    
    # Perform emergency rollback
    echo "🚨 Performing emergency rollback..."
    if git reset --hard "$LAST_GOOD_COMMIT"; then
        echo "✅ Emergency rollback successful"
        echo "🔄 Repository restored to clean state"
        
        # Clean any untracked files
        git clean -fd
        
        # Log the emergency rollback
        cat >> "$ROLLBACK_LOG" << EOF
[$(date -Iseconds)] EMERGENCY ROLLBACK
Target: $LAST_GOOD_COMMIT
Reason: $reason
Emergency Backup: $EMERGENCY_BACKUP
Status: SUCCESS
Files Cleaned: ALL integration work removed
EOF
        return 0
    else
        echo "❌ Emergency rollback failed"
        return 1
    fi
}

# Smart rollback - automatically determine best rollback method
smart_rollback() {
    local reason="$1"
    
    echo "🧠 SMART ROLLBACK ANALYSIS"
    echo "========================="
    echo "Reason: $reason"
    echo ""
    
    cd "$WORKSPACE"
    
    # Analyze the situation
    COMMITS_AHEAD=$(git rev-list --count HEAD ^origin/main 2>/dev/null || echo "0")
    MODIFIED_FILES=$(git status --porcelain | wc -l)
    INTEGRATION_FILES=$(git diff HEAD~1 --name-only | grep -c "executive-" || echo "0")
    
    echo "📊 Situation Analysis:"
    echo "  Commits ahead of main: $COMMITS_AHEAD"
    echo "  Modified files: $MODIFIED_FILES"  
    echo "  Integration files: $INTEGRATION_FILES"
    echo ""
    
    # Determine best rollback strategy
    if [ "$COMMITS_AHEAD" -le 1 ] && [ "$MODIFIED_FILES" -le 10 ]; then
        echo "🎯 Recommended: Git rollback (simple case)"
        rollback_git "HEAD~1" "$reason"
    elif [ -d "$SNAPSHOTS_DIR/baseline" ]; then
        echo "🎯 Recommended: Snapshot rollback (baseline available)"
        rollback_snapshot "baseline" "$reason"
    elif [ "$INTEGRATION_FILES" -gt 0 ]; then
        echo "🎯 Recommended: Selective file rollback (integration files only)"
        git diff HEAD~1 --name-only | grep "executive-" | rollback_files "-" "$reason"
    else
        echo "🎯 Recommended: Emergency rollback (complex situation)"
        emergency_rollback "$reason"
    fi
}

# Recovery verification
verify_recovery() {
    echo "✅ RECOVERY VERIFICATION"
    echo "======================="
    
    cd "$WORKSPACE"
    
    # TypeScript compilation check
    echo "📝 Checking TypeScript compilation..."
    if npm run typecheck > /tmp/recovery-typecheck.log 2>&1; then
        echo "  ✅ TypeScript: PASSED"
    else
        echo "  ❌ TypeScript: FAILED"
        echo "    First few errors:"
        head -5 /tmp/recovery-typecheck.log | sed 's/^/    /'
    fi
    
    # Test run
    echo "🧪 Running basic tests..."
    if npm test -- --passWithNoTests > /tmp/recovery-test.log 2>&1; then
        echo "  ✅ Tests: PASSED"
    else
        echo "  ❌ Tests: FAILED"
        echo "    Check log: /tmp/recovery-test.log"
    fi
    
    # Git status
    echo "📊 Git status:"
    git status --short | head -10 | sed 's/^/  /'
    
    echo ""
    echo "✅ Recovery verification complete"
}

# List available recovery options
list_recovery_options() {
    echo "🔍 AVAILABLE RECOVERY OPTIONS"
    echo "============================"
    
    # Git commits
    echo "📊 Recent commits:"
    cd "$WORKSPACE"
    git log --oneline -10 | sed 's/^/  /'
    echo ""
    
    # Available snapshots
    echo "📸 Available snapshots:"
    if [ -d "$SNAPSHOTS_DIR" ]; then
        ls -la "$SNAPSHOTS_DIR" | grep "^d" | awk '{print "  " $9}' | grep -v "^\.$\|^\.\.$"
    else
        echo "  No snapshots available"
    fi
    echo ""
    
    # Available backups
    echo "💾 Available backups:"
    if [ -d "$BACKUPS_DIR" ]; then
        ls -la "$BACKUPS_DIR" | grep "^d" | awk '{print "  " $9}' | grep -v "^\.$\|^\.\.$"
    else
        echo "  No backups available"
    fi
    echo ""
    
    # Git tags
    echo "🏷️  Recovery tags:"
    git tag -l "*recovery*" | sed 's/^/  /' | head -10
}

# Main function - handle command line arguments
main() {
    case "${1:-help}" in
        "git")
            rollback_git "$2" "${3:-Manual git rollback}"
            ;;
        "snapshot")
            rollback_snapshot "$2" "${3:-Manual snapshot rollback}"
            ;;
        "files")
            rollback_files "$2" "${3:-Manual file rollback}"
            ;;
        "emergency")
            emergency_rollback "${2:-Manual emergency rollback}"
            ;;
        "smart")
            smart_rollback "${2:-Manual smart rollback}"
            ;;
        "verify")
            verify_recovery
            ;;
        "list")
            list_recovery_options
            ;;
        "help"|*)
            echo "🔄 ROLLBACK SYSTEM USAGE"
            echo "======================="
            echo ""
            echo "Commands:"
            echo "  git <commit> [reason]     - Git-based rollback to specific commit"
            echo "  snapshot <name> [reason]  - Restore from named snapshot"
            echo "  files <file-list> [reason] - Rollback specific files"
            echo "  emergency [reason]        - Nuclear option - full rollback"
            echo "  smart [reason]           - Automatic best-method selection"
            echo "  verify                   - Verify recovery state"
            echo "  list                     - List available recovery options"
            echo ""
            echo "Examples:"
            echo "  $0 smart 'Agent violated boundaries'"
            echo "  $0 git HEAD~2 'Rollback last 2 commits'"  
            echo "  $0 snapshot baseline 'Return to start'"
            echo "  $0 emergency 'Agent went rogue'"
            ;;
    esac
}

# Execute main function with all arguments
main "$@"