# Farm Stand Windsurf Workflows

## Available Workflows

This directory contains comprehensive Windsurf workflows for the Farm Stand mobile app, enabling powerful Claude Code integration via MCP.

### 🔧 **Core Development Workflows**

#### `/refactor`
Complex refactoring operations involving multiple files or architectural changes
- **File**: `refactor.md`
- **Use for**: Multi-file refactoring, architectural changes, code restructuring
- **Example**: `/refactor --target="src/services/*.ts" --goal="optimize performance"`

#### `/docs`
Documentation generation for code, APIs, or project structure
- **File**: `docs.md`
- **Use for**: API documentation, README updates, code comments
- **Example**: `/docs --type="api" --audience="developers" --format="markdown"`

#### `/code-review`
Code review, security audit, and quality analysis
- **File**: `code-review.md`
- **Use for**: Security audits, code quality checks, vulnerability assessment
- **Example**: `/code-review --scope="entire codebase" --focus="security,performance"`

#### `/architecture`
System design, architecture review, and structural planning
- **File**: `architecture.md`
- **Use for**: System design, architectural decisions, component planning
- **Example**: `/architecture --scope="real-time system" --requirements="scalability"`

### 🎯 **Farm Stand Specific Workflows**

#### `/farm-stand-schema-fix`
**CRITICAL**: Fix the 327 schema mapping issues with live database integration
- **File**: `farm-stand-schema-fix.md`
- **Use for**: Schema mapping problems, runtime bugs like "total = $0.00"
- **Example**: `/farm-stand-schema-fix --live-schema=true --target="all services"`

#### `/pattern-compliance`
Ensure all services follow CartService golden pattern
- **File**: `pattern-compliance.md`
- **Use for**: Service pattern compliance, React Query atomic patterns
- **Example**: `/pattern-compliance --standard="CartService" --fix-violations=true`

#### `/bug-investigation`
Root cause analysis for runtime bugs and display issues
- **File**: `bug-investigation.md`
- **Use for**: Performance bugs, undefined values, data flow issues
- **Example**: `/bug-investigation --issue="total displays $0.00" --trace="orderService to UI"`

#### `/security-audit`
Comprehensive security audit for broadcast system and user isolation
- **File**: `security-audit.md`
- **Use for**: Security vulnerabilities, user isolation, authentication guards
- **Example**: `/security-audit --scope="broadcast system" --focus="user-isolation"`

#### `/performance-optimization`
Performance optimization for React Native and database operations
- **File**: `performance-optimization.md`
- **Use for**: App performance, query optimization, real-time improvements
- **Example**: `/performance-optimization --target="react query" --focus="caching"`

### 🤖 **Automation & Intelligence**

#### Smart Delegation System
- **File**: `smart-delegation.json`
- **Purpose**: Intelligent task routing based on complexity and type
- **Features**: Automatic workflow selection, resource estimation

#### Boomerang Orchestration
- **File**: `boomerang-orchestration.md`
- **Purpose**: Complex task breakdown with parallel subtask delegation
- **Features**: Multi-workflow coordination, result integration

#### Intelligent Delegation Engine
- **File**: `intelligent-delegation.js`
- **Purpose**: Complexity assessment and resource management
- **Features**: Task analysis, priority calculation, usage optimization

### 📊 **Monitoring & Setup**

#### MCP Setup Guide
- **File**: `MCP_SETUP.md`
- **Purpose**: Complete Claude Code + Windsurf MCP integration setup
- **Includes**: Configuration, server setup, usage examples

#### Workflow Monitoring
- **File**: `../monitoring/workflow-metrics.md`
- **Purpose**: Performance tracking and optimization
- **Features**: KPI monitoring, success rate tracking, usage analytics

## Quick Start

1. **Setup MCP Integration**:
   ```bash
   # Follow MCP_SETUP.md instructions
   claude mcp serve
   ```

2. **Fix Critical Issues First**:
   ```bash
   /farm-stand-schema-fix --live-schema=true
   ```

3. **Ensure Pattern Compliance**:
   ```bash
   /pattern-compliance --standard="CartService"
   ```

4. **Run Security Audit**:
   ```bash
   /security-audit --scope="broadcast system"
   ```

## Integration with Existing Automation

These workflows complement your existing Service Audit & Fix Automation System:

1. **Automation System** → Identifies issues (327 schema problems)
2. **MCP Workflows** → Delegates complex fixes to Claude Code
3. **Windsurf** → Orchestrates and integrates results
4. **Result** → Comprehensive automated development workflow

## Workflow Priorities for Farm Stand

### **Immediate Priority**
1. `/farm-stand-schema-fix` - Fix the 327 mapping issues
2. `/bug-investigation` - Resolve "total = $0.00" bug
3. `/security-audit` - Verify user isolation and broadcast security

### **Development Workflow**
1. `/pattern-compliance` - Ensure service consistency
2. `/performance-optimization` - Optimize app performance
3. `/code-review` - Maintain code quality
4. `/docs` - Keep documentation current

This workflow system transforms manual development tasks into intelligent, automated processes that maintain high quality and consistency across the Farm Stand mobile app.
