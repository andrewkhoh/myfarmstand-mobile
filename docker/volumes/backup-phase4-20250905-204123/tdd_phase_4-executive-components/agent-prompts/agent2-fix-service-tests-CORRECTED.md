# Agent 2: Fix Service Tests - CORRECTED PROMPT

## 🚨 CRITICAL: Emergency Fixes Already Applied

**Emergency structural fixes have been applied to your test files**. Your mock patterns have been partially corrected, but you need to complete the fixes.

## Current Status
- **Structural fixes**: ✅ Applied (SimplifiedSupabaseMock imports, basic patterns)
- **Mock data setup**: ❌ Still broken - THIS IS YOUR FOCUS
- **Service logic**: ❌ Still broken - Secondary focus
- **Test results**: ~42% pass rate → Target: 85-90%

## 🔍 What You Must Fix

### 1. **Critical Issue: Mock Setup Corruption**
Your test files have **hybrid patterns** that don't work:

```typescript
// ❌ CURRENT STATE (BROKEN)
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: {
      from: mockFrom  // ← mockFrom is undefined!
    },
    // ...
  };
});
```

### 2. **Fix Pattern - Use This Exactly**
```typescript
// ✅ CORRECT PATTERN (copy this exactly)
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      MARKETING_CAMPAIGNS: 'marketing_campaigns',
      PRODUCTS: 'products',
      // Add tables as needed
    }
  };
});
```

## 🎯 Your Task: Fix One Service at a Time

### Step 1: Start with Marketing Campaign Service
1. **Fix the mock setup** using the correct pattern above
2. **Remove all `mockFrom` references** - they don't work with SimplifiedSupabaseMock
3. **Configure mock data properly**:

```typescript
// Add after imports
const mockInstance = new SimplifiedSupabaseMock();

beforeEach(() => {
  jest.clearAllMocks();
  resetAllFactories();
  
  // Configure mock data for this service
  const mockCampaign = {
    id: 'campaign-test-123',
    campaign_name: 'Test Campaign',
    campaign_status: 'planned',
    created_by: testUser.id,
    // ALL required schema fields
  };
  
  mockInstance.setTableData('marketing_campaigns', [mockCampaign]);
});
```

### Step 2: Fix Service Method Calls
The tests call methods that don't exist. Check the actual service file:

```bash
# Check what methods actually exist
grep -n "export.*function\|static.*(" src/services/marketing/marketingCampaignService.ts
```

**Remove tests for non-existent methods** like `associateCampaignWithBundle`.

### Step 3: Test Incrementally
```bash
# Test just this service
npm run test:services -- marketingCampaignService.test.ts

# When it passes, move to next service
```

## 🔄 Process for Each Service

### Priority Order:
1. **marketing/marketingCampaignService.test.ts** (start here)
2. **productService.test.ts** 
3. **orderService.test.ts**
4. **paymentService.test.ts**
5. **inventoryService.test.ts**

### For Each Service:
1. **Copy working pattern** from `stockRestorationService.test.ts` (it works!)
2. **Fix mock setup** - Remove `mockFrom`, use `mockInstance.createClient()`
3. **Configure realistic mock data** matching schemas
4. **Remove tests for non-existent methods**
5. **Test and verify** before moving to next

## 🔍 Reference Files (COPY THESE PATTERNS)

### Working Example: `stockRestorationService.test.ts`
```typescript
// This file works - copy its patterns
jest.mock('../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: { /* constants */ }
  };
});
```

### Schema Reference: Check Required Fields
```bash
# Check what fields your mocks need
grep -A 10 -B 10 "z.object" src/schemas/marketing*
```

## ❌ Do NOT Do These:
- **Don't use `mockFrom`** - It doesn't work with SimplifiedSupabaseMock
- **Don't create basic mocks** - Use the class-based mock
- **Don't guess service methods** - Check the actual service file
- **Don't skip mock data setup** - Tests fail without proper data

## ✅ Success Criteria

### After Each Service:
- All tests in that service file pass
- No "is not a function" errors
- Proper mock data configured
- ValidationMonitor calls work

### Final Target:
- **Service tests: 85-90% pass rate**
- **No new failures created**
- **Systematic fix approach followed**

## 🚀 Start Now

1. **Fix marketingCampaignService.test.ts first**
2. **Use the exact pattern shown above** 
3. **Test after each change**
4. **Report progress**: `echo "$(date): Fixed marketing campaign service" >> ../test-fixes-communication/progress/fix-service-tests.md`

The emergency fixes gave you a foundation - now complete the work systematically!