#!/bin/bash

# Fix all role-related hook imports to use canonical locations
echo "🔧 Fixing role hook imports to use canonical locations..."

# Fix imports in test files
echo "📝 Fixing test file imports..."

# Fix useUserRole imports
find src/hooks/__tests__ -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "from './useUserRole'" "$file"; then
    echo "  ✏️  Fixing $file (useUserRole)..."
    sed -i '' "s|from './useUserRole'|from '../role-based/useUserRole'|g" "$file"
    sed -i '' "s|from \"./useUserRole\"|from \"../role-based/useUserRole\"|g" "$file"
  fi
done

# Fix in role-based test files that might have wrong paths
find src/hooks/role-based/__tests__ -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "from './useUserRole'" "$file"; then
    echo "  ✏️  Fixing $file (useUserRole in role-based)..."
    sed -i '' "s|from './useUserRole'|from '../useUserRole'|g" "$file"
  fi
  if grep -q "from './usePermissions'" "$file"; then
    echo "  ✏️  Fixing $file (usePermissions in role-based)..."
    sed -i '' "s|from './usePermissions'|from '../usePermissions'|g" "$file"
  fi
done

# Fix function name changes that the script might have missed
echo "📝 Fixing function name compatibility..."

# Check if useUserPermissionsByType is used and needs to be useRolePermissionsByType
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "useUserPermissionsByType" | while read file; do
  echo "  ✏️  Fixing $file (useUserPermissionsByType -> useRolePermissionsByType)..."
  sed -i '' "s/useUserPermissionsByType/useRolePermissionsByType/g" "$file"
done

echo "✅ Import fixes complete!"
echo ""
echo "📋 Summary:"
echo "- Fixed useUserRole imports to use canonical location"
echo "- Fixed usePermissions imports"
echo "- Fixed function name compatibility"