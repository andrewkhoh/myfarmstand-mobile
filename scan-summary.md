# Dependency Scan Summary

## Quick Stats
- **Total files scanned**: 437
- **Broken imports**: 53 (but most in ARCHIVE/backup folders)
- **Orphaned files**: 181
- **Real issues**: ~15 files

## Files with REAL Broken Imports (excluding archives/backups)

### Marketing Features (Known Broken)
- src/hooks/marketing/useMarketingCampaigns.ts
- src/screens/marketing/MarketingAnalyticsScreen.bak.tsx
- src/services/marketing/marketingCampaignService.ts
- src/services/marketing/productBundleService.ts
- src/services/marketing/productContentService.ts
- src/integration/marketing/orchestrator.ts
- src/integration/marketing/orchestratorExtended.ts
- src/integration/marketing/stateMachine.ts

### Role-Based Navigation (Extension Feature)
- src/hooks/role-based/useNavigationPermissions.ts
- src/hooks/role-based/useRoleMenu.ts
- src/hooks/role-based/useRoleNavigation.ts
- src/navigation/RoleBasedStackNavigator.tsx
- src/screens/role-based/PermissionManagementScreen.tsx
- src/screens/role-based/RoleSelectionScreen.tsx

### Test Files
- src/test/service-test-template.ts

## Core App Status
✅ **App.tsx** - No broken imports
✅ **App.original.tsx** - No broken imports  
✅ **Core Navigation** - All screens exist
✅ **Main Tab Navigator** - All screens exist
✅ **Auth/Cart/Realtime hooks** - Working

## Recommendations
1. **Immediate**: Core app should work as-is
2. **Cleanup**: Remove 181 orphaned files to speed up bundling
3. **Fix**: Repair or remove the 15 files with real broken imports
4. **Optimize**: Move test files to excluded directory
