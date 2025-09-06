# Service Pattern Compliance Workflow

## Description
Ensures all services and hooks follow the CartService golden pattern for React Query + Supabase atomic operations.

## Parameters
- `standard` (string): Pattern standard to follow (default: "CartService")
- `target` (string): Target services/hooks to check (default: "all hooks and services")
- `fix-violations` (boolean): Automatically fix pattern violations (default: true)

## Trigger
Use this workflow when:
- Service audit reports pattern violations
- New services need to follow established patterns
- Refactoring existing services for consistency
- Ensuring atomic operation compliance

## Action
Use claude_code tool with the following prompt:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Service Pattern Compliance Check
TASK ID: pattern-{TIMESTAMP}

CONTEXT:
- Golden Standard: CartService atomic React Query + Supabase pattern
- Target: {TARGET}
- Current Issues: Service pattern violations detected in automation audit
- Goal: 100% compliance across all services and hooks

CARTSERVICE GOLDEN PATTERN ANALYSIS:
1. **Analyze CartService Implementation**
   - Study src/services/cartService.ts as reference pattern
   - Document atomic operation structure
   - Identify key compliance requirements
   - Note React Query integration patterns

2. **Audit Target Services Against Standard**
   - Compare each service to CartService pattern
   - Identify pattern violations and gaps
   - Score compliance (target: 100/100)
   - Document specific deviations

3. **Fix Pattern Violations**
   - Refactor non-compliant services to match pattern
   - Ensure single source of truth principle
   - Implement atomic operations correctly
   - Update hooks to use direct mutation exposure
   - Remove redundant wrapper functions and try/catch blocks

4. **React Query Lifecycle Compliance**
   - Verify proper query key usage
   - Ensure correct invalidation patterns
   - Implement proper error handling via React Query
   - Remove manual error handling duplication

5. **Supabase Integration Compliance**
   - Ensure proper RPC function usage
   - Verify atomic database operations
   - Implement proper payload sanitization
   - Maintain security constraints

SPECIFIC COMPLIANCE REQUIREMENTS:
- Single source of truth (no wrapper functions)
- Direct mutation exposure (no try/catch in hooks)
- React Query lifecycle for error/success handling
- Atomic Supabase operations
- Proper query key factories
- Consistent return formats
- Security payload sanitization

COMPLETION CRITERIA:
- All services match CartService pattern structure
- Service audit shows 100/100 scores for all services
- No pattern violations in automation reports
- Hooks follow atomic pattern consistently
- React Query integration is optimal
```

## Expected Outputs
1. **Compliance audit report** with scores for each service
2. **Refactored services** matching CartService pattern
3. **Updated hooks** with proper atomic patterns
4. **Documentation** of pattern requirements
5. **Test validation** ensuring no functionality breaks

## Usage Examples

```bash
# Check all services against CartService standard
/pattern-compliance --standard="CartService" --target="all hooks and services"

# Fix specific service violations
/pattern-compliance --target="orderService,productService" --fix-violations=true

# Audit only without fixes
/pattern-compliance --fix-violations=false
```

## Integration Notes
- Works with Service Audit & Fix Automation System
- Ensures consistency across all Farm Stand services
- Maintains security and performance standards
- Provides foundation for reliable service patterns
