# Jest Tests Hanging - Docker Volumes Issue & Fix

## Problem Discovery
**Date**: September 11, 2025  
**Issue**: Jest tests hang indefinitely when using `jest.config.hooks.executive.js` on main branch, but work perfectly in Docker volume branches.

## Root Cause Analysis

### The Symptom
- Running `npx jest --config jest.config.hooks.executive.js` hangs forever
- Even simple tests with just `expect(1+1).toBe(2)` hang
- CPU usage spikes, process never completes
- Same tests work perfectly in `docker/volumes/tdd_phase_4-executive-hooks` branch

### The Investigation
1. **Initial hypothesis**: Configuration differences between branches
2. **Discovery**: Jest outputs thousands of "duplicate manual mock found" warnings
3. **Root cause**: Jest's haste map scans ALL directories including `docker/volumes/`

### The Real Problem
The main branch contains 40+ complete project copies in `docker/volumes/`:
```
docker/volumes/
├── tdd_phase_4-executive-hooks/      (complete project copy)
├── tdd_phase_4-decision-support/     (complete project copy)
├── phase1-role-foundation-*/         (multiple project copies)
├── tdd_phase_3-marketing-*/          (multiple project copies)
└── ... (40+ more directories)
```

Each contains duplicate mock files:
- `src/__mocks__/`
- `src/test/__mocks__/`
- `src/components/__mocks__/`

### Why It Hangs

#### Jest's Haste Map
- **Purpose**: Fast module resolution and mock mapping system
- **Process**: Scans entire project at startup to build module index
- **Problem**: Finds thousands of duplicate mocks across Docker volumes
- **Result**: Either hangs trying to resolve conflicts or exhausts memory

#### Why Docker Volume Branch Works
The `tdd_phase_4-executive-hooks` branch has an almost empty `docker/volumes/` directory - no nested projects to scan!

## The Solution

### The Fix
Add the `roots` configuration option to limit Jest's scanning scope:

```javascript
module.exports = {
  displayName: 'Executive Hooks Tests',
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  
  // CRITICAL FIX: Only scan src directory to avoid Docker volumes with duplicate mocks
  roots: ['<rootDir>/src'],
  
  testMatch: [
    '<rootDir>/src/hooks/executive/__tests__/**/*.test.{ts,tsx}'
  ],
  // ... rest of config
};
```

### Why This Works
- `roots` restricts Jest's ENTIRE scanning scope (including haste map)
- Jest only looks in `src/` directory for:
  - Test files
  - Mock files
  - Module dependencies
- Completely ignores `docker/volumes/` and its thousands of duplicates

### Important Note
The following options are NOT sufficient:
```javascript
testPathIgnorePatterns: ['<rootDir>/docker/'],
modulePathIgnorePatterns: ['<rootDir>/docker/'],
watchPathIgnorePatterns: ['<rootDir>/docker/'],
```
These only affect specific operations but DON'T prevent haste map scanning!

## Results
- **Before fix**: Tests hang indefinitely
- **After fix**: 20 test suites (300 tests) run in 11.5 seconds

## Key Learnings

1. **Jest's haste map scans everything** by default, regardless of ignore patterns
2. **`roots` option is critical** for projects with complex directory structures
3. **Docker volumes in the project directory** can cause unexpected test issues
4. **Duplicate mocks across projects** will cause Jest to hang or fail

## Recommendations

### For All Jest Configs
When you have Docker volumes or other nested projects in your repository:
```javascript
roots: ['<rootDir>/src'],  // Add this to ALL Jest configs
```

### For Future Debugging
Signs that you have this issue:
1. Tests hang at startup (not during execution)
2. High CPU usage with no output
3. "duplicate manual mock found" warnings
4. Tests work in isolated directories but not in main project

### Alternative Solutions
1. Move Docker volumes outside the project directory
2. Add `.gitignore` entries for Docker volumes (though Jest may still scan them)
3. Use separate repositories for Docker volume projects

## Related Configuration Options

- **`roots`**: Limits ALL Jest operations to specified directories
- **`testPathIgnorePatterns`**: Only affects test file discovery
- **`modulePathIgnorePatterns`**: Only affects module resolution
- **`watchPathIgnorePatterns`**: Only affects file watching
- **`haste`**: Can be configured but `roots` is simpler and more effective

## Credit
This issue was debugged through systematic analysis comparing working and non-working environments, identifying that the presence of nested project copies in Docker volumes was the root cause.