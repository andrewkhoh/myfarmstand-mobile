# Role Hooks Migration Guide

## Overview
This guide documents the migration from deprecated role hooks to the canonical API in `src/hooks/role-based/`.

## Migration Status: ✅ COMPLETED

### Key Changes
1. **Deprecated hooks** in `src/hooks/` now point to canonical locations
2. **Test files** have been updated to use new imports
3. **Duplicate files** (.ts and .tsx versions) remain for backward compatibility

## Import Migration Map

### useRolePermissions → usePermissions

**Old Import:**
```typescript
import { useRolePermissions } from '../hooks/useRolePermissions';
```

**New Import:**
```typescript
import { useUserPermissions } from '../hooks/role-based/usePermissions';
// or
import { useUserPermissions } from '../hooks/role-based/permissions';
```

### Function Name Changes

| Old Function | New Function | Location |
|-------------|--------------|----------|
| `useRolePermissions(role)` | `useRolePermissionsByType(role)` | `role-based/usePermissions` |
| `useRolePermissions(userId)` | `useUserPermissions(userId)` | `role-based/usePermissions` |
| `useHasPermission` | `useHasPermission` | `role-based/usePermissions` |
| `hasAllPermissions` | `useHasAllPermissions` | `role-based/usePermissions` |
| `hasAnyPermission` | `useHasAnyPermission` | `role-based/usePermissions` |

### useUserRole → role-based/useUserRole

**Old Import:**
```typescript
import { useUserRole } from '../hooks/useUserRole';
```

**New Import:**
```typescript
import { useUserRole } from '../hooks/role-based/useUserRole';
```

## Canonical API Locations

### Permission Hooks
- **Primary**: `src/hooks/role-based/usePermissions.ts`
- **Alternative**: `src/hooks/role-based/permissions.ts`

Available exports:
- `useUserPermissions(userId)`
- `useRolePermissionsByType(roleType)`
- `useHasPermission(userId, permission)`
- `useCanPerformAction(userId, resource, action)`
- `useHasAllPermissions(userId, permissions)`
- `useHasAnyPermission(userId, permissions)`
- `useCurrentUserPermissions()`
- `useCurrentUserHasPermission(permission)`
- `useCurrentUserCanPerformAction(resource, action)`

### User Role Hooks
- **Location**: `src/hooks/role-based/useUserRole.ts`

Available exports:
- `useUserRole(userId)`
- `useUpdateUserRole()`
- `useHasRole(userId, role)`
- `useHasMinimumRole(userId, minimumRole)`
- `getUserRoleType(userRole)`
- `isUserRoleActive(userRole)`

### Navigation Hooks
- `src/hooks/role-based/useRoleNavigation.ts`
- `src/hooks/role-based/useNavigationPermissions.ts`
- `src/hooks/role-based/useRoleMenu.ts`

## Files Modified During Migration

### Test Files Updated
- ✅ `src/hooks/__tests__/useRolePermissions.simplified.test.tsx`
- ✅ `src/hooks/__tests__/useUserRole.simplified.test.tsx`
- ✅ `src/hooks/__tests__/useUserRole-useRolePermissions-integration.test.tsx`
- ✅ `src/hooks/__tests__/useRoleIntegration.test.tsx`
- ✅ `src/hooks/__tests__/roleIntegration.test.tsx`
- ✅ `src/hooks/__tests__/role-hooks-integration.test.tsx`
- ✅ `src/hooks/__tests__/role-hooks-integration.simplified.test.tsx`
- ✅ `src/hooks/role-based/__tests__/roleHooksIntegration.test.tsx`
- ✅ `src/hooks/role-based/__tests__/useUserRole.test.tsx`
- ✅ `src/hooks/role-based/__tests__/useRolePermissions.test.tsx`
- ✅ `src/hooks/role-based/__tests__/useRoleMenu.test.tsx`
- ✅ `src/hooks/role-based/__tests__/useRoleNavigation.test.tsx`
- ✅ `src/hooks/role-based/__tests__/useNavigationPermissions.test.tsx`

## Deprecated Files (Keep for Backward Compatibility)

These files contain deprecation notices and should be removed only after all consumers have migrated:

- `src/hooks/useRolePermissions.ts` - Points to `role-based/permissions.ts`
- `src/hooks/useRolePermissions.tsx` - Points to `role-based/permissions.ts`
- `src/hooks/useUserRole.ts` - Points to `role-based/useUserRole.ts`
- `src/hooks/useUserRole.tsx` - Points to `role-based/useUserRole.ts`

## Migration Scripts

Two helper scripts were created to automate the migration:

1. **`scripts/migrate-to-canonical-hooks.sh`** - Initial migration script
2. **`scripts/fix-role-hook-imports.sh`** - Fixes remaining import issues

## Next Steps

1. **Run tests** to verify all imports are working:
   ```bash
   npm test -- src/hooks
   ```

2. **Check for remaining imports** from deprecated locations:
   ```bash
   grep -r "from.*useRolePermissions['\"]" src --include="*.ts" --include="*.tsx"
   grep -r "from.*useUserRole['\"]" src --include="*.ts" --include="*.tsx"
   ```

3. **After validation period** (recommended: 2-4 weeks):
   - Remove deprecated files if no issues are reported
   - Update any remaining documentation

## Troubleshooting

### Common Issues

1. **TypeScript errors about missing exports**
   - Solution: Check the function name changes table above
   - Helper functions like `isAdmin`, `isExecutive` may need to be defined locally

2. **Import path resolution errors**
   - Solution: Ensure you're using relative paths correctly
   - From `src/hooks/__tests__/`: Use `../role-based/usePermissions`
   - From `src/hooks/role-based/__tests__/`: Use `../usePermissions`

3. **Test failures after migration**
   - Solution: Some functions changed names (e.g., `useRolePermissions` → `useUserPermissions`)
   - Update both imports and function calls

## Benefits of Migration

1. **Single source of truth** - All role-related hooks in `role-based/` directory
2. **Consistent API** - Unified naming conventions
3. **Better organization** - Clear separation of concerns
4. **Reduced duplication** - No more .ts/.tsx duplicate files (after deprecation period)
5. **Improved maintainability** - Easier to find and update role-related functionality