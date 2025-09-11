# Import Chain Analysis Plan for useBusinessMetrics.test.tsx

## Goal
Find why this test hangs in main but works in volume by tracing every import.

## Test File Direct Imports
```
useBusinessMetrics.test.tsx imports:
├── react (npm package - ignore)
├── @testing-library/react-native (npm package - ignore)
├── @tanstack/react-query (npm package - ignore)
├── ../../../test/mocks/supabase.simplified.mock
├── ../../../test/contracts/hook.contracts
├── ../../../test/test-utils
├── ../../../services/executive/simpleBusinessMetricsService
├── ../../role-based/useUserRole
└── ../useBusinessMetrics (via require - defensive import)
```

## Analysis Strategy

### Step 1: Map the Import Tree
For each local import above, check what IT imports:

1. **supabase.simplified.mock.ts** - What does it import?
2. **hook.contracts.ts** - What does it import?
3. **test-utils.ts** - What does it import?
4. **simpleBusinessMetricsService.ts** - What does it import?
5. **useUserRole.ts** - What does it import? (WE KNOW THIS HAS BROKEN IMPORT)
6. **useBusinessMetrics.ts** - What does it import?

### Step 2: For Each Import, Check
- Does the file exist in both main and volume?
- Are the imports identical?
- Do the imported files exist?

### Step 3: Focus on the Chain That Includes External Packages
Particularly interested in chains that lead to:
- `@supabase/supabase-js`
- `expo-constants`
- Any file that doesn't exist

### Step 4: The Known Issues So Far

1. **useUserRole.ts** 
   - Main: imports from `../../services/role-based/rolePermissionService` ❌ (doesn't exist)
   - Volume: imports from `../../services/rolePermissionService` ✅ (exists)
   - **FIXED** - but still hangs

2. **Jest Config moduleNameMapper**
   - Maps `@supabase/supabase-js` → `src/__mocks__/supabase.ts` (doesn't exist)
   - But actual mock is at `src/test/__mocks__/@supabase/supabase-js.ts`

3. **The Mystery**
   - Even with broken mapping, volume works
   - Even after fixing useUserRole import, main still hangs

### Step 5: What Could Cause Silent Hanging?

1. **Circular dependency** - A imports B, B imports A
2. **Module resolution loop** - Jest can't find a module and keeps trying
3. **Transform issue** - Babel/TypeScript transform getting stuck
4. **Mock hoisting issue** - Mocks not being applied before imports are resolved

## Next Actions

1. Check what `useBusinessMetrics.ts` (the hook itself) imports
2. Check if any of those imports lead to `@supabase/supabase-js`
3. Check if the test's defensive import pattern matters
4. Check if there's a circular dependency somewhere