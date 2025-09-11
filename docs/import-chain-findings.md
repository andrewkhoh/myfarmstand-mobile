# Import Chain Findings for useBusinessMetrics Test

## Direct Test Imports - ALL OK ✅
1. **supabase.simplified.mock** → Only imports `zod` ✅
2. **hook.contracts** → Only imports `zod` and types ✅  
3. **test-utils** → File exists as test-utils.tsx ✅
4. **simpleBusinessMetricsService** → NO imports ✅
5. **useUserRole** → Fixed broken import path ✅
6. **useBusinessMetrics** (via require) → See below

## The Hook's Import Chain (useBusinessMetrics.ts)
```
useBusinessMetrics.ts imports:
├── @tanstack/react-query ✅
├── react ✅
├── useUserRole ✅ (fixed)
├── executiveAnalyticsKeys ✅
├── realtimeService ⚠️ → LEADS TO PROBLEM
│   └── imports '../config/supabase'
│       └── imports '@supabase/supabase-js' ❌
│       └── imports 'expo-constants' ❌
└── useCurrentUser (from useAuth)
    └── imports AuthService
        └── imports '../config/supabase' ❌ (same problem)
```

## The Problem Chain
```
Test File
    ↓
useBusinessMetrics (hook)
    ↓
realtimeService
    ↓
config/supabase.ts
    ↓
@supabase/supabase-js
    ↓
Jest moduleNameMapper tries to map to: src/__mocks__/supabase.ts ❌ (doesn't exist)
```

## What We've Fixed
1. ✅ Fixed useUserRole import path from `role-based/rolePermissionService` to `rolePermissionService`

## What's Still Broken
1. ❌ Jest config maps `@supabase/supabase-js` to non-existent `src/__mocks__/supabase.ts`
2. ❌ Actual mock is at `src/test/__mocks__/@supabase/supabase-js.ts`

## The Mystery
- Both main and volume have the SAME broken mapping
- Both have the SAME files  
- Volume works, main hangs

## Possible Explanations
1. **Jest resolution order** - Volume might be finding the mock differently
2. **Cached transforms** - Volume might have cached babel transforms
3. **Node modules structure** - Something in node_modules differs
4. **Manual mocks** - Jest should auto-find mocks in `__mocks__` directories, but the config mapping might be interfering