#!/bin/bash

# Update all worktrees with latest changes from main branch
# This script fetches latest changes and updates each worktree

# Configuration
PROJECT_NAME="tdd-completion"
BASE_BRANCH="main"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Updating all worktrees with latest changes from ${BASE_BRANCH}${NC}"
echo -e "${BLUE}================================================${NC}"

# First, fetch latest changes from remote
echo -e "\n${YELLOW}📥 Fetching latest changes from remote...${NC}"
git fetch origin

# Update main branch first
echo -e "\n${YELLOW}🔄 Updating main branch...${NC}"
git checkout main
git pull origin main

# Get list of worktrees
echo -e "\n${YELLOW}📋 Finding all worktrees...${NC}"
WORKTREES=$(git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2)

# Define agents from the setup script
declare -a AGENTS=(
  "marketing-ui"
  "campaign-bundle-ui"
  "executive-dashboard"
  "executive-analytics"
  "test-infrastructure"
  "integration"
  "production"
)

# Update each worktree
for agent in "${AGENTS[@]}"; do
  WORKSPACE="../${PROJECT_NAME}-${agent}"
  BRANCH="${PROJECT_NAME}-${agent}"
  
  # Check if worktree exists
  if git worktree list | grep -q "$WORKSPACE"; then
    echo -e "\n${YELLOW}🔄 Updating worktree: ${agent}${NC}"
    echo -e "   Workspace: ${WORKSPACE}"
    echo -e "   Branch: ${BRANCH}"
    
    # Navigate to worktree
    cd "$WORKSPACE" 2>/dev/null
    if [ $? -eq 0 ]; then
      # Check for uncommitted changes
      if [[ -n $(git status --porcelain) ]]; then
        echo -e "   ${RED}⚠️  Warning: Uncommitted changes found in ${agent}${NC}"
        echo -e "   ${YELLOW}   Stashing changes...${NC}"
        git stash push -m "Auto-stash before update $(date +%Y%m%d-%H%M%S)"
      fi
      
      # Merge latest changes from main
      echo -e "   ${YELLOW}   Merging latest changes from ${BASE_BRANCH}...${NC}"
      git merge origin/${BASE_BRANCH} --no-edit
      
      if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✅ Successfully updated ${agent}${NC}"
        
        # Check if there were stashed changes
        if git stash list | grep -q "Auto-stash before update"; then
          echo -e "   ${YELLOW}   Applying stashed changes...${NC}"
          git stash pop
          if [ $? -ne 0 ]; then
            echo -e "   ${RED}   ⚠️  Merge conflicts when applying stash!${NC}"
            echo -e "   ${YELLOW}   Please resolve conflicts manually in ${WORKSPACE}${NC}"
          fi
        fi
      else
        echo -e "   ${RED}❌ Merge conflicts detected for ${agent}!${NC}"
        echo -e "   ${YELLOW}   Please resolve conflicts manually in ${WORKSPACE}${NC}"
      fi
      
      # Return to main repo
      cd - > /dev/null
    else
      echo -e "   ${RED}❌ Could not access worktree directory${NC}"
    fi
  else
    echo -e "\n${YELLOW}⚠️  Worktree not found: ${agent}${NC}"
    echo -e "   ${YELLOW}   Run setup-tdd-multi-agent.sh to create it${NC}"
  fi
done

# Return to main branch
echo -e "\n${YELLOW}🏠 Returning to main branch...${NC}"
git checkout main

echo -e "\n${GREEN}✅ Worktree update complete!${NC}"
echo -e "\n${BLUE}📊 Summary:${NC}"
echo -e "  • Main branch updated to latest"
echo -e "  • All existing worktrees merged with latest changes"
echo -e "  • Any conflicts need manual resolution"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo -e "  • Check each worktree for merge conflicts"
echo -e "  • Run tests in each worktree to ensure everything works"
echo -e "  • Use ${GREEN}git status${NC} in each worktree to see current state"
echo -e "  • Use ${GREEN}./monitor-agents.sh${NC} to track agent progress"