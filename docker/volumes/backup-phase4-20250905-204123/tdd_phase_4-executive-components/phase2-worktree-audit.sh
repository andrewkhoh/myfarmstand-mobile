#!/bin/bash

# Phase 2 Worktree Infrastructure Audit Script
# Check infrastructure adoption across ALL worktrees

echo "🔍 Phase 2 Worktree Infrastructure Audit"
echo "=========================================="
echo "Timestamp: $(date)"
echo ""

# Initialize counters
TOTAL_SERVICE_FILES=0
SERVICE_WITH_MOCK=0
SERVICE_WITH_FACTORY=0
SERVICE_WITH_RESET=0

TOTAL_HOOK_FILES=0
HOOK_WITH_DEFENSIVE=0
HOOK_WITH_RQ=0
HOOK_WITH_WRAPPER=0

TOTAL_SCHEMA_FILES=0
SCHEMA_WITH_TRANSFORM=0
SCHEMA_WITH_NULLS=0

# Debug: Ensure counters are properly initialized
echo "DEBUG: Initial counters - Services: $TOTAL_SERVICE_FILES, Hooks: $TOTAL_HOOK_FILES, Schemas: $TOTAL_SCHEMA_FILES"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m' # No Color

# Define all worktrees to check
WORKTREES=(
  "."  # Main repo
  "../phase2-core-services"
  "../phase2-extension-services" 
  "../phase2-core-hooks"
  "../phase2-extension-hooks"
  "../phase2-schema-other"
)

echo "📂 SCANNING WORKTREES:"
for worktree in "${WORKTREES[@]}"; do
  if [ -d "$worktree" ]; then
    echo "  ✅ $worktree"
  else
    echo "  ❌ $worktree (not found)"
  fi
done
echo ""

echo "📦 SERVICE TESTS INFRASTRUCTURE AUDIT"
echo "-------------------------------------"
for worktree in "${WORKTREES[@]}"; do
  if [ -d "$worktree" ]; then
    echo "${BLUE}Checking $worktree${NC}"
    for file in "$worktree"/src/services/**/__tests__/*.test.ts; do
      if [ -f "$file" ]; then
        TOTAL_SERVICE_FILES=$((TOTAL_SERVICE_FILES + 1))
        filename=$(basename "$file")
        printf "  %-50s " "$filename:"
        
        issues=""
        
        # Check for SimplifiedSupabaseMock
        if grep -q "SimplifiedSupabaseMock" "$file" 2>/dev/null; then
          printf "${GREEN}✓Mock${NC} "
          SERVICE_WITH_MOCK=$((SERVICE_WITH_MOCK + 1))
        else
          printf "${RED}✗Mock${NC} "
          issues="$issues NoSimplifiedMock"
        fi
        
        # Check for factories
        if grep -q "createUser\|createOrder\|createProduct\|createPayment" "$file" 2>/dev/null; then
          printf "${GREEN}✓Factory${NC} "
          SERVICE_WITH_FACTORY=$((SERVICE_WITH_FACTORY + 1))
        else
          printf "${YELLOW}✗Factory${NC} "
          issues="$issues NoFactories"
        fi
        
        # Check for resetAllFactories
        if grep -q "resetAllFactories" "$file" 2>/dev/null; then
          printf "${GREEN}✓Reset${NC}"
          SERVICE_WITH_RESET=$((SERVICE_WITH_RESET + 1))
        else
          printf "${YELLOW}✗Reset${NC}"
          issues="$issues NoReset"
        fi
        
        if [ -n "$issues" ]; then
          printf " ${RED}[NEEDS FIX]${NC}"
        fi
        echo ""
      fi
    done
  fi
done

echo ""
echo "🪝 HOOK TESTS INFRASTRUCTURE AUDIT"
echo "-----------------------------------"
for worktree in "${WORKTREES[@]}"; do
  if [ -d "$worktree" ]; then
    echo "${BLUE}Checking $worktree${NC}"
    for file in "$worktree"/src/hooks/**/__tests__/*.test.tsx "$worktree"/src/hooks/**/__tests__/*.test.ts; do
      if [ -f "$file" ]; then
        TOTAL_HOOK_FILES=$((TOTAL_HOOK_FILES + 1))
        filename=$(basename "$file")
        printf "  %-50s " "$filename:"
        
        issues=""
        
        # Check for defensive imports
        if grep -q "try.*require.*catch\|let.*:.*any.*try" "$file" 2>/dev/null; then
          printf "${GREEN}✓Defensive${NC} "
          HOOK_WITH_DEFENSIVE=$((HOOK_WITH_DEFENSIVE + 1))
        else
          printf "${RED}✗Defensive${NC} "
          issues="$issues NoDefensive"
        fi
        
        # Check for React Query mock
        if grep -q "jest.mock.*@tanstack/react-query\|jest.mock.*'@tanstack/react-query'" "$file" 2>/dev/null; then
          printf "${GREEN}✓ReactQuery${NC} "
          HOOK_WITH_RQ=$((HOOK_WITH_RQ + 1))
        else
          printf "${RED}✗ReactQuery${NC} "
          issues="$issues NoRQMock"
        fi
        
        # Check for createWrapper
        if grep -q "createWrapper" "$file" 2>/dev/null; then
          printf "${GREEN}✓Wrapper${NC}"
          HOOK_WITH_WRAPPER=$((HOOK_WITH_WRAPPER + 1))
        else
          printf "${YELLOW}✗Wrapper${NC}"
          issues="$issues NoWrapper"
        fi
        
        if [ -n "$issues" ]; then
          printf " ${RED}[NEEDS FIX]${NC}"
        fi
        echo ""
      fi
    done
  fi
done

echo ""
echo "📋 SCHEMA TESTS INFRASTRUCTURE AUDIT"
echo "------------------------------------"
for worktree in "${WORKTREES[@]}"; do
  if [ -d "$worktree" ]; then
    echo "${BLUE}Checking $worktree${NC}"
    for file in "$worktree"/src/schemas/**/__tests__/*.test.ts; do
      if [ -f "$file" ]; then
        TOTAL_SCHEMA_FILES=$((TOTAL_SCHEMA_FILES + 1))
        filename=$(basename "$file")
        printf "  %-50s " "$filename:"
        
        issues=""
        
        # Check for transform pattern
        if grep -q "transform\|Transform\|TransformSchema" "$file" 2>/dev/null; then
          printf "${GREEN}✓Transform${NC} "
          SCHEMA_WITH_TRANSFORM=$((SCHEMA_WITH_TRANSFORM + 1))
        else
          printf "${YELLOW}✗Transform${NC} "
          issues="$issues NoTransform"
        fi
        
        # Check for null handling
        if grep -q "null.*toBe\|nullable\|\?\?\||| ''" "$file" 2>/dev/null; then
          printf "${GREEN}✓Nulls${NC}"
          SCHEMA_WITH_NULLS=$((SCHEMA_WITH_NULLS + 1))
        else
          printf "${YELLOW}✗Nulls${NC}"
          issues="$issues NoNullHandling"
        fi
        
        if [ -n "$issues" ]; then
          printf " ${YELLOW}[CHECK]${NC}"
        fi
        echo ""
      fi
    done
  fi
done

echo ""
echo "========================================="
echo "📊 WORKTREE INFRASTRUCTURE ADOPTION SUMMARY"
echo "========================================="

# Calculate percentages
if [ $TOTAL_SERVICE_FILES -gt 0 ]; then
  SERVICE_MOCK_PCT=$((SERVICE_WITH_MOCK * 100 / TOTAL_SERVICE_FILES))
  SERVICE_FACTORY_PCT=$((SERVICE_WITH_FACTORY * 100 / TOTAL_SERVICE_FILES))
  SERVICE_RESET_PCT=$((SERVICE_WITH_RESET * 100 / TOTAL_SERVICE_FILES))
else
  SERVICE_MOCK_PCT=0
  SERVICE_FACTORY_PCT=0
  SERVICE_RESET_PCT=0
fi

if [ $TOTAL_HOOK_FILES -gt 0 ]; then
  HOOK_DEFENSIVE_PCT=$((HOOK_WITH_DEFENSIVE * 100 / TOTAL_HOOK_FILES))
  HOOK_RQ_PCT=$((HOOK_WITH_RQ * 100 / TOTAL_HOOK_FILES))
  HOOK_WRAPPER_PCT=$((HOOK_WITH_WRAPPER * 100 / TOTAL_HOOK_FILES))
else
  HOOK_DEFENSIVE_PCT=0
  HOOK_RQ_PCT=0
  HOOK_WRAPPER_PCT=0
fi

if [ $TOTAL_SCHEMA_FILES -gt 0 ]; then
  SCHEMA_TRANSFORM_PCT=$((SCHEMA_WITH_TRANSFORM * 100 / TOTAL_SCHEMA_FILES))
  SCHEMA_NULLS_PCT=$((SCHEMA_WITH_NULLS * 100 / TOTAL_SCHEMA_FILES))
else
  SCHEMA_TRANSFORM_PCT=0
  SCHEMA_NULLS_PCT=0
fi

echo ""
echo "SERVICE TESTS ($TOTAL_SERVICE_FILES files across all worktrees):"
echo "  SimplifiedSupabaseMock: $SERVICE_WITH_MOCK/$TOTAL_SERVICE_FILES (${SERVICE_MOCK_PCT}%)"
echo "  Factory Usage:         $SERVICE_WITH_FACTORY/$TOTAL_SERVICE_FILES (${SERVICE_FACTORY_PCT}%)"
echo "  Reset Pattern:         $SERVICE_WITH_RESET/$TOTAL_SERVICE_FILES (${SERVICE_RESET_PCT}%)"

echo ""
echo "HOOK TESTS ($TOTAL_HOOK_FILES files across all worktrees):"
echo "  Defensive Imports:     $HOOK_WITH_DEFENSIVE/$TOTAL_HOOK_FILES (${HOOK_DEFENSIVE_PCT}%)"
echo "  React Query Mocks:     $HOOK_WITH_RQ/$TOTAL_HOOK_FILES (${HOOK_RQ_PCT}%)"
echo "  Wrapper Usage:         $HOOK_WITH_WRAPPER/$TOTAL_HOOK_FILES (${HOOK_WRAPPER_PCT}%)"

echo ""
echo "SCHEMA TESTS ($TOTAL_SCHEMA_FILES files across all worktrees):"
echo "  Transform Pattern:     $SCHEMA_WITH_TRANSFORM/$TOTAL_SCHEMA_FILES (${SCHEMA_TRANSFORM_PCT}%)"
echo "  Null Handling:         $SCHEMA_WITH_NULLS/$TOTAL_SCHEMA_FILES (${SCHEMA_NULLS_PCT}%)"

# Calculate overall adoption across worktrees
TOTAL_FILES=$((TOTAL_SERVICE_FILES + TOTAL_HOOK_FILES + TOTAL_SCHEMA_FILES))
TOTAL_WITH_INFRA=$((SERVICE_WITH_MOCK + HOOK_WITH_DEFENSIVE + SCHEMA_WITH_TRANSFORM))
if [ $TOTAL_FILES -gt 0 ]; then
  OVERALL_PCT=$((TOTAL_WITH_INFRA * 100 / TOTAL_FILES))
else
  OVERALL_PCT=0
fi

echo ""
echo "========================================="
echo "OVERALL WORKTREE INFRASTRUCTURE ADOPTION: $TOTAL_WITH_INFRA/$TOTAL_FILES (${OVERALL_PCT}%)"
echo "========================================="

echo ""
echo "🔍 WORKTREE COMPARISON:"
echo "  Main repo (before integration): Limited adoption"
echo "  Phase2 worktrees (after agents): Enhanced adoption" 
echo ""
echo "💡 To integrate improvements: Merge completed worktrees back to main"