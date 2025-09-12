#!/bin/bash

# Rollback script for marketing test migration
# This can restore production code if accidentally modified

echo "🔄 Marketing Test Migration Rollback"
echo "===================================="
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo ""
fi

echo "Choose rollback option:"
echo "1. Rollback ONLY test files (keep production code)"
echo "2. Rollback production code from git stash"
echo "3. Rollback everything to last commit"
echo "4. Cancel"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo "🔄 Reverting test files only..."
        git checkout HEAD -- src/services/marketing/__tests__/
        git checkout HEAD -- src/schemas/marketing/__tests__/ 2>/dev/null
        git checkout HEAD -- src/hooks/marketing/__tests__/ 2>/dev/null
        git checkout HEAD -- jest.config.marketing.js 2>/dev/null
        git checkout HEAD -- src/test/marketing-setup.ts 2>/dev/null
        echo "✅ Test files reverted"
        ;;
    
    2)
        echo "🔄 Restoring production code from protection stash..."
        # Find the protection stash
        STASH_REF=$(git stash list | grep "PROTECTION: Marketing production code" | head -1 | cut -d: -f1)
        
        if [ -z "$STASH_REF" ]; then
            echo "❌ No protection stash found!"
            echo "   Try option 3 to rollback to last commit"
            exit 1
        fi
        
        echo "Found stash: $STASH_REF"
        git checkout "$STASH_REF" -- src/services/marketing/*.ts
        git checkout "$STASH_REF" -- src/schemas/marketing/*.ts
        git checkout "$STASH_REF" -- src/hooks/marketing/*.ts 2>/dev/null
        git checkout "$STASH_REF" -- src/hooks/marketing/*.tsx 2>/dev/null
        echo "✅ Production code restored from stash"
        ;;
    
    3)
        echo "⚠️  This will rollback ALL changes to marketing folders"
        read -p "Are you sure? (y/N): " confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo "🔄 Rolling back everything..."
            git checkout HEAD -- src/services/marketing/
            git checkout HEAD -- src/schemas/marketing/
            git checkout HEAD -- src/hooks/marketing/
            git checkout HEAD -- jest.config.marketing.js 2>/dev/null
            git checkout HEAD -- src/test/marketing-setup.ts 2>/dev/null
            echo "✅ Full rollback complete"
        else
            echo "Cancelled"
        fi
        ;;
    
    4)
        echo "Cancelled"
        exit 0
        ;;
    
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🔍 Current status:"
git status --short src/services/marketing/ src/schemas/marketing/ src/hooks/marketing/

echo ""
echo "To validate production code integrity:"
echo "  ./scripts/validate-marketing-unchanged.sh"