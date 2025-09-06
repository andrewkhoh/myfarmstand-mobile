# Complex Refactoring Workflow

## Trigger
When user requests complex refactoring operations involving multiple files or architectural changes

## Action
Use claude_code tool with the following prompt template:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Complex Refactoring
TASK ID: refactor-{TIMESTAMP}

CONTEXT:
- Target files: {TARGET_FILES}
- Refactoring goal: {REFACTORING_GOAL}
- Constraints: {CONSTRAINTS}

INSTRUCTIONS:
1. Analyze current code structure and dependencies
2. Create refactoring plan with step-by-step approach
3. Execute refactoring while maintaining functionality
4. Run tests to verify changes
5. Update documentation if needed

COMPLETION CRITERIA:
- All tests pass
- Code follows project conventions
- No breaking changes introduced
```

## Parameters
- TARGET_FILES: List of files to refactor
- REFACTORING_GOAL: Description of desired outcome
- CONSTRAINTS: Any limitations or requirements

## Farm Stand Specific Context
- Follow React Query + Supabase atomic pattern (CartService as golden standard)
- Maintain security broadcast constraints
- Preserve user isolation and authentication guards
- Update TypeScript interfaces and service mappings
- Ensure camelCase/snake_case consistency
