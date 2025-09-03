# Multi-Agent TDD Infrastructure Guide

## Overview

This document provides comprehensive instructions for setting up and using the multi-agent TDD (Test-Driven Development) infrastructure. This system orchestrates multiple containerized Claude Code agents to implement features through coordinated TDD cycles.

## Architecture

### Core Components

1. **Template Generation System** - Dynamic project generation from YAML configs
2. **Docker Orchestration** - Containerized agents with shared volumes
3. **Authentication Pattern** - Single OAuth shared across all agents
4. **Communication Infrastructure** - Shared volumes for inter-agent coordination
5. **Monitoring Dashboard** - Real-time progress tracking

### File Structure

```
docker/
├── agents/
│   ├── entrypoint-generic.sh        # Universal entrypoint for all projects
│   ├── entrypoint-enhanced.sh       # Phase 1 specific (DO NOT MODIFY)
│   ├── Dockerfile                   # Agent container definition
│   └── prompts/                     # Agent-specific prompt files
│       ├── phase2-inventory-schema.md
│       ├── phase2-inventory-services.md
│       └── ...
├── configs/
│   └── tdd-phase-2-inventory.yml    # Project configuration
├── projects/                        # Generated projects (auto-created)
│   └── tdd_phase_2/                 # Example generated project
│       ├── docker-compose.yml       # Container orchestration
│       ├── entrypoint.sh            # Copy of entrypoint-generic.sh
│       ├── setup.sh                 # Initialization script
│       └── stop.sh                  # Cleanup script
├── templates/
│   ├── setup-project.template.sh    # Setup script template
│   └── stop-project.template.sh     # Stop script template
└── volumes/
    ├── communication/               # Inter-agent communication
    │   ├── logs/                   # Agent execution logs
    │   ├── status/                 # JSON status files
    │   ├── progress/               # Markdown progress files
    │   ├── handoffs/               # Agent-to-agent handoffs
    │   ├── blockers/               # Blocking issues
    │   └── test-results/           # Test execution results
    └── tdd_phase_2-*/              # Agent workspaces (git worktrees)
bin/
└── generate-multi-agent-project.sh  # Project generator script
```

## Step-by-Step Setup Guide

### 1. Create Project Configuration

Create a YAML config file in `docker/configs/`:

```yaml
# docker/configs/your-project.yml
project:
  name: "your_project_name"           # Identifier (no spaces)
  prefix: "your_prefix"               # Used for container naming
  description: "Your Project Description"
  max_restarts: 5                     # Self-improvement cycles
  test_pass_target: 85               # Target pass rate percentage
  monitoring_port: 3003              # Unique port for monitoring

agents:
  - name: "your-schema"
    type: "foundation"
    depends_on: []
    test_command: "npm run test:schemas:your-feature"
    prompt_file: "your-schema.md"
    
  - name: "your-services"
    type: "service"
    depends_on: ["your-schema"]
    test_command: "npm run test:services:your-feature"
    prompt_file: "your-services.md"
    
  - name: "your-hooks"
    type: "hook"
    depends_on: ["your-services"]
    test_command: "npm run test:hooks:your-feature"
    prompt_file: "your-hooks.md"
    
  - name: "your-screens"
    type: "screen"
    depends_on: ["your-hooks"]
    test_command: "npm run test:screens:your-feature"
    prompt_file: "your-screens.md"
    
  - name: "your-integration"
    type: "integration"
    depends_on: ["your-schema", "your-services", "your-hooks", "your-screens"]
    test_command: "npm run test:integration:your-feature"
    prompt_file: "your-integration.md"
```

**Key Configuration Rules:**
- `name`: Agent identifier (used in container names)
- `type`: Agent category (foundation/service/hook/screen/integration)
- `depends_on`: Agent dependencies (ensures proper startup order)
- `test_command`: Command to run tests for this agent
- `prompt_file`: Filename in `docker/agents/prompts/`

### 2. Create Agent Prompt Files

Create prompt files in `docker/agents/prompts/`:

```markdown
# your-schema.md

# Schema Agent - Database & Type Definitions

You are implementing database schemas and TypeScript type definitions for [your feature].

## Your Responsibilities
- Database table definitions (SQL)
- TypeScript interfaces and types
- Zod validation schemas
- Database migrations

## Current Context
This is TDD cycle ${RESTART_COUNT} of ${MAX_RESTARTS}.
- Focus on making tests pass
- Follow existing architectural patterns
- Ensure type safety throughout

## Implementation Checklist
- [ ] Database schema definitions
- [ ] TypeScript interfaces
- [ ] Zod validation schemas
- [ ] Test coverage for schemas

Implement incrementally, focusing on test failures.
```

**Prompt File Guidelines:**
- Use agent name as filename (e.g., `your-schema.md`)
- Include clear responsibilities and scope
- Reference architectural patterns document
- Focus on TDD methodology
- Use environment variables like `${RESTART_COUNT}` for context

### 3. Generate Project Infrastructure

```bash
# Generate project from configuration
bin/generate-multi-agent-project.sh docker/configs/your-project.yml
```

**This creates:**
- Project directory: `docker/projects/your_prefix/`
- Docker Compose configuration
- Setup and cleanup scripts
- Entrypoint with all environment variables

### 4. Initialize Project Environment

```bash
cd docker/projects/your_prefix
./setup.sh
```

**Setup script performs:**
- Creates communication volume structure
- Initializes agent status files
- Creates git worktrees for each agent
- Installs npm dependencies
- Creates Docker network

### 5. Authentication Setup

**Start auth container:**
```bash
docker-compose up -d your_prefix-auth
```

**Authenticate (one-time):**
```bash
docker exec -it your_prefix-auth /bin/bash
claude login
# Follow browser OAuth flow
exit
```

**Authentication is now shared across all agents via volume mount.**

### 6. Launch Agents

**DEBUG Mode (Recommended First):**
```bash
DEBUG=true FRESH_START=true docker-compose up -d
```

**Production Mode:**
```bash
FRESH_START=true docker-compose up -d
```

**Environment Variable Options:**
- `DEBUG=true`: Analysis only, no code changes
- `FRESH_START=true`: Reset restart counters, start fresh
- `DEBUG=false`: Full implementation mode (default)

## Monitoring and Management

### Real-Time Monitoring

**Monitoring Dashboard:**
```bash
# Access web interface
open http://localhost:YOUR_MONITORING_PORT
```

**Log Monitoring:**
```bash
# Individual agent logs
docker logs your-agent-name --follow

# Progress files
tail -f docker/volumes/communication/progress/your-agent.md

# Status JSON
cat docker/volumes/communication/status/your-agent.json | jq '.'
```

### Agent Status Tracking

**Status File Structure:**
```json
{
  "agent": "your-agent",
  "status": "running|completed|failed",
  "cycles": 3,
  "maxRestarts": 5,
  "testsPass": 15,
  "testsFail": 2,
  "testPassRate": 88,
  "targetPassRate": 85,
  "filesModified": ["file1.ts", "file2.tsx"],
  "errors": [],
  "lastUpdate": "2025-08-29T02:15:30Z"
}
```

**Agent States:**
- `initializing`: Starting up
- `running`: Active TDD cycles
- `completed`: Reached max cycles or target
- `failed`: Encountered blocking error
- `maintenance`: Heartbeat mode

### Container Management

**Stop All Agents:**
```bash
./stop.sh
```

**Restart Specific Agent:**
```bash
docker-compose restart your-agent-name
```

**View Container Status:**
```bash
docker-compose ps
```

## Development Workflow

### Phase 1: Infrastructure Testing (DEBUG Mode)

1. **Generate project** with proper configuration
2. **Start in DEBUG mode** to verify all components
3. **Monitor logs** for prompt loading and authentication
4. **Verify communication** between agents
5. **Check status files** for proper initialization

### Phase 2: Implementation (Production Mode)

1. **Start with FRESH_START=true** to reset counters
2. **Monitor progress files** for TDD cycle execution
3. **Watch test results** improve over cycles
4. **Track file modifications** and dependency resolution
5. **Review handoff files** between dependent agents

### Phase 3: Completion and Review

1. **Check final pass rates** against targets
2. **Review generated code** for quality
3. **Validate test coverage** across all agents
4. **Document lessons learned** for next project

## Troubleshooting Guide

### Common Issues

**1. Authentication Failures**
```bash
# Symptoms: "Invalid API key" errors in logs
# Solution: Re-authenticate in auth container
docker exec -it your_prefix-auth claude login
```

**2. Prompt File Not Found**
```bash
# Symptoms: "Prompt file not found" in logs
# Check: Ensure prompt files exist in docker/agents/prompts/
ls -la docker/agents/prompts/your-*.md
```

**3. Environment Variables Not Set**
```bash
# Symptoms: Variables showing as "unset" in logs
# Check: Verify docker-compose.yml has all required vars
docker exec your-agent-name env | grep AGENT_
```

**4. Test Commands Failing**
```bash
# Symptoms: "Command not found" in test execution
# Check: Verify test commands exist in package.json
docker exec your-agent-name npm run test:your-command
```

**5. Agents Stuck in Maintenance**
```bash
# Symptoms: Only heartbeat messages, no work
# Solution: Check prompt files and restart with FRESH_START
DEBUG=true FRESH_START=true docker-compose up -d
```

### Debug Commands

**Container Environment:**
```bash
docker exec your-agent-name env | grep -E "AGENT_|PROJECT_|DEBUG"
```

**Prompt File Verification:**
```bash
docker exec your-agent-name cat /prompts/your-prompt.md | head -20
```

**Communication Volume Structure:**
```bash
ls -la docker/volumes/communication/
```

**Agent Workspace Access:**
```bash
docker exec -it your-agent-name /bin/bash
cd /workspace
```

## Best Practices

### Configuration Management

1. **Use semantic naming** for agents and projects
2. **Define clear dependencies** between agents
3. **Set realistic pass targets** (85% is recommended)
4. **Use unique monitoring ports** for each project

### Prompt Engineering

1. **Be specific** about agent responsibilities
2. **Reference architectural patterns** document
3. **Include implementation checklists**
4. **Use environment variables** for context

### Infrastructure Management

1. **Always test in DEBUG mode** first
2. **Use FRESH_START** when resuming work
3. **Monitor resource usage** during long runs
4. **Clean up completed projects** regularly

### Development Process

1. **Start with foundation agents** (schema, services)
2. **Progress through dependencies** in order
3. **Monitor inter-agent handoffs** carefully
4. **Validate test coverage** continuously

## Architecture Decisions

### Why Single Entrypoint?

- **Consistency**: All projects use same execution logic
- **Maintainability**: Single file to update for improvements
- **Flexibility**: Environment variables customize behavior

### Why Git Worktrees?

- **Isolation**: Each agent works in separate branch
- **Concurrency**: Agents can work simultaneously without conflicts
- **History**: Clear commit history per agent

### Why Shared Authentication?

- **Efficiency**: One-time OAuth setup for all agents
- **Reliability**: No per-container authentication failures
- **Security**: Centralized token management

### Why Volume-Based Communication?

- **Persistence**: Communication survives container restarts
- **Debugging**: Easy to inspect inter-agent messages
- **Scalability**: Can add more communication channels easily

## Migration from Phase 1

If migrating from Phase 1 infrastructure:

1. **Do NOT modify** `entrypoint-enhanced.sh` (Phase 1 only)
2. **Use** `entrypoint-generic.sh` for new projects
3. **Update configurations** to new YAML format
4. **Create prompt files** in new location
5. **Test thoroughly** in DEBUG mode before production

## Future Enhancements

### Planned Features

- **Dynamic scaling** based on workload
- **Agent load balancing** for heavy computation
- **Inter-project dependencies** for larger systems
- **Automatic prompt optimization** based on results
- **Integration with CI/CD** pipelines

### Extension Points

- **Custom agent types** beyond foundation/service/hook/screen/integration
- **Plugin architecture** for specialized tools
- **External service integrations** (databases, APIs)
- **Multi-language support** beyond TypeScript/React

## Conclusion

This infrastructure provides a scalable, maintainable foundation for multi-agent TDD development. By following this guide, teams can:

1. **Rapidly prototype** new features with AI assistance
2. **Maintain quality** through comprehensive testing
3. **Coordinate complex** multi-agent workflows
4. **Scale development** across multiple concurrent projects

The key to success is thorough testing in DEBUG mode, careful configuration management, and continuous monitoring of agent progress and coordination.

Remember: This is a "pipe cleaner" system designed to validate and refine the multi-agent development process. Start simple, test thoroughly, and iterate based on results.