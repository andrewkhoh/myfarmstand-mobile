# Farm Stand Schema Fix Workflow

## Description
Comprehensive workflow to fix the 327 schema mapping issues by integrating live database schema inspection and updating service mappings.

## Parameters
- `live-schema` (boolean): Use live database schema inspection (default: true)
- `target` (string): Target services to fix (default: "all services")
- `dry-run` (boolean): Preview changes without applying (default: false)

## Trigger
Use this workflow when:
- Schema validation reports mapping issues
- Runtime bugs like "total = $0.00" occur
- Static schema.sql is suspected to be outdated
- camelCase/snake_case mapping problems are detected

## Action
Use claude_code tool with the following comprehensive prompt:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Farm Stand Schema Mapping Fix
TASK ID: schema-fix-{TIMESTAMP}

CRITICAL CONTEXT:
- Issue: 327 schema mapping mismatches detected by automation system
- Root Cause: Schema validator uses static database/schema.sql instead of live database
- Impact: Runtime bugs (total = $0.00, undefined timestamps, broken user associations)
- User Discovery: Bug found by user's son during testing

LIVE SCHEMA INTEGRATION REQUIRED:
1. **Integrate database/schema_inspector.sql queries**
   - Connect to live Supabase database with credentials
   - Execute information_schema queries to get real-time column data
   - Replace static file parsing with live database inspection

2. **Update automation/schema-validator.ts**
   - Add Supabase client connection
   - Replace loadDatabaseSchema() to use live queries
   - Implement real-time schema fetching
   - Cache schema data for performance

3. **Fix Critical Mapping Issues**
   - created_at/updated_at fields (200+ issues): Map snake_case to camelCase
   - user_id mapping: Ensure proper customerId mapping
   - total_amount mapping: Fix orderService total display bug
   - Missing fields: Add or fix field references

4. **Service-Specific Fixes**
   - orderService (126 mismatches): Fix total, timestamps, user associations
   - productService (180 mismatches): Fix category_id, pre_order_deadline fields
   - cartService (24 mismatches): Fix timestamp and user mappings
   - noShowHandlingService (34 mismatches): Fix user_id and field references

5. **Validation & Testing**
   - Re-run automation system with live schema
   - Verify 327 issues reduced to 0
   - Test runtime bugs are fixed (total displays correctly)
   - Ensure no regression in existing functionality

COMPLETION CRITERIA:
- Live schema inspection integrated and working
- All 327 mapping issues resolved
- Runtime display bugs fixed (total = $0.00 → correct amount)
- Automation reports show 0 critical schema issues
- No breaking changes to existing functionality

FARM STAND SPECIFIC REQUIREMENTS:
- Maintain CartService golden pattern compliance
- Preserve security broadcast constraints
- Keep user isolation and authentication guards
- Follow React Query atomic patterns
- Ensure TypeScript type safety
```

## Expected Outputs
1. **Updated schema-validator.ts** with live database integration
2. **Fixed service mappings** for all affected services
3. **Resolved runtime bugs** like total display issues
4. **Clean automation reports** with 0 critical schema issues
5. **Documentation** of changes and validation results

## Usage Examples

```bash
# Fix all schema issues with live database
/farm-stand-schema-fix --live-schema=true --target="all services"

# Preview changes without applying
/farm-stand-schema-fix --dry-run=true

# Fix specific services only
/farm-stand-schema-fix --target="orderService,productService"
```

## Integration Notes
- Works with existing Service Audit & Fix Automation System
- Addresses critical flaw identified in automation system design
- Provides comprehensive solution to schema mapping problems
- Enables accurate validation for future development
