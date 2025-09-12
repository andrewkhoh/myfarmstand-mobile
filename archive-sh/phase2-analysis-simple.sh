#!/bin/bash

echo "🔍 INFRASTRUCTURE ADOPTION & PASS RATE ANALYSIS"
echo "================================================"
echo ""

# Core Service Tests
echo "📦 CORE SERVICE TESTS"
echo "--------------------"
core_service_total=0
core_service_mock=0
for file in src/services/__tests__/*.test.ts; do
    if [ -f "$file" ]; then
        name=$(basename "$file")
        # Skip extension services
        if [[ ! "$name" =~ "phase4" ]]; then
            ((core_service_total++))
            grep -q "SimplifiedSupabaseMock" "$file" && ((core_service_mock++))
        fi
    fi
done
echo "Files: $core_service_total"
[ $core_service_total -gt 0 ] && echo "SimplifiedSupabaseMock: $core_service_mock/$core_service_total ($(( core_service_mock * 100 / core_service_total ))%)"
echo ""

# Extension Service Tests (Executive, Inventory, Marketing)
echo "📦 EXTENSION SERVICE TESTS"
echo "-------------------------"
ext_service_total=0
ext_service_mock=0
for dir in src/services/*/; do
    if [[ "$dir" =~ (executive|inventory|marketing) ]]; then
        for file in "$dir"__tests__/*.test.ts; do
            if [ -f "$file" ]; then
                ((ext_service_total++))
                grep -q "SimplifiedSupabaseMock" "$file" && ((ext_service_mock++))
            fi
        done
    fi
done
echo "Files: $ext_service_total"
[ $ext_service_total -gt 0 ] && echo "SimplifiedSupabaseMock: $ext_service_mock/$ext_service_total ($(( ext_service_mock * 100 / ext_service_total ))%)"
echo ""

# Core Hook Tests
echo "🪝 CORE HOOK TESTS"
echo "-----------------"
core_hook_total=0
core_hook_defensive=0
core_hook_rq=0
for file in src/hooks/__tests__/*.test.tsx src/hooks/__tests__/*.test.ts; do
    if [ -f "$file" ]; then
        name=$(basename "$file")
        if [[ ! "$name" =~ ".race.test" ]]; then
            ((core_hook_total++))
            grep -q "let.*:.*any" "$file" && ((core_hook_defensive++))
            grep -q "jest.mock.*@tanstack/react-query" "$file" && ((core_hook_rq++))
        fi
    fi
done
echo "Files: $core_hook_total"
[ $core_hook_total -gt 0 ] && echo "Defensive Imports: $core_hook_defensive/$core_hook_total ($(( core_hook_defensive * 100 / core_hook_total ))%)"
[ $core_hook_total -gt 0 ] && echo "React Query Mocks: $core_hook_rq/$core_hook_total ($(( core_hook_rq * 100 / core_hook_total ))%)"
echo ""

# Extension Hook Tests
echo "🪝 EXTENSION HOOK TESTS"
echo "----------------------"
ext_hook_total=0
ext_hook_defensive=0
ext_hook_rq=0
for dir in src/hooks/*/; do
    if [[ "$dir" =~ (executive|inventory|marketing|role-based) ]]; then
        for file in "$dir"__tests__/*.test.tsx "$dir"__tests__/*.test.ts; do
            if [ -f "$file" ]; then
                ((ext_hook_total++))
                grep -q "let.*:.*any" "$file" && ((ext_hook_defensive++))
                grep -q "jest.mock.*@tanstack/react-query" "$file" && ((ext_hook_rq++))
            fi
        done
    fi
done
echo "Files: $ext_hook_total"
[ $ext_hook_total -gt 0 ] && echo "Defensive Imports: $ext_hook_defensive/$ext_hook_total ($(( ext_hook_defensive * 100 / ext_hook_total ))%)"
[ $ext_hook_total -gt 0 ] && echo "React Query Mocks: $ext_hook_rq/$ext_hook_total ($(( ext_hook_rq * 100 / ext_hook_total ))%)"
echo ""

# Schema Tests
echo "📋 SCHEMA TESTS"
echo "--------------"
schema_total=0
for file in src/schemas/__tests__/*.test.ts src/schemas/__contracts__/*.test.ts; do
    [ -f "$file" ] && ((schema_total++))
done
echo "Files: $schema_total"
echo ""

echo "================================"
echo "📊 TEST PASS RATES BY CATEGORY"
echo "================================"
echo ""

# Run and analyze test results
echo "Service Tests:"
npm run test:services 2>&1 | grep -E "Tests:|passed|failed" | head -2

echo ""
echo "Hook Tests:"
npm run test:hooks 2>&1 | grep -E "Tests:|passed|failed" | head -2

echo ""
echo "Overall Tests:"
cat test-results.txt 2>/dev/null | grep -E "Tests:|Suites:" | tail -2 || echo "No cached results"
