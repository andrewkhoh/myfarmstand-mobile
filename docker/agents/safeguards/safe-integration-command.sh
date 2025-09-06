#!/bin/bash
# Safe Integration Command Center
# Orchestrates safe repository integration with all safeguards

set -e

WORKSPACE="/workspace"
TARGET_REPO="${1:-tdd_phase_4-decision-support}"
INTEGRATION_MODE="${2:-safe}"  # safe, experiment, emergency-rollback

echo "🛡️ SAFE INTEGRATION COMMAND CENTER"
echo "=================================="
echo "Target Repository: $TARGET_REPO"
echo "Integration Mode: $INTEGRATION_MODE"
echo "Workspace: $WORKSPACE"
echo ""

# Available repositories for integration (in recommended order)
AVAILABLE_REPOS=(
    "tdd_phase_4-decision-support"
    "tdd_phase_4-executive-hooks"
    "tdd_phase_4-executive-components"
    "tdd_phase_4-executive-services"
    "tdd_phase_4-executive-schemas"
)

# Validate target repository
validate_target_repo() {
    if [[ ! " ${AVAILABLE_REPOS[@]} " =~ " ${TARGET_REPO} " ]]; then
        echo "❌ ERROR: Invalid target repository: $TARGET_REPO"
        echo ""
        echo "Available repositories:"
        for repo in "${AVAILABLE_REPOS[@]}"; do
            if [ -d "docker/volumes/$repo" ]; then
                echo "  ✅ $repo (ready for integration)"
            else
                echo "  ❌ $repo (not found - may need setup)"
            fi
        done
        exit 1
    fi
    
    if [ ! -d "docker/volumes/$TARGET_REPO" ]; then
        echo "❌ ERROR: Repository directory not found: docker/volumes/$TARGET_REPO"
        echo "Please ensure the repository has been properly set up."
        exit 1
    fi
    
    echo "✅ Target repository validated: $TARGET_REPO"
}

# Pre-integration safety checks
pre_integration_checks() {
    echo "🔍 PRE-INTEGRATION SAFETY CHECKS"
    echo "==============================="
    
    cd "$WORKSPACE"
    
    # Check 1: Clean main branch state
    echo "📋 Checking main branch state..."
    if [ -n "$(git status --porcelain)" ]; then
        echo "  ⚠️  WARNING: Main branch has uncommitted changes"
        echo "  Current changes:"
        git status --short | head -10 | sed 's/^/    /'
        echo ""
        read -p "  Continue with integration? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "  📤 Integration cancelled by user"
            exit 1
        fi
    else
        echo "  ✅ Main branch is clean"
    fi
    
    # Check 2: Required safeguard scripts
    echo "📋 Checking safeguard scripts..."
    REQUIRED_SCRIPTS=(
        "docker/agents/safeguards/boundary-monitor.sh"
        "docker/agents/safeguards/rollback-system.sh"
        "docker/agents/safeguards/compliance-monitor.sh"
        "docker/agents/safeguards/test-branch-setup.sh"
    )
    
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if [ -x "$script" ]; then
            echo "  ✅ $script"
        else
            echo "  ❌ Missing or non-executable: $script"
            exit 1
        fi
    done
    
    # Check 3: Docker system
    echo "📋 Checking Docker system..."
    if ! docker info >/dev/null 2>&1; then
        echo "  ❌ Docker is not running or accessible"
        exit 1
    else
        echo "  ✅ Docker system ready"
    fi
    
    # Check 4: API key
    echo "📋 Checking API configuration..."
    if [ -z "$CLAUDE_API_KEY" ]; then
        echo "  ⚠️  WARNING: CLAUDE_API_KEY not set"
        echo "  Integration agent may not function without API key"
    else
        echo "  ✅ API key configured"
    fi
    
    # Check 5: Repository content analysis
    echo "📋 Analyzing target repository..."
    REPO_FILES=$(find "docker/volumes/$TARGET_REPO/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    echo "  📊 TypeScript files found: $REPO_FILES"
    
    if [ "$REPO_FILES" -eq 0 ]; then
        echo "  ⚠️  WARNING: No TypeScript files found in target repository"
    else
        echo "  ✅ Repository contains implementation files"
    fi
    
    echo ""
    echo "✅ All pre-integration checks passed"
    echo ""
}

# Safe integration mode
run_safe_integration() {
    echo "🛡️ STARTING SAFE INTEGRATION MODE"
    echo "================================"
    echo "Repository: $TARGET_REPO"
    echo "Safety features: ALL ENABLED"
    echo ""
    
    # Set environment variables
    export TARGET_REPO
    export INTEGRATION_MODE="safe"
    
    # Start the safe integration system
    echo "🚀 Launching safe integration containers..."
    docker-compose -f docker/configs/safe-repository-integration.yml up -d
    
    echo "✅ Safe integration system started"
    echo ""
    echo "📊 MONITORING DASHBOARD:"
    echo "http://localhost:3011"
    echo ""
    echo "📋 REAL-TIME MONITORING COMMANDS:"
    echo "Integration Agent:      docker logs -f safe-integration-agent"
    echo "Boundary Monitor:       docker logs -f integration-boundary-monitor"
    echo "Compliance Monitor:     docker logs -f integration-compliance-monitor"
    echo "Safety Backup:          docker logs -f integration-safety-backup"
    echo ""
    echo "⚠️  EMERGENCY CONTROLS:"
    echo "Pause Agent:            docker pause safe-integration-agent"
    echo "Emergency Rollback:     $0 $TARGET_REPO emergency-rollback"
    echo "Smart Rollback:         ./docker/agents/safeguards/rollback-system.sh smart"
    echo ""
    echo "🔄 Integration will self-improve until 100% test pass rate is achieved"
    echo "Monitor progress at: http://localhost:3011"
}

# Experiment mode (isolated test branch)
run_experiment_mode() {
    echo "🧪 STARTING EXPERIMENT MODE"
    echo "==========================="
    echo "Repository: $TARGET_REPO"
    echo "Safety: MAXIMUM (isolated test branch)"
    echo ""
    
    # Create experiment environment
    EXPERIMENT_NAME="integration-$(basename $TARGET_REPO | sed 's/tdd_phase_4-//')"
    echo "🧪 Creating experiment environment: $EXPERIMENT_NAME"
    
    ./docker/agents/safeguards/test-branch-setup.sh "$EXPERIMENT_NAME" "$TARGET_REPO"
    
    echo ""
    echo "🧪 EXPERIMENT CONTROLS:"
    echo "Start:    cd /shared/experiments/$EXPERIMENT_NAME && ./start.sh"
    echo "Stop:     cd /shared/experiments/$EXPERIMENT_NAME && ./stop.sh"
    echo "Analyze:  cd /shared/experiments/$EXPERIMENT_NAME && ./analyze.sh"
    echo "Cleanup:  cd /shared/experiments/$EXPERIMENT_NAME && ./cleanup.sh"
}

# Emergency rollback mode
run_emergency_rollback() {
    echo "🚨 EMERGENCY ROLLBACK MODE"
    echo "========================="
    echo ""
    
    # Stop any running integration
    echo "🛑 Stopping any running integration containers..."
    docker-compose -f docker/configs/safe-repository-integration.yml down 2>/dev/null || true
    
    # Run smart rollback analysis
    echo "🧠 Analyzing situation for best rollback strategy..."
    ./docker/agents/safeguards/rollback-system.sh smart "Emergency rollback requested by user"
    
    # Verify recovery
    echo "✅ Running recovery verification..."
    ./docker/agents/safeguards/rollback-system.sh verify
    
    echo ""
    echo "🔄 Emergency rollback completed"
    echo "📊 Check rollback log: /shared/rollback/rollback-operations.log"
}

# Status check mode
check_integration_status() {
    echo "📊 INTEGRATION STATUS CHECK"
    echo "=========================="
    echo ""
    
    # Check running containers
    echo "🐳 Docker Containers:"
    if docker ps --filter "name=integration" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q integration; then
        docker ps --filter "name=integration" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "No integration containers running"
    fi
    echo ""
    
    # Check compliance status
    echo "🛡️ Compliance Status:"
    if [ -f "/shared/compliance/state.json" ]; then
        if command -v jq >/dev/null; then
            jq -r '"Compliance Score: " + (.compliance_score | tostring) + "%" + "\nViolations: " + (.violations | tostring) + "\nWarnings: " + (.warnings | tostring)' /shared/compliance/state.json
        else
            cat /shared/compliance/state.json
        fi
    else
        echo "No compliance data available"
    fi
    echo ""
    
    # Check recent violations
    echo "⚠️ Recent Violations:"
    if [ -f "/shared/violations/boundary-violations.log" ]; then
        tail -5 /shared/violations/boundary-violations.log 2>/dev/null || echo "No violations"
    else
        echo "No violation log found"
    fi
    echo ""
    
    # Integration progress
    echo "📈 Integration Progress:"
    if [ -f "/shared/status/repository-integration.json" ]; then
        if command -v jq >/dev/null; then
            jq -r '"Pass Rate: " + (.current_pass_rate | tostring) + "%" + "\nCycle: " + (.cycle | tostring) + "\nStatus: " + .status' /shared/status/repository-integration.json 2>/dev/null || echo "Status file malformed"
        else
            cat /shared/status/repository-integration.json
        fi
    else
        echo "No integration status available"
    fi
}

# Main command dispatcher
main() {
    case "$INTEGRATION_MODE" in
        "safe")
            validate_target_repo
            pre_integration_checks
            run_safe_integration
            ;;
        "experiment")
            validate_target_repo
            pre_integration_checks
            run_experiment_mode
            ;;
        "emergency-rollback")
            run_emergency_rollback
            ;;
        "status")
            check_integration_status
            ;;
        "help"|*)
            echo "🛡️ SAFE INTEGRATION COMMAND CENTER"
            echo "=================================="
            echo ""
            echo "Usage: $0 <repository> <mode>"
            echo ""
            echo "Repositories:"
            for repo in "${AVAILABLE_REPOS[@]}"; do
                echo "  $repo"
            done
            echo ""
            echo "Modes:"
            echo "  safe               - Full safe integration with all monitoring"
            echo "  experiment         - Isolated test branch experimentation"
            echo "  emergency-rollback - Emergency rollback and recovery"
            echo "  status             - Check current integration status"
            echo "  help               - Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 tdd_phase_4-decision-support safe"
            echo "  $0 tdd_phase_4-executive-hooks experiment"
            echo "  $0 any emergency-rollback"
            echo "  $0 any status"
            ;;
    esac
}

# Handle signals
trap 'echo "🛑 Safe integration command interrupted"; exit 1' SIGINT SIGTERM

# Execute main function
main "$@"