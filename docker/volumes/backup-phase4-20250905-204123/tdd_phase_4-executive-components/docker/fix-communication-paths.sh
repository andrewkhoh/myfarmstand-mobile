#!/bin/bash

# Script to identify and fix inconsistent communication paths in agent prompts

echo "=== Communication Path Inconsistencies ==="
echo ""

# Check each prompt file
for prompt in docker/agents/prompts/phase3-marketing-*.md; do
    agent_name=$(basename "$prompt" .md | sed 's/phase3-//')
    echo "Checking: $agent_name"
    
    # Check for inconsistent status file paths
    echo "  Status paths:"
    grep -n "/communication/status/" "$prompt" | while read -r line; do
        if echo "$line" | grep -q "/communication/status/${agent_name}.json"; then
            echo "    ✓ $line"
        else
            echo "    ✗ INCONSISTENT: $line"
        fi
    done
    
    # Check for handoff files
    echo "  Handoff paths:"
    if grep -q "/communication/handoffs/${agent_name}-complete.md" "$prompt"; then
        echo "    ✓ Has correct handoff file"
    else
        echo "    ✗ Missing or incorrect handoff file"
    fi
    
    # Check for blocker files
    echo "  Blocker paths:"
    if grep -q "/communication/blockers/${agent_name}.md" "$prompt"; then
        echo "    ✓ Has correct blocker file"
    else
        echo "    ✗ Missing or incorrect blocker file"
    fi
    
    echo ""
done

echo "=== Files that need fixing ==="
echo ""

# List files with issues
grep -l "status/components.json\|status/integration.json\|blockers/components.md\|blockers/integration-impl.md" docker/agents/prompts/phase3-marketing-*.md | while read -r file; do
    echo "- $file"
done

echo ""
echo "=== Recommended fixes ==="
echo ""
echo "1. marketing-components-impl.md:"
echo "   - Change: /communication/status/components.json"
echo "   - To: /communication/status/marketing-components-impl.json"
echo ""
echo "2. marketing-integration-impl.md:"
echo "   - Change: /communication/status/integration.json"
echo "   - To: /communication/status/marketing-integration-impl.json"
echo "   - Change: /communication/status/integration-impl.json"
echo "   - To: /communication/status/marketing-integration-impl.json"
echo ""
echo "3. Ensure all agents write phase handoff files:"
echo "   - RED agents: /communication/handoffs/red-complete.md"
echo "   - GREEN agents: /communication/handoffs/green-complete.md"
echo "   - REFACTOR agent: /communication/handoffs/refactor-complete.md"
echo "   - AUDIT agent: /communication/handoffs/audit-complete.md"
echo "   - FINAL agent: /communication/handoffs/final-complete.md"