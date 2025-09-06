# Security Audit Workflow

## Description
Comprehensive security audit for broadcast system, user isolation, authentication guards, and data protection in the Farm Stand app.

## Parameters
- `scope` (string): Audit scope (default: "broadcast system")
- `focus` (string): Focus areas (default: "security,user-isolation")
- `depth` (string): Audit depth - surface, deep, comprehensive (default: "deep")

## Trigger
Use this workflow when:
- Security vulnerabilities suspected
- User isolation needs verification
- Broadcast system security review required
- Authentication guard validation needed

## Action
Use claude_code tool with the following prompt:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Security Audit
TASK ID: security-{TIMESTAMP}

CONTEXT:
- Audit Scope: {SCOPE}
- Focus Areas: {FOCUS}
- Previous Security Issues: Cross-user contamination risks identified and fixed
- Critical Systems: Broadcast channels, user authentication, data isolation

SECURITY AUDIT AREAS:
1. **Broadcast System Security**
   - Check for cross-user channel contamination
   - Verify user-specific channel isolation
   - Audit payload sanitization effectiveness
   - Test for unauthorized channel access
   - Validate encrypted channel name usage

2. **User Isolation Verification**
   - Ensure complete user data separation
   - Check query key user-specific patterns
   - Verify no global fallback channels for user data
   - Test cross-user data access prevention
   - Validate authentication guards

3. **Authentication & Authorization**
   - Audit authentication requirement enforcement
   - Check role-based access controls
   - Verify admin privilege escalation protection
   - Test unauthorized access prevention
   - Validate session management

4. **Data Protection & Privacy**
   - Check for sensitive data exposure in logs
   - Verify payload sanitization completeness
   - Audit data transmission security
   - Test for information leakage
   - Validate GDPR compliance measures

5. **RLS & Database Security**
   - Verify Row Level Security implementation
   - Check database permission enforcement
   - Test unauthorized data access
   - Validate user context in queries
   - Audit RPC function security

KNOWN SECURITY FIXES TO VALIDATE:
- User-specific query keys (no global fallbacks)
- Payload sanitization (sensitive fields excluded)
- Authentication guards (all operations require auth)
- Channel authorization (users only access authorized channels)
- Safe logging (no sensitive data in logs)

COMPLETION CRITERIA:
- Zero cross-user contamination risks
- Complete user isolation verified
- All authentication guards functional
- No sensitive data exposure
- Security compliance documented
```

## Expected Outputs
1. **Security audit report** with vulnerability assessment
2. **Risk analysis** with severity ratings
3. **Compliance verification** for existing security measures
4. **Recommendations** for additional security improvements
5. **Test results** proving security effectiveness

## Usage Examples

```bash
# Full broadcast system security audit
/security-audit --scope="broadcast system" --focus="security,user-isolation"

# Authentication system review
/security-audit --scope="authentication" --focus="authorization,access-control"

# Comprehensive security review
/security-audit --depth="comprehensive" --scope="entire system"
```

## Integration Notes
- Validates previously implemented security fixes
- Ensures ongoing security compliance
- Provides systematic security verification
- Maintains user privacy and data protection standards
