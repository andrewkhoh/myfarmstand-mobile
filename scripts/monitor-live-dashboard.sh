#!/bin/bash
# Enhanced live monitoring dashboard with health checks

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

COMM_DIR="docker/volumes/communication"

# Function to get container status with color
get_container_status() {
    local container="$1"
    local status=$(docker inspect "$container" 2>/dev/null | grep -o '"Status":"[^"]*"' | cut -d'"' -f4)
    
    case "$status" in
        "running")
            echo -e "${GREEN}● Running${NC}"
            ;;
        "exited")
            echo -e "${RED}● Exited${NC}"
            ;;
        "restarting")
            echo -e "${YELLOW}● Restarting${NC}"
            ;;
        *)
            echo -e "${YELLOW}● ${status:-Unknown}${NC}"
            ;;
    esac
}

# Function to get last progress line
get_last_progress() {
    local agent="$1"
    local file="${COMM_DIR}/progress/${agent}.md"
    if [ -f "$file" ]; then
        # Get last non-empty line
        tail -n 5 "$file" | grep -v '^$' | tail -1 | cut -c1-80
    else
        echo "No progress yet"
    fi
}

# Function to count test results from status
get_test_stats() {
    local agent="$1"
    local status_file="${COMM_DIR}/status/${agent}.json"
    if [ -f "$status_file" ]; then
        local pass=$(grep -o '"testsPass":[0-9]*' "$status_file" | cut -d: -f2)
        local summary=$(grep -o '"testSummary":"[^"]*"' "$status_file" | cut -d'"' -f4)
        if [ -n "$summary" ]; then
            echo "$summary"
        elif [ -n "$pass" ]; then
            echo "${pass} tests passed"
        else
            echo "No tests yet"
        fi
    else
        echo "-"
    fi
}

# Function to check agent health
check_agent_health() {
    local agent="$1"
    local status_file="${COMM_DIR}/status/${agent}.json"
    
    if [ ! -f "$status_file" ]; then
        echo -e "${YELLOW}No status${NC}"
        return
    fi
    
    # Check last heartbeat
    local last_heartbeat=$(grep -o '"heartbeat":"[^"]*"' "$status_file" | cut -d'"' -f4)
    if [ -n "$last_heartbeat" ]; then
        local heartbeat_epoch=$(date -d "$last_heartbeat" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$last_heartbeat" +%s 2>/dev/null || echo 0)
        local now_epoch=$(date +%s)
        local diff=$((now_epoch - heartbeat_epoch))
        
        if [ $diff -lt 120 ]; then
            echo -e "${GREEN}Healthy${NC}"
        elif [ $diff -lt 300 ]; then
            echo -e "${YELLOW}Slow${NC}"
        else
            echo -e "${RED}Stale${NC}"
        fi
    else
        echo -e "${YELLOW}Unknown${NC}"
    fi
}

# Main monitoring loop
while true; do
    clear
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║              🐳 PHASE 1 CONTAINERIZED MULTI-AGENT MONITOR                  ║"
    echo "║                        $(date '+%Y-%m-%d %H:%M:%S')                         ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Container Status Section
    echo -e "${CYAN}📦 CONTAINER STATUS${NC}"
    echo "─────────────────────────────────────────────────────────────────────────────"
    printf "%-20s %-18s %-12s %-15s %-10s %-10s\n" "AGENT" "STATUS" "HEALTH" "TESTS" "CPU%" "MEMORY"
    echo "─────────────────────────────────────────────────────────────────────────────"
    
    for agent in role-services role-hooks role-navigation role-screens permission-ui integration; do
        container="${agent}-agent"
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            status=$(get_container_status "$container")
            health=$(check_agent_health "$agent")
            tests=$(get_test_stats "$agent")
            
            # Get resource usage
            stats=$(docker stats --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}" "$container" 2>/dev/null || echo "-|-")
            cpu=$(echo "$stats" | cut -d'|' -f1)
            mem=$(echo "$stats" | cut -d'|' -f2 | cut -d'/' -f1)
            
            printf "%-20s %-28s %-22s %-15s %-10s %-10s\n" \
                "$agent" "$status" "$health" "${tests:0:15}" "$cpu" "$mem"
        else
            printf "%-20s %-28s\n" "$agent" "${YELLOW}Not found${NC}"
        fi
    done
    echo ""
    
    # Progress Section
    echo -e "${CYAN}📝 AGENT PROGRESS (Last Activity)${NC}"
    echo "─────────────────────────────────────────────────────────────────────────────"
    for agent in role-services role-hooks role-navigation role-screens permission-ui integration; do
        progress=$(get_last_progress "$agent")
        if [[ "$progress" == *"ERROR"* ]]; then
            printf "${BLUE}%-15s${NC} ${RED}%s${NC}\n" "$agent:" "$progress"
        elif [[ "$progress" == *"✅"* ]]; then
            printf "${BLUE}%-15s${NC} ${GREEN}%s${NC}\n" "$agent:" "$progress"
        else
            printf "${BLUE}%-15s${NC} %s\n" "$agent:" "$progress"
        fi
    done
    echo ""
    
    # Test Infrastructure Compliance
    echo -e "${CYAN}🧪 TEST INFRASTRUCTURE STATUS${NC}"
    echo "─────────────────────────────────────────────────────────────────────────────"
    
    # Check for SimplifiedSupabaseMock usage
    mock_count=0
    violation_count=0
    for log_file in ${COMM_DIR}/logs/*.log; do
        if [ -f "$log_file" ]; then
            if grep -q "SimplifiedSupabaseMock" "$log_file" 2>/dev/null; then
                mock_count=$((mock_count + 1))
            fi
            if grep -q "jest.mock.*@supabase" "$log_file" 2>/dev/null; then
                violation_count=$((violation_count + 1))
            fi
        fi
    done
    
    echo -e "SimplifiedSupabaseMock adoption: ${GREEN}${mock_count} agents using${NC}"
    if [ $violation_count -gt 0 ]; then
        echo -e "Pattern violations detected: ${RED}${violation_count} agents with jest.mock()${NC}"
    else
        echo -e "Pattern violations: ${GREEN}None detected${NC}"
    fi
    echo ""
    
    # Completed Handoffs
    echo -e "${CYAN}✅ COMPLETED HANDOFFS${NC}"
    echo "─────────────────────────────────────────────────────────────────────────────"
    handoff_count=0
    for file in ${COMM_DIR}/handoffs/*-complete.md; do
        if [ -f "$file" ]; then
            agent=$(basename "$file" -complete.md)
            timestamp=$(stat -c %y "$file" 2>/dev/null | cut -d' ' -f2 | cut -d'.' -f1 || \
                       stat -f "%Sm" -t "%H:%M:%S" "$file" 2>/dev/null || echo "")
            echo -e "  ${GREEN}✓${NC} $agent (completed at $timestamp)"
            handoff_count=$((handoff_count + 1))
        fi
    done
    if [ $handoff_count -eq 0 ]; then
        echo "  None yet"
    fi
    echo ""
    
    # Active Blockers
    echo -e "${CYAN}🚨 ACTIVE BLOCKERS${NC}"
    echo "─────────────────────────────────────────────────────────────────────────────"
    blocker_count=0
    for file in ${COMM_DIR}/blockers/*-blockers.md; do
        if [ -f "$file" ]; then
            agent=$(basename "$file" -blockers.md)
            echo -e "  ${RED}⚠${NC}  $agent: $(head -1 "$file" 2>/dev/null)"
            blocker_count=$((blocker_count + 1))
        fi
    done
    if [ $blocker_count -eq 0 ]; then
        echo -e "  ${GREEN}No active blockers${NC}"
    fi
    echo ""
    
    # Recent Errors (if any)
    error_count=$(grep -h "ERROR\|Failed" ${COMM_DIR}/progress/*.md 2>/dev/null | wc -l)
    if [ $error_count -gt 0 ]; then
        echo -e "${CYAN}⚠️  RECENT ERRORS (Last 3)${NC}"
        echo "─────────────────────────────────────────────────────────────────────────────"
        grep -h "ERROR\|Failed" ${COMM_DIR}/progress/*.md 2>/dev/null | tail -3
        echo ""
    fi
    
    # Summary Statistics
    echo -e "${CYAN}📊 SUMMARY${NC}"
    echo "─────────────────────────────────────────────────────────────────────────────"
    
    total_agents=6
    running_count=$(docker ps --filter "name=-agent" --format "{{.Names}}" | wc -l)
    echo -e "Agents Running: ${running_count}/${total_agents}"
    echo -e "Handoffs Complete: ${handoff_count}/${total_agents}"
    echo -e "Active Blockers: ${blocker_count}"
    echo -e "Total Errors: ${error_count}"
    
    # Calculate overall health
    if [ $running_count -eq $total_agents ] && [ $blocker_count -eq 0 ]; then
        echo -e "Overall Health: ${GREEN}● Healthy${NC}"
    elif [ $running_count -gt 0 ] && [ $blocker_count -lt 3 ]; then
        echo -e "Overall Health: ${YELLOW}● Degraded${NC}"
    else
        echo -e "Overall Health: ${RED}● Critical${NC}"
    fi
    
    echo ""
    echo "─────────────────────────────────────────────────────────────────────────────"
    echo "Dashboard URL: http://localhost:3001 | Refreshing in 10s | Press Ctrl+C to exit"
    
    sleep 10
done