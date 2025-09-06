# Documentation Generation Workflow

## Trigger
When user requests documentation generation for code, APIs, or project structure

## Action
Use claude_code tool with documentation-specific prompt:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Documentation Generation
TASK ID: docs-{TIMESTAMP}

CONTEXT:
- Documentation type: {DOC_TYPE}
- Target audience: {AUDIENCE}
- Output format: {FORMAT}

INSTRUCTIONS:
1. Analyze codebase structure and functionality
2. Generate comprehensive documentation following project standards
3. Include code examples and usage patterns
4. Create or update README, API docs, or inline comments
5. Ensure documentation is up-to-date with current implementation

DELIVERABLES:
- Generated documentation files
- Updated existing documentation
- Code comments where appropriate
```

## Parameters
- DOC_TYPE: API, README, inline comments, etc.
- AUDIENCE: developers, end-users, maintainers
- FORMAT: Markdown, JSDoc, Sphinx, etc.

## Farm Stand Specific Context
- Document React Query hooks and service patterns
- Include Supabase RPC function documentation
- Document security broadcast system
- Include automation system usage guides
- Follow existing documentation structure in automation/README.md
