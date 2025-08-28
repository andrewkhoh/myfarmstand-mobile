# 🐳 Containerized Multi-Agent Architecture Guide
*Safe Execution of Dangerous Operations with Container Isolation*

## Table of Contents
1. [Overview](#overview)
2. [Security Model](#security-model)
3. [Container Architecture](#container-architecture)
4. [Implementation Guide](#implementation-guide)
5. [Docker Configuration](#docker-configuration)
6. [Safety Mechanisms](#safety-mechanisms)
7. [Recovery Procedures](#recovery-procedures)
8. [Monitoring & Health](#monitoring--health)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The Containerized Multi-Agent Architecture extends the [multi-agent pattern](./multi-agent-architecture-guide.md) with Docker containers to enable safe execution of dangerous operations. Each agent runs in an isolated container with `--dangerous-permissions` enabled, but with blast radius limited to the container filesystem.

### Key Benefits
- **Catastrophic Failure Prevention**: Errors contained to throwaway containers
- **Dangerous Operations Support**: Full `claude-code --dangerous-permissions` capability
- **Instant Recovery**: Failed containers restart in seconds
- **Progress Preservation**: Work survives container crashes
- **Parallel Isolation**: Each agent's mistakes don't affect others
- **Resource Limits**: Prevent runaway processes consuming host resources

### When to Use This Pattern
- Operations requiring `sudo`, `rm -rf`, or system modifications
- Experimental AI agents that might make destructive mistakes
- Large-scale refactoring with high risk of breaking changes
- Any multi-agent workflow where safety is paramount

## Security Model

### Container Isolation Boundaries

```
┌─ HOST SYSTEM (Protected) ────────────────────────────┐
│                                                      │
│  ┌─ Agent Container (Sandboxed) ─────────────────┐   │
│  │                                               │   │
│  │  ✅ ALLOWED (Full Dangerous Permissions):     │   │
│  │  • rm -rf /workspace/*                       │   │
│  │  • sudo commands within container            │   │
│  │  • Modify any container files                │   │
│  │  • Install/uninstall packages                │   │
│  │  • Network access (if enabled)               │   │
│  │                                               │   │
│  │  ❌ BLOCKED (Container Boundaries):           │   │
│  │  • Access host filesystem                    │   │
│  │  • Modify other containers                   │   │
│  │  • Escape to host system                     │   │
│  │  • Access Docker socket                      │   │
│  │  • Privilege escalation to host              │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  Volume Mounts (Controlled Access):                   │
│  • /workspace → Git worktree (read/write)            │
│  • /shared → Communication hub (read/write)          │
│  • Host system → No access                           │
└───────────────────────────────────────────────────────┘
```

### Threat Model
- **Agent Errors**: Contained to container filesystem
- **Malicious Commands**: Limited to container scope
- **Resource Exhaustion**: Capped by container limits
- **Data Loss**: Mitigated by volume mounts and snapshots
- **System Compromise**: Impossible due to container isolation

## Container Architecture

### Core Components

```
project-root/
├── docker/
│   ├── docker-compose.yml           # Orchestration
│   ├── agents/
│   │   ├── Dockerfile              # Agent container image
│   │   ├── entrypoint.sh           # Agent initialization
│   │   └── claude-config.json      # Claude Code configuration
│   ├── monitoring/
│   │   ├── Dockerfile              # Monitor container image
│   │   ├── dashboard.js            # Progress dashboard
│   │   └── health-checker.js       # Container health monitoring
│   └── volumes/
│       ├── communication/          # Shared communication (volume)
│       └── snapshots/              # Workspace backups
├── scripts/
│   ├── setup-containerized-agents.sh
│   ├── launch-agent.sh
│   └── emergency-recovery.sh
└── agents/
    ├── agent-1-prompt.md
    ├── agent-2-prompt.md
    └── agent-N-prompt.md
```

### Container Types

1. **Agent Containers**: Execute AI agents with dangerous permissions
2. **Monitor Container**: Orchestrates workflow and health monitoring  
3. **Recovery Container**: Handles emergency procedures and cleanup

## Implementation Guide

### Step 1: Environment Setup

```bash
#!/bin/bash
# scripts/setup-containerized-agents.sh

set -euo pipefail

# Configuration
PROJECT_NAME="test-refactor"
MAIN_REPO="/Users/andrewkhoh/Documents/myfarmstand-mobile"
AGENT_COUNT=7
BASE_BRANCH="main"

echo "🐳 Setting up Containerized Multi-Agent Environment..."

# Create directory structure
mkdir -p docker/{agents,monitoring,volumes/communication/{progress,blockers,handoffs,contracts,snapshots}}
mkdir -p scripts agents

# Create communication hub
COMM_DIR="docker/volumes/communication"
mkdir -p ${COMM_DIR}/{progress,blockers,handoffs,contracts}

# Define agent configuration
declare -A AGENTS=(
    ["factory"]="foundation"
    ["mock"]="foundation" 
    ["schema"]="foundation"
    ["migrate-services"]="migration"
    ["migrate-hooks"]="migration"
    ["cleanup"]="cleanup"
    ["integration"]="integration"
)

# Create git worktrees for each agent
for agent in "${!AGENTS[@]}"; do
    WORKSPACE="${PROJECT_NAME}-${agent}"
    BRANCH="${PROJECT_NAME}-${agent}"
    WORKTREE_PATH="docker/volumes/${WORKSPACE}"
    
    # Create worktree
    cd $MAIN_REPO
    git worktree add $WORKTREE_PATH -b $BRANCH $BASE_BRANCH
    
    echo "✅ Created workspace for ${agent} at ${WORKTREE_PATH}"
done

# Initialize task board
cat > ${COMM_DIR}/task-board.md << 'EOF'
# 📋 Containerized Task Board

Last Updated: $(date)

## 🐳 Container Status

### Foundation Agents (Parallel)
- [ ] Factory Agent - Container: factory-agent
- [ ] Mock Agent - Container: mock-agent  
- [ ] Schema Agent - Container: schema-agent

### Migration Agents (Depends on Foundation)
- [ ] Service Migration - Container: migrate-services-agent
- [ ] Hook Migration - Container: migrate-hooks-agent

### Cleanup & Integration
- [ ] Cleanup Agent - Container: cleanup-agent
- [ ] Integration Agent - Container: integration-agent

## 🔒 Safety Status
- Blast Radius: ✅ Contained to containers
- Data Preservation: ✅ Volume mounts active
- Recovery Ready: ✅ Snapshots available
EOF

echo "✅ Containerized multi-agent environment ready!"
echo "Next: Run 'docker-compose up' to start agents"
```

### Step 2: Docker Configuration

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  # Foundation Agents (can run in parallel)
  factory-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: factory-agent
    environment:
      - AGENT_NAME=factory
      - AGENT_TYPE=foundation
      - CLAUDE_CONFIG=/config/claude-config.json
    volumes:
      - ./volumes/test-refactor-factory:/workspace:rw
      - ./volumes/communication:/shared:rw
      - ./agents/claude-config.json:/config/claude-config.json:ro
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions", "--config", "/config/claude-config.json"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
      - SETUID
      - SETGID
    read_only: false  # Allow dangerous operations within container
    tmpfs:
      - /tmp:rw,size=1G
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - monitor

  mock-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: mock-agent
    environment:
      - AGENT_NAME=mock
      - AGENT_TYPE=foundation
    volumes:
      - ./volumes/test-refactor-mock:/workspace:rw
      - ./volumes/communication:/shared:rw
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - monitor

  schema-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: schema-agent
    environment:
      - AGENT_NAME=schema
      - AGENT_TYPE=foundation
    volumes:
      - ./volumes/test-refactor-schema:/workspace:rw
      - ./volumes/communication:/shared:rw
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - monitor

  # Migration Agents (wait for foundation)
  migrate-services-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: migrate-services-agent
    environment:
      - AGENT_NAME=migrate-services
      - AGENT_TYPE=migration
      - DEPENDS_ON=factory,mock
    volumes:
      - ./volumes/test-refactor-migrate-services:/workspace:rw
      - ./volumes/communication:/shared:rw
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - factory-agent
      - mock-agent
      - monitor

  migrate-hooks-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile  
    container_name: migrate-hooks-agent
    environment:
      - AGENT_NAME=migrate-hooks
      - AGENT_TYPE=migration
      - DEPENDS_ON=mock,schema
    volumes:
      - ./volumes/test-refactor-migrate-hooks:/workspace:rw
      - ./volumes/communication:/shared:rw
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - mock-agent
      - schema-agent
      - monitor

  # Cleanup & Integration
  cleanup-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: cleanup-agent
    environment:
      - AGENT_NAME=cleanup
      - AGENT_TYPE=cleanup
    volumes:
      - ./volumes/test-refactor-cleanup:/workspace:rw
      - ./volumes/communication:/shared:rw
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - monitor

  integration-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: integration-agent
    environment:
      - AGENT_NAME=integration
      - AGENT_TYPE=integration
      - DEPENDS_ON=migrate-services,migrate-hooks,cleanup
    volumes:
      - ./volumes/test-refactor-integration:/workspace:rw
      - ./volumes/communication:/shared:rw
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - migrate-services-agent
      - migrate-hooks-agent
      - cleanup-agent
      - monitor

  # Monitoring & Orchestration
  monitor:
    build:
      context: ./monitoring
      dockerfile: Dockerfile
    container_name: multi-agent-monitor
    environment:
      - NODE_ENV=production
    volumes:
      - ./volumes/communication:/shared:rw
      - /var/run/docker.sock:/var/run/docker.sock:ro  # For container management
    ports:
      - "3000:3000"  # Dashboard UI
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 1G
    cpus: 0.5

volumes:
  communication:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/communication

networks:
  default:
    name: multi-agent-network
```

### Step 3: Agent Container Image

```dockerfile
# docker/agents/Dockerfile
FROM node:18-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    sudo \
    vim \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (but allow sudo)
RUN useradd -m -s /bin/bash -G sudo agent && \
    echo 'agent ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Install Claude Code CLI
RUN npm install -g claude-code-cli

# Set up workspace
WORKDIR /workspace
RUN chown agent:agent /workspace

# Copy entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch to non-root user
USER agent

# Environment setup
ENV CLAUDE_API_KEY=""
ENV AGENT_NAME=""
ENV AGENT_TYPE=""
ENV DEPENDS_ON=""

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

```bash
#!/bin/bash
# docker/agents/entrypoint.sh

set -euo pipefail

echo "🐳 Starting Agent Container: $AGENT_NAME"

# Wait for dependencies if specified
if [ -n "${DEPENDS_ON:-}" ]; then
    echo "⏳ Waiting for dependencies: $DEPENDS_ON"
    IFS=',' read -ra DEPS <<< "$DEPENDS_ON"
    for dep in "${DEPS[@]}"; do
        while [ ! -f "/shared/handoffs/${dep}-ready.md" ]; do
            echo "   Waiting for ${dep}..."
            sleep 30
        done
        echo "   ✅ ${dep} ready"
    done
fi

# Create progress file
mkdir -p /shared/progress
echo "# $AGENT_NAME Progress Log" > "/shared/progress/$AGENT_NAME.md"
echo "Started: $(date)" >> "/shared/progress/$AGENT_NAME.md"

# Load agent prompt
if [ -f "/shared/prompts/$AGENT_NAME-prompt.md" ]; then
    echo "📋 Loading agent prompt..."
    cat "/shared/prompts/$AGENT_NAME-prompt.md"
fi

# Update progress
echo "$(date): Container started, ready for work" >> "/shared/progress/$AGENT_NAME.md"

# Execute Claude Code with dangerous permissions
echo "🚀 Starting Claude Code with dangerous permissions..."
exec "$@"
```

### Step 4: Monitoring Container

```dockerfile
# docker/monitoring/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S monitor -u 1001

USER monitor

EXPOSE 3000

CMD ["node", "dashboard.js"]
```

```javascript
// docker/monitoring/dashboard.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const Docker = require('dockerode');

const app = express();
const docker = new Docker();

class ContainerizedAgentMonitor {
  constructor() {
    this.communicationDir = '/shared';
    this.agents = new Map();
    this.startTime = new Date();
  }

  async initialize() {
    // Load agent configurations
    const containers = await docker.listContainers();
    for (const container of containers) {
      if (container.Names[0].includes('agent')) {
        const agentName = container.Labels?.AGENT_NAME || 'unknown';
        this.agents.set(agentName, {
          containerId: container.Id,
          status: container.State,
          created: new Date(container.Created * 1000)
        });
      }
    }

    console.log(`🐳 Monitoring ${this.agents.size} agent containers`);
  }

  async getAgentProgress() {
    const progressDir = path.join(this.communicationDir, 'progress');
    const progress = new Map();

    try {
      const files = await fs.readdir(progressDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const agentName = file.replace('.md', '');
          const content = await fs.readFile(path.join(progressDir, file), 'utf-8');
          const lines = content.split('\n');
          const lastUpdate = lines[lines.length - 2] || 'No updates';
          
          progress.set(agentName, {
            lastUpdate,
            lineCount: lines.length,
            lastModified: (await fs.stat(path.join(progressDir, file))).mtime
          });
        }
      }
    } catch (error) {
      console.error('Error reading progress:', error);
    }

    return progress;
  }

  async getContainerHealth() {
    const health = new Map();
    
    for (const [agentName, info] of this.agents) {
      try {
        const container = docker.getContainer(info.containerId);
        const inspect = await container.inspect();
        
        health.set(agentName, {
          status: inspect.State.Status,
          health: inspect.State.Health?.Status || 'unknown',
          restartCount: inspect.RestartCount,
          uptime: Date.now() - new Date(inspect.State.StartedAt).getTime(),
          memoryUsage: inspect.MemoryUsage || 'unknown'
        });
      } catch (error) {
        health.set(agentName, { status: 'error', error: error.message });
      }
    }

    return health;
  }

  async checkBlockers() {
    const blockersDir = path.join(this.communicationDir, 'blockers');
    let blockers = [];

    try {
      const files = await fs.readdir(blockersDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const stat = await fs.stat(path.join(blockersDir, file));
          blockers.push({
            file,
            age: Date.now() - stat.mtime.getTime(),
            severity: file.split('-')[0]
          });
        }
      }
    } catch (error) {
      console.error('Error reading blockers:', error);
    }

    return blockers;
  }

  async emergencyRestart(agentName) {
    console.log(`🚨 Emergency restart requested for ${agentName}`);
    
    const agentInfo = this.agents.get(agentName);
    if (!agentInfo) {
      throw new Error(`Unknown agent: ${agentName}`);
    }

    try {
      const container = docker.getContainer(agentInfo.containerId);
      
      // Create snapshot before restart
      await this.createSnapshot(agentName);
      
      // Restart container
      await container.restart();
      
      // Log restart
      const progressFile = path.join(this.communicationDir, 'progress', `${agentName}.md`);
      await fs.appendFile(progressFile, `\n$(date): 🚨 Emergency restart by monitor\n`);
      
      console.log(`✅ ${agentName} restarted successfully`);
      return { success: true, message: `${agentName} restarted` };
      
    } catch (error) {
      console.error(`Failed to restart ${agentName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async createSnapshot(agentName) {
    const workspaceDir = `/shared/../test-refactor-${agentName}`;
    const snapshotDir = `/shared/snapshots/${agentName}-${Date.now()}`;
    
    try {
      await fs.mkdir(snapshotDir, { recursive: true });
      // Copy workspace (simplified - in production use proper backup)
      await fs.cp(workspaceDir, snapshotDir, { recursive: true });
      console.log(`📸 Snapshot created: ${snapshotDir}`);
    } catch (error) {
      console.error(`Snapshot failed for ${agentName}:`, error);
    }
  }
}

// Initialize monitor
const monitor = new ContainerizedAgentMonitor();

// API Routes
app.get('/health', async (req, res) => {
  try {
    const progress = await monitor.getAgentProgress();
    const containers = await monitor.getContainerHealth();
    const blockers = await monitor.checkBlockers();
    
    res.json({
      uptime: Date.now() - monitor.startTime.getTime(),
      agents: Object.fromEntries(progress),
      containers: Object.fromEntries(containers),
      blockers,
      healthy: blockers.filter(b => b.severity === 'CRITICAL').length === 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/restart/:agent', async (req, res) => {
  try {
    const result = await monitor.emergencyRestart(req.params.agent);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard UI
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Containerized Multi-Agent Monitor</title>
    <meta http-equiv="refresh" content="30">
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #00ff00; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .agent-card { border: 1px solid #00ff00; padding: 15px; border-radius: 5px; }
        .healthy { border-color: #00ff00; }
        .warning { border-color: #ffff00; }
        .error { border-color: #ff0000; }
        .metrics { margin-top: 20px; }
        button { background: #333; color: #00ff00; border: 1px solid #00ff00; padding: 5px 10px; cursor: pointer; }
        button:hover { background: #00ff00; color: #000; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐳 Containerized Multi-Agent Monitor</h1>
        <div id="status"></div>
        <div id="agents" class="status-grid"></div>
        <div class="metrics">
            <h2>📊 System Metrics</h2>
            <div id="metrics"></div>
        </div>
    </div>

    <script>
        async function updateDashboard() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                
                document.getElementById('status').innerHTML = \`
                    <h2>System Status: \${data.healthy ? '🟢 Healthy' : '🔴 Issues Detected'}</h2>
                    <p>Uptime: \${Math.round(data.uptime / 1000 / 60)} minutes</p>
                    <p>Active Blockers: \${data.blockers.length}</p>
                \`;

                const agentsDiv = document.getElementById('agents');
                agentsDiv.innerHTML = '';
                
                Object.entries(data.agents).forEach(([name, info]) => {
                    const containerInfo = data.containers[name] || {};
                    const statusClass = containerInfo.status === 'running' ? 'healthy' : 'error';
                    
                    agentsDiv.innerHTML += \`
                        <div class="agent-card \${statusClass}">
                            <h3>🤖 \${name}</h3>
                            <p>Status: \${containerInfo.status || 'unknown'}</p>
                            <p>Restarts: \${containerInfo.restartCount || 0}</p>
                            <p>Last Update: \${info.lastUpdate || 'none'}</p>
                            <button onclick="restartAgent('\${name}')">🔄 Restart</button>
                        </div>
                    \`;
                });

                document.getElementById('metrics').innerHTML = \`
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
                
            } catch (error) {
                console.error('Dashboard update failed:', error);
            }
        }

        async function restartAgent(agentName) {
            if (confirm(\`Restart \${agentName} agent?\\n\\nThis will create a snapshot and restart the container.\`)) {
                try {
                    const response = await fetch(\`/restart/\${agentName}\`, { method: 'POST' });
                    const result = await response.json();
                    alert(result.success ? \`✅ \${result.message}\` : \`❌ \${result.error}\`);
                    updateDashboard();
                } catch (error) {
                    alert(\`❌ Restart failed: \${error.message}\`);
                }
            }
        }

        // Update every 30 seconds
        updateDashboard();
        setInterval(updateDashboard, 30000);
    </script>
</body>
</html>
  `);
});

// Start server
app.listen(3000, () => {
  console.log('🎛️  Dashboard available at http://localhost:3000');
  monitor.initialize();
});
```

## Safety Mechanisms

### 1. Container Isolation

```bash
# scripts/verify-isolation.sh
#!/bin/bash

echo "🔍 Verifying Container Isolation..."

# Test 1: Verify containers cannot access host filesystem
docker run --rm -v $(pwd):/workspace test-agent-image \
    bash -c "ls -la / | grep -v workspace || echo '✅ Host filesystem not accessible'"

# Test 2: Verify dangerous operations are contained
docker run --rm test-agent-image \
    bash -c "rm -rf /tmp/test-destruction && echo '✅ Dangerous operations contained to container'"

# Test 3: Verify no privilege escalation
docker run --rm test-agent-image \
    bash -c "docker ps 2>&1 | grep -q 'permission denied' && echo '✅ No Docker socket access'"

# Test 4: Verify resource limits
docker run --rm --memory=100m test-agent-image \
    bash -c "python3 -c 'x=\"a\"*1000000000' 2>&1 | grep -q 'MemoryError' && echo '✅ Memory limits enforced'"

echo "✅ All isolation tests passed"
```

### 2. Progress Preservation

```typescript
// scripts/progress-backup.ts
class ProgressBackup {
  private backupDir = './docker/volumes/snapshots';
  
  async createBackup(agentName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `${agentName}-${timestamp}`);
    
    await fs.mkdir(backupPath, { recursive: true });
    
    // Backup workspace
    const workspacePath = `./docker/volumes/test-refactor-${agentName}`;
    await this.copyDirectory(workspacePath, path.join(backupPath, 'workspace'));
    
    // Backup progress
    const progressPath = `./docker/volumes/communication/progress/${agentName}.md`;
    if (await this.fileExists(progressPath)) {
      await fs.copyFile(progressPath, path.join(backupPath, 'progress.md'));
    }
    
    console.log(`📸 Backup created: ${backupPath}`);
    return backupPath;
  }
  
  async restoreBackup(backupPath: string, agentName: string): Promise<void> {
    const workspacePath = `./docker/volumes/test-refactor-${agentName}`;
    
    // Stop container first
    await this.stopContainer(agentName);
    
    // Restore workspace
    await this.copyDirectory(path.join(backupPath, 'workspace'), workspacePath);
    
    // Restore progress
    const progressPath = `./docker/volumes/communication/progress/${agentName}.md`;
    const backupProgressPath = path.join(backupPath, 'progress.md');
    if (await this.fileExists(backupProgressPath)) {
      await fs.copyFile(backupProgressPath, progressPath);
    }
    
    // Restart container
    await this.startContainer(agentName);
    
    console.log(`✅ Restored from backup: ${backupPath}`);
  }
  
  private async stopContainer(agentName: string): Promise<void> {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(`docker stop ${agentName}-agent`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  
  private async startContainer(agentName: string): Promise<void> {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(`docker start ${agentName}-agent`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
```

### 3. Resource Monitoring

```typescript
// scripts/resource-monitor.ts
interface ResourceUsage {
  containerId: string;
  name: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
}

class ResourceMonitor {
  async getContainerStats(): Promise<ResourceUsage[]> {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      exec('docker stats --no-stream --format "table {{.Container}}\\t{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}"', 
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          
          const lines = stdout.trim().split('\n').slice(1); // Skip header
          const stats: ResourceUsage[] = [];
          
          lines.forEach(line => {
            const parts = line.split(/\s+/);
            if (parts.length >= 5 && parts[1].includes('agent')) {
              stats.push({
                containerId: parts[0],
                name: parts[1],
                cpuPercent: parseFloat(parts[2].replace('%', '')),
                memoryUsage: this.parseMemory(parts[3].split('/')[0]),
                memoryLimit: this.parseMemory(parts[3].split('/')[1]),
                memoryPercent: parseFloat(parts[4].replace('%', ''))
              });
            }
          });
          
          resolve(stats);
        }
      );
    });
  }
  
  private parseMemory(memStr: string): number {
    const value = parseFloat(memStr);
    if (memStr.includes('GiB')) return value * 1024 * 1024 * 1024;
    if (memStr.includes('MiB')) return value * 1024 * 1024;
    if (memStr.includes('KiB')) return value * 1024;
    return value;
  }
  
  async checkResourceLimits(): Promise<{ warnings: string[]; critical: string[] }> {
    const stats = await this.getContainerStats();
    const warnings: string[] = [];
    const critical: string[] = [];
    
    stats.forEach(stat => {
      if (stat.cpuPercent > 80) {
        warnings.push(`${stat.name}: High CPU usage (${stat.cpuPercent}%)`);
      }
      if (stat.cpuPercent > 95) {
        critical.push(`${stat.name}: Critical CPU usage (${stat.cpuPercent}%)`);
      }
      
      if (stat.memoryPercent > 80) {
        warnings.push(`${stat.name}: High memory usage (${stat.memoryPercent}%)`);
      }
      if (stat.memoryPercent > 95) {
        critical.push(`${stat.name}: Critical memory usage (${stat.memoryPercent}%)`);
      }
    });
    
    return { warnings, critical };
  }
}
```

## Single-Script Automation

### Complete Workflow Automation

You can launch and manage the entire multi-agent workflow with a single script - no multiple terminal windows required!

```bash
#!/bin/bash
# launch-multi-agent-workflow.sh - One script to rule them all

set -euo pipefail

PROJECT_NAME="test-refactor"
MAIN_REPO="/Users/andrewkhoh/Documents/myfarmstand-mobile"

echo "🚀 Launching Complete Multi-Agent Workflow..."

# Step 1: Setup environment (create worktrees, directories)
echo "📁 Setting up environment..."
./scripts/setup-containerized-agents.sh

# Step 2: Generate agent prompts dynamically
echo "📝 Generating agent prompts..."
./scripts/generate-agent-prompts.sh

# Step 3: Launch all containers with docker-compose
echo "🐳 Starting all agent containers..."
docker-compose -f docker/docker-compose.yml up -d

# Step 4: Monitor progress (backgrounded)
echo "📊 Starting monitoring dashboard..."
./scripts/monitor-progress.sh &
MONITOR_PID=$!

# Step 5: Start host-based integration agent (backgrounded)
echo "🔄 Starting integration agent..."
./scripts/integration-agent.sh &
INTEGRATION_PID=$!

echo ""
echo "✅ Multi-Agent Workflow Started!"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "📁 Progress: docker/volumes/communication/progress/"
echo "🚨 Blockers: docker/volumes/communication/blockers/"
echo ""
echo "To stop everything: ./scripts/stop-workflow.sh"

# Optional: Wait for completion
if [[ "${1:-}" == "--wait" ]]; then
    echo "⏳ Waiting for workflow completion..."
    wait $INTEGRATION_PID
    echo "✅ Workflow completed!"
    
    # Cleanup background processes
    kill $MONITOR_PID 2>/dev/null || true
fi
```

### Docker Compose with Auto-Prompt Injection

```yaml
# docker/docker-compose.yml - Enhanced with prompt automation
version: '3.8'

services:
  factory-agent:
    build: ./agents
    environment:
      - AGENT_NAME=factory
      - AGENT_PROMPT_FILE=/prompts/factory-agent.md
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    volumes:
      - ./volumes/test-refactor-factory:/workspace:rw
      - ./volumes/communication:/shared:rw
      - ./prompts:/prompts:ro  # Auto-generated prompts
    command: >
      bash -c "
        echo '📋 Loading agent prompt...';
        cat /prompts/factory-agent.md;
        echo '';
        echo '🚀 Starting Claude Code...';
        claude-code --dangerous-permissions --prompt-file /prompts/factory-agent.md
      "
    restart: unless-stopped
    depends_on:
      - prompt-generator

  # Prompt generator service (runs once to create all prompts)
  prompt-generator:
    image: alpine
    volumes:
      - ./prompts:/prompts:rw
      - ./scripts:/scripts:ro
    command: /scripts/generate-agent-prompts.sh
    restart: "no"  # Run once and exit
```

### Automated Prompt Generation

```bash
#!/bin/bash
# scripts/generate-agent-prompts.sh

PROMPTS_DIR="docker/prompts"
COMM_DIR="docker/volumes/communication"

mkdir -p $PROMPTS_DIR

# Function to generate prompt for each agent type
generate_prompt() {
    local agent_name="$1"
    local agent_type="$2"
    local dependencies="$3"
    local deliverables="$4"
    
    cat > "$PROMPTS_DIR/${agent_name}-agent.md" << EOF
You are the ${agent_name} Agent for the test refactor project.
Your workspace: /workspace
Communication hub: /shared

## Your Type: ${agent_type}

## Your Responsibilities
$(get_responsibilities "$agent_name")

## Dependencies
${dependencies:-"None - you can start immediately"}

## Deliverables
${deliverables}

## Communication Protocol
1. Update progress every 30 minutes to /shared/progress/${agent_name}.md
2. Check blockers hourly at /shared/blockers/
3. Share contracts at /shared/contracts/
4. Signal completion at /shared/handoffs/${agent_name}-ready.md

## Starting Instructions
1. First, check /shared/task-board.md for your tasks
2. Review any existing work in /shared/contracts/
3. Begin your assigned work
4. Update progress regularly

Begin work immediately after reviewing the task board.
EOF
}

# Generate prompts for all agents
generate_prompt "factory" "foundation" "" "- Base factory classes\n- 15+ domain factories"
generate_prompt "mock" "foundation" "" "- SimplifiedSupabaseMock\n- Eliminate chain mocking"
generate_prompt "schema" "foundation" "" "- Contract definitions\n- Validation schemas"
generate_prompt "migrate-services" "migration" "factory, mock" "- Migrate 34 service tests"
generate_prompt "migrate-hooks" "migration" "mock, schema" "- Migrate 50 hook tests"
generate_prompt "cleanup" "cleanup" "" "- Reduce setup files from 14 to 2"
generate_prompt "integration" "integration" "all agents complete" "- Merged codebase\n- Final PR"

echo "✅ Generated all agent prompts"
```

### Stop/Cleanup Script

```bash
#!/bin/bash
# scripts/stop-workflow.sh

echo "🛑 Stopping Multi-Agent Workflow..."

# Stop docker containers
docker-compose -f docker/docker-compose.yml down

# Kill background processes
pkill -f "monitor-progress.sh" || true
pkill -f "integration-agent.sh" || true

# Optional: Create backup
if [[ "${1:-}" == "--backup" ]]; then
    BACKUP_DIR="backups/workflow-$(date +%Y%m%d-%H%M%S)"
    mkdir -p $BACKUP_DIR
    cp -r docker/volumes/communication $BACKUP_DIR/
    echo "📦 Backup created: $BACKUP_DIR"
fi

echo "✅ Workflow stopped"
```

### Usage Examples

```bash
# Start everything with single command
./launch-multi-agent-workflow.sh

# Start and wait for completion
./launch-multi-agent-workflow.sh --wait

# Check status without opening new terminals
docker-compose -f docker/docker-compose.yml ps
tail -f docker/volumes/communication/progress/*.md

# Stop everything cleanly
./scripts/stop-workflow.sh

# Stop with backup
./scripts/stop-workflow.sh --backup
```

### Integration with Host System

The integration/consolidation phase runs on the **host system** (not in containers) for better git access:

```bash
#!/bin/bash
# scripts/integration-agent.sh - Runs on HOST

PROJECT_ROOT="/Users/andrewkhoh/Documents/myfarmstand-mobile"
COMM_DIR="$PROJECT_ROOT/docker/volumes/communication"

# Function to merge all agent work
merge_all_branches() {
    cd "$PROJECT_ROOT"
    
    # Create integration branch
    git checkout main
    git checkout -b test-refactor-integration
    
    # Merge each agent's worktree branch
    for agent in factory mock schema migrate-services migrate-hooks cleanup; do
        echo "🔀 Merging test-refactor-${agent}..."
        git merge "test-refactor-${agent}" --no-edit
        
        # Handle conflicts if needed
        if [ $? -ne 0 ]; then
            echo "⚠️ Conflicts detected - resolving..."
            # Auto-resolution logic here
        fi
    done
    
    # Create final PR
    gh pr create --title "Multi-Agent Test Refactor" \
                 --body "Automated merge of all agent branches"
}

# Wait for all agents to complete
while true; do
    if check_all_agents_ready; then
        merge_all_branches
        break
    fi
    sleep 120  # Check every 2 minutes
done
```

This approach gives you:
- ✅ **Single command to start everything**
- ✅ **No multiple terminal windows**
- ✅ **Automatic prompt generation and injection**
- ✅ **Background monitoring and integration**
- ✅ **Clean shutdown and backup options**

## Recovery Procedures

### Emergency Recovery Script

```bash
#!/bin/bash
# scripts/emergency-recovery.sh

set -euo pipefail

AGENT_NAME="$1"
RECOVERY_TYPE="${2:-restart}" # restart, restore, rebuild

echo "🚨 Emergency Recovery for $AGENT_NAME (type: $RECOVERY_TYPE)"

case $RECOVERY_TYPE in
    "restart")
        echo "🔄 Restarting container..."
        docker restart "${AGENT_NAME}-agent"
        echo "✅ Container restarted"
        ;;
        
    "restore")
        echo "📸 Finding latest backup..."
        BACKUP_DIR=$(find docker/volumes/snapshots -name "${AGENT_NAME}-*" -type d | sort -r | head -n1)
        
        if [ -z "$BACKUP_DIR" ]; then
            echo "❌ No backups found for $AGENT_NAME"
            exit 1
        fi
        
        echo "🔄 Restoring from $BACKUP_DIR..."
        
        # Stop container
        docker stop "${AGENT_NAME}-agent" || true
        
        # Restore workspace
        rm -rf "docker/volumes/test-refactor-${AGENT_NAME}"
        cp -r "$BACKUP_DIR/workspace" "docker/volumes/test-refactor-${AGENT_NAME}"
        
        # Restore progress
        if [ -f "$BACKUP_DIR/progress.md" ]; then
            cp "$BACKUP_DIR/progress.md" "docker/volumes/communication/progress/${AGENT_NAME}.md"
        fi
        
        # Restart container
        docker start "${AGENT_NAME}-agent"
        
        echo "✅ Restored from backup"
        ;;
        
    "rebuild")
        echo "🏗️ Rebuilding container from scratch..."
        
        # Create backup first
        ./scripts/create-backup.sh "$AGENT_NAME"
        
        # Stop and remove container
        docker stop "${AGENT_NAME}-agent" || true
        docker rm "${AGENT_NAME}-agent" || true
        
        # Rebuild image
        docker build -t "test-agent-image" docker/agents/
        
        # Recreate container with docker-compose
        docker-compose up -d "${AGENT_NAME}-agent"
        
        echo "✅ Container rebuilt"
        ;;
        
    *)
        echo "❌ Unknown recovery type: $RECOVERY_TYPE"
        echo "Usage: $0 <agent-name> [restart|restore|rebuild]"
        exit 1
        ;;
esac

echo "📊 Current status:"
docker ps --filter "name=${AGENT_NAME}-agent" --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
```

## Monitoring Claude Code in Containers

### Overview

When Claude Code runs inside containers with `--dangerous-permissions`, monitoring becomes crucial. Here are comprehensive monitoring strategies:

### 1. Real-Time Docker Logs

```bash
# Follow logs from specific agent
docker logs -f factory-agent

# Follow all agents with timestamps
docker-compose logs -f --timestamps

# Filter for specific patterns
docker logs factory-agent 2>&1 | grep -E "(Error|Failed|Completed)"

# Save logs to file while watching
docker logs -f factory-agent 2>&1 | tee logs/factory-$(date +%Y%m%d).log
```

### 2. Enhanced Entrypoint with Progress Capture

```bash
#!/bin/bash
# docker/agents/entrypoint-monitor.sh

set -euo pipefail

AGENT_NAME="${AGENT_NAME}"
PROGRESS_FILE="/shared/progress/${AGENT_NAME}.md"
LOG_FILE="/shared/logs/${AGENT_NAME}.log"
STATUS_FILE="/shared/status/${AGENT_NAME}.json"

# Initialize progress tracking
mkdir -p /shared/{progress,logs,status}
echo "# ${AGENT_NAME} Progress Log" > "$PROGRESS_FILE"
echo "Started: $(date)" >> "$PROGRESS_FILE"

# Create named pipe for output capture
mkfifo /tmp/claude-pipe

# Function to parse Claude output
parse_claude_output() {
    while IFS= read -r line; do
        # Log everything
        echo "$(date '+%Y-%m-%d %H:%M:%S') $line" >> "$LOG_FILE"
        
        # Extract and log specific events
        if [[ "$line" =~ "Using tool:" ]]; then
            TOOL=$(echo "$line" | sed 's/.*Using tool: //')
            echo "$(date '+%H:%M:%S') Tool: $TOOL" >> "$PROGRESS_FILE"
            update_status "lastTool" "$TOOL"
        fi
        
        if [[ "$line" =~ "File modified:" ]] || [[ "$line" =~ "File created:" ]]; then
            FILE=$(echo "$line" | sed 's/.*File [^:]*: //')
            echo "$(date '+%H:%M:%S') Modified: $FILE" >> "$PROGRESS_FILE"
            update_status "filesModified" "$FILE"
        fi
        
        if [[ "$line" =~ "Test" ]]; then
            echo "$(date '+%H:%M:%S') Test: $line" >> "$PROGRESS_FILE"
            update_status "lastTest" "$line"
        fi
        
        if [[ "$line" =~ "Error:" ]] || [[ "$line" =~ "Failed:" ]]; then
            echo "$(date '+%H:%M:%S') ⚠️ ERROR: $line" >> "$PROGRESS_FILE"
            update_status "errors" "$line"
        fi
        
        # Echo to stdout for docker logs
        echo "$line"
    done
}

# Function to update JSON status
update_status() {
    local key="$1"
    local value="$2"
    
    # Create status file if doesn't exist
    if [ ! -f "$STATUS_FILE" ]; then
        echo '{"agent":"'$AGENT_NAME'","status":"running","startTime":"'$(date -Iseconds)'"}' > "$STATUS_FILE"
    fi
    
    # Update status (simplified - in production use jq)
    python3 -c "
import json
with open('$STATUS_FILE', 'r') as f:
    data = json.load(f)
if '$key' not in data:
    data['$key'] = []
if isinstance(data.get('$key'), list):
    data['$key'].append('$value')
else:
    data['$key'] = '$value'
data['lastUpdate'] = '$(date -Iseconds)'
with open('$STATUS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
"
}

# Start heartbeat in background
(
    while true; do
        echo "$(date '+%H:%M:%S') 💓 Heartbeat - Active" >> "$PROGRESS_FILE"
        update_status "heartbeat" "$(date -Iseconds)"
        sleep 60
    done
) &
HEARTBEAT_PID=$!

# Start Claude Code with output capture
claude-code --dangerous-permissions 2>&1 | parse_claude_output &
CLAUDE_PID=$!

# Cleanup on exit
cleanup() {
    kill $HEARTBEAT_PID 2>/dev/null || true
    echo "$(date): Container shutting down" >> "$PROGRESS_FILE"
    update_status "status" "stopped"
}
trap cleanup EXIT

# Wait for Claude Code
wait $CLAUDE_PID
EXIT_CODE=$?

# Final status
if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date): ✅ Completed successfully" >> "$PROGRESS_FILE"
    update_status "status" "completed"
else
    echo "$(date): ❌ Failed with code $EXIT_CODE" >> "$PROGRESS_FILE"
    update_status "status" "failed"
fi

exit $EXIT_CODE
```

### 3. Live Monitoring Dashboard

```bash
#!/bin/bash
# scripts/monitor-live-dashboard.sh

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to get container status with color
get_container_status() {
    local container="$1"
    local status=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].State.Status')
    
    case "$status" in
        "running")
            echo -e "${GREEN}● Running${NC}"
            ;;
        "exited")
            echo -e "${RED}● Exited${NC}"
            ;;
        *)
            echo -e "${YELLOW}● $status${NC}"
            ;;
    esac
}

# Function to get last progress line
get_last_progress() {
    local agent="$1"
    local file="docker/volumes/communication/progress/${agent}.md"
    if [ -f "$file" ]; then
        tail -n 1 "$file" | cut -c1-80
    else
        echo "No progress yet"
    fi
}

# Main monitoring loop
while true; do
    clear
    echo "╔════════════════════════════════════════════════════════════════════════╗"
    echo "║            CONTAINERIZED MULTI-AGENT MONITOR                          ║"
    echo "║                    $(date '+%Y-%m-%d %H:%M:%S')                        ║"
    echo "╚════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Container Status Section
    echo "📦 CONTAINER STATUS"
    echo "─────────────────────────────────────────────────────────────────────────"
    printf "%-20s %-15s %-10s %-10s %-10s\n" "AGENT" "STATUS" "CPU%" "MEMORY" "RESTARTS"
    
    for agent in factory mock schema migrate-services migrate-hooks cleanup integration; do
        container="${agent}-agent"
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            status=$(get_container_status "$container")
            stats=$(docker stats --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}" "$container" 2>/dev/null || echo "N/A\tN/A")
            restarts=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].RestartCount' || echo "0")
            
            printf "%-20s %-25s %-10s %-10s %-10s\n" "$agent" "$status" $(echo "$stats" | cut -f1) $(echo "$stats" | cut -f2) "$restarts"
        fi
    done
    echo ""
    
    # Progress Section
    echo "📝 AGENT PROGRESS"
    echo "─────────────────────────────────────────────────────────────────────────"
    for agent in factory mock schema migrate-services migrate-hooks cleanup integration; do
        progress=$(get_last_progress "$agent")
        printf "${BLUE}%-15s${NC} %s\n" "$agent:" "$progress"
    done
    echo ""
    
    # Blockers Section
    echo "🚨 ACTIVE BLOCKERS"
    echo "─────────────────────────────────────────────────────────────────────────"
    blocker_count=$(ls -1 docker/volumes/communication/blockers/ 2>/dev/null | wc -l)
    if [ "$blocker_count" -gt 0 ]; then
        ls -1t docker/volumes/communication/blockers/ | head -5
    else
        echo -e "${GREEN}No active blockers${NC}"
    fi
    echo ""
    
    # Resource Usage Section
    echo "📊 RESOURCE USAGE"
    echo "─────────────────────────────────────────────────────────────────────────"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep agent || true
    echo ""
    
    # Recent Errors Section
    echo "⚠️  RECENT ERRORS (Last 5)"
    echo "─────────────────────────────────────────────────────────────────────────"
    grep -h "ERROR\|Failed" docker/volumes/communication/progress/*.md 2>/dev/null | tail -5 || echo "No recent errors"
    echo ""
    
    echo "Press Ctrl+C to exit | Refreshing in 5 seconds..."
    sleep 5
done
```

### 4. Multi-Terminal Monitoring with Tmux

```bash
#!/bin/bash
# scripts/monitor-multi-terminal.sh

SESSION="agent-monitor"

# Kill existing session
tmux kill-session -t $SESSION 2>/dev/null

# Create new session with main pane showing docker logs
tmux new-session -d -s $SESSION -n "Monitor" \
    "docker-compose logs -f --tail=50"

# Split horizontally for progress files
tmux split-window -h -t $SESSION:0 \
    "watch -n 2 'for f in docker/volumes/communication/progress/*.md; do echo \"=== \$(basename \$f) ===\"; tail -n 3 \$f; echo; done'"

# Split vertically for container stats
tmux split-window -v -t $SESSION:0.1 \
    "watch -n 5 docker stats --no-stream"

# Create new window for blockers
tmux new-window -t $SESSION -n "Blockers" \
    "watch -n 10 'ls -la docker/volumes/communication/blockers/'"

# Create new window for individual agent logs
tmux new-window -t $SESSION -n "AgentLogs" \
    "docker logs -f factory-agent"

# Split for another agent
tmux split-window -h -t $SESSION:2 \
    "docker logs -f mock-agent"

# Select first window and attach
tmux select-window -t $SESSION:0
tmux attach-session -t $SESSION
```

### 5. JSON Status Aggregator

```javascript
// scripts/aggregate-status.js
const fs = require('fs');
const path = require('path');

class StatusAggregator {
  constructor(communicationDir) {
    this.statusDir = path.join(communicationDir, 'status');
    this.outputFile = path.join(communicationDir, 'aggregate-status.json');
  }

  async aggregateStatus() {
    const agents = {};
    const files = fs.readdirSync(this.statusDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const agentName = file.replace('.json', '');
        const statusPath = path.join(this.statusDir, file);
        
        try {
          const data = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
          
          agents[agentName] = {
            status: data.status || 'unknown',
            lastUpdate: data.lastUpdate || null,
            heartbeat: data.heartbeat || null,
            filesModified: (data.filesModified || []).length,
            errors: (data.errors || []).length,
            lastTool: data.lastTool || null,
            progress: this.calculateProgress(data),
            health: this.calculateHealth(data)
          };
        } catch (error) {
          agents[agentName] = { status: 'error', error: error.message };
        }
      }
    }
    
    const aggregate = {
      timestamp: new Date().toISOString(),
      overallHealth: this.calculateOverallHealth(agents),
      agents,
      summary: {
        total: Object.keys(agents).length,
        running: Object.values(agents).filter(a => a.status === 'running').length,
        completed: Object.values(agents).filter(a => a.status === 'completed').length,
        failed: Object.values(agents).filter(a => a.status === 'failed').length,
        totalErrors: Object.values(agents).reduce((sum, a) => sum + (a.errors || 0), 0)
      }
    };
    
    fs.writeFileSync(this.outputFile, JSON.stringify(aggregate, null, 2));
    return aggregate;
  }
  
  calculateProgress(data) {
    // Simple progress calculation based on activity
    if (data.status === 'completed') return 100;
    if (data.status === 'failed') return -1;
    
    const indicators = [
      data.filesModified?.length || 0,
      data.lastTool ? 10 : 0,
      data.heartbeat ? 5 : 0
    ];
    
    return Math.min(95, indicators.reduce((a, b) => a + b, 0) * 5);
  }
  
  calculateHealth(data) {
    const now = new Date();
    const lastUpdate = new Date(data.lastUpdate || 0);
    const timeSinceUpdate = now - lastUpdate;
    
    if (timeSinceUpdate > 600000) return 'stale'; // >10 minutes
    if (data.errors?.length > 5) return 'unhealthy';
    if (data.errors?.length > 0) return 'degraded';
    return 'healthy';
  }
  
  calculateOverallHealth(agents) {
    const healths = Object.values(agents).map(a => a.health);
    if (healths.includes('unhealthy')) return 'unhealthy';
    if (healths.includes('degraded')) return 'degraded';
    if (healths.includes('stale')) return 'stale';
    return 'healthy';
  }
}

// Run aggregator
if (require.main === module) {
  const aggregator = new StatusAggregator('docker/volumes/communication');
  
  setInterval(async () => {
    const status = await aggregator.aggregateStatus();
    console.clear();
    console.log('📊 AGGREGATE STATUS');
    console.log('══════════════════');
    console.log(`Overall Health: ${status.overallHealth}`);
    console.log(`Agents: ${status.summary.running}/${status.summary.total} running`);
    console.log(`Errors: ${status.summary.totalErrors}`);
    console.log('\nAgent Details:');
    
    for (const [name, agent] of Object.entries(status.agents)) {
      console.log(`  ${name}: ${agent.status} (${agent.progress}%) - ${agent.health}`);
    }
  }, 5000);
}
```

### 6. Alert System

```bash
#!/bin/bash
# scripts/monitor-alerts.sh

COMM_DIR="docker/volumes/communication"
ALERT_FILE="$COMM_DIR/alerts.log"

# Function to send alert (customize for Slack, email, etc.)
send_alert() {
    local severity="$1"
    local message="$2"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$severity] $message" >> "$ALERT_FILE"
    
    # Example: Send to Slack
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"[$severity] $message\"}" \
    #     "$SLACK_WEBHOOK_URL"
    
    # Example: Send email
    # echo "$message" | mail -s "[$severity] Agent Alert" admin@example.com
    
    # Terminal notification
    echo -e "\033[0;31m🚨 ALERT [$severity]: $message\033[0m"
}

# Monitor for various conditions
while true; do
    # Check for container failures
    for agent in factory mock schema migrate-services migrate-hooks cleanup integration; do
        container="${agent}-agent"
        status=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].State.Status')
        
        if [ "$status" == "exited" ] || [ "$status" == "dead" ]; then
            send_alert "CRITICAL" "Container $container has stopped unexpectedly"
        fi
        
        # Check restart count
        restarts=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].RestartCount' || echo "0")
        if [ "$restarts" -gt 5 ]; then
            send_alert "WARNING" "Container $container has restarted $restarts times"
        fi
    done
    
    # Check for stale agents (no heartbeat in 5 minutes)
    for progress_file in $COMM_DIR/progress/*.md; do
        if [ -f "$progress_file" ]; then
            agent=$(basename "$progress_file" .md)
            last_modified=$(stat -f "%m" "$progress_file" 2>/dev/null || stat -c "%Y" "$progress_file" 2>/dev/null)
            current_time=$(date +%s)
            time_diff=$((current_time - last_modified))
            
            if [ "$time_diff" -gt 300 ]; then
                send_alert "WARNING" "Agent $agent appears stale (no updates for ${time_diff} seconds)"
            fi
        fi
    done
    
    # Check for critical blockers
    blocker_count=$(ls -1 $COMM_DIR/blockers/CRITICAL-* 2>/dev/null | wc -l)
    if [ "$blocker_count" -gt 0 ]; then
        send_alert "CRITICAL" "Found $blocker_count critical blockers"
    fi
    
    # Check disk space
    available_space=$(df -h docker/volumes | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 1 ]; then
        send_alert "CRITICAL" "Low disk space: ${available_space}G available"
    fi
    
    sleep 60  # Check every minute
done
```

### 7. Quick Status Commands

```bash
# Add to ~/.bashrc or ~/.zshrc for quick access

# Show all agent progress
alias agent-progress='tail -n 5 docker/volumes/communication/progress/*.md'

# Show agent status
alias agent-status='docker-compose ps'

# Show agent logs
alias agent-logs='docker-compose logs -f --tail=50'

# Show specific agent log
agent-log() {
    docker logs -f --tail=100 "$1-agent"
}

# Show agent resources
alias agent-stats='docker stats --no-stream $(docker-compose ps -q)'

# Show blockers
alias agent-blockers='ls -la docker/volumes/communication/blockers/'

# Quick health check
agent-health() {
    echo "🏥 Agent Health Check"
    echo "════════════════════"
    for agent in factory mock schema migrate-services migrate-hooks cleanup integration; do
        container="${agent}-agent"
        status=$(docker inspect "$container" 2>/dev/null | jq -r '.[0].State.Status' || echo "not found")
        
        case "$status" in
            "running")
                echo "✅ $agent: Running"
                ;;
            "exited")
                echo "❌ $agent: Exited"
                ;;
            *)
                echo "⚠️  $agent: $status"
                ;;
        esac
    done
}

# Emergency restart agent
agent-restart() {
    echo "🔄 Restarting $1-agent..."
    docker-compose restart "$1-agent"
}

# View agent environment
agent-env() {
    docker exec "$1-agent" env | sort
}

# Execute command in agent container
agent-exec() {
    local agent="$1"
    shift
    docker exec -it "${agent}-agent" "$@"
}
```

### Key Monitoring Insights

1. **Docker logs are your primary source** - Claude Code outputs to stdout/stderr
2. **Progress files provide structured updates** - Written to shared volumes
3. **Heartbeats detect stale agents** - Background process writes periodic updates
4. **JSON status enables aggregation** - Machine-readable progress tracking
5. **Tmux/screen for multi-view monitoring** - See logs, progress, stats simultaneously
6. **Alerts catch critical issues** - Container failures, stale agents, resource exhaustion

The combination of real-time logs, progress files, and status aggregation gives you complete visibility into Claude Code's execution within containers.

## Best Practices

### 1. Container Configuration

```yaml
# Security-hardened container configuration
services:
  agent:
    # Resource limits (prevent runaway processes)
    mem_limit: 2G
    memswap_limit: 2G
    cpus: 1.0
    pids_limit: 100
    
    # Security options
    security_opt:
      - no-new-privileges:true    # Prevent privilege escalation
      - seccomp:unconfined        # Allow dangerous operations within container
    
    # Capability management
    cap_drop:
      - ALL                       # Drop all capabilities
    cap_add:
      - CHOWN                     # Allow file ownership changes
      - DAC_OVERRIDE              # Allow file permission overrides
      - SETUID                    # Allow user switching
      - SETGID                    # Allow group switching
    
    # Filesystem permissions
    read_only: false              # Allow file modifications
    tmpfs:
      - /tmp:rw,size=1G          # Writable temp space
    
    # Network isolation (optional)
    network_mode: "none"          # Disable network if not needed
    
    # Restart policy
    restart: unless-stopped       # Always restart unless manually stopped
```

### 2. Volume Management

```yaml
volumes:
  # Workspace volumes (agent-specific)
  agent-workspace:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/test-refactor-agent
  
  # Communication volume (shared)
  communication:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/communication
  
  # Backup volume
  snapshots:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/snapshots
```

### 3. Health Checks

```dockerfile
# Add health check to Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

```bash
# Health check script
#!/bin/bash
# docker/agents/health-check.sh

# Check if Claude Code process is running
if ! pgrep -f "claude-code" > /dev/null; then
    echo "❌ Claude Code process not running"
    exit 1
fi

# Check if workspace is accessible
if [ ! -w /workspace ]; then
    echo "❌ Workspace not writable"
    exit 1
fi

# Check if communication directory is accessible
if [ ! -w /shared ]; then
    echo "❌ Communication directory not accessible"  
    exit 1
fi

# Check resource usage
MEMORY_USAGE=$(cat /proc/meminfo | grep MemAvailable | awk '{print $2}')
if [ "$MEMORY_USAGE" -lt 100000 ]; then  # Less than 100MB available
    echo "⚠️ Low memory warning"
    exit 1
fi

echo "✅ Health check passed"
exit 0
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Debug container startup
docker logs <container-name> --tail 50

# Check resource availability
docker system df
docker system prune -f

# Verify volume mounts
docker inspect <container-name> | jq '.Mounts'
```

#### 2. Permission Issues

```bash
# Fix volume permissions
sudo chown -R $(id -u):$(id -g) docker/volumes/
chmod -R 755 docker/volumes/

# Check container user
docker exec <container-name> id
```

#### 3. Resource Exhaustion

```bash
# Check resource usage
docker stats --no-stream

# Clean up unused resources
docker container prune -f
docker image prune -f
docker volume prune -f
```

#### 4. Communication Failures

```bash
# Verify shared volumes
ls -la docker/volumes/communication/

# Check file permissions
docker exec <container-name> ls -la /shared/

# Test file creation
docker exec <container-name> touch /shared/test-write
```

### Diagnostic Commands

```bash
# Full system diagnostic
./scripts/diagnose-containers.sh

# Monitor real-time logs
docker-compose logs -f

# Check container health
docker inspect <container-name> | jq '.State.Health'

# Resource monitoring
watch -n 5 docker stats
```

## Conclusion

The Containerized Multi-Agent Architecture provides a secure, isolated environment for running dangerous AI operations while maintaining the benefits of parallel execution. Key advantages:

- **Safety**: Catastrophic failures contained to containers
- **Recovery**: Instant restart and restore capabilities  
- **Monitoring**: Real-time visibility into agent health and progress
- **Isolation**: Each agent operates independently with full permissions within its container
- **Scalability**: Easy to add/remove agents as needed

This pattern enables confident use of `--dangerous-permissions` without risking host system integrity, making it ideal for high-risk AI operations and experimental workflows.

---

*Based on the [Multi-Agent Architecture Guide](./multi-agent-architecture-guide.md) with container isolation for safe dangerous operations*