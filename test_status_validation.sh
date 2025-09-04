#!/bin/bash
echo "=== TESTING STATUS FILE VALIDATION ==="

# Test validation function
validate_status_write() {
    local temp_file="$1"
    local target_file="$2"
    
    echo "Validating: $temp_file -> $target_file"
    
    if jq empty "$temp_file" 2>/dev/null; then
        echo "  ✅ Valid JSON - proceeding with write"
        mv "$temp_file" "$target_file"
        return 0
    else
        echo "  ❌ Invalid JSON - skipping write"
        echo "  Content: $(cat "$temp_file")"
        rm -f "$temp_file"
        return 1
    fi
}

# Test cases
echo ""
echo "--- Test Case 1: Valid JSON ---"
cat > "/tmp/valid.json" << 'JSON'
{
  "agent": "test",
  "status": "working"
}
JSON

validate_status_write "/tmp/valid.json" "/tmp/target_valid.json"
echo "Result: $(cat "/tmp/target_valid.json" 2>/dev/null || echo "No file created")"

echo ""
echo "--- Test Case 2: Invalid JSON ---"
cat > "/tmp/invalid.json" << 'TEXT'
{
  "agent": "test"
  "status": "working"  // Missing comma - invalid JSON
}
TEXT

validate_status_write "/tmp/invalid.json" "/tmp/target_invalid.json"
echo "Result: $(cat "/tmp/target_invalid.json" 2>/dev/null || echo "No file created")"

echo ""
echo "--- Test Case 3: Malformed JSON ---"
echo "not json at all" > "/tmp/malformed.json"
validate_status_write "/tmp/malformed.json" "/tmp/target_malformed.json"
echo "Result: $(cat "/tmp/target_malformed.json" 2>/dev/null || echo "No file created")"

# Cleanup
rm -f /tmp/valid.json /tmp/invalid.json /tmp/malformed.json 
rm -f /tmp/target_*.json
