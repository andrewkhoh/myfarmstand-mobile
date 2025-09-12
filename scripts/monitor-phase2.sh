#!/bin/bash

# Phase 2 Real-time Monitoring Dashboard
# Shows progress of all 5 agents achieving 100% infrastructure adoption

COMM_DIR="./test-fixes-communication"

# Colors for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

while true; do
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       PHASE 2: 100% INFRASTRUCTURE ADOPTION DASHBOARD           ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # Overall Progress
    echo -e "${YELLOW}📊 OVERALL INFRASTRUCTURE ADOPTION${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Run quick audit
    if [ -f "./phase2-infrastructure-audit.sh" ]; then
        ./phase2-infrastructure-audit.sh 2>/dev/null | grep -E "OVERALL|Service Tests:|Hook Tests:|Schema Tests:" | while read line; do
            if [[ "$line" =~ "100%" ]]; then
                echo -e "${GREEN}✓ $line${NC}"
            elif [[ "$line" =~ "OVERALL" ]]; then
                echo -e "${YELLOW}$line${NC}"
            else
                echo "$line"
            fi
        done
    fi
    
    echo ""
    echo -e "${YELLOW}🤖 AGENT STATUS${NC}"
    echo "━━━━━━━━━━━━━━━━"
    
    # Check each agent's progress
    for agent in core-services extension-services core-hooks extension-hooks schema-other; do
        echo ""
        echo -e "${BLUE}[$agent]${NC}"
        
        # Check if progress file exists
        if [ -f "$COMM_DIR/progress/$agent/current.md" ]; then
            current=$(head -1 "$COMM_DIR/progress/$agent/current.md" 2>/dev/null || echo "Starting...")
            echo "  Current: $current"
        else
            echo "  Current: Waiting to start..."
        fi
        
        # Check completion metrics
        if [ -f "$COMM_DIR/progress/$agent/metrics.json" ]; then
            completion=$(grep -o '"completion":[0-9]*' "$COMM_DIR/progress/$agent/metrics.json" 2>/dev/null | cut -d: -f2)
            files_fixed=$(grep -o '"files_fixed":[0-9]*' "$COMM_DIR/progress/$agent/metrics.json" 2>/dev/null | cut -d: -f2)
            files_total=$(grep -o '"files_total":[0-9]*' "$COMM_DIR/progress/$agent/metrics.json" 2>/dev/null | cut -d: -f2)
            
            if [ -n "$completion" ]; then
                if [ "$completion" -eq 100 ]; then
                    echo -e "  Progress: ${GREEN}$completion% ✓${NC}"
                else
                    echo -e "  Progress: ${YELLOW}$completion%${NC}"
                fi
            fi
            
            if [ -n "$files_fixed" ] && [ -n "$files_total" ]; then
                echo "  Files: $files_fixed/$files_total"
            fi
        fi
        
        # Check for blockers
        if [ -f "$COMM_DIR/blockers/$agent/issue.md" ]; then
            echo -e "  ${RED}⚠️  BLOCKED: $(head -1 $COMM_DIR/blockers/$agent/issue.md)${NC}"
        fi
        
        # Check if ready to merge
        if [ -f "$COMM_DIR/handoffs/$agent/ready-to-merge.flag" ]; then
            echo -e "  ${GREEN}✅ Ready to merge${NC}"
        fi
    done
    
    echo ""
    echo -e "${YELLOW}📈 TEST METRICS${NC}"
    echo "━━━━━━━━━━━━━━━"
    
    # Get latest test results if available
    if [ -f "test-results-latest.txt" ]; then
        grep -E "Test Suites:|Tests:" test-results-latest.txt | tail -2
        
        # Calculate pass rate
        total_tests=$(grep "Tests:" test-results-latest.txt | grep -o '[0-9]* total' | cut -d' ' -f1)
        passed_tests=$(grep "Tests:" test-results-latest.txt | grep -o '[0-9]* passed' | cut -d' ' -f1)
        
        if [ -n "$total_tests" ] && [ -n "$passed_tests" ] && [ "$total_tests" -gt 0 ]; then
            pass_rate=$((passed_tests * 100 / total_tests))
            echo -e "Pass Rate: ${YELLOW}$pass_rate%${NC} ($passed_tests/$total_tests)"
            
            # Show improvement from baseline
            baseline_rate=62
            improvement=$((pass_rate - baseline_rate))
            if [ $improvement -gt 0 ]; then
                echo -e "Improvement: ${GREEN}+$improvement%${NC} from baseline"
            elif [ $improvement -lt 0 ]; then
                echo -e "Improvement: ${RED}$improvement%${NC} from baseline"
            fi
        fi
    else
        echo "No test results available yet"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Controls: [Ctrl+C] Exit | Auto-refresh every 10 seconds"
    
    sleep 10
done