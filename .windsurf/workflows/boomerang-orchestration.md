# Boomerang Pattern Orchestration Workflow

## Parent Task Orchestration Pattern

### Flow Structure
1. **Task Analysis**: Windsurf analyzes complex user request
2. **Subtask Breakdown**: Generate specific Claude Code prompts
3. **Parallel Delegation**: Send subtasks to Claude Code via MCP
4. **Result Integration**: Combine Claude Code outputs intelligently
5. **Quality Assurance**: Validate integrated solution
6. **Final Delivery**: Present unified solution to user

### Example Implementation
User Request: "Fix the schema mapping issues and optimize the Farm Stand app performance"

**Windsurf Orchestration:**
- Schema validation → Claude Code (workflow: code-review)
- Service mapping fixes → Claude Code (workflow: refactor)
- Performance optimization → Claude Code (workflow: architecture)
- Database query optimization → Claude Code (workflow: code-review)
- Documentation update → Claude Code (workflow: docs)

**Integration Phase:**
- Combine schema fixes with service updates
- Ensure compatibility between performance changes
- Create unified implementation plan
- Generate comprehensive test coverage
- Update automation system reports

### Farm Stand Specific Orchestration Patterns

#### Schema Mapping Fix Orchestration
```
User Request: "Fix the 327 schema mapping issues"

Subtasks:
1. Live schema inspection → Claude Code (integrate schema_inspector.sql)
2. Service mapping analysis → Claude Code (compare against live schema)
3. Automated fix generation → Claude Code (update schema-validator.ts)
4. Pattern compliance check → Claude Code (ensure CartService alignment)
5. Test generation → Claude Code (create comprehensive tests)
```

#### Performance Optimization Orchestration
```
User Request: "Optimize app performance and fix the total = $0.00 bug"

Subtasks:
1. Root cause analysis → Claude Code (analyze orderService mapping)
2. Broadcast payload optimization → Claude Code (fix sanitization issues)
3. React Query optimization → Claude Code (improve atomic patterns)
4. Database query optimization → Claude Code (optimize RPC functions)
5. Real-time performance → Claude Code (optimize broadcast efficiency)
```
