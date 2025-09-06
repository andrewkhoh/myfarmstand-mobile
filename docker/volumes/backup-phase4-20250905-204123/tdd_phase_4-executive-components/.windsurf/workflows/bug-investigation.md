# Performance Bug Investigation Workflow

## Description
Root cause analysis and fix for runtime bugs like "total = $0.00" or undefined values in the Farm Stand app.

## Parameters
- `issue` (string): Description of the bug (required)
- `trace` (string): Data flow to trace (e.g., "orderService to UI")
- `component` (string): Affected UI component (optional)
- `service` (string): Suspected service (optional)

## Trigger
Use this workflow when:
- Runtime display bugs occur (total = $0.00, undefined values)
- Data not showing correctly in UI
- User reports functional issues
- Suspected mapping or broadcast problems

## Action
Use claude_code tool with the following prompt:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Performance Bug Investigation
TASK ID: bug-{TIMESTAMP}

CONTEXT:
- Reported Bug: {ISSUE}
- Data Flow Trace: {TRACE}
- Suspected Cause: Schema mapping or broadcast sanitization issues
- User Impact: Critical display/functionality problems
- Discovery: {DISCOVERY_CONTEXT}

INVESTIGATION METHODOLOGY:
1. **Trace Data Flow End-to-End**
   - Start from database schema (actual fields)
   - Follow through service layer mapping
   - Check RPC function return formats
   - Verify broadcast payload handling
   - End at UI component display

2. **Identify Mapping Breaks**
   - Compare database field names vs service expectations
   - Check for camelCase/snake_case mismatches
   - Verify field existence in actual schema
   - Look for undefined mappings

3. **Analyze Broadcast Sanitization**
   - Check if fields are being stripped during broadcast
   - Verify payload sanitization allowed fields
   - Test broadcast send/receive for data integrity
   - Check for security filtering issues

4. **Verify RPC Function Consistency**
   - Check atomic RPC function return formats
   - Compare expected vs actual return structure
   - Verify field mapping in RPC responses
   - Test RPC function outputs

5. **Test Against Live Database**
   - Use live schema inspection to verify fields
   - Test actual database queries
   - Verify data exists and is accessible
   - Check for permission/RLS issues

ROOT CAUSE ANALYSIS AREAS:
- Schema mapping mismatches (created_at vs createdAt)
- Broadcast payload sanitization stripping fields
- RPC function return format inconsistencies
- Service layer mapping errors
- UI component field access issues

COMPLETION CRITERIA:
- Root cause identified and documented
- Fix implemented and tested
- No regression in other features
- User-reported bug resolved
- Data flow verified end-to-end
```

## Expected Outputs
1. **Root cause analysis report** with detailed findings
2. **Data flow diagram** showing break points
3. **Implemented fix** with code changes
4. **Test results** proving bug resolution
5. **Prevention recommendations** for similar issues

## Usage Examples

```bash
# Investigate total display bug
/bug-investigation --issue="total displays $0.00" --trace="orderService to OrderConfirmationScreen"

# Trace undefined timestamp issue
/bug-investigation --issue="timestamps showing undefined" --trace="database to UI components"

# Investigate broadcast data loss
/bug-investigation --issue="real-time updates missing data" --trace="service broadcast to client"
```

## Integration Notes
- Works with schema validation and service audit systems
- Provides systematic approach to bug resolution
- Ensures comprehensive root cause analysis
- Prevents similar issues through pattern identification
