#!/bin/bash

# Quick TypeScript fixes to get baseline passing
echo "🔧 Applying quick TypeScript fixes..."

# Fix 1: Check if ts-errors.txt exists and show first few errors
if [ -f "ts-errors.txt" ]; then
    echo "First 5 TypeScript errors to fix:"
    head -5 ts-errors.txt
    echo ""
fi

# Fix specific known issues

# 1. Fix formatPercentage import error
echo "1. Fixing formatPercentage import..."
find src -name "*.tsx" -exec sed -i.bak 's/formatPercentage/formatPercent/g' {} \;

# 2. Fix DataPopulationManager undefined type issue
if [ -f "src/components/admin/DataPopulationManager.tsx" ]; then
    echo "2. Fixing DataPopulationManager null safety..."
    sed -i.bak 's/string | null | undefined/string | null/g' src/components/admin/DataPopulationManager.tsx
fi

# 3. Fix date type issues in HistoricalOrderPatterns
if [ -f "src/components/analytics/HistoricalOrderPatterns.tsx" ]; then
    echo "3. Fixing date type issues..."
    # This is a more complex fix, will need manual intervention
    echo "   ⚠️  Manual fix needed for HistoricalOrderPatterns.tsx date types"
fi

# 4. Create missing utility functions
echo "4. Checking for missing utility functions..."
if [ ! -f "src/utils/formatters.ts" ]; then
    echo "Creating missing formatters.ts..."
    cat > src/utils/formatters.ts << 'EOF'
export const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
};
EOF
fi

# 5. Fix common import issues
echo "5. Fixing common import issues..."

# Add missing React imports
find src -name "*.tsx" -exec grep -L "import React" {} \; | while read file; do
    if grep -q "React\." "$file" || grep -q "FC\|ReactNode\|useState\|useEffect" "$file"; then
        echo "Adding React import to $file"
        sed -i.bak '1i\
import React from '\''react'\'';
' "$file"
    fi
done

# 6. Clean up backup files
echo "6. Cleaning up backup files..."
find src -name "*.bak" -delete

echo "✅ Quick fixes applied!"
echo ""
echo "Next steps:"
echo "1. Run 'npx tsc --noEmit' to check remaining errors"
echo "2. Fix remaining type errors manually"
echo "3. Run tests to ensure nothing is broken"