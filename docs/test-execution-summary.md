# How useBusinessMetrics Test Works (Volume Analysis)

## Test Strategy
The test uses a **comprehensive mocking strategy** - it mocks EVERYTHING before any imports happen:

### 1. Defensive Import Pattern
```javascript
// Hook is imported with try/catch to handle missing implementation
let useBusinessMetrics: any;
try {
  const hookModule = require('../useBusinessMetrics');
  useBusinessMetrics = hookModule.useBusinessMetrics;
} catch (error) {
  console.log('Import error for useBusinessMetrics:', error);
}
```

### 2. Mock Order (CRITICAL!)
The test mocks dependencies in this specific order:

1. **React Query** - Mocked FIRST before any other imports
   ```javascript
   jest.mock('@tanstack/react-query', () => ({
     useQuery: jest.fn(() => ({ data: null, isLoading: false... }))
   }))
   ```

2. **Services** - Mocked to prevent real service calls
   ```javascript
   jest.mock('../../../services/executive/simpleBusinessMetricsService');
   ```

3. **Hooks** - useUserRole and useAuth mocked
   ```javascript
   jest.mock('../../role-based/useUserRole');
   jest.mock('../../useAuth', () => ({
     useCurrentUser: () => ({ data: { id: 'test-user-123' } })
   }))
   ```

4. **Utilities** - Query keys and broadcast factory mocked
   ```javascript
   jest.mock('../../../utils/queryKeyFactory');
   jest.mock('../../../utils/broadcastFactory');
   ```

## Why It Works in Volume

The test works because:

1. **All dependencies are mocked** - The test never actually loads the real implementations
2. **Jest hoisting** - `jest.mock()` calls are hoisted to the top, so mocks are in place before imports
3. **No real Supabase needed** - Since services are mocked, the real Supabase client is never imported

## The Key Insight

**The test doesn't need Supabase to be mocked at all!** Because:
- `SimpleBusinessMetricsService` is mocked entirely
- `useUserRole` is mocked entirely  
- `useAuth` is mocked entirely
- The real implementations (which import Supabase) are never loaded

## Why Does It Hang in Main?

The hanging happens during Jest's module resolution phase, BEFORE the test even runs:

1. Jest tries to load the test file
2. Test imports `useBusinessMetrics` hook (using require)
3. Hook imports `useUserRole` 
4. In main, `useUserRole` had a broken import path (now fixed)
5. Hook also imports `realtimeService`
6. `realtimeService` imports `config/supabase`
7. `config/supabase` imports `@supabase/supabase-js`
8. Jest config maps this to non-existent `src/__mocks__/supabase.ts`
9. Jest hangs trying to resolve this

## The Pattern That Works

Volume works because:
1. No `src/__mocks__/supabase.ts` exists
2. Jest config points to non-existent file
3. Jest ignores the bad mapping and continues
4. The mocks in the test prevent the real code from running anyway

## Solution

To make main work like volume:
1. ✅ Fix broken import paths (already done for useUserRole)
2. Remove any `src/__mocks__` directory that conflicts
3. Let the test's own mocks handle everything
4. OR fix the Jest config to not map to non-existent files