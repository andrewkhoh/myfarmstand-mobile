#!/bin/bash

# Protection script for marketing production code
# This ensures we don't accidentally modify production code during test migration

echo "🔒 Creating protection snapshot of marketing production code..."

# Create checksums directory
mkdir -p .migration-protection

# Generate checksums for all production marketing files
echo "📊 Generating checksums for service files..."
find src/services/marketing -name "*.ts" -not -path "*/__tests__/*" -not -path "*/__test__/*" | sort | xargs md5sum > .migration-protection/marketing-services.md5

echo "📊 Generating checksums for schema files..."
find src/schemas/marketing -name "*.ts" -not -path "*/__tests__/*" -not -path "*/__contracts__/*" | sort | xargs md5sum > .migration-protection/marketing-schemas.md5

echo "📊 Generating checksums for hook files..."
find src/hooks/marketing -name "*.ts" -name "*.tsx" -not -path "*/__tests__/*" | sort | xargs md5sum > .migration-protection/marketing-hooks.md5 2>/dev/null || echo "No hook files found (may not exist yet)"

# Combine all checksums
cat .migration-protection/marketing-*.md5 > .migration-protection/all-marketing.md5

# Count protected files
TOTAL_FILES=$(wc -l < .migration-protection/all-marketing.md5)

echo "✅ Protected $TOTAL_FILES production files"
echo "📁 Checksums saved to .migration-protection/"

# Create git stash entry as additional backup
echo "📦 Creating git stash backup..."
git stash push -m "PROTECTION: Marketing production code before test migration $(date +%Y%m%d_%H%M%S)" \
  src/services/marketing/*.ts \
  src/schemas/marketing/*.ts \
  src/hooks/marketing/*.ts \
  src/hooks/marketing/*.tsx \
  2>/dev/null || echo "Note: Some paths may not exist yet"

echo "✅ Protection snapshot complete!"
echo ""
echo "To verify no changes later, run:"
echo "  ./scripts/validate-marketing-unchanged.sh"