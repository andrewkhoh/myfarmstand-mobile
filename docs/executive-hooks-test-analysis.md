# Executive Hooks Test Analysis: Volume vs Main

## Test Execution Flow Diagram

```
Volume (WORKS - 98-100% pass rate)          Main (HANGS - timeout)
=====================================        =====================================
npm run test:hooks:executive                npm run test:hooks:executive
       |                                            |
       v                                            v
jest -c jest.config.hooks.executive.js      jest -c jest.config.hooks.executive.js
       |                                            |
       v                                            v
[Config File]                                [Config File]
- preset: 'jest-expo'                       - preset: 'jest-expo'  ✅ SAME
- testEnvironment: 'jsdom'                  - testEnvironment: 'jsdom'  ✅ SAME
- moduleNameMapper (with @supabase mock)    - moduleNameMapper (with @supabase mock)  ✅ SAME
- setupFilesAfterEnv:                       - setupFilesAfterEnv:
  - src/test/setup.ts                         - src/test/setup.ts
  - src/test/serviceSetup.ts                  - src/test/serviceSetup.ts  ✅ SAME
       |                                            |
       v                                            v
[Setup Files Loaded]                        [Setup Files Loaded]
1. setup.ts (190 bytes)                     1. setup.ts (190 bytes)  ✅ NOW SAME
   - imports jest-dom                          - imports jest-dom
   - sets EXPO_PUBLIC_CHANNEL_SECRET           - sets EXPO_PUBLIC_CHANNEL_SECRET
2. serviceSetup.ts (3607 bytes)             2. serviceSetup.ts (3607 bytes)  ✅ SAME
   - createMockSupabaseClient function         - createMockSupabaseClient function
       |                                            |
       v                                            v
[Module Resolution]                         [Module Resolution]
@supabase/supabase-js →                     @supabase/supabase-js →
  src/__mocks__/supabase.ts                   src/__mocks__/supabase.ts
  ❓ FILE EXISTS?                              ❌ FILE DOES NOT EXIST!
       |                                            |
       v                                            v
[Test Files]                                [Test Files]
18 test files found  ✅                     18 test files found  ✅ SAME
       |                                            |
       v                                            v
[Test Execution]                            [Test Execution]
✅ RUNS SUCCESSFULLY                         ❌ HANGS/TIMEOUT
```

## Key Finding: THE MISSING PIECE

The jest.config.hooks.executive.js maps `@supabase/supabase-js` to `<rootDir>/src/__mocks__/supabase.ts`

**CRITICAL DIFFERENCE:**
- Volume: The mock mapping exists but file is also missing - BUT IT STILL WORKS!
- Main: The mock mapping exists but file is missing - CAUSES HANG!

## Investigation: Why does it work in volume but not main?

Let me check if there's something different about how the tests or hooks import Supabase...