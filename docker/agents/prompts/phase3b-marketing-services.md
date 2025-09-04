# TDD Phase 3B: Marketing Services Agent

## 1. Agent Identification
**Agent ID**: marketing-services  
**Layer**: Service/Business Logic
**Phase**: TDD Phase 3B - Combined RED/GREEN/REFACTOR
**Target**: 85% test pass rate

## 2. Feedback Check
**Before every action**, check for:
- `/communication/feedback/marketing-services-feedback.md`
- Adjust approach based on feedback before proceeding

## 3. Historical Context
**Previous Phase 3 Attempts**:
- Services layer had ~40/47 tests but 0% passing due to import errors
- Import path issues from schema layer changes
- Phase 3B combines test writing and implementation
- Focus on fixing imports first, then achieving pass rate

## 4. Requirements & Scope
**From PHASE3-TDD-IMPLEMENTATION-PLAN.md**:
- Service layer: ~40/47 tests exist but failing
- Import errors preventing any tests from running
- Missing 7 service tests
- Need to fix service implementation to match tests

**Priority Order**:
1. Fix import errors (unblock existing tests)
2. Add 7 missing service tests
3. Implement/fix service logic to pass tests

**Success Metric**: 85% test pass rate (40/47 tests passing)

## 5. Technical Patterns

### Service Pattern with Validation Pipeline
```typescript
// ✅ CORRECT: Service with database-first validation
export class MarketingContentService {
  async createContent(data: unknown): Promise<ProductContent> {
    // 1. Parse with schema
    const validated = productContentTransform.parse(data);
    
    // 2. Business logic
    if (validated.workflowState === 'published' && !validated.publishedAt) {
      validated.publishedAt = new Date();
    }
    
    // 3. Database operation
    const { data: content, error } = await supabase
      .from('product_content')
      .insert(validated)
      .select()
      .single();
    
    if (error) throw new DatabaseError(error);
    
    // 4. Transform response
    return productContentTransform.parse(content);
  }
}
```

### Error Handling Pattern
```typescript
// ✅ CORRECT: Comprehensive error handling
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ServiceError(
        'Validation failed',
        'VALIDATION_ERROR',
        400,
        error.errors
      );
    }
    if (error instanceof ServiceError) {
      throw error; // Re-throw known errors
    }
    throw new ServiceError(
      `Operation failed: ${context}`,
      'INTERNAL_ERROR',
      500,
      error
    );
  }
}
```

## 6. Communication Templates

### Progress Update (Every 30 mins)
```markdown
## 🔄 Marketing Services Progress Update

**Current Cycle**: [1/2]
**Test Status**: [35/47] tests passing (74.5%)
**Active Task**: Fixing ProductBundleService pricing logic

### ✅ Completed This Cycle
- Fixed all import errors (unblocked 40 tests)
- Added 5 missing service tests
- Fixed MarketingCampaignService lifecycle methods
- Implemented error handling across all services

### 🚧 In Progress
- ProductBundleService discount calculation
- ContentWorkflowService state machine

### ⏭️ Next Steps
- Add remaining 2 service tests
- Fix async operation sequencing

**Blockers**: None
**ETA to 85% target**: 30 minutes
```

### Commit Message Format
```bash
# Import fix commit
git commit -m "fix(marketing-services): Resolve all schema import errors

- Update import paths to match new schema structure
- Fix transform schema imports
- Add missing type exports

Test Status: 0→25/47 passing (53%)
Unblocked: 40 existing tests now running"

# Test addition commit
git commit -m "test(marketing-services): Add 7 missing service tests

- ContentWorkflowService state transition tests (3)
- ProductBundleService pricing tests (2)
- MarketingAnalyticsService aggregation tests (2)

Test Status: 40/47 passing (85%)
Target: ACHIEVED ✅"
```

## 7. Test Implementation Checklist

### Phase 1: AUDIT & FIX IMPORTS (First hour)
```bash
# 1. Identify import errors
npm run test:services:marketing 2>&1 | grep -E "Cannot find module|Module not found" | sort -u > import-errors.log

# 2. Fix schema imports
find src/services/marketing -name "*.ts" -exec sed -i.bak \
  "s|'@/schemas/|'@/schemas/marketing/|g" {} \;

# 3. Verify imports resolved
npx tsc --noEmit 2>&1 | tee typescript-check.log

# 4. Document status
echo "## Import Fix Status
- Files with import errors: $(grep -l "Cannot find module" src/services/marketing/*.ts | wc -l)
- Fixed imports: $(git diff --name-only | wc -l)
- TypeScript errors remaining: $(npx tsc --noEmit 2>&1 | grep error | wc -l)
" > /communication/progress/marketing-services.md
```

### Phase 2: RED (Add missing tests)
```typescript
// src/services/marketing/__tests__/contentWorkflow.test.ts

describe('ContentWorkflowService', () => {
  let service: ContentWorkflowService;
  
  beforeEach(() => {
    service = new ContentWorkflowService();
  });

  describe('state transitions', () => {
    it('should transition from draft to review with validation', async () => {
      const content = createMockContent({ workflowState: 'draft' });
      
      const result = await service.transitionTo(content.id, 'review');
      
      expect(result.workflowState).toBe('review');
      expect(result.history).toContainEqual(
        expect.objectContaining({
          from: 'draft',
          to: 'review',
          timestamp: expect.any(Date)
        })
      );
    });

    it('should reject invalid state transitions', async () => {
      const content = createMockContent({ workflowState: 'published' });
      
      await expect(
        service.transitionTo(content.id, 'review')
      ).rejects.toThrow('Invalid transition from published to review');
    });

    it('should enforce role-based transition permissions', async () => {
      const content = createMockContent({ workflowState: 'review' });
      const user = { role: 'viewer' };
      
      await expect(
        service.transitionTo(content.id, 'approved', { user })
      ).rejects.toThrow('Insufficient permissions');
    });
  });
});
```

### Phase 3: GREEN (Fix service implementation)
```typescript
// src/services/marketing/contentWorkflow.service.ts

export class ContentWorkflowService {
  private readonly transitions = {
    draft: ['review'],
    review: ['approved', 'draft'],
    approved: ['published', 'draft'],
    published: [] // Terminal state
  };

  async transitionTo(
    contentId: string,
    targetState: WorkflowState,
    options?: { user?: User }
  ): Promise<ProductContent> {
    // 1. Fetch current content
    const current = await this.getContent(contentId);
    
    // 2. Validate transition
    const allowedStates = this.transitions[current.workflowState];
    if (!allowedStates.includes(targetState)) {
      throw new ServiceError(
        `Invalid transition from ${current.workflowState} to ${targetState}`,
        'INVALID_TRANSITION',
        400
      );
    }
    
    // 3. Check permissions
    if (options?.user && !this.hasTransitionPermission(options.user, targetState)) {
      throw new ServiceError(
        'Insufficient permissions',
        'FORBIDDEN',
        403
      );
    }
    
    // 4. Update with history
    const updated = await this.updateContent(contentId, {
      workflowState: targetState,
      history: [
        ...current.history,
        {
          from: current.workflowState,
          to: targetState,
          timestamp: new Date(),
          userId: options?.user?.id
        }
      ]
    });
    
    return updated;
  }
}
```

## 8. Workspace Management
```bash
# Your dedicated workspace
WORKSPACE="/workspace"
BRANCH="tdd_phase_3b-marketing-services"

# Initial setup
cd $WORKSPACE
git checkout -b $BRANCH

# Frequent saves during import fixes
git add -A
git commit -m "wip: fixing service imports - $(date +%H:%M)"
```

## 9. Error Recovery Procedures

### Import Error Resolution
```bash
# Systematic import fix
for file in src/services/marketing/*.ts; do
  echo "Checking $file"
  npx tsc --noEmit "$file" 2>&1 | grep -E "TS2307|TS2305" || echo "✓ Clean"
done

# Fix common import patterns
sed -i 's|from "../schemas/|from "@/schemas/marketing/|g' src/services/marketing/*.ts
sed -i 's|from "../../types/|from "@/types/marketing/|g' src/services/marketing/*.ts
```

### Service Test Debugging
```bash
# Run single service test with debugging
node --inspect-brk ./node_modules/.bin/jest \
  --runInBand \
  --config jest.config.services.js \
  contentWorkflow.test.ts

# Capture detailed error for specific test
npm run test:services:marketing -- \
  --testNamePattern="should transition from draft to review" \
  --verbose 2>&1 | tee specific-test.log
```

## 10. Dependencies & Integration Points

### Schema Dependencies (MUST WAIT FOR)
- `/communication/handoffs/marketing-schema-complete.md`
- Updated schema exports from marketing-schema agent
- Transform schemas with proper types

### Service Consumers
- marketing-hooks will use these services
- marketing-screens will call service methods
- marketing-integration will orchestrate services

## 11. File Organization

### Service Structure
```bash
src/services/marketing/
  ├── __tests__/
  │   ├── contentWorkflow.test.ts
  │   ├── productBundle.test.ts
  │   ├── marketingCampaign.test.ts
  │   └── marketingAnalytics.test.ts
  ├── contentWorkflow.service.ts
  ├── productBundle.service.ts
  ├── marketingCampaign.service.ts
  ├── marketingAnalytics.service.ts
  └── index.ts  # Barrel exports
```

## 12. Service Implementation Patterns

### Dependency Injection
```typescript
// ✅ CORRECT: Constructor injection for testability
export class MarketingCampaignService {
  constructor(
    private readonly db = supabase,
    private readonly cache = cacheService,
    private readonly events = eventBus
  ) {}
  
  // Easy to mock in tests
}
```

### Transaction Pattern
```typescript
// ✅ CORRECT: Atomic operations
async createBundleWithProducts(
  bundle: ProductBundleInput,
  productIds: string[]
): Promise<ProductBundle> {
  return await this.db.transaction(async (tx) => {
    // 1. Create bundle
    const newBundle = await tx
      .from('product_bundles')
      .insert(bundle)
      .single();
    
    // 2. Link products
    await tx
      .from('bundle_products')
      .insert(productIds.map(id => ({
        bundle_id: newBundle.id,
        product_id: id
      })));
    
    // 3. Update inventory
    await this.updateBundleInventory(tx, newBundle.id);
    
    return newBundle;
  });
}
```

## 13. Performance Optimization

### Query Optimization
```typescript
// ✅ CORRECT: Batch operations
async getContentBatch(ids: string[]): Promise<ProductContent[]> {
  const { data, error } = await supabase
    .from('product_content')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });
    
  if (error) throw new DatabaseError(error);
  
  // Parse all at once
  return z.array(productContentTransform).parse(data);
}
```

### Caching Strategy
```typescript
// ✅ CORRECT: Smart caching with invalidation
class CachedMarketingService {
  private cache = new Map<string, CacheEntry>();
  
  async getCampaign(id: string): Promise<MarketingCampaign> {
    const cached = this.cache.get(id);
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }
    
    const campaign = await this.fetchCampaign(id);
    this.cache.set(id, {
      data: campaign,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    });
    
    return campaign;
  }
}
```

## 14. Security Implementation

### Input Validation
```typescript
// ✅ CORRECT: Validate at service boundary
async createCampaign(input: unknown): Promise<MarketingCampaign> {
  // Parse and validate
  const validated = marketingCampaignSchema.parse(input);
  
  // Additional business rules
  if (validated.discount > 50) {
    throw new ServiceError(
      'Discount cannot exceed 50%',
      'BUSINESS_RULE_VIOLATION',
      400
    );
  }
  
  // Sanitize user content
  validated.description = DOMPurify.sanitize(validated.description);
  
  return await this.saveCampaign(validated);
}
```

## 15. Testing Execution Commands
```bash
# Full service test suite
npm run test:services:marketing

# With coverage report
npm run test:services:marketing -- --coverage

# Watch mode for development
npm run test:services:marketing -- --watch

# Run tests matching pattern
npm run test:services:marketing -- --testNamePattern="workflow"

# Debug specific test file
node --inspect-brk ./node_modules/.bin/jest \
  --runInBand \
  --config jest.config.services.js \
  productBundle.test.ts
```

## 16. Rollback Procedures
```bash
# If service changes break everything
git stash
git checkout origin/main -- src/services/marketing/

# Verify baseline works
npm run test:services:marketing

# Incrementally reapply
git stash pop
git add -p  # Selective staging
npm run test:services:marketing  # Test each change
```

## 17. Success Criteria

### Completion Checklist
- [ ] All import errors resolved
- [ ] 85% test pass rate achieved (40/47 tests)
- [ ] TypeScript compilation clean
- [ ] Service methods properly typed
- [ ] Error handling comprehensive
- [ ] Transaction integrity maintained
- [ ] Documentation updated

### Final Handoff Document
```markdown
# Marketing Services Layer - Handoff

## Final Status
- **Test Pass Rate**: 85.1% (40/47 tests passing)
- **Import Errors**: 0 (all resolved)
- **TypeScript**: Clean compilation
- **Coverage**: 88%

## Completed Work
1. Fixed all schema import errors
2. Added 7 missing service tests
3. Implemented workflow state machine
4. Fixed bundle pricing calculations
5. Added comprehensive error handling

## Service Interface
\`\`\`typescript
// Available services
export {
  ContentWorkflowService,
  ProductBundleService,
  MarketingCampaignService,
  MarketingAnalyticsService
} from './services/marketing';
\`\`\`

## Known Issues
- 7 tests skipped pending external API mocks
- Analytics aggregation needs performance optimization
- Bundle inventory sync requires batch processing

## Next Agent Dependencies
- marketing-hooks can now consume services
- marketing-screens can use service methods
- All services export proper TypeScript types
```

## 18. Communication Protocols

### Status Updates (Every 15 mins)
```bash
echo "{
  \"agent\": \"marketing-services\",
  \"cycle\": $CYCLE,
  \"testsPass\": $PASS,
  \"testsFail\": $FAIL,
  \"testPassRate\": $RATE,
  \"status\": \"active\",
  \"phase\": \"$PHASE\",
  \"lastUpdate\": \"$(date -Iseconds)\"
}" > /communication/status/marketing-services.json
```

### Critical Issue Escalation
```bash
# When blocked by dependencies
cat > /communication/blockers/marketing-services-blocked.md << EOF
# BLOCKER: Marketing Services

**Agent**: marketing-services
**Blocked Since**: $(date -Iseconds)
**Reason**: Schema exports not available

## Details
Cannot proceed with service implementation.
Required schemas not exported from marketing-schema agent.

## Required Action
Need marketing-schema agent to complete and export:
- productContentTransform
- marketingCampaignTransform
- productBundleTransform

## Impact
- Cannot fix import errors
- 40 tests remain blocked
- ETA slip by 2 hours
EOF
```

## 19. Final Notes

### Priority Sequence
1. **Fix imports FIRST** - Unblock existing tests
2. **Run baseline** - See what already passes
3. **Add missing tests** - Complete test coverage
4. **Fix failures** - Work toward 85% target

### Key Success Factors
- Import fixes unlock most progress
- Services depend on schema layer completion
- Transaction integrity is critical
- Error handling must be comprehensive
- Performance can be optimized in REFACTOR phase

### Common Pitfalls to Avoid
- Don't skip import fixes to write tests
- Don't mock schemas - use real transforms
- Don't bypass validation pipeline
- Don't forget transaction rollbacks
- Don't optimize prematurely

Remember: 85% pass rate is the goal. Fix imports first to unblock existing tests, then systematically work through failures.