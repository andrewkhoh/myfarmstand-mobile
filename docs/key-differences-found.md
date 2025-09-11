# Key Differences Found Between Main and Volume

## 1. CRITICAL DIFFERENCE: useUserRole Import Path ❌
**File:** `src/hooks/role-based/useUserRole.ts`

| Main | Volume |
|------|--------|
| `import { RolePermissionService } from '../../services/role-based/rolePermissionService';` | `import { RolePermissionService, type RolePermissionTransform } from '../../services/rolePermissionService';` |
| Points to: `services/role-based/rolePermissionService.ts` | Points to: `services/rolePermissionService.ts` |
| **FILE DOES NOT EXIST** ❌ | File exists ✅ |

**Impact:** 
- `useBusinessMetrics` hook imports `useUserRole`
- `useUserRole` has a broken import path in main
- Even though the test mocks `useUserRole`, Jest still needs to parse/load the file first
- The broken import causes Jest to fail during module resolution

## 2. ValidationMonitor Differences
**File:** `src/utils/validationMonitor.ts`

| Main | Volume |
|------|--------|
| Has many more validation patterns (35+ patterns) | Has fewer patterns (4 basic patterns) |
| More complex pattern types | Simpler implementation |

**Impact:** Shouldn't cause hanging, but shows files were modified after copying

## 3. Service Test File Differences  
**Files:** `src/services/executive/__tests__/*.test.ts`

| Main | Volume |
|------|--------|
| Mock path: `jest.mock("../../../config/supabase"` | Mock path: `jest.mock("../../config/supabase"` |
| Missing some imports | Has imports like `createProduct, createUser` |

**Impact:** These test files aren't run during hooks tests, so not directly relevant

## 4. Mock Files Configuration Mismatch
**Jest Config:** Both have identical config with:
```javascript
'^@supabase/supabase-js$': '<rootDir>/src/__mocks__/supabase.ts'
```

**Actual Mock Locations:**
| Location | Main | Volume |
|----------|------|--------|
| `src/__mocks__/supabase.ts` | Created by us, then deleted | Never existed |
| `src/test/__mocks__/@supabase/supabase-js.ts` | ✅ Exists | ✅ Exists |
| `src/test/__mocks__/expo-constants.ts` | ✅ Exists | ✅ Exists |

**The Mystery:** 
- Jest config points to wrong location in BOTH
- But volume works, main doesn't
- Actual mocks are in `src/test/__mocks__/` not `src/__mocks__/`

## 5. Import Chain That Causes Hanging

```
useBusinessMetrics.test.tsx
    ↓
imports: useBusinessMetrics
    ↓
imports: useUserRole  
    ↓
imports: ../../services/role-based/rolePermissionService ← BROKEN PATH
    ↓
FILE NOT FOUND → Jest hangs trying to resolve
```

## Summary of Root Cause

The test hangs because:
1. `useUserRole` has a broken import path to a non-existent service location
2. Even though the test mocks `useUserRole`, Jest still needs to load/parse the file
3. When Jest tries to resolve the broken import, it fails
4. Combined with the misconfigured Supabase mock mapping, Jest gets stuck

**Why Volume Works:**
- Volume's `useUserRole` has the correct import path
- Points to `../../services/rolePermissionService` which exists

**Why Main Fails:**
- Main's `useUserRole` has incorrect import path  
- Points to `../../services/role-based/rolePermissionService` which doesn't exist
- Jest can't resolve the module and hangs