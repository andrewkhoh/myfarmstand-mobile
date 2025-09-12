#!/bin/bash

# Validation script to ensure no production marketing code was changed

echo "🔍 Validating marketing production code integrity..."

# Check if protection files exist
if [ ! -f .migration-protection/all-marketing.md5 ]; then
    echo "❌ ERROR: No protection snapshot found!"
    echo "   Run ./scripts/protect-marketing-code.sh first"
    exit 1
fi

# Generate current checksums
echo "📊 Generating current checksums..."
mkdir -p .migration-protection/current

find src/services/marketing -name "*.ts" -not -path "*/__tests__/*" -not -path "*/__test__/*" | sort | xargs md5sum > .migration-protection/current/marketing-services.md5
find src/schemas/marketing -name "*.ts" -not -path "*/__tests__/*" -not -path "*/__contracts__/*" | sort | xargs md5sum > .migration-protection/current/marketing-schemas.md5
find src/hooks/marketing -name "*.ts" -name "*.tsx" -not -path "*/__tests__/*" | sort | xargs md5sum > .migration-protection/current/marketing-hooks.md5 2>/dev/null || echo "No hook files found"

# Combine current checksums
cat .migration-protection/current/marketing-*.md5 > .migration-protection/current/all-marketing.md5

# Compare checksums
echo "🔄 Comparing checksums..."
DIFF_OUTPUT=$(diff .migration-protection/all-marketing.md5 .migration-protection/current/all-marketing.md5 2>&1)

if [ -z "$DIFF_OUTPUT" ]; then
    echo "✅ SUCCESS: No production code changes detected!"
    echo "   All marketing service, schema, and hook files are unchanged."
    
    # Show test-only changes
    echo ""
    echo "📝 Test file changes (allowed):"
    git status --short src/services/marketing/__tests__/ src/schemas/marketing/__tests__/ src/hooks/marketing/__tests__/ 2>/dev/null | grep -E "^\s*M" || echo "  No test file changes"
    
    # Cleanup current checksums
    rm -rf .migration-protection/current
    exit 0
else
    echo "❌ ERROR: Production code changes detected!"
    echo ""
    echo "Changed files:"
    echo "$DIFF_OUTPUT" | grep "^>" | cut -d' ' -f3
    echo ""
    echo "⚠️  These production files should NOT be modified during test migration!"
    echo "   Only test files (__tests__/*.test.ts) should be changed."
    echo ""
    echo "To rollback production changes:"
    echo "  ./scripts/rollback-marketing-tests.sh"
    
    # Keep current checksums for investigation
    exit 1
fi