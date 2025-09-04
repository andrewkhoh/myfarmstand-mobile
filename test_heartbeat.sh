#!/bin/bash
echo "=== TESTING HEARTBEAT MECHANISM ==="

# Create mock status file
TEST_STATUS_FILE="/tmp/test_status.json"
cat > "$TEST_STATUS_FILE" << 'JSON'
{
  "agent": "test-agent",
  "status": "initializing",
  "lastUpdate": "2025-01-01T00:00:00Z"
}
JSON

echo "Original status file:"
cat "$TEST_STATUS_FILE"

# Test heartbeat function
test_heartbeat() {
    echo ""
    echo "Starting heartbeat test..."
    
    # Start heartbeat in background
    {
        for i in {1..3}; do  # Only 3 iterations for test
            jq --arg heartbeat "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
               '.lastUpdate = $heartbeat | .status = "working"' \
               "$TEST_STATUS_FILE" > "${TEST_STATUS_FILE}.tmp" && mv "${TEST_STATUS_FILE}.tmp" "$TEST_STATUS_FILE"
            echo "Heartbeat $i sent at $(date)"
            sleep 2  # Short interval for test
        done
    } &
    HEARTBEAT_PID=$!
    
    # Simulate Claude work (shorter for test)
    echo "Simulating Claude execution..."
    sleep 5
    
    # Stop heartbeat
    kill $HEARTBEAT_PID 2>/dev/null || true
    wait $HEARTBEAT_PID 2>/dev/null || true
    
    echo ""
    echo "Final status file:"
    cat "$TEST_STATUS_FILE"
    
    # Verify JSON is still valid
    if jq empty "$TEST_STATUS_FILE" 2>/dev/null; then
        echo "✅ Status file remains valid JSON"
    else
        echo "❌ Status file corrupted!"
    fi
}

test_heartbeat

# Cleanup
rm -f "$TEST_STATUS_FILE" "${TEST_STATUS_FILE}.tmp"
