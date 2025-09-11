# Fix Strategy Analysis: Risk vs Effectiveness

## Option 1: Remove Bad Mapping from Jest Config
**Change:** Remove `'^@supabase/supabase-js$': '<rootDir>/src/__mocks__/supabase.ts'` from jest.config

### Effectiveness: ⭐⭐⭐ HIGH
- Matches the volume's actual behavior (config points to non-existent file, Jest ignores it)
- Lets Jest's normal module resolution work
- Test's own mocks (`jest.mock()`) will handle everything

### Risk: ⭐ LOW  
- **Minimal risk** - We're removing something that's already broken
- Config will be cleaner and more honest
- Other tests that don't mock Supabase might fail (but they're probably already broken)

### Pros:
- Simple, one-line change
- Makes config match reality
- Follows volume's working pattern

### Cons:
- If any test actually needs the Supabase mock mapping, it will fail
- But those tests are likely already failing

---

## Option 2: Create Mock Where Jest Expects
**Change:** Create `src/__mocks__/supabase.ts` with proper mock implementation

### Effectiveness: ⭐⭐ MEDIUM
- Jest will find the mock and load it
- Should unblock module resolution
- We tried this already - it didn't work (still hung)

### Risk: ⭐⭐ MEDIUM
- We already tried creating this file - test still hung
- Might not be the root cause
- Creates a file that doesn't exist in volume (diverges from working pattern)

### Pros:
- Satisfies Jest's configuration
- Provides consistent mocking across all tests

### Cons:
- Already tried and failed
- Adds a file that volume doesn't have
- May not fix the real issue

---

## Option 3: Mock in Setup Files
**Change:** Add Supabase mocks to `src/test/setup.ts` or `src/test/serviceSetup.ts`

### Effectiveness: ⭐ LOW
- Setup files run AFTER module resolution
- Won't fix the hanging during import phase
- Jest needs to resolve modules before setup files run

### Risk: ⭐⭐⭐ HIGH
- High chance of not working
- Makes setup files more complex
- Diverges significantly from volume pattern

### Pros:
- Centralized mocking location
- All tests get the mock automatically

### Cons:
- Won't fix the module resolution hanging
- Setup files run too late in Jest's lifecycle
- Adds complexity

---

## Recommendation: Option 1

**Why Option 1 is Best:**

1. **Highest Success Probability** - Matches exactly what works in volume
2. **Lowest Risk** - Removes broken configuration rather than adding complexity
3. **Simplest Change** - One line removal vs creating new files/logic
4. **Evidence-Based** - Volume works without the mapping, so main should too

## The Real Problem

The hang happens because:
1. Jest config says: "When you see `@supabase/supabase-js`, load `src/__mocks__/supabase.ts`"
2. That file doesn't exist
3. Jest gets stuck trying to resolve it

By removing the mapping:
1. Jest will try to load the real `@supabase/supabase-js`
2. But the test's `jest.mock()` calls will intercept it
3. Mock is used instead of real module
4. Test runs successfully

## Backup Plan

If Option 1 doesn't work, we can:
1. Check if there are other broken imports we missed
2. Try using `modulePathIgnorePatterns` to skip problematic paths
3. Create a minimal mock that just exports empty objects