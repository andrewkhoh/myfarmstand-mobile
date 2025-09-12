#!/bin/bash

# Fix Service Tests - Apply SimplifiedSupabaseMock Pattern
# This script fixes all failing service tests by applying the correct mocking pattern

echo "🔧 Starting service test fixes..."

# List of files to fix (using the correct SimplifiedSupabaseMock pattern)
files_to_fix=(
  "src/services/__tests__/stockRestorationService.test.ts"
  "src/services/__tests__/paymentService.test.ts"
  "src/services/__tests__/authService.test.ts"
  "src/services/__tests__/kioskOrderIntegration.test.ts"
  "src/services/__tests__/productAdminService.test.ts"
  "src/services/__tests__/tokenService.test.ts"
  "src/services/__tests__/cartService.test.ts"
  "src/services/__tests__/pickupReschedulingService.test.ts"
  "src/services/__tests__/errorRecoveryService.test.ts"
  "src/services/__tests__/realtimeService.test.ts"
  "src/services/__tests__/orderService.test.ts"
  "src/services/__tests__/noShowHandlingService.test.ts"
  "src/services/__tests__/notificationService.test.ts"
  "src/services/inventory/__tests__/stockMovementService.test.ts"
  "src/services/inventory/__tests__/inventoryService.test.ts"
  "src/services/inventory/__tests__/stockMovementService.mock.test.ts"
  "src/services/role-based/__tests__/roleNavigationService.test.ts"
  "src/services/marketing/__tests__/productBundleService.test.ts"
  "src/services/marketing/__tests__/productContentService.test.ts"
  "src/services/marketing/__tests__/marketingServiceIntegration.test.ts"
  "src/services/executive/__tests__/crossRoleAnalyticsIntegration.test.ts"
  "src/services/executive/__tests__/predictiveAnalyticsIntegration.test.ts"
  "src/services/executive/__tests__/businessMetricsService.test.ts"
  "src/services/executive/__tests__/executiveDashboardIntegration.test.ts"
  "src/services/executive/__tests__/performanceIntegration.test.ts"
  "src/services/executive/__tests__/businessIntelligenceService.test.ts"
  "src/services/executive/__tests__/strategicReportingService.test.ts"
)

# Function to fix a single test file
fix_test_file() {
  local file="$1"
  echo "🔧 Fixing: $file"
  
  # Create backup
  cp "$file" "$file.backup"
  
  # Apply fixes using sed (in-place editing)
  
  # 1. Fix the SimplifiedSupabaseMock import pattern
  sed -i '' 's/const { SimplifiedSupabaseMock } = require.*$/const mockFrom = jest.fn();/g' "$file"
  sed -i '' 's/const mockInstance = new SimplifiedSupabaseMock();//g' "$file"
  sed -i '' 's/supabase: mockInstance.createClient(),/supabase: { from: mockFrom },/g' "$file"
  
  # 2. Fix supabase.from.mockReturnValue patterns to use mockFrom
  sed -i '' 's/supabase\.from\.mockReturnValue/mockFrom.mockReturnValue/g' "$file"
  
  # 3. Add missing ValidationMonitor methods if needed
  sed -i '' 's/recordPatternSuccess: jest.fn(),/recordPatternSuccess: jest.fn(), recordDataIntegrity: jest.fn()/g' "$file"
  
  # 4. Fix require statements for mocked modules (remove them since we'll use imports)
  sed -i '' '/const { supabase } = require/d' "$file"
  sed -i '' '/const { ValidationMonitor } = require/d' "$file"
  sed -i '' '/const { RolePermissionService } = require/d' "$file"
  
  echo "✅ Fixed: $file"
}

# Fix all files
for file in "${files_to_fix[@]}"; do
  if [ -f "$file" ]; then
    fix_test_file "$file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 Service test fixes completed!"
echo "📝 Backup files created with .backup extension"
echo "🚀 Ready to run tests!"