# Multi-Agent Infrastructure Refactor Guide

## 🎯 **Overview**

This guide documents the complete refactor of the multi-agent containerized infrastructure from hardcoded Phase 1/2 systems to a generic, configuration-driven framework. The refactor enables creating new multi-agent projects through simple YAML configuration while maintaining all self-improvement, dependency coordination, and monitoring capabilities.

## ✅ **Key Achievements**

### **Generic Template System**
- **Project Generator**: `bin/generate-multi-agent-project.sh` creates complete projects from YAML configs
- **Template Engine**: Dynamic variable substitution with `{{PROJECT_NAME}}`, `{{AGENT_NAME}}`, etc.
- **Dependency Injection**: Automatic generation of dependency checks and agent coordination

### **Configuration-Driven Architecture**
- **YAML Configs**: Define agents, dependencies, test commands in `docker/configs/*.yml`
- **Automatic Generation**: docker-compose.yml, setup.sh, stop.sh, entrypoint scripts
- **Consistent Communication**: Fixed handoff file naming across all components

### **Backward Compatibility**
- Existing Phase 1 continues working unchanged while new projects use generic system

## 📋 **Usage Guide**

### **Create New Multi-Agent Project**

1. **Create YAML configuration**:
```bash
cat > docker/configs/my-project.yml <<EOF
project:
  name: "my-feature"
  prefix: "tdd-phase-3"
  description: "My Feature Implementation"
  max_restarts: 5
  test_pass_target: 85
  monitoring_port: 3003

agents:
  - name: "my-schema"
    type: "foundation"
    depends_on: []
    test_command: "npm run test:schemas:my"
    prompt_file: "my-schema.md"
    
  - name: "my-services"
    type: "service"
    depends_on: ["my-schema"]
    test_command: "npm run test:services:my"
    prompt_file: "my-services.md"
EOF
```

2. **Generate project infrastructure**:
```bash
./bin/generate-multi-agent-project.sh docker/configs/my-project.yml
```

3. **Launch agents**:
```bash
cd docker/projects/tdd-phase-3
./setup.sh
docker-compose up -d
```

4. **Monitor progress**:
```bash
open http://localhost:3003
```

### **Generated File Structure**
```
docker/projects/tdd-phase-3/
├── docker-compose.yml     # Generated with all agents
├── setup.sh              # Git worktrees + dependencies
├── stop.sh               # Clean shutdown
└── entrypoint.sh         # Agent-specific execution
```

## 🔗 **Communication Architecture**

### **Shared Volumes**
The `/shared` directory structure enables agent coordination:

- **Status**: `status/{agent}.json` - Real-time agent status with heartbeats
- **Handoffs**: `handoffs/{agent}-complete.md` - Dependency completion signals  
- **Progress**: `progress/{agent}.md` - Human-readable progress logs
- **Test Results**: `test-results/{agent}-latest.txt` - TDD cycle outputs
- **Blockers**: `blockers/{agent}-incomplete.md` - Failure notifications
- **Feedback**: `feedback/{agent}-improvements.md` - Cycle feedback

### **Dependency Chain**
Agents automatically wait for prerequisite handoff files:

```bash
# Generated dependency check example
while [ ! -f "/shared/handoffs/my-schema-complete.md" ]; do
    echo "⏳ Waiting for my-schema completion..."
    sleep 30
done
```

## 🏗 **Template System Details**

### **Core Templates**
Located in `docker/templates/`:

- **`entrypoint-generic.sh`**: Self-improving agent entrypoint with TDD cycles
- **`docker-compose-template.yml`**: Service definitions with volume mounts
- **`setup-template.sh`**: Git worktree creation and dependency installation
- **`stop-template.sh`**: Clean agent shutdown

### **Variable Substitution**
Template variables are replaced during generation:

- `{{PROJECT_NAME}}` → Project name from config
- `{{PROJECT_DESCRIPTION}}` → Project description
- `{{AGENT_NAME}}` → Individual agent name
- `{{AGENT_TYPE}}` → Agent type (foundation, service, hook, etc.)
- `{{TEST_COMMAND}}` → Agent-specific test command
- `{{DEPENDENCY_CHECKS}}` → Generated dependency waiting logic

### **Project Generator Script**
The `bin/generate-multi-agent-project.sh` script:

1. Parses YAML configuration
2. Creates project directory structure
3. Generates docker-compose.yml with all agents
4. Creates setup/stop scripts with agent lists
5. Generates entrypoint with dependency checks
6. Validates configuration completeness

## 📊 **Configuration Schema**

### **Project Section**
```yaml
project:
  name: "project-name"           # Used for Docker network, volumes
  prefix: "tdd-phase-X"          # Directory prefix, branch names
  description: "Description"     # Shown in logs, status
  max_restarts: 5               # Self-improvement cycles
  test_pass_target: 85          # Required pass rate %
  monitoring_port: 3003         # Monitoring dashboard port
```

### **Agent Section**
```yaml
agents:
  - name: "agent-name"          # Must be unique
    type: "foundation"          # Agent category
    depends_on: ["other-agent"] # Dependency list (optional)
    test_command: "npm test"    # Test execution command
    prompt_file: "agent.md"     # Claude prompt file
```

### **Agent Types**
Standard agent types for consistent categorization:

- **foundation**: Schema, database, core types
- **service**: Business logic, API layers
- **hook**: React hooks, state management
- **screen**: UI components, screens
- **integration**: End-to-end, system tests

## 🔄 **Self-Improvement Cycle**

Each agent follows a TDD-based self-improvement pattern:

1. **Initialization**: Set up environment, check dependencies
2. **Test Analysis**: Run tests, capture current state
3. **Claude Execution**: AI-driven improvement cycle
4. **Test Verification**: Re-run tests, measure progress
5. **Cycle Completion**: Update status, prepare for next cycle
6. **Restart Trigger**: Exit container to trigger Docker restart

### **Cycle Limits**
- Default: 5 self-improvement cycles per agent
- Configurable via `max_restarts` in project config
- Agents enter maintenance mode after max cycles
- Success threshold: Configurable pass rate target

## 🔍 **Monitoring & Status**

### **Status Files**
Each agent maintains JSON status in `/shared/status/{agent}.json`:

```json
{
  "agent": "my-schema",
  "status": "running",
  "project": "my-feature",
  "cycles": 2,
  "maxRestarts": 5,
  "testsPass": 15,
  "testsFail": 3,
  "testPassRate": 83,
  "targetPassRate": 85,
  "workSummary": "Cycle 2: 15/18 tests passing (83%)"
}
```

### **Progress Logs**
Human-readable progress in `/shared/progress/{agent}.md`:

```markdown
# my-schema Progress Log - My Feature Implementation
Started: 2025-01-15 10:30:00
Target: TDD Implementation with 5 improvement cycles

🚀 Starting self-improvement cycle 1
🔍 Analyzing current test state...
📊 Test Results: 12/18 passing (67%)
🤖 Invoking Claude for cycle 1...
📝 Modified: src/schemas/my-schema.ts
✅ 3 tests now passing
📊 Cycle 1 complete: 83% pass rate
```

### **Web Monitoring**
Each project includes a monitoring dashboard:
- Real-time status updates
- Progress visualization
- Log aggregation
- Agent coordination view

## 🚀 **Migration Guide**

### **From Hardcoded to Generic**

1. **Create configuration** for existing project
2. **Generate new infrastructure** using template system
3. **Test generated setup** alongside original
4. **Migrate agent prompts** to new structure
5. **Update launch procedures** to use new scripts

### **Example: Phase 1 Migration**
```bash
# 1. Create Phase 1 config
cat > docker/configs/phase1-existing.yml <<EOF
project:
  name: "role-management"
  prefix: "phase1"
  description: "Role Management System"
  max_restarts: 3
  test_pass_target: 80
agents:
  - name: "role-hooks"
    type: "hook"
    depends_on: []
    test_command: "npm run test:hooks:role"
EOF

# 2. Generate using new system
./bin/generate-multi-agent-project.sh docker/configs/phase1-existing.yml

# 3. Compare outputs
diff -r docker/phase1-existing/ docker/projects/phase1/
```

## 🔧 **Troubleshooting**

### **Common Issues**

**YAML Parsing Errors**:
- Ensure proper indentation (spaces, not tabs)
- Validate YAML syntax with `yq` or online validator
- Check for missing required fields

**Dependency Loops**:
- Generator validates for circular dependencies
- Use `depends_on: []` for foundation agents
- Create clear dependency hierarchy

**Handoff File Mismatches**:
- Ensure agent names match between config and prompts
- Handoff files use pattern: `{project-prefix}-{agent-name}-complete.md`
- Check entrypoint dependency waiting logic

**Docker Issues**:
- Verify Docker network creation
- Check volume mount permissions
- Ensure Claude authentication in containers

### **Validation Commands**
```bash
# Test YAML syntax
yq eval docker/configs/my-project.yml

# Validate generated docker-compose
docker-compose -f docker/projects/my-project/docker-compose.yml config

# Check dependency chain
./bin/validate-agent-dependencies.sh docker/configs/my-project.yml
```

## 🎯 **Best Practices**

### **Configuration Design**
- **Clear naming**: Use descriptive agent and project names
- **Logical dependencies**: Foundation → Service → Hook → Screen → Integration
- **Reasonable targets**: 80-90% pass rates for most projects
- **Appropriate cycles**: 3-5 cycles for most improvements

### **Agent Coordination**
- **Single responsibility**: Each agent handles one layer/concern
- **Clear interfaces**: Well-defined handoff criteria
- **Failure isolation**: Individual agent failures don't block others
- **Progress transparency**: Detailed logging and status updates

### **Infrastructure Maintenance**
- **Version control**: All generated files should be committed
- **Documentation**: Update prompts when changing agent responsibilities
- **Monitoring**: Regular health checks on long-running projects
- **Cleanup**: Remove completed project directories periodically

## 📚 **Related Documentation**

- `multi-agent-architecture-guide.md` - Overall architecture principles
- `multi-agent-monitoring-pattern.md` - Status and coordination patterns
- `containerized-multi-agent-guide.md` - Docker containerization details
- `agent-prompt-guidelines.md` - Writing effective agent prompts

## 🔮 **Future Enhancements**

### **Planned Features**
- **Dynamic scaling**: Auto-adjust agent resources based on load
- **Cross-project dependencies**: Agents depending on other projects
- **Template marketplace**: Reusable agent configurations
- **Performance optimization**: Parallel agent execution where possible

### **Configuration Extensions**
- **Resource limits**: CPU/memory constraints per agent
- **Timeout controls**: Custom timeouts for long-running operations
- **Notification hooks**: Slack/email notifications on completion
- **Custom volumes**: Project-specific volume mounts

The multi-agent infrastructure refactor provides a solid foundation for scalable, maintainable AI-driven development workflows while preserving all the proven patterns from the original Phase 1 implementation.