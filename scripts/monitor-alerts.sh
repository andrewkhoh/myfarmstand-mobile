#!/bin/bash
# Alert system for containerized agents

COMM_DIR="docker/volumes/communication"
ALERT_FILE="$COMM_DIR/alerts.log"
ALERT_THRESHOLD_RESTARTS=3
ALERT_THRESHOLD_STALE_SECONDS=300  # 5 minutes
ALERT_THRESHOLD_MEMORY_PERCENT=80
ALERT_THRESHOLD_CPU_PERCENT=90

# Initialize alert log
mkdir -p "$COMM_DIR"
echo "$(date '+%Y-%m-%d %H:%M:%S') Alert monitoring started" > "$ALERT_FILE"

# Colors for terminal output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Function to send alert
send_alert() {
    local severity="$1"
    local agent="$2"
    local message="$3"
    
    # Log to file
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$severity] [$agent] $message" >> "$ALERT_FILE"
    
    # Terminal notification with color
    case "$severity" in
        "CRITICAL")
            echo -e "${RED}🚨 CRITICAL ALERT [$agent]: $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING [$agent]: $message${NC}"
            ;;
        "INFO")
            echo -e "${GREEN}ℹ️  INFO [$agent]: $message${NC}"
            ;;
    esac
    
    # Create blocker file for critical alerts
    if [ "$severity" == "CRITICAL" ]; then
        echo "$message" > "$COMM_DIR/blockers/${severity}-${agent}-$(date +%s).md"
    fi
}

# Function to check container health
check_container_health() {
    local agent="$1"
    local container="${agent}-agent"
    
    # Check if container exists
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        return
    fi
    
    # Get container info
    local status=$(docker inspect "$container" 2>/dev/null | grep -o '"Status":"[^"]*"' | cut -d'"' -f4)
    local restart_count=$(docker inspect "$container" 2>/dev/null | grep -o '"RestartCount":[0-9]*' | cut -d: -f2)
    
    # Check container status
    case "$status" in
        "exited"|"dead")
            send_alert "CRITICAL" "$agent" "Container has stopped unexpectedly (status: $status)"
            ;;
        "restarting")
            send_alert "WARNING" "$agent" "Container is restarting"
            ;;
    esac
    
    # Check restart count
    if [ "${restart_count:-0}" -gt "$ALERT_THRESHOLD_RESTARTS" ]; then
        send_alert "WARNING" "$agent" "Container has restarted $restart_count times (threshold: $ALERT_THRESHOLD_RESTARTS)"
    fi
    
    # Check resource usage
    local stats=$(docker stats --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}" "$container" 2>/dev/null)
    if [ -n "$stats" ]; then
        local cpu_percent=$(echo "$stats" | cut -d'|' -f1 | sed 's/%//')
        local mem_percent=$(echo "$stats" | cut -d'|' -f2 | sed 's/%//')
        
        # CPU alert
        if [ -n "$cpu_percent" ] && (( $(echo "$cpu_percent > $ALERT_THRESHOLD_CPU_PERCENT" | bc -l 2>/dev/null) )); then
            send_alert "WARNING" "$agent" "High CPU usage: ${cpu_percent}% (threshold: ${ALERT_THRESHOLD_CPU_PERCENT}%)"
        fi
        
        # Memory alert
        if [ -n "$mem_percent" ] && (( $(echo "$mem_percent > $ALERT_THRESHOLD_MEMORY_PERCENT" | bc -l 2>/dev/null) )); then
            send_alert "WARNING" "$agent" "High memory usage: ${mem_percent}% (threshold: ${ALERT_THRESHOLD_MEMORY_PERCENT}%)"
        fi
    fi
}

# Function to check agent staleness
check_agent_staleness() {
    local agent="$1"
    local status_file="$COMM_DIR/status/${agent}.json"
    
    if [ ! -f "$status_file" ]; then
        return
    fi
    
    # Check last heartbeat
    local last_heartbeat=$(grep -o '"heartbeat":"[^"]*"' "$status_file" | cut -d'"' -f4)
    if [ -n "$last_heartbeat" ]; then
        # Convert to epoch (handle both Linux and macOS date)
        local heartbeat_epoch=$(date -d "$last_heartbeat" +%s 2>/dev/null || \
                               date -j -f "%Y-%m-%dT%H:%M:%S" "$last_heartbeat" +%s 2>/dev/null || \
                               echo 0)
        local now_epoch=$(date +%s)
        local diff=$((now_epoch - heartbeat_epoch))
        
        if [ $diff -gt $ALERT_THRESHOLD_STALE_SECONDS ]; then
            send_alert "WARNING" "$agent" "Agent appears stale (no heartbeat for ${diff} seconds)"
        fi
    fi
    
    # Check progress file modification time
    local progress_file="$COMM_DIR/progress/${agent}.md"
    if [ -f "$progress_file" ]; then
        local last_modified=$(stat -c %Y "$progress_file" 2>/dev/null || \
                            stat -f %m "$progress_file" 2>/dev/null || \
                            echo 0)
        local now=$(date +%s)
        local diff=$((now - last_modified))
        
        if [ $diff -gt $((ALERT_THRESHOLD_STALE_SECONDS * 2)) ]; then
            send_alert "WARNING" "$agent" "No progress updates for $((diff / 60)) minutes"
        fi
    fi
}

# Function to check test failures
check_test_failures() {
    local agent="$1"
    local status_file="$COMM_DIR/status/${agent}.json"
    
    if [ ! -f "$status_file" ]; then
        return
    fi
    
    # Check for test failures in status
    local test_summary=$(grep -o '"testSummary":"[^"]*"' "$status_file" | cut -d'"' -f4)
    if [[ "$test_summary" == *"fail"* ]]; then
        send_alert "WARNING" "$agent" "Test failures detected: $test_summary"
    fi
    
    # Check error count
    local error_count=$(grep -c '"errors"' "$status_file" 2>/dev/null || echo 0)
    if [ $error_count -gt 5 ]; then
        send_alert "WARNING" "$agent" "Multiple errors detected (count: $error_count)"
    fi
}

# Function to check pattern violations
check_pattern_violations() {
    local agent="$1"
    local log_file="$COMM_DIR/logs/${agent}.log"
    
    if [ ! -f "$log_file" ]; then
        return
    fi
    
    # Check for forbidden patterns
    if grep -q "jest.mock.*@supabase" "$log_file" 2>/dev/null; then
        send_alert "CRITICAL" "$agent" "Pattern violation: jest.mock() detected for Supabase!"
    fi
    
    if grep -q "const mock.*=.*{.*from:.*jest.fn()" "$log_file" 2>/dev/null; then
        send_alert "CRITICAL" "$agent" "Pattern violation: Manual mock creation detected!"
    fi
    
    # Check for required patterns
    if ! grep -q "SimplifiedSupabaseMock" "$log_file" 2>/dev/null; then
        local line_count=$(wc -l < "$log_file" 2>/dev/null || echo 0)
        if [ $line_count -gt 100 ]; then  # Only alert if agent has been active
            send_alert "WARNING" "$agent" "SimplifiedSupabaseMock pattern not detected in logs"
        fi
    fi
}

# Function to check disk space
check_disk_space() {
    local available_space=$(df -h docker/volumes 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ -n "$available_space" ] && (( $(echo "$available_space < 1" | bc -l 2>/dev/null) )); then
        send_alert "CRITICAL" "system" "Low disk space: ${available_space}G available"
    fi
}

# Main monitoring loop
echo -e "${GREEN}🔍 Alert monitoring started${NC}"
echo "Checking for: container health, staleness, test failures, pattern violations"
echo "Alert log: $ALERT_FILE"
echo ""

iteration=0
while true; do
    iteration=$((iteration + 1))
    
    # Check each agent
    for agent in role-services role-hooks role-navigation role-screens permission-ui integration; do
        check_container_health "$agent"
        check_agent_staleness "$agent"
        check_test_failures "$agent"
        check_pattern_violations "$agent"
    done
    
    # Check system resources every 5 iterations
    if [ $((iteration % 5)) -eq 0 ]; then
        check_disk_space
    fi
    
    # Clean up old blocker files (older than 1 hour)
    find "$COMM_DIR/blockers" -name "*.md" -mmin +60 -delete 2>/dev/null
    
    # Show alert summary every 10 iterations
    if [ $((iteration % 10)) -eq 0 ]; then
        alert_count=$(tail -100 "$ALERT_FILE" | grep -c "$(date '+%Y-%m-%d')" || echo 0)
        critical_count=$(tail -100 "$ALERT_FILE" | grep -c "CRITICAL" || echo 0)
        warning_count=$(tail -100 "$ALERT_FILE" | grep -c "WARNING" || echo 0)
        
        echo ""
        echo "📊 Alert Summary (last 100 entries):"
        echo "  Total: $alert_count | Critical: $critical_count | Warnings: $warning_count"
        echo "  Last check: $(date '+%H:%M:%S')"
    fi
    
    sleep 60  # Check every minute
done