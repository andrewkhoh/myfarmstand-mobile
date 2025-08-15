# Farm Stand Specific Automation Workflows

## Schema Mapping Fix Workflow

### Trigger
When user mentions schema mapping issues, camelCase/snake_case problems, or the 327 validation errors

### Action
```
Your work folder is {PROJECT_PATH}

TASK TYPE: Schema Mapping Fix
TASK ID: schema-fix-{TIMESTAMP}

CONTEXT:
- Critical Issue: 327 schema mapping mismatches detected
- Root Cause: Static schema.sql vs live database discrepancy
- Impact: Runtime bugs like total = $0.00 display issues

INSTRUCTIONS:
1. Integrate live schema inspection using database/schema_inspector.sql
2. Update schema-validator.ts to connect to live Supabase database
3. Compare service field mappings against actual database schema
4. Generate accurate mapping fixes for camelCase/snake_case issues
5. Update all services to use consistent field mapping
6. Verify fixes resolve runtime display bugs

COMPLETION CRITERIA:
- Live schema inspection integrated
- All 327 mapping issues resolved
- Runtime bugs fixed (total displays correctly)
- Automation reports show 0 critical issues
```

## Service Pattern Compliance Workflow

### Trigger
When user requests service refactoring or mentions CartService golden pattern

### Action
```
Your work folder is {PROJECT_PATH}

TASK TYPE: Service Pattern Compliance
TASK ID: pattern-{TIMESTAMP}

CONTEXT:
- Golden Standard: CartService atomic React Query + Supabase pattern
- Current Issues: Service pattern violations detected in audit
- Goal: 100% compliance across all services and hooks

INSTRUCTIONS:
1. Analyze CartService implementation as reference pattern
2. Audit all services against golden standard
3. Refactor non-compliant services to match pattern
4. Ensure single source of truth and atomic operations
5. Update hooks to use direct mutation exposure
6. Verify React Query lifecycle compliance

COMPLETION CRITERIA:
- All services match CartService pattern
- Service audit shows 100/100 scores
- No pattern violations in automation reports
```

## Performance Bug Investigation Workflow

### Trigger
When user reports runtime bugs like "total = $0.00" or undefined values

### Action
```
Your work folder is {PROJECT_PATH}

TASK TYPE: Performance Bug Investigation
TASK ID: bug-{TIMESTAMP}

CONTEXT:
- Reported Bug: {BUG_DESCRIPTION}
- Suspected Cause: Schema mapping or broadcast sanitization issues
- User Impact: Critical display/functionality problems

INSTRUCTIONS:
1. Trace data flow from database to UI component
2. Identify mapping breaks in service layer
3. Check broadcast payload sanitization for field stripping
4. Verify RPC function return format consistency
5. Test fix against live database schema
6. Ensure fix doesn't break other functionality

COMPLETION CRITERIA:
- Root cause identified and documented
- Fix implemented and tested
- No regression in other features
- User-reported bug resolved
```
