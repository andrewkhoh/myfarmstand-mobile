# Test Execution Flow Diagram: Main vs Volume

## VOLUME (WORKS ✅)
```
npm run test:hooks:executive
         |
         v
[jest --config jest.config.hooks.executive.js --verbose --forceExit]
         |
         v
Load jest.config.hooks.executive.js
         |
         ├─> preset: 'jest-expo'
         ├─> testEnvironment: 'jsdom'
         ├─> moduleNameMapper:
         │     '@supabase/supabase-js' → 'src/__mocks__/supabase.ts' ❌ (FILE MISSING)
         └─> setupFilesAfterEnv:
                  |
                  ├─> src/test/setup.ts (190 bytes)
                  │     ├─> import '@testing-library/jest-dom'
                  │     └─> process.env.EXPO_PUBLIC_CHANNEL_SECRET = '...'
                  │
                  └─> src/test/serviceSetup.ts (3607 bytes)
                        └─> exports createMockSupabaseClient()
         |
         v
Discover test files: 18 files in src/hooks/executive/__tests__/
         |
         v
Load test file: useCrossRoleAnalytics.test.tsx
         |
         ├─> jest.mock('../../../services/executive/businessMetricsService') ← HOISTED
         ├─> jest.mock('../../../services/executive/businessIntelligenceService') ← HOISTED
         └─> jest.mock('../../../utils/validationMonitor') ← HOISTED
         |
         v
Import: useCrossRoleAnalytics from '../useCrossRoleAnalytics'
         |
         v
     [Hook loads its dependencies]
         |
         ├─> import BusinessMetricsService from '../../services/executive/businessMetricsService'
         │            ↓ (MOCKED - doesn't actually load)
         │      [Would import { supabase } from '../../config/supabase']
         │            ↓
         │      [Would import '@supabase/supabase-js']
         │            ↓
         │      [Would map to src/__mocks__/supabase.ts - MISSING]
         │
         └─> import BusinessIntelligenceService (MOCKED - doesn't load)
         |
         v
✅ TEST RUNS SUCCESSFULLY (298/299 pass in 22.7s)
```

## MAIN (HANGS ❌)
```
npm run test:hooks:executive
         |
         v
[jest -c jest.config.hooks.executive.js --forceExit]
         |
         v
Load jest.config.hooks.executive.js
         |
         ├─> preset: 'jest-expo'
         ├─> testEnvironment: 'jsdom'
         ├─> moduleNameMapper:
         │     '@supabase/supabase-js' → 'src/__mocks__/supabase.ts' ❌ (FILE MISSING)
         └─> setupFilesAfterEnv:
                  |
                  ├─> src/test/setup.ts (190 bytes)
                  │     ├─> import '@testing-library/jest-dom'
                  │     └─> process.env.EXPO_PUBLIC_CHANNEL_SECRET = '...'
                  │
                  └─> src/test/serviceSetup.ts (3607 bytes)
                        └─> exports createMockSupabaseClient()
         |
         v
Discover test files: 18 files in src/hooks/executive/__tests__/
         |
         v
Load test file: useCrossRoleAnalytics.test.tsx
         |
         ├─> jest.mock('../../../services/executive/businessMetricsService') ← HOISTED
         ├─> jest.mock('../../../services/executive/businessIntelligenceService') ← HOISTED
         └─> jest.mock('../../../utils/validationMonitor') ← HOISTED
         |
         v
Import: useCrossRoleAnalytics from '../useCrossRoleAnalytics'
         |
         v
     [Hook loads its dependencies]
         |
         ├─> import BusinessMetricsService from '../../services/executive/businessMetricsService'
         │            ↓ (SHOULD BE MOCKED but something goes wrong?)
         │      import { supabase } from '../../config/supabase'
         │            ↓
         │      import { createClient } from '@supabase/supabase-js'
         │            ↓
         │      MODULE MAPPER: '@supabase/supabase-js' → 'src/__mocks__/supabase.ts'
         │            ↓
         │      ❌ FILE NOT FOUND: src/__mocks__/supabase.ts
         │            ↓
         │      💀 JEST HANGS HERE
         │
         └─> (Never gets here)
         |
         v
❌ TIMEOUT/HANG
```

## Key Difference Point
```
                    VOLUME                          MAIN
                       |                              |
                       v                              v
            Mock prevents loading            Mock fails to prevent
            real service imports             loading service imports
                       |                              |
                       v                              v
            Never hits missing                 Hits missing mock file
              mock file issue                  '@supabase/supabase-js'
                       |                              |
                       v                              v
                  TESTS RUN ✅                   HANGS ❌
```

## The Critical Question:
**Why do the jest.mock() calls work in volume but not in main?**

Both have:
- Same jest.mock() calls (hoisted)
- Same file paths
- Same jest version
- Same configuration

Yet in volume, the mocks prevent the service files from actually loading their imports.
In main, it seems like the services are still trying to load their dependencies despite being mocked.