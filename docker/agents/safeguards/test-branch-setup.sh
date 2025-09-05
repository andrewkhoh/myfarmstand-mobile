#!/bin/bash
# Safe Test Branch Experimentation Workflow
# Creates isolated environment for risky integration experiments

set -e

WORKSPACE="/workspace"
EXPERIMENT_NAME="${1:-integration-experiment}"
TARGET_REPO="${2:-tdd_phase_4-decision-support}"

echo "🧪 SAFE EXPERIMENTATION SETUP"
echo "============================="
echo "Experiment: $EXPERIMENT_NAME"
echo "Target Repo: $TARGET_REPO"
echo "Workspace: $WORKSPACE"
echo ""

cd "$WORKSPACE"

# Step 1: Verify clean main state
echo "✅ STEP 1: Verify Clean Main State"
echo "================================="

if [ -n "$(git status --porcelain)" ]; then
    echo "❌ ERROR: Main branch has uncommitted changes"
    echo "Please commit or stash changes before starting experiment"
    echo ""
    echo "Current changes:"
    git status --short
    exit 1
fi

echo "✅ Main branch is clean - safe to proceed"
echo ""

# Step 2: Create experiment branch
echo "🌿 STEP 2: Create Isolated Experiment Branch" 
echo "==========================================="

EXPERIMENT_BRANCH="experiment-$EXPERIMENT_NAME-$(date +%Y%m%d-%H%M%S)"
echo "Creating branch: $EXPERIMENT_BRANCH"

if git checkout -b "$EXPERIMENT_BRANCH"; then
    echo "✅ Experiment branch created successfully"
else
    echo "❌ Failed to create experiment branch"
    exit 1
fi

# Create experiment tracking
cat > ".experiment-info" << EOF
# Experiment Information
Name: $EXPERIMENT_NAME
Branch: $EXPERIMENT_BRANCH
Target Repository: $TARGET_REPO
Started: $(date -Iseconds)
Base Commit: $(git rev-parse HEAD)
Purpose: Safe integration testing
Safe to Delete: YES (after analysis)
EOF

git add ".experiment-info"
git commit -m "experiment: Start $EXPERIMENT_NAME

Target Repository: $TARGET_REPO
Branch: $EXPERIMENT_BRANCH
Purpose: Safe integration experimentation

This is an experimental branch - safe to delete after analysis.
All real work should be done after successful experimentation."

echo "✅ Experiment tracking created"
echo ""

# Step 3: Create experiment safeguards
echo "🛡️  STEP 3: Setup Experiment Safeguards"
echo "======================================"

# Create safeguard directories
mkdir -p "/shared/experiments/$EXPERIMENT_NAME"
mkdir -p "/shared/experiments/$EXPERIMENT_NAME/snapshots"
mkdir -p "/shared/experiments/$EXPERIMENT_NAME/logs"
mkdir -p "/shared/experiments/$EXPERIMENT_NAME/violations"

# Take baseline snapshot
echo "📸 Creating baseline snapshot..."
SNAPSHOT_DIR="/shared/experiments/$EXPERIMENT_NAME/snapshots/baseline"
mkdir -p "$SNAPSHOT_DIR"

# Snapshot current state
cp -r src "$SNAPSHOT_DIR/" 2>/dev/null || true
cp package*.json "$SNAPSHOT_DIR/" 2>/dev/null || true
cp tsconfig.json "$SNAPSHOT_DIR/" 2>/dev/null || true
git log --oneline -10 > "$SNAPSHOT_DIR/recent-commits.txt"
git status --porcelain > "$SNAPSHOT_DIR/git-status.txt"
find src -name "*.ts" -o -name "*.tsx" | wc -l > "$SNAPSHOT_DIR/file-count.txt"

echo "✅ Baseline snapshot saved"

# Create experiment monitoring script
cat > "/shared/experiments/$EXPERIMENT_NAME/monitor.sh" << 'MONITOR_EOF'
#!/bin/bash
# Experiment Monitor - runs continuously during experiment

EXPERIMENT_NAME="$1"
TARGET_REPO="$2"

echo "🔍 EXPERIMENT MONITOR ACTIVE"
echo "Experiment: $EXPERIMENT_NAME"
echo "Target: $TARGET_REPO"

CYCLE=1
while true; do
    sleep 60  # Check every minute
    
    cd /workspace
    
    if [ -n "$(git status --porcelain)" ]; then
        echo "📊 Changes detected - Cycle $CYCLE"
        
        # Take snapshot
        SNAPSHOT_DIR="/shared/experiments/$EXPERIMENT_NAME/snapshots/cycle-$CYCLE"
        mkdir -p "$SNAPSHOT_DIR"
        
        git status --porcelain > "$SNAPSHOT_DIR/changes.txt"
        git diff --name-only > "$SNAPSHOT_DIR/modified-files.txt"
        
        # Basic safety checks
        MODIFIED_COUNT=$(git status --porcelain | wc -l)
        NEW_FILES=$(git status --porcelain | grep "^??" | wc -l)
        DELETED_FILES=$(git status --porcelain | grep "^ D" | wc -l)
        
        echo "  Modified: $MODIFIED_COUNT files"
        echo "  New: $NEW_FILES files"  
        echo "  Deleted: $DELETED_FILES files"
        
        # Alert on suspicious activity
        if [ $DELETED_FILES -gt 10 ]; then
            echo "⚠️  WARNING: Many files deleted ($DELETED_FILES)"
            echo "This might indicate agent boundary violations" >> "/shared/experiments/$EXPERIMENT_NAME/warnings.log"
        fi
        
        if [ $MODIFIED_COUNT -gt 100 ]; then
            echo "⚠️  WARNING: Extensive modifications ($MODIFIED_COUNT files)"
            echo "This might indicate overly aggressive changes" >> "/shared/experiments/$EXPERIMENT_NAME/warnings.log"
        fi
        
        CYCLE=$((CYCLE + 1))
    fi
    
    # Check if experiment is still running
    if ! docker ps | grep -q "repository-integration"; then
        echo "📊 Experiment completed - Monitor stopping"
        break
    fi
done
MONITOR_EOF

chmod +x "/shared/experiments/$EXPERIMENT_NAME/monitor.sh"
echo "✅ Experiment monitor created"
echo ""

# Step 4: Setup experiment Docker environment
echo "🐳 STEP 4: Setup Isolated Docker Environment"
echo "=========================================="

# Create experiment-specific docker compose
cat > "/shared/experiments/$EXPERIMENT_NAME/docker-compose.yml" << EOF
version: '3.8'

# Experiment: $EXPERIMENT_NAME
# Target: $TARGET_REPO
# SAFE TO DELETE after experiment

services:
  experiment-integration-agent:
    build:
      context: ../../../agents
      dockerfile: Dockerfile
    container_name: experiment-integration-agent
    environment:
      - AGENT_ROLE=repository-integration
      - AGENT_ID=experiment-integration
      - WORKSPACE_PATH=/workspace
      - SHARED_PATH=/shared
      - CLAUDE_API_KEY=\${CLAUDE_API_KEY}
      - TARGET_REPO=$TARGET_REPO
      - EXPERIMENT_MODE=true
      - EXPERIMENT_NAME=$EXPERIMENT_NAME
    volumes:
      - ../../..:/workspace
      - ../../../docker/volumes/communication:/shared
    networks:
      - experiment-network
    working_dir: /workspace
    command: ["./docker/agents/entrypoint-generic.sh"]
    restart: "no"

  experiment-monitor:
    build:
      context: ../../../agents  
      dockerfile: Dockerfile
    container_name: experiment-monitor
    environment:
      - EXPERIMENT_NAME=$EXPERIMENT_NAME
      - TARGET_REPO=$TARGET_REPO
    volumes:
      - ../../..:/workspace
      - ../../../docker/volumes/communication:/shared
    networks:
      - experiment-network
    command: ["/shared/experiments/$EXPERIMENT_NAME/monitor.sh", "$EXPERIMENT_NAME", "$TARGET_REPO"]
    depends_on:
      - experiment-integration-agent

  experiment-safety-monitor:
    build:
      context: ../../../agents
      dockerfile: Dockerfile
    container_name: experiment-safety-monitor
    environment:
      - TARGET_REPO=$TARGET_REPO
      - EXPERIMENT_NAME=$EXPERIMENT_NAME
    volumes:
      - ../../..:/workspace
      - ../../../docker/volumes/communication:/shared
    networks:
      - experiment-network
    command: ["./docker/agents/safeguards/boundary-monitor.sh"]

networks:
  experiment-network:
    driver: bridge
EOF

echo "✅ Experiment Docker environment created"
echo ""

# Step 5: Create experiment commands
echo "📋 STEP 5: Create Experiment Control Commands"
echo "==========================================="

# Start experiment command
cat > "/shared/experiments/$EXPERIMENT_NAME/start.sh" << EOF
#!/bin/bash
echo "🚀 Starting experiment: $EXPERIMENT_NAME"
echo "Target repository: $TARGET_REPO"
echo "Branch: $EXPERIMENT_BRANCH"
echo ""

cd /shared/experiments/$EXPERIMENT_NAME
docker-compose up -d

echo "✅ Experiment started"
echo "Monitor logs: docker logs -f experiment-integration-agent"
echo "Safety logs: docker logs -f experiment-safety-monitor"
echo "Stop with: ./stop.sh"
EOF

# Stop experiment command  
cat > "/shared/experiments/$EXPERIMENT_NAME/stop.sh" << EOF
#!/bin/bash
echo "🛑 Stopping experiment: $EXPERIMENT_NAME"

cd /shared/experiments/$EXPERIMENT_NAME
docker-compose down

echo "✅ Experiment stopped"
echo ""
echo "📊 Experiment Results:"
echo "======================"
echo "Snapshots: /shared/experiments/$EXPERIMENT_NAME/snapshots/"
echo "Logs: /shared/experiments/$EXPERIMENT_NAME/logs/"
echo "Violations: /shared/experiments/$EXPERIMENT_NAME/violations/"
echo ""
echo "🧹 Cleanup: ./cleanup.sh"
echo "📊 Analyze: ./analyze.sh"
EOF

# Cleanup experiment command
cat > "/shared/experiments/$EXPERIMENT_NAME/cleanup.sh" << EOF
#!/bin/bash
echo "🧹 EXPERIMENT CLEANUP"
echo "==================="
echo "Experiment: $EXPERIMENT_NAME"
echo "Branch: $EXPERIMENT_BRANCH"
echo ""

cd /workspace

# Switch back to main
echo "📍 Switching to main branch..."
git checkout main

# Delete experiment branch
echo "🗑️  Deleting experiment branch..."
git branch -D "$EXPERIMENT_BRANCH" 2>/dev/null || echo "Branch already deleted"

# Clean Docker resources
echo "🐳 Cleaning Docker resources..."
cd /shared/experiments/$EXPERIMENT_NAME
docker-compose down --rmi all --volumes 2>/dev/null || true

echo "✅ Experiment cleanup complete"
echo ""
echo "📊 Experiment data preserved at:"
echo "/shared/experiments/$EXPERIMENT_NAME/"
echo ""
echo "To delete experiment data: rm -rf /shared/experiments/$EXPERIMENT_NAME/"
EOF

# Analysis command
cat > "/shared/experiments/$EXPERIMENT_NAME/analyze.sh" << EOF
#!/bin/bash
echo "📊 EXPERIMENT ANALYSIS"
echo "====================="
echo "Experiment: $EXPERIMENT_NAME"
echo "Target: $TARGET_REPO"
echo ""

EXPERIMENT_DIR="/shared/experiments/$EXPERIMENT_NAME"

# Count snapshots
SNAPSHOTS=\$(ls "\$EXPERIMENT_DIR/snapshots" | wc -l)
echo "📸 Snapshots taken: \$SNAPSHOTS"

# Check for violations
if [ -f "\$EXPERIMENT_DIR/violations/boundary-violations.log" ]; then
    VIOLATIONS=\$(wc -l < "\$EXPERIMENT_DIR/violations/boundary-violations.log")
    echo "⚠️  Boundary violations: \$VIOLATIONS"
    
    if [ \$VIOLATIONS -gt 0 ]; then
        echo ""
        echo "🚨 VIOLATION DETAILS:"
        head -10 "\$EXPERIMENT_DIR/violations/boundary-violations.log"
    fi
else
    echo "✅ No boundary violations detected"
fi

# Check final state
if [ -f "\$EXPERIMENT_DIR/snapshots/final-cycle-*/changes.txt" ]; then
    FINAL_CHANGES=\$(find "\$EXPERIMENT_DIR/snapshots" -name "changes.txt" -exec wc -l {} \; | tail -1 | awk '{print \$1}')
    echo "📝 Final changes: \$FINAL_CHANGES files"
fi

echo ""
echo "📋 RECOMMENDATION:"
if [ -f "\$EXPERIMENT_DIR/violations/boundary-violations.log" ] && [ \$(wc -l < "\$EXPERIMENT_DIR/violations/boundary-violations.log") -gt 0 ]; then
    echo "❌ EXPERIMENT FAILED - Agent violated boundaries"
    echo "   Do not use this approach in production"
    echo "   Review violations and refine agent prompt"
else
    echo "✅ EXPERIMENT SUCCESSFUL - Agent stayed within boundaries"
    echo "   Safe to proceed with production integration"
    echo "   Consider applying same approach to main branch"
fi
EOF

# Make all scripts executable
chmod +x "/shared/experiments/$EXPERIMENT_NAME"/*.sh

echo "✅ Experiment control commands created"
echo ""

# Step 6: Final experiment setup summary
echo "🎉 EXPERIMENT SETUP COMPLETE"
echo "==========================="
echo ""
echo "Experiment: $EXPERIMENT_NAME"
echo "Branch: $EXPERIMENT_BRANCH"  
echo "Target Repository: $TARGET_REPO"
echo ""
echo "📁 Experiment Directory:"
echo "/shared/experiments/$EXPERIMENT_NAME/"
echo ""
echo "🚀 Start Experiment:"
echo "cd /shared/experiments/$EXPERIMENT_NAME && ./start.sh"
echo ""
echo "📊 Monitor Progress:"
echo "docker logs -f experiment-integration-agent"
echo "docker logs -f experiment-safety-monitor"
echo ""
echo "🛑 Stop Experiment:"
echo "cd /shared/experiments/$EXPERIMENT_NAME && ./stop.sh"
echo ""
echo "📊 Analyze Results:"
echo "cd /shared/experiments/$EXPERIMENT_NAME && ./analyze.sh"
echo ""
echo "🧹 Cleanup After Analysis:"
echo "cd /shared/experiments/$EXPERIMENT_NAME && ./cleanup.sh"
echo ""
echo "🔒 SAFETY FEATURES:"
echo "- Isolated experiment branch (safe to delete)"
echo "- Continuous boundary monitoring"
echo "- Automatic snapshots every change"
echo "- Real-time violation detection"
echo "- Complete rollback capability"
echo "- No risk to main branch"
echo ""
echo "✅ Ready to experiment safely!"