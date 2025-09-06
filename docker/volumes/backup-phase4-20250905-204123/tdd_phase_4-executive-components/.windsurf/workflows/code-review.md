# Code Review and Analysis Workflow

## Trigger
When user requests code review, security audit, or quality analysis

## Action
Use claude_code tool with analysis-specific prompt:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Code Review and Analysis
TASK ID: review-{TIMESTAMP}

CONTEXT:
- Review scope: {REVIEW_SCOPE}
- Focus areas: {FOCUS_AREAS}
- Standards: {CODING_STANDARDS}

INSTRUCTIONS:
1. Perform comprehensive code analysis
2. Check for security vulnerabilities
3. Evaluate performance implications
4. Assess code maintainability
5. Verify adherence to coding standards
6. Generate detailed report with recommendations

DELIVERABLES:
- Code quality assessment
- Security vulnerability report
- Performance optimization suggestions
- Refactoring recommendations
```

## Parameters
- REVIEW_SCOPE: specific files, modules, or entire codebase
- FOCUS_AREAS: security, performance, maintainability, etc.
- CODING_STANDARDS: project-specific or industry standards

## Farm Stand Specific Context
- Review against CartService golden pattern compliance
- Check for camelCase/snake_case mapping consistency
- Validate React Query atomic pattern usage
- Audit broadcast security and user isolation
- Verify TypeScript compliance and type safety
