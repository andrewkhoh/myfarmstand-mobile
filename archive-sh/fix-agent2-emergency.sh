#!/bin/bash

# Emergency Fix for Agent 2 Service Tests
# Replaces incorrect mock patterns with SimplifiedSupabaseMock

set -e

echo "🚨 EMERGENCY FIX: Agent 2 Service Test Patterns"
echo "=============================================="

AGENT2_DIR="../test-fixes-fix-service-tests"
COMM_DIR="../test-fixes-communication"

if [ ! -d "$AGENT2_DIR" ]; then
  echo "❌ Agent 2 directory not found: $AGENT2_DIR"
  exit 1
fi

cd "$AGENT2_DIR"

echo "📊 Current test status (BEFORE fix):"
npm run test:services 2>&1 | grep -E "Test Suites:|Tests:" | tail -2

echo ""
echo "🔧 Applying emergency fixes..."

# Create backup
echo "  📥 Creating backup..."
cp -r src/services/__tests__ src/services/__tests__.backup.$(date +%Y%m%d-%H%M%S)

echo "  🛠️ Fixing mock patterns..."

# Fix 1: Replace basic mock pattern with SimplifiedSupabaseMock
find src/services -name "*.test.*" -exec sed -i '' \
  's/const mockFrom = jest\.fn();/\/\/ Using SimplifiedSupabaseMock pattern/g' {} \;

# Fix 2: Update jest.mock calls to use proper pattern
find src/services -name "*.test.*" -exec sed -i '' \
  's/supabase: { from: mockFrom }/supabase: mockInstance.createClient()/g' {} \;

# Fix 3: Add proper SimplifiedSupabaseMock import
find src/services -name "*.test.*" -exec sed -i '' \
  '/jest\.mock.*config\/supabase/,/});/{
    s/jest\.mock.*config\/supabase.*/jest.mock("..\/..\/config\/supabase", () => {\n  const { SimplifiedSupabaseMock } = require("..\/..\/test\/mocks\/supabase.simplified.mock");\n  const mockInstance = new SimplifiedSupabaseMock();\n  return {/
    s/});/    TABLES: { \/\* Add table constants \*\/ }\n  };\n});/
  }' {} \;

echo "  ✅ Mock pattern fixes applied"

# Fix 4: Add proper imports for each test file
echo "  📦 Adding required imports..."
find src/services -name "*.test.*" -exec sed -i '' \
  '1i\
// Test Infrastructure Imports\
import { createProduct, createUser, resetAllFactories } from "..\/..\/test\/factories";\

' {} \;

echo "  ✅ Import fixes applied"

# Fix 5: Fix ValidationMonitor expectations
echo "  📋 Fixing ValidationMonitor patterns..."
find src/services -name "*.test.*" -exec sed -i '' \
  's/service: '"'"'\([^'"'"']*\)'"'"'/context: '"'"'\1'"'"'/g' {} \;

find src/services -name "*.test.*" -exec sed -i '' \
  's/validation: '"'"'\([^'"'"']*\)'"'"'/errorCode: '"'"'\1'"'"'/g' {} \;

echo "  ✅ ValidationMonitor fixes applied"

echo ""
echo "🧪 Testing fixes on sample service..."

# Test one service to verify fixes work
if [ -f "src/services/marketing/__tests__/marketingCampaignService.test.ts" ]; then
  echo "  🔍 Running marketing campaign service tests..."
  npm run test:services -- marketingCampaignService.test.ts 2>/dev/null | grep -E "PASS|FAIL" | head -1
fi

echo ""
echo "📊 Full test status (AFTER emergency fixes):"
npm run test:services 2>&1 | grep -E "Test Suites:|Tests:" | tail -2

echo ""
echo "📝 Logging results..."
echo "$(date): Emergency fixes applied to Agent 2" >> $COMM_DIR/status/emergency-fixes.txt
npm run test:services 2>&1 | grep -E "Test Suites:|Tests:" >> $COMM_DIR/status/emergency-fixes.txt

echo ""
echo "✅ Emergency fixes complete!"
echo "📁 Backup created at: src/services/__tests__.backup.*"
echo "📊 Check test results above for improvement"
echo ""
echo "🚀 Next steps:"
echo "   1. Review individual test file patterns manually"
echo "   2. Add proper mock data setup in beforeEach blocks"
echo "   3. Verify SimplifiedSupabaseMock usage is correct"
echo "   4. Test service by service systematically"
