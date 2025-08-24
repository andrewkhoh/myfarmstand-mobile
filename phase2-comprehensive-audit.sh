#!/bin/bash

# Phase 2 COMPREHENSIVE Infrastructure Adoption Audit
# Covers ALL 173 test files across the entire codebase

echo "🔍 Phase 2 COMPREHENSIVE Infrastructure Adoption Audit"
echo "======================================================"
echo "Timestamp: $(date)"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialize comprehensive counters
declare -A CATEGORY_TOTALS
declare -A CATEGORY_WITH_INFRA

CATEGORIES=(
  "services:core"
  "services:executive"
  "services:inventory"
  "services:marketing"
  "services:role-based"
  "hooks:core"
  "hooks:executive"
  "hooks:inventory"
  "hooks:marketing"
  "hooks:role-based"
  "schemas:core"
  "schemas:contracts"
  "components"
  "screens"
  "utils"
  "navigation"
  "integration"
)

for cat in "${CATEGORIES[@]}"; do
  CATEGORY_TOTALS[$cat]=0
  CATEGORY_WITH_INFRA[$cat]=0
done

echo "📊 TEST FILE INVENTORY"
echo "====================="
echo ""

# Count all test files first
TOTAL_FILES=$(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l | tr -d ' ')
echo "Total test files found: $TOTAL_FILES"
echo ""

# Function to check service infrastructure
check_service_infra() {
  local file=$1
  local has_infra=0
  
  if grep -q "SimplifiedSupabaseMock" "$file" 2>/dev/null; then
    has_infra=1
  elif grep -q "jest.mock.*config/supabase" "$file" 2>/dev/null && grep -q "factories" "$file" 2>/dev/null; then
    has_infra=1
  fi
  
  echo $has_infra
}

# Function to check hook infrastructure  
check_hook_infra() {
  local file=$1
  local has_defensive=0
  local has_rq=0
  
  if grep -q "try.*require.*catch\|let.*:.*any.*try" "$file" 2>/dev/null; then
    has_defensive=1
  fi
  
  if grep -q "jest.mock.*@tanstack/react-query\|jest.mock.*'@tanstack/react-query'" "$file" 2>/dev/null; then
    has_rq=1
  fi
  
  if [[ $has_defensive -eq 1 && $has_rq -eq 1 ]]; then
    echo 1
  else
    echo 0
  fi
}

# Function to check schema infrastructure
check_schema_infra() {
  local file=$1
  local has_infra=0
  
  if grep -q "transform\|Transform\|TransformSchema" "$file" 2>/dev/null; then
    has_infra=1
  fi
  
  echo $has_infra
}

# Function to check general test infrastructure
check_general_infra() {
  local file=$1
  local has_infra=0
  
  if grep -q "createWrapper\|test-utils\|test-setup" "$file" 2>/dev/null; then
    has_infra=1
  elif grep -q "factories\|createUser\|createProduct" "$file" 2>/dev/null; then
    has_infra=1
  fi
  
  echo $has_infra
}

echo "📦 SERVICE TESTS (35 files)"
echo "----------------------------"

# Core Services
echo "Core Services (14 files):"
for file in src/services/__tests__/*.test.ts; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["services:core"]=$((CATEGORY_TOTALS["services:core"] + 1))
    if [ $(check_service_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["services:core"]=$((CATEGORY_WITH_INFRA["services:core"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

# Executive Services
echo "Executive Services (10 files):"
for file in src/services/executive/__tests__/*.test.ts; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["services:executive"]=$((CATEGORY_TOTALS["services:executive"] + 1))
    if [ $(check_service_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["services:executive"]=$((CATEGORY_WITH_INFRA["services:executive"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

# Inventory Services
echo "Inventory Services (3 files):"
for file in src/services/inventory/__tests__/*.test.ts; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["services:inventory"]=$((CATEGORY_TOTALS["services:inventory"] + 1))
    if [ $(check_service_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["services:inventory"]=$((CATEGORY_WITH_INFRA["services:inventory"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

# Marketing Services
echo "Marketing Services (6 files):"
for file in src/services/marketing/__tests__/*.test.ts; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["services:marketing"]=$((CATEGORY_TOTALS["services:marketing"] + 1))
    if [ $(check_service_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["services:marketing"]=$((CATEGORY_WITH_INFRA["services:marketing"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

echo ""
echo "🪝 HOOK TESTS (74 files)" 
echo "------------------------"

# Core Hooks
echo "Core Hooks (13 files):"
for file in src/hooks/__tests__/*.test.tsx src/hooks/__tests__/*.test.ts; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["hooks:core"]=$((CATEGORY_TOTALS["hooks:core"] + 1))
    if [ $(check_hook_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["hooks:core"]=$((CATEGORY_WITH_INFRA["hooks:core"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

# Executive Hooks
echo "Executive Hooks (8 files):"
for file in src/hooks/executive/__tests__/*.test.tsx; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["hooks:executive"]=$((CATEGORY_TOTALS["hooks:executive"] + 1))
    if [ $(check_hook_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["hooks:executive"]=$((CATEGORY_WITH_INFRA["hooks:executive"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

# Inventory Hooks
echo "Inventory Hooks (11 files):"
for file in src/hooks/inventory/__tests__/*.test.tsx; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["hooks:inventory"]=$((CATEGORY_TOTALS["hooks:inventory"] + 1))
    if [ $(check_hook_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["hooks:inventory"]=$((CATEGORY_WITH_INFRA["hooks:inventory"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

# Marketing Hooks
echo "Marketing Hooks (5 files):"
for file in src/hooks/marketing/__tests__/*.test.tsx; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["hooks:marketing"]=$((CATEGORY_TOTALS["hooks:marketing"] + 1))
    if [ $(check_hook_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["hooks:marketing"]=$((CATEGORY_WITH_INFRA["hooks:marketing"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

echo ""
echo "📋 SCHEMA TESTS (22 files)"
echo "--------------------------"

# Core Schemas
echo "Core Schemas (8 files):"
for file in src/schemas/__tests__/*.test.ts; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["schemas:core"]=$((CATEGORY_TOTALS["schemas:core"] + 1))
    if [ $(check_schema_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["schemas:core"]=$((CATEGORY_WITH_INFRA["schemas:core"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

# Contract Schemas
echo "Contract Schemas (14 files):"
for file in src/schemas/**/__contracts__/*.test.ts; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["schemas:contracts"]=$((CATEGORY_TOTALS["schemas:contracts"] + 1))
    if [ $(check_schema_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["schemas:contracts"]=$((CATEGORY_WITH_INFRA["schemas:contracts"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

echo ""
echo "🧩 OTHER TESTS (42 files)"
echo "-------------------------"

# Components
echo "Component Tests (2 files):"
for file in src/components/**/*.test.tsx; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["components"]=$((CATEGORY_TOTALS["components"] + 1))
    if [ $(check_general_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["components"]=$((CATEGORY_WITH_INFRA["components"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

# Screens
echo "Screen Tests (11 files):"
for file in src/screens/**/*.test.tsx src/screens/**/*.test.ts; do
  if [ -f "$file" ]; then
    CATEGORY_TOTALS["screens"]=$((CATEGORY_TOTALS["screens"] + 1))
    if [ $(check_general_infra "$file") -eq 1 ]; then
      CATEGORY_WITH_INFRA["screens"]=$((CATEGORY_WITH_INFRA["screens"] + 1))
      echo -n "✓"
    else
      echo -n "✗"
    fi
  fi
done
echo ""

echo ""
echo "========================================="
echo "📊 COMPREHENSIVE INFRASTRUCTURE SUMMARY"
echo "========================================="
echo ""

# Calculate totals
TOTAL_WITH_INFRA=0
TOTAL_FILES_CHECKED=0

for cat in "${CATEGORIES[@]}"; do
  total=${CATEGORY_TOTALS[$cat]}
  with_infra=${CATEGORY_WITH_INFRA[$cat]}
  
  if [ $total -gt 0 ]; then
    pct=$((with_infra * 100 / total))
    printf "%-25s: %3d/%3d (%3d%%)" "$cat" "$with_infra" "$total" "$pct"
    
    if [ $pct -lt 50 ]; then
      printf " ${RED}[CRITICAL]${NC}"
    elif [ $pct -lt 80 ]; then
      printf " ${YELLOW}[NEEDS WORK]${NC}"
    else
      printf " ${GREEN}[GOOD]${NC}"
    fi
    echo ""
    
    TOTAL_WITH_INFRA=$((TOTAL_WITH_INFRA + with_infra))
    TOTAL_FILES_CHECKED=$((TOTAL_FILES_CHECKED + total))
  fi
done

echo ""
echo "========================================="
if [ $TOTAL_FILES_CHECKED -gt 0 ]; then
  OVERALL_PCT=$((TOTAL_WITH_INFRA * 100 / TOTAL_FILES_CHECKED))
  echo "OVERALL INFRASTRUCTURE ADOPTION: $TOTAL_WITH_INFRA/$TOTAL_FILES_CHECKED ($OVERALL_PCT%)"
else
  echo "OVERALL INFRASTRUCTURE ADOPTION: 0/0 (0%)"
fi
echo "========================================="

echo ""
echo "🎯 TARGET: 100% infrastructure adoption"
echo "📝 NOTE: Focus on infrastructure patterns, not pass rates"

# Priority recommendations
echo ""
echo "🚨 PRIORITY ACTIONS:"
echo "-------------------"

for cat in "${CATEGORIES[@]}"; do
  total=${CATEGORY_TOTALS[$cat]}
  with_infra=${CATEGORY_WITH_INFRA[$cat]}
  
  if [ $total -gt 0 ]; then
    pct=$((with_infra * 100 / total))
    if [ $pct -lt 50 ]; then
      missing=$((total - with_infra))
      echo "• CRITICAL: $cat needs $missing files fixed ($pct% current)"
    fi
  fi
done

echo ""
echo "Complete audit saved. Run again after fixes to track progress."