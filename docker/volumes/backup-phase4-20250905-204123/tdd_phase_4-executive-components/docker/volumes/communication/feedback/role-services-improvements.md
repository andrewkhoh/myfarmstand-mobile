# Role Services Agent - Critical Improvements Required

## ❌ PHASE 1 FAILED - Pattern Violations Detected

### Current Status
- **Pass Rate**: 61.3% (76/124 tests passing)
- **Target**: ≥85%
- **Gap**: 23.7%
- **Status**: BLOCKED

## 🚨 CRITICAL VIOLATIONS FOUND

### 1. NOT Using SimplifiedSupabaseMock Pattern

You are using manual jest.mock() which violates the established patterns that achieved 100% success rate.

**Your Current Code** (WRONG):
```typescript
jest.mock("../../config/supabase", () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    // manual mock...
  }));
```

**Required Pattern** (from Agent 1 - 100% success):
```typescript
import { SimplifiedSupabaseMock } from "../test/serviceSetup";

describe("ServiceName", () => {
  let mockSupabase: SimplifiedSupabaseMock;
  
  beforeEach(() => {
    mockSupabase = new SimplifiedSupabaseMock();
  });
});
```

### 2. Test Infrastructure Issues

- Missing `setupServiceTest` function causing import errors
- Missing environment variable `EXPO_PUBLIC_CHANNEL_SECRET`
- Syntax errors in test files

## Priority Actions Required

### Step 1: Fix ALL Service Tests Immediately

1. Open `/workspace/src/services/role-based/__tests__/rolePermissionService.test.ts`
2. Remove ALL jest.mock() calls
3. Import and use SimplifiedSupabaseMock
4. Follow the EXACT pattern from `src/services/__tests__/cartService.test.ts`

### Step 2: Study Successful Patterns

**MANDATORY READING**:
- `docs/architectural-patterns-and-best-practices.md`
- `src/test/serviceSetup.ts` - SimplifiedSupabaseMock implementation
- `src/services/__tests__/cartService.test.ts` - Perfect example

### Step 3: Fix Environment Setup

Add to test environment:
```bash
export EXPO_PUBLIC_CHANNEL_SECRET="test-secret-key-for-testing-only"
```

## Consequences of Not Following Patterns

You are experiencing EXACTLY what was warned about:
- **You ignored patterns**: 61.3% pass rate
- **Agent 1 followed patterns**: 100% pass rate
- **This proves the patterns work**

## Next Steps

1. **DO NOT PROCEED** with any other work
2. **FIX service tests** to use SimplifiedSupabaseMock
3. **RERUN tests** until ≥85% pass rate
4. **ONLY THEN** can Phase 1 be approved

**Remember**: The patterns exist because they work. Stop creating your own mocks and use the established SimplifiedSupabaseMock pattern!
