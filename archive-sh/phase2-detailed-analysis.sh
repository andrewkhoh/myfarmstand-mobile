#!/bin/bash

echo "🔍 DETAILED INFRASTRUCTURE & PASS RATE ANALYSIS"
echo "=============================================="
echo "Timestamp: $(date)"
echo ""

# Categories
declare -a service_core=("authService" "cartService" "errorRecoveryService" "kioskOrderIntegration" "noShowHandlingService" "notificationService" "orderService" "paymentService" "pickupReschedulingService" "productAdminService" "productService" "realtimeService" "stockRestorationService" "tokenService")

declare -a service_executive=("businessIntelligenceService" "businessMetricsService" "crossRoleAnalyticsIntegration" "executiveDashboardIntegration" "performanceIntegration" "predictiveAnalyticsIntegration" "predictiveAnalyticsService" "strategicReportingService")

declare -a service_inventory=("inventoryService" "stockMovementService")

declare -a service_marketing=("campaignManagementIntegration" "contentWorkflowIntegration" "marketingCampaignService" "marketingServiceIntegration" "productBundleService" "productContentService")

declare -a hook_core=("useAuth" "useCart" "useErrorRecovery" "useKiosk" "useNoShowHandling" "useNotifications" "useOrders" "usePayment" "usePickupRescheduling" "useProductAdmin" "useProducts" "useRealtime" "useStockValidation")

declare -a hook_executive=("useBusinessInsights" "useBusinessMetrics" "usePredictiveAnalytics" "useStrategicReporting")

declare -a hook_inventory=("useBulkOperations" "useInventoryDashboard" "useInventoryItems" "useInventoryOperations" "useStockMovements")

declare -a hook_marketing=("useMarketingCampaigns" "useProductBundles" "useProductContent")

# Function to analyze infrastructure adoption
analyze_infrastructure() {
    local category=$1
    local type=$2
    local -n files=$3
    local total=0
    local with_mock=0
    local with_defensive=0
    local with_factory=0
    local with_rq=0
    
    for file in "${files[@]}"; do
        if [ "$type" = "service" ]; then
            test_file="src/services/__tests__/${file}.test.ts"
            [ "$category" = "executive" ] && test_file="src/services/executive/__tests__/${file}.test.ts"
            [ "$category" = "inventory" ] && test_file="src/services/inventory/__tests__/${file}.test.ts"
            [ "$category" = "marketing" ] && test_file="src/services/marketing/__tests__/${file}.test.ts"
        else
            test_file="src/hooks/__tests__/${file}.test.tsx"
            [ "$category" = "executive" ] && test_file="src/hooks/executive/__tests__/${file}.test.tsx"
            [ "$category" = "inventory" ] && test_file="src/hooks/inventory/__tests__/${file}.test.tsx"
            [ "$category" = "marketing" ] && test_file="src/hooks/marketing/__tests__/${file}.test.tsx"
        fi
        
        if [ -f "$test_file" ]; then
            ((total++))
            
            if [ "$type" = "service" ]; then
                grep -q "SimplifiedSupabaseMock" "$test_file" && ((with_mock++))
                grep -q "resetAllFactories\|Factory\.reset" "$test_file" && ((with_factory++))
            else
                grep -q "let.*:.*any" "$test_file" && ((with_defensive++))
                grep -q "jest.mock.*@tanstack/react-query" "$test_file" && ((with_rq++))
            fi
        fi
    done
    
    echo "  Total files: $total"
    if [ "$type" = "service" ]; then
        [ $total -gt 0 ] && echo "  SimplifiedSupabaseMock: $with_mock/$total ($(( with_mock * 100 / total ))%)"
        [ $total -gt 0 ] && echo "  Factory/Reset: $with_factory/$total ($(( with_factory * 100 / total ))%)"
    else
        [ $total -gt 0 ] && echo "  Defensive Imports: $with_defensive/$total ($(( with_defensive * 100 / total ))%)"
        [ $total -gt 0 ] && echo "  React Query Mocks: $with_rq/$total ($(( with_rq * 100 / total ))%)"
    fi
}

echo "📦 SERVICE TESTS INFRASTRUCTURE"
echo "================================"
echo ""
echo "Core Services:"
analyze_infrastructure "core" "service" service_core
echo ""
echo "Executive Services:"
analyze_infrastructure "executive" "service" service_executive
echo ""
echo "Inventory Services:"
analyze_infrastructure "inventory" "service" service_inventory
echo ""
echo "Marketing Services:"
analyze_infrastructure "marketing" "service" service_marketing
echo ""

echo "🪝 HOOK TESTS INFRASTRUCTURE"
echo "============================="
echo ""
echo "Core Hooks:"
analyze_infrastructure "core" "hook" hook_core
echo ""
echo "Executive Hooks:"
analyze_infrastructure "executive" "hook" hook_executive
echo ""
echo "Inventory Hooks:"
analyze_infrastructure "inventory" "hook" hook_inventory
echo ""
echo "Marketing Hooks:"
analyze_infrastructure "marketing" "hook" hook_marketing
echo ""

echo "📊 TEST PASS RATES BY CATEGORY"
echo "=============================="
echo ""

# Run specific test suites and capture results
echo "Running service tests..."
npm run test:services 2>&1 | grep -E "Tests:|Suites:" | tail -2
echo ""

echo "Running hook tests..."
npm run test:hooks 2>&1 | grep -E "Tests:|Suites:" | tail -2
echo ""

# Check for schema tests
echo "Checking for schema tests..."
find src -name "*.schema.test.ts" -o -name "*.contract.test.ts" | wc -l
