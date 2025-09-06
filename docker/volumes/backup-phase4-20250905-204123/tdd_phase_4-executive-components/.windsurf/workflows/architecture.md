# Architecture Planning Workflow

## Trigger
When user requests system design, architecture review, or structural planning

## Action
Use claude_code tool with architecture-specific prompt:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Architecture Planning
TASK ID: arch-{TIMESTAMP}

CONTEXT:
- Project scope: {PROJECT_SCOPE}
- Requirements: {REQUIREMENTS}
- Constraints: {CONSTRAINTS}
- Technology stack: {TECH_STACK}

INSTRUCTIONS:
1. Analyze current architecture (if existing)
2. Identify architectural patterns and best practices
3. Design scalable and maintainable structure
4. Create component diagrams and documentation
5. Provide implementation roadmap
6. Consider performance and security implications

DELIVERABLES:
- Architecture documentation
- Component diagrams
- Implementation plan
- Technology recommendations
```

## Parameters
- PROJECT_SCOPE: feature, module, or entire system
- REQUIREMENTS: functional and non-functional requirements
- CONSTRAINTS: budget, timeline, technology limitations
- TECH_STACK: current or preferred technologies

## Farm Stand Specific Context
- React Native + Expo mobile architecture
- Supabase backend with RLS and atomic RPC functions
- React Query state management patterns
- Real-time broadcast system architecture
- Security-first design with user isolation
