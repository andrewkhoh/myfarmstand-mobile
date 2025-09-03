#!/bin/bash

# Migration script to update imports from deprecated hooks to canonical API
# Run from the myfarmstand-mobile directory

echo "🔄 Starting migration to canonical hook APIs..."

# Update useRolePermissions imports in test files
echo "📝 Migrating useRolePermissions imports..."

# Files that import from ../useRolePermissions
files_to_migrate=(
  "src/hooks/__tests__/useUserRole-useRolePermissions-integration.test.tsx"
  "src/hooks/__tests__/useRoleIntegration.test.tsx"
  "src/hooks/__tests__/roleIntegration.test.tsx"
  "src/hooks/__tests__/role-hooks-integration.test.tsx"
  "src/hooks/__tests__/role-hooks-integration.simplified.test.tsx"
  "src/hooks/role-based/__tests__/roleHooksIntegration.test.tsx"
  "src/hooks/role-based/__tests__/useRolePermissions.test.tsx"
)

for file in "${files_to_migrate[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✏️  Updating $file..."
    
    # Update imports from ../useRolePermissions to ../role-based/usePermissions
    sed -i.bak "s|from '\.\./useRolePermissions'|from '../role-based/usePermissions'|g" "$file"
    sed -i.bak "s|from \"\.\./useRolePermissions\"|from \"../role-based/usePermissions\"|g" "$file"
    
    # Update function names
    sed -i.bak "s|useRolePermissions|useUserPermissions|g" "$file"
    
    # Clean up backup files
    rm -f "${file}.bak"
  fi
done

# Update useUserRole imports
echo "📝 Migrating useUserRole imports..."

user_role_files=(
  "src/hooks/__tests__/useUserRole.simplified.test.tsx"
  "src/hooks/__tests__/useUserRole-useRolePermissions-integration.test.tsx"
  "src/hooks/__tests__/useRoleIntegration.test.tsx"
  "src/hooks/__tests__/roleIntegration.test.tsx"
  "src/hooks/__tests__/role-hooks-integration.test.tsx"
  "src/hooks/__tests__/role-hooks-integration.simplified.test.tsx"
  "src/hooks/role-based/__tests__/useUserRole.test.tsx"
  "src/hooks/role-based/__tests__/roleHooksIntegration.test.tsx"
  "src/hooks/role-based/__tests__/useRoleMenu.test.tsx"
  "src/hooks/role-based/__tests__/useRoleNavigation.test.tsx"
  "src/hooks/role-based/__tests__/useNavigationPermissions.test.tsx"
)

for file in "${user_role_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✏️  Updating $file..."
    
    # Update imports from ../useUserRole to proper canonical location
    # Note: useUserRole should come from role-based/useUserRole
    sed -i.bak "s|from '\.\./useUserRole'|from './useUserRole'|g" "$file"
    sed -i.bak "s|from \"\.\./useUserRole\"|from \"./useUserRole\"|g" "$file"
    
    # Clean up backup files
    rm -f "${file}.bak"
  fi
done

echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review the changes with: git diff"
echo "2. Run tests to verify: npm test"
echo "3. Remove deprecated files once all tests pass:"
echo "   - src/hooks/useRolePermissions.ts"
echo "   - src/hooks/useRolePermissions.tsx"
echo "   - src/hooks/useUserRole.ts"
echo "   - src/hooks/useUserRole.tsx"