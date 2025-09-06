#!/bin/bash

# Phase 3 Marketing Operations - Agent Orchestrator
# Monitors all agents, handles escalations, and coordinates phase transitions

set -e

# Configuration
COMMUNICATION_DIR="docker/volumes/communication"
STATUS_DIR="${COMMUNICATION_DIR}/status"
HANDOFF_DIR="${COMMUNICATION_DIR}/handoffs"
BLOCKER_DIR="${COMMUNICATION_DIR}/blockers"
PROGRESS_DIR="${COMMUNICATION_DIR}/progress"
LOCK_DIR="${COMMUNICATION_DIR}/locks"

# Create directories if they don't exist
mkdir -p "$STATUS_DIR" "$HANDOFF_DIR" "$BLOCKER_DIR" "$PROGRESS_DIR" "$LOCK_DIR"

# Agent definitions
declare -A AGENTS=(
    # RED Phase
    ["marketing-schema-tests"]="RED"
    ["marketing-service-tests"]="RED"
    ["marketing-hooks-tests"]="RED"
    ["marketing-screens-tests"]="RED"
    ["marketing-components-tests"]="RED"
    ["marketing-integration-tests"]="RED"
    # GREEN Phase
    ["marketing-schema-impl"]="GREEN"
    ["marketing-service-impl"]="GREEN"
    ["marketing-hooks-impl"]="GREEN"
    ["marketing-components-impl"]="GREEN"
    ["marketing-screens-impl"]="GREEN"
    ["marketing-integration-impl"]="GREEN"
    # REFACTOR Phase
    ["marketing-refactor"]="REFACTOR"
    # AUDIT Phase
    ["marketing-audit"]="AUDIT"
    # FINAL Phase
    ["marketing-integration-final"]="FINAL"
)

# Dependencies
declare -A DEPENDENCIES=(
    ["marketing-schema-impl"]="marketing-schema-tests"
    ["marketing-service-impl"]="marketing-service-tests marketing-schema-impl"
    ["marketing-hooks-impl"]="marketing-hooks-tests marketing-service-impl"
    ["marketing-components-impl"]="marketing-components-tests"
    ["marketing-screens-impl"]="marketing-screens-tests marketing-components-impl marketing-hooks-impl"
    ["marketing-integration-impl"]="marketing-integration-tests marketing-screens-impl"
    ["marketing-refactor"]="marketing-integration-impl"
    ["marketing-audit"]="marketing-refactor"
    ["marketing-integration-final"]="marketing-audit"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check agent status
check_agent_status() {
    local agent=$1
    local status_file="${STATUS_DIR}/${agent}.json"
    
    if [ -f "$status_file" ]; then
        # Check if file is recent (updated within last 5 minutes)
        local file_age=$(($(date +%s) - $(stat -f %m "$status_file" 2>/dev/null || stat -c %Y "$status_file" 2>/dev/null)))
        if [ $file_age -gt 300 ]; then
            echo "stale"
        else
            # Try to parse JSON status
            if command -v jq &> /dev/null; then
                local phase=$(jq -r '.phase' "$status_file" 2>/dev/null || echo "unknown")
                local passing=$(jq -r '.passing // .tests_written // 0' "$status_file" 2>/dev/null || echo "0")
                local total=$(jq -r '.total // 0' "$status_file" 2>/dev/null || echo "0")
                echo "active:${phase}:${passing}/${total}"
            else
                echo "active:unknown"
            fi
        fi
    else
        echo "not_started"
    fi
}

# Check for blockers
check_blockers() {
    local agent=$1
    local blocker_file="${BLOCKER_DIR}/${agent}.md"
    
    if [ -f "$blocker_file" ]; then
        echo -e "${RED}[BLOCKED]${NC} ${agent}:"
        head -n 3 "$blocker_file"
        return 1
    fi
    return 0
}

# Check dependencies
check_dependencies() {
    local agent=$1
    local deps="${DEPENDENCIES[$agent]}"
    
    if [ -z "$deps" ]; then
        return 0  # No dependencies
    fi
    
    for dep in $deps; do
        local handoff_file="${HANDOFF_DIR}/${dep}-complete.md"
        if [ ! -f "$handoff_file" ]; then
            echo -e "${YELLOW}[WAITING]${NC} ${agent} waiting for ${dep}"
            return 1
        fi
    done
    
    return 0
}

# Monitor phase progress
monitor_phase() {
    local phase=$1
    local phase_agents=()
    local total_agents=0
    local completed_agents=0
    
    # Get agents for this phase
    for agent in "${!AGENTS[@]}"; do
        if [ "${AGENTS[$agent]}" == "$phase" ]; then
            phase_agents+=("$agent")
            ((total_agents++))
            
            # Check if agent completed
            if [ -f "${HANDOFF_DIR}/${agent}-complete.md" ]; then
                ((completed_agents++))
            fi
        fi
    done
    
    echo -e "\n${BLUE}=== Phase: ${phase} ===${NC}"
    echo "Progress: ${completed_agents}/${total_agents} agents completed"
    
    # Show agent statuses
    for agent in "${phase_agents[@]}"; do
        local status=$(check_agent_status "$agent")
        local status_parts=(${status//:/ })
        
        case "${status_parts[0]}" in
            "active")
                echo -e "  ${GREEN}✓${NC} ${agent}: ${status_parts[2]}"
                ;;
            "stale")
                echo -e "  ${YELLOW}⚠${NC} ${agent}: Status file stale"
                ;;
            "not_started")
                echo -e "  ${RED}✗${NC} ${agent}: Not started"
                ;;
            *)
                echo -e "  ${YELLOW}?${NC} ${agent}: Unknown status"
                ;;
        esac
        
        # Check for blockers
        check_blockers "$agent" > /dev/null 2>&1 || true
    done
    
    # Check if phase is complete
    if [ $completed_agents -eq $total_agents ] && [ $total_agents -gt 0 ]; then
        echo -e "${GREEN}Phase ${phase} COMPLETE!${NC}"
        
        # Create phase handoff file if it doesn't exist
        local phase_handoff="${HANDOFF_DIR}/${phase,,}-complete.md"
        if [ ! -f "$phase_handoff" ]; then
            cat > "$phase_handoff" << EOF
# Phase ${phase} Complete

Date: $(date)
Total Agents: ${total_agents}
Completed: ${completed_agents}

## Agents Completed:
$(for agent in "${phase_agents[@]}"; do echo "- ${agent}"; done)

## Next Phase:
$(case "$phase" in
    "RED") echo "GREEN - Implementation phase" ;;
    "GREEN") echo "REFACTOR - Optimization phase" ;;
    "REFACTOR") echo "AUDIT - Compliance phase" ;;
    "AUDIT") echo "FINAL - Integration phase" ;;
    "FINAL") echo "DEPLOYMENT - Ready for production" ;;
esac)
EOF
            log "Created phase handoff: ${phase_handoff}"
        fi
        
        return 0
    fi
    
    return 1
}

# Generate dashboard
generate_dashboard() {
    clear
    echo "================================================"
    echo "   Phase 3 Marketing Operations - Orchestrator"
    echo "================================================"
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # Monitor each phase
    local phases=("RED" "GREEN" "REFACTOR" "AUDIT" "FINAL")
    for phase in "${phases[@]}"; do
        monitor_phase "$phase"
    done
    
    # Check for critical blockers
    echo -e "\n${BLUE}=== Blockers ===${NC}"
    local blocker_count=0
    for agent in "${!AGENTS[@]}"; do
        if [ -f "${BLOCKER_DIR}/${agent}.md" ]; then
            ((blocker_count++))
            echo -e "${RED}[BLOCKED]${NC} ${agent}"
        fi
    done
    
    if [ $blocker_count -eq 0 ]; then
        echo -e "${GREEN}No blockers detected${NC}"
    else
        echo -e "${RED}Total blockers: ${blocker_count}${NC}"
    fi
    
    # Overall progress
    echo -e "\n${BLUE}=== Overall Progress ===${NC}"
    local total_tests=284  # Total from all phases
    local passing_tests=0
    
    # Count passing tests from status files
    for agent in "${!AGENTS[@]}"; do
        local status_file="${STATUS_DIR}/${agent}.json"
        if [ -f "$status_file" ] && command -v jq &> /dev/null; then
            local passing=$(jq -r '.passing // .tests_written // 0' "$status_file" 2>/dev/null || echo "0")
            passing_tests=$((passing_tests + passing))
        fi
    done
    
    local progress_pct=$((passing_tests * 100 / total_tests))
    echo "Tests: ${passing_tests}/${total_tests} (${progress_pct}%)"
    
    # Progress bar
    local bar_length=50
    local filled_length=$((progress_pct * bar_length / 100))
    printf "["
    printf "%0.s█" $(seq 1 $filled_length)
    printf "%0.s░" $(seq 1 $((bar_length - filled_length)))
    printf "]\n"
}

# Health check for all agents
health_check() {
    log "Performing health check..."
    
    for agent in "${!AGENTS[@]}"; do
        local status=$(check_agent_status "$agent")
        
        if [[ "$status" == "stale" ]]; then
            log "WARNING: Agent ${agent} has stale status file"
            
            # Check if agent container is running
            if docker ps --format "table {{.Names}}" | grep -q "$agent"; then
                log "Container ${agent} is running but not updating status"
            else
                log "Container ${agent} is not running"
            fi
        fi
    done
}

# Handle escalations
handle_escalations() {
    # Check for critical blockers that need human intervention
    local critical_blockers=()
    
    for agent in "${!AGENTS[@]}"; do
        local blocker_file="${BLOCKER_DIR}/${agent}.md"
        if [ -f "$blocker_file" ]; then
            if grep -q "CRITICAL" "$blocker_file"; then
                critical_blockers+=("$agent")
            fi
        fi
    done
    
    if [ ${#critical_blockers[@]} -gt 0 ]; then
        log "CRITICAL: Escalation required for agents: ${critical_blockers[*]}"
        
        # Send notification (placeholder for actual notification system)
        echo "CRITICAL ESCALATION REQUIRED" > "${COMMUNICATION_DIR}/escalation.txt"
        echo "Agents: ${critical_blockers[*]}" >> "${COMMUNICATION_DIR}/escalation.txt"
        echo "Time: $(date)" >> "${COMMUNICATION_DIR}/escalation.txt"
    fi
}

# Cleanup old files
cleanup_old_files() {
    log "Cleaning up old communication files..."
    
    # Remove status files older than 1 hour
    find "$STATUS_DIR" -name "*.json" -mmin +60 -delete 2>/dev/null || true
    
    # Archive old progress files
    local archive_dir="${COMMUNICATION_DIR}/archive/$(date +%Y%m%d)"
    mkdir -p "$archive_dir"
    find "$PROGRESS_DIR" -name "*.md" -mmin +1440 -exec mv {} "$archive_dir/" \; 2>/dev/null || true
}

# Main monitoring loop
main() {
    log "Starting Phase 3 Marketing Operations Orchestrator"
    
    # Initial setup
    cleanup_old_files
    
    # Monitoring interval (seconds)
    local interval=${1:-30}
    
    while true; do
        # Generate dashboard
        generate_dashboard
        
        # Perform health check every 5 iterations
        if [ $((SECONDS % 150)) -lt $interval ]; then
            health_check
        fi
        
        # Handle escalations
        handle_escalations
        
        # Check if all phases complete
        if [ -f "${HANDOFF_DIR}/final-complete.md" ]; then
            log "All phases complete! Marketing operations ready for deployment."
            echo -e "\n${GREEN}🎉 SUCCESS: All TDD phases complete!${NC}"
            break
        fi
        
        # Wait before next update
        sleep $interval
    done
}

# Handle script termination
trap 'log "Orchestrator shutting down..."; exit 0' SIGINT SIGTERM

# Parse command line arguments
case "${1:-}" in
    "dashboard")
        # One-time dashboard generation
        generate_dashboard
        ;;
    "health")
        # Health check only
        health_check
        ;;
    "cleanup")
        # Cleanup only
        cleanup_old_files
        ;;
    *)
        # Main monitoring loop
        main "${1:-30}"
        ;;
esac