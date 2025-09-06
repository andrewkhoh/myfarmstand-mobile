# Claude Code + Windsurf MCP Integration Setup

## MCP Configuration

Create or modify your `mcp_config.json` file in Windsurf's configuration directory:

**macOS**: `~/.codeium/windsurf/mcp_config.json`
**Windows**: `%APPDATA%\Codeium\windsurf\mcp_config.json`
**Linux**: `~/.config/.codeium/windsurf/mcp_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "claude-code": {
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

## Starting the MCP Server

Launch Claude Code as an MCP server from your terminal:

```bash
claude mcp serve
```

This transforms Claude Code into a service that Windsurf can interact with programmatically.

## Farm Stand Project Integration

### Quick Start Commands

```bash
# Complex refactoring with schema fixes
/refactor --target="src/services/*.ts" --goal="fix schema mapping issues"

# Documentation generation
/docs --type="api" --audience="developers" --format="markdown"

# Security audit
/code-review --scope="broadcast system" --focus="security,user-isolation"

# Architecture planning
/architecture --scope="schema validation" --requirements="live database integration"
```

### Workflow Usage Examples

#### Fix the 327 Schema Mapping Issues
```bash
/farm-stand-schema-fix --live-schema=true --target="all services"
```

#### Service Pattern Compliance Check
```bash
/pattern-compliance --standard="CartService" --target="all hooks and services"
```

#### Performance Bug Investigation
```bash
/bug-investigation --issue="total displays $0.00" --trace="orderService to UI"
```

## Monitoring and Usage

### Track Claude Code Usage
```bash
claude status
```

### Workflow Effectiveness
```bash
windsurf workflows stats --period=week
```

### Delegation Analytics
```bash
windsurf analyze delegation-effectiveness --export=csv
```

## Integration with Existing Automation

The MCP workflows complement your existing Service Audit & Fix Automation System:

1. **Automation System**: Identifies issues (327 schema problems)
2. **MCP Workflows**: Delegates complex fixes to Claude Code
3. **Windsurf**: Orchestrates and integrates results
4. **Result**: Comprehensive automated development workflow

## Farm Stand Specific Benefits

- **Schema Validation**: Live database integration for accurate mapping analysis
- **Service Patterns**: Automated compliance with CartService golden standard
- **Security Audits**: Comprehensive broadcast system security analysis
- **Performance Fixes**: Root cause analysis for runtime bugs
- **Documentation**: Automated generation of technical documentation
